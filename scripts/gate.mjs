/**
 * The whole verification suite behind one command.
 *
 *   npm run gate                 # typecheck · test · lint · validate:content
 *   npm run gate -- --sim 1,2    # …plus a balance reading at those seeds
 *   npm run gate -- --quiet      # summary lines only, no failure bodies
 *
 * CLAUDE.md's gate is four commands run in order, and the cost of that is that
 * running only three of them looks exactly like running four. This orchestrates
 * them; it does not replace, wrap or reinterpret any of them. Every gate is
 * still `npm run <name>` exactly as package.json defines it, so a change here
 * can never make a gate laxer than it is on its own.
 *
 * ── Why pass/fail is read from the EXIT CODE and nothing else ──
 *
 * This repo has shipped both halves of the text-matching bug (failure modes 9
 * and 11):
 *
 *   - `npm run test` exited **1** with "No test files found" while being cited
 *     as passing. Text that reads like a report is not a result.
 *   - `validate-content.ts` grew a rule appended *below* its report block, so
 *     it found a real failure, printed `content OK — …`, and exited **0**.
 *
 * So a gate here passes if and only if its child process exited 0. There is no
 * scan of the output for "error", "failed", "✗" or any other word, because both
 * of the bugs above would have sailed through such a scan — one by looking bad
 * while passing, one by looking good while failing. Output is captured for the
 * reader; the verdict comes from `status`.
 *
 * The corollary is that a null status — timeout, or killed by a signal — is a
 * FAIL, not a skip. `status ?? 0` anywhere in this file would silently convert
 * "we never found out" into "it passed", which is the same bug wearing a
 * different hat.
 *
 * ── Why the sim is printed but never graded ──
 *
 * `scripts/simulate.ts` exits 0 whether or not the balance targets are met (see
 * its `main()` — it prints "One or more balance targets missed." and returns
 * normally). That is deliberate: balance targets are a **reading**, not a gate.
 * A run can legitimately miss one and still be a correct change, and the
 * numbers move with the seed. So `--sim` prints the `[FAIL]` lines and the
 * reachability line and stops there; it never touches this script's exit code.
 * The one thing it does surface is a non-zero sim exit, which means the harness
 * itself crashed rather than that a target missed — that is worth seeing, and
 * "the sim printed nothing" should never be able to pass unremarked.
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

/**
 * `npm` is a shell script on POSIX and `npm.cmd` on Windows, and Node 22 refuses
 * to spawn a `.cmd` at all without a shell (EINVAL, from the CVE-2024-27980
 * fix). Verified on this box: bare `npm` → ENOENT, `npm.cmd` → EINVAL,
 * `shell: true` → works and propagates the child's exit code intact. Every
 * argument below is a literal with no spaces or shell metacharacters, which is
 * what makes going through cmd.exe safe here.
 */
const SHELL = true;

/** Generous, because a slow gate must not be reported as a broken one. */
const GATE_TIMEOUT_MS = 300_000; // npm test is ~10s here, but CI cold-starts.
const SIM_TIMEOUT_MS = 300_000; // The sim is ~120s per seed at 2000 runs.

/** 64 MB. A truncated capture would hide the very output a FAIL exists to show. */
const MAX_BUFFER = 64 * 1024 * 1024;

/**
 * The four gates, in the order CLAUDE.md runs them. Sequential on purpose: they
 * share the TypeScript build output and the disk, so running them concurrently
 * trades a correct answer for a faster wrong one.
 *
 * `highlight` is the one line a reader actually checks on a PASS — the test
 * counts and the content tallies. It is a convenience for the human, never an
 * input to the verdict; a gate with a missing highlight still passes on its
 * exit code, and a gate with a beautiful highlight still fails on its exit code.
 */
const GATES = [
  { name: 'typecheck', argv: ['run', 'typecheck'] },
  {
    name: 'test',
    argv: ['run', 'test'],
    // vitest's tail: "Tests  432 passed (432)". Matched after ANSI stripping.
    highlight: (line) => /^Tests\s+\d/.test(line),
  },
  { name: 'lint', argv: ['run', 'lint'] },
  {
    name: 'validate:content',
    argv: ['run', 'validate:content'],
    highlight: (line) => line.startsWith('content OK'),
  },
];

// ── argv ────────────────────────────────────────────────────────────────────

/**
 * `--sim` takes an optional comma-separated seed list. The next token is only
 * consumed as seeds if it is not itself a flag, so `--sim --quiet` means
 * "default seed, quietly" rather than "seed `--quiet`".
 */
function parseArgs(argv) {
  const opts = { quiet: false, sim: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quiet') opts.quiet = true;
    else if (a === '--sim') {
      const next = argv[i + 1];
      const raw = next && !next.startsWith('--') ? (i++, next) : '1';
      opts.sim = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      console.error(`gate: unknown argument "${a}"`);
      process.exit(2);
    }
  }
  return opts;
}

