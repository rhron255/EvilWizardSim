/**
 * Local content review server.
 *
 *   npm run content-review
 *
 * Serves a plain static page (`public/`) plus three JSON routes:
 *   GET  /api/content   — every user-facing prose field, freshly re-read from disk
 *   POST /api/edit      — writes one field back into its source .ts file
 *   POST /api/validate  — re-runs scripts/validate-content.ts and returns its output
 *
 * Binds to 127.0.0.1 only, and refuses any request whose Host, Origin or
 * content type says it did not come from its own page (requestGuard.ts) — it
 * writes source files, so another web page must not be able to drive it. Meant
 * to run side-by-side with `npm run dev` while auditing content, so it probes
 * for a free port starting above Vite's default.
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { applyEdit, ROOT } from './writer';
import { guardRequest } from './requestGuard';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const TSX_BIN = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runTsx(scriptRelPath: string, args: string[] = []) {
  return spawnSync(TSX_BIN, [scriptRelPath, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024,
  });
}

async function serveStatic(reqPath: string, res: http.ServerResponse) {
  const rel = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const MAX_BODY_BYTES = 1024 * 1024;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error('request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  // Answered before anything else, including static files: see requestGuard.ts.
  const refusal = guardRequest(
    {
      method: req.method,
      host: req.headers.host,
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
    },
    (server.address() as AddressInfo).port,
  );
  if (refusal) {
    sendJson(res, 403, { error: refusal });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/content') {
    // Spawned fresh every request — a long-lived process would keep the
    // content module graph cached across ESM imports and go stale the moment
    // a field is edited (by this tool, or by hand in an editor alongside it).
    const result = runTsx('tools/content-review/loader.ts');
    if (result.status !== 0) {
      sendJson(res, 500, { error: result.stderr || result.stdout || 'loader failed' });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(result.stdout);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/edit') {
    try {
      const body = JSON.parse(await readBody(req));
      const result = applyEdit(body);
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 400, { error: (err as Error).message });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/validate') {
    const result = runTsx('scripts/validate-content.ts');
    sendJson(res, 200, { code: result.status ?? -1, output: `${result.stdout}${result.stderr}` });
    return;
  }

  if (req.method === 'GET') {
    await serveStatic(url.pathname, res);
    return;
  }

  res.writeHead(404);
  res.end();
});

function tryListen(port: number) {
  server.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && port < 5190) {
      tryListen(port + 1);
    } else {
      throw err;
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Content review tool → http://127.0.0.1:${port}`);
  });
}

tryListen(5175);
