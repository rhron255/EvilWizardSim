/**
 * Per-hex balance report (issue #124).
 *
 *   npx tsx scripts/hex-report.ts [--seed 1] [--out <dir>]
 *
 * Plays the full harness once with no hex and once per hex in `src/content`
 * (`simulate.ts --hex <id> --report-json`), then prints each hex beside the
 * base: the headline population rates, and whether every ending is still
 * reached by the population or by its dedicated cohort (rule 6, "a hex may
 * make an ending harder, never impossible").
 *
 * NOT part of the per-PR balance comment (`balance-report.ts`, #75): each hex
 * with the full probe set takes about two minutes on a laptop, and CI runs the
 * base harness five times already. Run it when a hex or a balance constant
 * changes. The report only reads files, so `--out <dir>` with JSON written by
 * `simulate.ts` already present skips the playing (`--reuse`).
 *
 * A reached ending is one with at least one career in the population or a
 * non-zero seeker rate in its cohort; the same two columns the PR comment
 * reads, for the same reason — a population-only column would call a
 * cohort-shaped ending dead when it is merely unmeasured (failure mode 5).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hexes } from '../src/content';

type Report = {
  seed: number;
  hex?: string;
  runs: number;
  population: Record<string, { n: number; share: number }>;
  seekers: Record<string, { cohort: string; runs: number; rate: number }>;
  checks: { label: string; pass: boolean; value: string }[];
};

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const seed = flag('seed', '1');
const out = flag('out', join('hex-report', `seed${seed}`));
const reuse = process.argv.includes('--reuse');
mkdirSync(out, { recursive: true });

const ids = ['', ...hexes.map((h) => h.id)];

function play(id: string): string {
  const file = join(out, `${id || 'none'}.json`);
  if (reuse && existsSync(file)) return file;
  const args = ['tsx', 'scripts/simulate.ts', '--seed', seed, '--report-json', file];
  if (id) args.push('--hex', id);
  const result = spawnSync('npx', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (result.status !== 0 && !existsSync(file)) {
    console.error(`simulate.ts failed for hex "${id || 'none'}"`);
    process.exit(1);
  }
  return file;
}

const reports = ids.map((id) => ({ id, report: JSON.parse(readFileSync(play(id), 'utf8')) as Report }));

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
const reached = (r: Report) => {
  const all = Object.keys(r.population);
  const missing = all.filter(
    (e) => (r.population[e]?.n ?? 0) === 0 && (r.seekers[e]?.rate ?? 0) === 0,
  );
  return { total: all.length, missing };
};

const base = reports[0].report;
const failing = (r: Report) => new Set(r.checks.filter((c) => !c.pass).map((c) => c.label));
const baseFailing = failing(base);

console.log(`Hex report · seed ${seed} · ${base.runs} careers per column\n`);
console.log(
  ['hex'.padEnd(18), 'slain'.padStart(8), 'ascension'.padStart(10), 'endings reached'.padStart(16), 'new check failures'].join('  '),
);
for (const { id, report } of reports) {
  const { total, missing } = reached(report);
  const newFails = [...failing(report)].filter((l) => !baseFailing.has(l));
  console.log(
    [
      (id || 'none (base)').padEnd(18),
      pct(report.population.slain_by_chosen_one?.share ?? 0).padStart(8),
      pct(report.population.ascension?.share ?? 0).padStart(10),
      `${total - missing.length} of ${total}`.padStart(16),
      newFails.length === 0 ? '—' : newFails.join('; '),
    ].join('  '),
  );
  if (missing.length > 0) console.log(`  unreached: ${missing.join(', ')}`);
}
