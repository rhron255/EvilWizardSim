/**
 * Turns a set of `--report-json` files into the balance comment CI posts on a
 * pull request.
 *
 *   npx tsx scripts/balance-report.ts --head <dir> [--base <dir>] [--out <path>]
 *
 * Each directory holds one JSON file per seed, written by
 * `scripts/simulate.ts --report-json`. With `--base` it renders a comparison;
 * without, it renders the head numbers alone (which is what a push to `main`
 * gets, and what you get locally).
 *
 * ## Why it reports a range and not a number
 *
 * The reprisal and leadership cohorts are `PROBE_RUNS` = 200 careers each, so
 * a true 2% rate has an expected count of 4 and routinely reads 1.0-4.5%
 * across seeds WITH NO CODE CHANGE AT ALL. A comment that printed one seed's
 * figure would invite a reviewer to chase a two-career swing, which is
 * CLAUDE.md failure mode 6 ("invented targets get chased") wearing a CI badge
 * — and this file would be the thing that invented the target.
 *
 * So every cell is mean plus observed range across the seeds, and a delta is
 * only called a MOVE when it clears the noise the seeds themselves show. The
 * test is deliberately crude and deliberately stated in the output: a change
 * counts when it is larger than the width of the base's own seed spread (and
 * at least `MIN_MOVE`, so an ending that happened to read identically on
 * every base seed cannot make any difference at all look significant). It is
 * a smell test, not statistics, and the comment says so rather than implying
 * a rigour it does not have.
 *
 * The honest alternative — more seeds — is a runtime decision, not a
 * presentation one. Raise `--seeds` in the workflow if the noise floor is too
 * high to see what you need.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Report = {
  seed: number;
  runs: number;
  completionPlayers: number;
  completionCap: number;
  population: Record<string, { n: number; share: number }>;
  seekers: Record<string, { cohort: string; runs: number; rate: number }>;
  checks: Array<{ label: string; pass: boolean; value: string }>;
};

/** A rate has to move by at least this much before the comment calls it a move. */
const MIN_MOVE = 0.005;

function arg(name: string, fallback = ''): string {
  const at = process.argv.indexOf(`--${name}`);
  return at !== -1 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function load(dir: string): Report[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Report)
    .sort((a, b) => a.seed - b.seed);
}

type Band = { mean: number; min: number; max: number };

const band = (xs: number[]): Band => ({
  mean: xs.reduce((a, b) => a + b, 0) / xs.length,
  min: Math.min(...xs),
  max: Math.max(...xs),
});

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

/** Mean, with the spread beside it when the seeds disagreed enough to matter. */
function cell(b: Band | undefined): string {
  if (!b) return '—';
  if (b.max - b.min < 0.0001) return pct(b.mean);
  return `${pct(b.mean)} <sub>${pct(b.min)}–${pct(b.max)}</sub>`;
}

/**
 * The delta column. Blank when the movement is inside the base's own seed
 * spread, because at 200 runs that is what "no change" looks like.
 */
function delta(head: Band | undefined, base: Band | undefined): string {
  if (!head || !base) return '';
  const d = head.mean - base.mean;
  const noise = Math.max(base.max - base.min, MIN_MOVE);
  if (Math.abs(d) <= noise) return `<sub>±noise</sub>`;
  const sign = d > 0 ? '+' : '−';
  return `**${sign}${(Math.abs(d) * 100).toFixed(2)}pt**`;
}

function bands(reports: Report[]) {
  const population = new Map<string, Band>();
  const seekers = new Map<string, Band>();
  const cohortOf = new Map<string, string>();
  const ids = new Set(reports.flatMap((r) => Object.keys(r.population)));
  for (const id of ids) {
    population.set(
      id,
      band(reports.map((r) => r.population[id]?.share ?? 0)),
    );
    if (reports[0].seekers[id]) {
      seekers.set(
        id,
        band(reports.map((r) => r.seekers[id]?.rate ?? 0)),
      );
      cohortOf.set(id, reports[0].seekers[id].cohort);
    }
  }
  return { population, seekers, cohortOf };
}

/**
 * Checks that depend on the completion probe, which CI runs at a token player
 * count. They are EXCLUDED rather than shown failing: a check run against one
 * simulated player is not a failing check, it is an unmeasured one, and a red
 * mark beside it would be the harness lying in the most ordinary way there is
 * (CLAUDE.md failure mode 5). The comment says what it skipped and why.
 */
const NEEDS_COMPLETION_PROBE = /full completion/i;

