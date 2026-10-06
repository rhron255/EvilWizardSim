#!/usr/bin/env bash
# Runs the balance sim for every seed in $BALANCE_SEEDS at the same time, one
# process per seed, writing <outdir>/seed<N>.json.
#
#   BALANCE_SEEDS="1 2 3 4 5" scripts/measure-seeds.sh <outdir> [--tolerate-failures]
#
# WHY PROCESSES: `simulate.ts` is deterministic per seed and a seed shares
# nothing with any other, so running them side by side changes how long the
# measurement takes and nothing about what it measures — the numbers are
# byte-identical to a sequential run, which is what keeps the base-numbers cache
# (`balance-cache-key.ts`) valid across both ways of producing them.
#
# Exit status is non-zero if any seed failed, unless --tolerate-failures: the
# merge-base measurement uses that, because an older base may not have
# `--report-json` at all and the report degrades to head-only rather than failing.
set -u

out="${1:?usage: measure-seeds.sh <outdir> [--tolerate-failures]}"
tolerate="${2:-}"
: "${BALANCE_SEEDS:?BALANCE_SEEDS is not set}"

mkdir -p "$out"

pids=()
seeds=()
for seed in $BALANCE_SEEDS; do
  npx tsx scripts/simulate.ts --seed "$seed" --report-json "$out/seed$seed.json" > /dev/null &
  pids+=("$!")
  seeds+=("$seed")
done

failed=0
for i in "${!pids[@]}"; do
  if ! wait "${pids[$i]}"; then
    echo "seed ${seeds[$i]} failed" >&2
    failed=1
  fi
done

[ "$tolerate" = "--tolerate-failures" ] && exit 0
exit "$failed"
