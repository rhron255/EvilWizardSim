// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { guardRequest } from './requestGuard';

const PORT = 5175;
const ownPage = { host: `127.0.0.1:${PORT}`, origin: `http://127.0.0.1:${PORT}`, contentType: 'application/json' };

describe('guardRequest', () => {
  it('lets the tool’s own page through, on either loopback name', () => {
    expect(guardRequest({ method: 'POST', ...ownPage }, PORT)).toBeNull();
    expect(
      guardRequest({ method: 'POST', host: `localhost:${PORT}`, origin: `http://localhost:${PORT}`, contentType: 'application/json; charset=utf-8' }, PORT),
    ).toBeNull();
  });

  it('lets a plain navigation or curl through: no Origin, a GET', () => {
    expect(guardRequest({ method: 'GET', host: `127.0.0.1:${PORT}` }, PORT)).toBeNull();
  });

  it('refuses another web page’s cross-origin write, even as a text/plain "simple request"', () => {
    const drive = { method: 'POST', host: `127.0.0.1:${PORT}`, origin: 'https://evil.example', contentType: 'text/plain' };
    expect(guardRequest(drive, PORT)).toMatch(/Origin/);
    // The Origin check alone is not what stops it: a page that hides its Origin is still refused on content type.
    expect(guardRequest({ ...drive, origin: undefined }, PORT)).toMatch(/application\/json/);
  });

  it('refuses a sandboxed page, whose Origin is the string "null"', () => {
    expect(guardRequest({ method: 'POST', ...ownPage, origin: 'null' }, PORT)).toMatch(/Origin/);
  });

  it('refuses a rebound DNS name reading content (Host is not loopback)', () => {
    expect(guardRequest({ method: 'GET', host: `evil.example:${PORT}` }, PORT)).toMatch(/Host/);
    expect(guardRequest({ method: 'GET', host: 'evil.example' }, PORT)).toMatch(/Host/);
    expect(guardRequest({ method: 'GET' }, PORT)).toMatch(/Host/);
  });

  it('refuses another port on the same machine (another local dev server)', () => {
    expect(guardRequest({ method: 'POST', ...ownPage, origin: 'http://127.0.0.1:5173' }, PORT)).toMatch(/Origin/);
    expect(guardRequest({ method: 'GET', host: '127.0.0.1:5173' }, PORT)).toMatch(/Host/);
  });

  it('refuses a POST that does not declare JSON', () => {
    expect(guardRequest({ method: 'POST', ...ownPage, contentType: undefined }, PORT)).toMatch(/application\/json/);
    expect(guardRequest({ method: 'POST', ...ownPage, contentType: 'application/jsonx' }, PORT)).toMatch(/application\/json/);
    expect(guardRequest({ method: 'POST', ...ownPage, contentType: 'text/plain;application/json' }, PORT)).toMatch(/application\/json/);
  });
});