function checkTable(head: Report[], base: Report[] | undefined, measured: boolean): string {
  // A check is reported by how many seeds it passed on, because several of
  // them genuinely flip between seeds. "3/5" is information; "[FAIL]" from a
  // single seed is a coin toss presented as a verdict.
  const labels = head[0].checks
    .map((c) => c.label)
    .filter((label) => measured || !NEEDS_COMPLETION_PROBE.test(label));
  const passes = (rs: Report[], label: string) =>
    rs.filter((r) => r.checks.find((c) => c.label === label)?.pass).length;

  const rows = labels.map((label) => {
    const h = passes(head, label);
    const b = base ? passes(base, label) : undefined;
    const moved = b !== undefined && h !== b;
    const mark = h === head.length ? '✅' : h === 0 ? '❌' : '⚠️';
    const was = b === undefined ? '' : moved ? ` (was ${b}/${base!.length})` : '';
    return `| ${mark} ${label} | ${h}/${head.length}${was} |`;
  });
  return ['| target | seeds passing |', '| --- | --- |', ...rows].join('\n');
}

function main() {
  const headDir = arg('head');
  const baseDir = arg('base');
  const out = arg('out');
  if (!headDir) throw new Error('balance-report: --head <dir> is required');

  const head = load(headDir);
  if (head.length === 0) throw new Error(`balance-report: no JSON reports in ${headDir}`);

  /*
   * A missing base is NORMAL, not a failure: the base ref does not have
   * `--report-json` until the commit adding it lands, and a PR branched from
   * before that will never produce base reports. Degrade to the head-only
   * table rather than failing the job — but SAY SO in the comment, because a
   * comparison table that quietly stopped comparing is the kind of instrument
   * this repo has been bitten by before.
   */
  const baseLoaded = baseDir ? load(baseDir) : [];
  const base = baseLoaded.length > 0 ? baseLoaded : undefined;
  const baseMissing = Boolean(baseDir) && base === undefined;

  const h = bands(head);
  const b = base ? bands(base) : undefined;

  // Seeker rate first: for the eleven cohort-shaped endings it is the number
  // that says whether the ending is reachable at all. Population share for
  // those is near zero by construction and sorting on it buries them.
  const ids = [...h.population.keys()].sort((x, y) => {
    const rx = h.seekers.get(x)?.mean ?? h.population.get(x)!.mean;
    const ry = h.seekers.get(y)?.mean ?? h.population.get(y)!.mean;
    return ry - rx;
  });

  const rows = ids.map((id) => {
    const pop = h.population.get(id);
    const seek = h.seekers.get(id);
    const cohort = h.cohortOf.get(id);
    const popCell = `${cell(pop)} ${base ? delta(pop, b!.population.get(id)) : ''}`.trim();
    const seekCell = seek
      ? `${cell(seek)} ${base ? delta(seek, b!.seekers.get(id)) : ''}`.trim()
      : '—';
    return `| \`${id}\` | ${popCell} | ${seekCell} | ${cohort ? `\`${cohort}\`` : '—'} |`;
  });

  const seeds = head.map((r) => r.seed).join(', ');
  const measured = head[0].completionPlayers > 1;

  const md = [
    '<!-- balance-report -->',
    '## Balance: ending percentages',
    '',
    base
      ? `Seeds ${seeds}, this branch vs its merge base. **Population** is the 2000-career mixed-policy run — how often an ending finds a player who was not looking for it. **Seeker** is the ending's own dedicated cohort, which is the only number that says whether a player chasing it can get it; for the cohort-shaped endings the population figure is near zero *by construction*, because those cohorts are deliberately kept out of the population mix.`
      : `Seeds ${seeds}. **Population** is the 2000-career mixed-policy run; **seeker** is the ending's own dedicated cohort.`,
    baseMissing
      ? 'ℹ️ **No comparison against the base ref** — it produced no reports, which is expected for a branch that predates `--report-json`. The numbers below are this branch only.'
      : null,
    '',
    '| ending | population | seeker | cohort |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    'Small type is the range across seeds. A delta is only shown when it exceeds the spread the base seeds produced on their own — anything inside that reads `±noise`, because at 200 runs per cohort a two-career swing is not a signal. Chasing one is how this repo got `DEF_LICH` wrong twice.',
    '',
    '### Target checks',
    '',
    checkTable(head, base, measured),
    '',
    measured
      ? null
      : `ℹ️ The completion probe ran at \`COMPLETION_PLAYERS=${head[0].completionPlayers}\`, so the **"Full completion … under 1000 runs"** target is *omitted above rather than shown failing* — at that player count it is unmeasured, not red. It needs the 150-player probe, which costs ~60s per seed against ~10s for everything else; run \`npm run sim\` locally for it.`,
    '',
    '<sub>Generated by `.github/workflows/ci.yml` → `scripts/balance-report.ts`. Re-run by pushing; this comment updates in place.</sub>',
  ]
    // Only the conditional lines above are dropped. Blank strings are load
    // bearing: GitHub will not render a table that is not preceded by one.
    .filter((line): line is string => line !== null)
    .join('\n');

  if (out) writeFileSync(out, `${md}\n`);
  else console.log(md);
}

main();
