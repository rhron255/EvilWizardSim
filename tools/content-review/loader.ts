/**
 * Content loader for the local review tool.
 *
 * Reuses the exact loading pattern `scripts/validate-content.ts` already
 * proves out (`import * as content from '../../src/content'`), but goes one
 * level more granular for offers — importing each named sub-array directly
 * from `src/content/offers` — so every offer can be tagged with the file it
 * actually lives in instead of guessing.
 *
 * Run directly (`tsx tools/content-review/loader.ts`) it prints the full
 * review-field list as JSON, which is how the server gets a guaranteed-fresh
 * read of on-disk content: it spawns this script per request rather than
 * holding the content module graph in its own long-lived process, sidestepping
 * ESM module-cache staleness entirely.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Project } from 'ts-morph';
import * as content from '../../src/content';
import {
  anyOffers,
  ascentOffers,
  declineOffers,
  virtueOffers,
  pactOffers,
  scriptedOffers,
  concordatOffers,
  oathOffers,
  favorOffers,
  grievanceOffers,
} from '../../src/content/offers';
import { CHANGELOG } from '../../src/content/changelog';
import { relicPowerText } from '../../src/components/meta/relicPower';
import type { Offer } from '../../src/types';
import { listTemplateFragments, TEMPLATE_FILES } from './templateFragments';

export type ReviewField = {
  category:
    | 'offer'
    | 'faction'
    | 'artifact'
    | 'lair'
    | 'origin'
    | 'ending'
    | 'epithet'
    | 'mechanic'
    | 'changelog'
    | 'template';
  itemId: string;
  itemLabel: string;
  file: string;
  fieldPath: string;
  value: string;
  budget?: { max: number; warnAt?: number };
  context?: string;
};

// Mirrors scripts/validate-content.ts's own budgets — not re-guessed, copied
// from the constants that file enforces, so the UI's counters agree with the
// gate that will actually reject an over-budget field.
const NARRATION_MAX = 500;
const CODA_MAX = 110;
const DEED_CLIP_WARN = 90;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const OFFER_FILES: { file: string; offers: Offer[] }[] = [
  { file: 'src/content/offers/any.ts', offers: anyOffers },
  { file: 'src/content/offers/ascent.ts', offers: ascentOffers },
  { file: 'src/content/offers/decline.ts', offers: declineOffers },
  { file: 'src/content/offers/virtue.ts', offers: virtueOffers },
  { file: 'src/content/offers/pacts.ts', offers: pactOffers },
  { file: 'src/content/offers/scripted.ts', offers: scriptedOffers },
  { file: 'src/content/offers/concordats.ts', offers: concordatOffers },
  { file: 'src/content/offers/oaths.ts', offers: oathOffers },
  { file: 'src/content/offers/favors.ts', offers: favorOffers },
  { file: 'src/content/offers/grievances.ts', offers: grievanceOffers },
];

export function collectReviewItems(): ReviewField[] {
  const fields: ReviewField[] = [];

  for (const { file, offers } of OFFER_FILES) {
    for (const offer of offers) {
      const push = (fieldPath: string, value: string, extra?: Partial<ReviewField>) => {
        if (!value) return;
        fields.push({ category: 'offer', itemId: offer.id, itemLabel: offer.title, file, fieldPath, value, ...extra });
      };
      push('title', offer.title);
      push('body', offer.body);
      offer.options.forEach((opt, i) => {
        push(`options[${i}].label`, opt.label);
        if (opt.kind === 'certain') {
          if (opt.resultText) {
            push(`options[${i}].resultText`, opt.resultText, {
              budget: { max: Infinity, warnAt: DEED_CLIP_WARN },
              context: 'certain — the Deeds column clips past the warn length',
            });
          }
        } else {
          const pct = Math.round(opt.odds * 100);
          push(`options[${i}].successText`, opt.successText, {
            budget: { max: Infinity, warnAt: DEED_CLIP_WARN },
            context: `gamble, ${pct}% success`,
          });
          push(`options[${i}].failureText`, opt.failureText, {
            budget: { max: Infinity, warnAt: DEED_CLIP_WARN },
            context: `gamble, ${100 - pct}% failure`,
          });
        }
      });
    }
  }

  for (const f of content.factions) {
    const push = (fieldPath: string, value: string) =>
      fields.push({ category: 'faction', itemId: f.id, itemLabel: f.name, file: 'src/content/factions.ts', fieldPath, value });
    push('blurb', f.blurb);
    push('demands', f.demands);
    push('adjective', f.adjective);
    push('reliquary', f.reliquary);
  }

  for (const a of content.artifacts) {
    // `power` has no authored prose of its own (issue #77) — it is structured
    // data, DERIVED into a line by relicPowerText, the same rule Effect
    // follows. Shown read-only so an editor can see it lines up with
    // flavorText without a stray "effect" string to hand-edit out of sync.
    const context =
      a.power === null
        ? 'no power authored yet (issue #77)'
        : `power: "${relicPowerText(a.power, { factions: content.factions })}"`;
    const push = (fieldPath: string, value: string, extra?: Partial<ReviewField>) =>
      fields.push({ category: 'artifact', itemId: a.id, itemLabel: a.name, file: 'src/content/artifacts.ts', fieldPath, value, ...extra });
    push('name', a.name);
    push('flavorText', a.flavorText, { context });
  }

  for (const l of content.lairs) {
    fields.push({
      category: 'lair',
      itemId: l.id,
      itemLabel: l.name,
      file: 'src/content/lairs.ts',
      fieldPath: 'blurb',
      value: l.blurb,
    });
  }

  for (const o of content.origins) {
    fields.push({
      category: 'origin',
      itemId: o.id,
      itemLabel: o.name,
      file: 'src/content/origins.ts',
      fieldPath: 'blurb',
      value: o.blurb,
    });
  }

  for (const e of content.endings) {
    const push = (fieldPath: string, value: string, extra?: Partial<ReviewField>) =>
      fields.push({ category: 'ending', itemId: e.id, itemLabel: e.name, file: 'src/content/endings.ts', fieldPath, value, ...extra });
    push('name', e.name);
    push('summary', e.summary);
    push('hint', e.hint);
    push('narration', e.narration, { budget: { max: NARRATION_MAX } });
    if (e.codaMode === 'tiered') {
      for (const [tier, line] of Object.entries(e.coda)) {
        push(`coda.${tier}`, line, { budget: { max: CODA_MAX } });
      }
    } else {
      push('coda', e.coda, { budget: { max: CODA_MAX } });
    }
  }

  for (const ep of content.epithets) {
    fields.push({
      category: 'epithet',
      itemId: ep.id,
      itemLabel: ep.text,
      file: 'src/content/epithets.ts',
      fieldPath: 'text',
      value: ep.text,
      context: 'the "when" predicate that awards this line is code-only — not editable here',
    });
  }

  for (const m of content.mechanics) {
    const push = (fieldPath: string, value: string) =>
      fields.push({ category: 'mechanic', itemId: m.id, itemLabel: m.name, file: 'src/content/mechanics.ts', fieldPath, value });
    push('name', m.name);
    push('blurb', m.blurb);
  }

  // Changelog entries (issue #67) have no `id` field of their own — they are
  // keyed by build-version STRING as an object property in `CHANGELOG`, so
  // `itemId` here is that version key rather than something read off the
  // record. `writer.ts`'s record lookup falls back to matching a property
  // NAME for exactly this shape.
  for (const [version, entry] of Object.entries(CHANGELOG)) {
    const push = (fieldPath: string, value: string) =>
      fields.push({
        category: 'changelog',
        itemId: version,
        itemLabel: version,
        file: 'src/content/changelog.ts',
        fieldPath,
        value,
      });
    push('summary', entry.summary);
    entry.details.forEach((line, i) => push(`details[${i}]`, line));
  }

  // Shared template wording (e.g. relic power lines) — see templateFragments.ts.
  // These have no per-item identity; `itemId` here only needs to be unique
  // within the field list, since writer.ts locates the edit target by VALUE
  // across the whole file, not by this id.
  const templateProject = new Project({ skipAddingFilesFromTsConfig: true });
  for (const file of TEMPLATE_FILES) {
    const sourceFile = templateProject.addSourceFileAtPath(path.join(ROOT, file));
    for (const frag of listTemplateFragments(sourceFile)) {
      const itemId = `frag-${frag.index}`;
      const label = frag.value.length > 40 ? `${frag.value.slice(0, 40)}…` : frag.value;
      fields.push({
        category: 'template',
        itemId,
        itemLabel: label,
        file,
        fieldPath: `fragment[${frag.index}]`,
        value: frag.value,
        context: 'shared wording — this line is reused to build EVERY relic power line of this shape, not authored per relic',
      });
    }
  }

  return fields;
}

// Runnable directly: `tsx tools/content-review/loader.ts` prints the full
// field list as JSON. The server spawns this as a fresh child process per
// request so it always reflects the current on-disk content.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(JSON.stringify(collectReviewItems()));
}