// ── running ─────────────────────────────────────────────────────────────────

/**
 * vitest and eslint keep their colour codes when their output is piped, so the
 * capture arrives full of CSI escapes. Strip them: `Tests  432 passed` does not
 * match /^Tests/ while it is wrapped in them, and a failure body pasted into an
 * issue should be readable text.
 */
const ANSI = /\x1B\[[0-9;?]*[ -\/]*[@-~]/g;
const stripAnsi = (s) => s.replace(ANSI, '');

/**
 * Runs one child to completion and reports what it did — never what it said.
 * `status` is passed through untouched, including `null`, so the caller has to
 * decide what an unfinished run means instead of inheriting a cheerful default.
 */
function run(command, argv, timeout) {
  const started = Date.now();
  const r = spawnSync(command, argv, {
    shell: SHELL,
    encoding: 'utf8',
    timeout,
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Gates split themselves across both streams (vitest's summary is not always
  // on the same one as its failures), so the body is the pair, concatenated.
  const output = stripAnsi(`${r.stdout ?? ''}${r.stderr ?? ''}`);
  return {
    status: r.status,
    signal: r.signal,
    error: r.error,
    output,
    ms: Date.now() - started,
    timedOut: r.error?.code === 'ETIMEDOUT' || r.signal != null,
  };
}

const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const pad = (s, n) => String(s).padEnd(n);

function firstMatch(output, predicate) {
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && predicate(trimmed)) return trimmed;
  }
  return null;
}

// ── main ────────────────────────────────────────────────────────────────────

const opts = parseArgs(process.argv.slice(2));
const results = [];
const totalStarted = Date.now();

console.log('');
console.log(`gate · ${GATES.map((g) => g.name).join(' · ')}`);
console.log('');

for (const gate of GATES) {
  const r = run('npm', gate.argv, GATE_TIMEOUT_MS);
  const ok = r.status === 0; // ← the entire verdict. See the header comment.
  results.push({ gate, ...r, ok });

  let why = '';
  if (!ok) {
    if (r.timedOut) why = `  (timed out after ${secs(GATE_TIMEOUT_MS)})`;
    else if (r.error) why = `  (${r.error.code ?? r.error.message})`;
    else why = `  (exit ${r.status})`;
  }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${pad(gate.name, 18)}${pad(secs(r.ms), 8)}${why}`);

  // The two numbers a reader checks, printed even on a clean run — a green
  // "test" that ran 0 files is exactly the shape of failure mode 9.
  const line = gate.highlight ? firstMatch(r.output, gate.highlight) : null;
  if (line) console.log(`        ${line}`);
  else if (gate.highlight && ok) console.log('        (no summary line found in output)');
}

const failed = results.filter((r) => !r.ok);
console.log('');
console.log(
  `  ${results.length - failed.length}/${results.length} gates passed in ${secs(
    Date.now() - totalStarted,
  )}`,
);
console.log('');

// Failure bodies come after the summary so the verdict is readable without
// scrolling past a tsc dump to find it.
if (failed.length > 0 && !opts.quiet) {
  for (const r of failed) {
    console.log('─'.repeat(72));
    console.log(`FAIL  npm run ${r.gate.name}  (exit ${r.status ?? `signal ${r.signal}`})`);
    console.log('─'.repeat(72));
    console.log(r.output.trimEnd() || '(no output captured)');
    console.log('');
  }
}

// ── the balance reading, which is not a gate ────────────────────────────────

if (opts.sim) {
  console.log('  balance reading (not a gate — see the header comment)');
  for (const seed of opts.sim) {
    const r = run('npx', ['tsx', 'scripts/simulate.ts', '--seed', seed], SIM_TIMEOUT_MS);
    const lines = r.output.split(/\r?\n/).map((l) => l.trimEnd());
    const shown = lines.filter(
      (l) => l.trimStart().startsWith('[FAIL]') || l.includes('Every authored ending occurs'),
    );
    console.log('');
    console.log(`    seed ${seed}  ${secs(r.ms)}`);
    if (r.status !== 0) {
      // Not a target miss — the harness exits 0 for those. This is a crash, and
      // failure mode 5 says suspect the instrument before believing a number.
      console.log(`    ! the sim itself exited ${r.status ?? `signal ${r.signal}`}`);
      if (!opts.quiet) console.log(r.output.trimEnd() || '    (no output captured)');
    }
    if (shown.length === 0) console.log('    (no [FAIL] or reachability lines in the sim output)');
    // Deduplicated: the reachability check prints as a [FAIL] line when it
    // fails, and would otherwise be listed twice.
    for (const l of [...new Set(shown)]) console.log(`    ${l.trim()}`);
  }
  console.log('');
}

// Never swallowed, and never softened by anything the children printed.
process.exit(failed.length === 0 ? 0 : 1);
