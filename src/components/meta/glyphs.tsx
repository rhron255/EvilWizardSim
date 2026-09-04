/**
 * Inline-SVG glyph vocabulary. No image assets anywhere in the meta UI.
 *
 * Artifact glyphs are hand-authored silhouettes chosen deterministically by
 * artifact id, which is what makes the collection's locked slots work: the
 * shape is legible, the name is not. Lair glyphs are indexed by tier so the
 * ladder reads as a visual progression. Faction and ending glyphs are
 * one-to-one with their ids.
 *
 * Everything draws in `currentColor` at a 1.35 stroke so the marks sit at the
 * same optical weight as the hairline rules around them.
 */

import type { EndingId, FactionId } from '../../types';
import { hashString } from './hash';

type GlyphProps = {
  size?: number;
  className?: string;
  /** Heavier, flatter treatment for undiscovered collection slots. */
  locked?: boolean;
};

const BASE: React.SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

// ---------------------------------------------------------------------------
// Artifact silhouettes — 16 shapes, assigned by hash of the artifact id
// ---------------------------------------------------------------------------

const ARTIFACT_PATHS: string[][] = [
  // crown
  ['M3.5 18h17', 'M4.5 18l-1.2-9.6 5.2 3.9L12 4.4l3.5 7.9 5.2-3.9L19.5 18', 'M12 9.6v1.6'],
  // chalice
  ['M7 3.5h10', 'M7.6 3.5c0 5.4 1.9 7.6 4.4 7.6s4.4-2.2 4.4-7.6', 'M12 11.1V18', 'M7.8 20.5h8.4'],
  // dagger
  ['M12 2.2l2.2 5.1v8.1H9.8V7.3z', 'M7.4 15.4h9.2', 'M12 15.4v6.4', 'M10.3 21.8h3.4'],
  // ring with stone
  ['M12 22a6.2 6.2 0 100-12.4 6.2 6.2 0 000 12.4z', 'M12 18.6a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z', 'M12 2.2l3 3.6-3 3.8-3-3.8z'],
  // tome
  ['M3.5 4.8h6.3c1.2 0 2.2.9 2.2 2v12.4c0-1.1-1-2-2.2-2H3.5z', 'M20.5 4.8h-6.3c-1.2 0-2.2.9-2.2 2v12.4c0-1.1 1-2 2.2-2h6.3z', 'M12 6.8v12.4'],
  // orb on a stand
  ['M12 15.4a6 6 0 100-12 6 6 0 000 12z', 'M7.6 13.6L5.4 20.8h13.2l-2.2-7.2', 'M4.4 20.8h15.2', 'M9.4 7.2a3.4 3.4 0 012.6-1.8'],
  // key
  ['M8.4 12.4a4.6 4.6 0 100-9.2 4.6 4.6 0 000 9.2z', 'M11.6 11.2l8.8 8.8', 'M17 16.6l2.2-2.2', 'M19.2 18.8l1.8-1.8'],
  // skull
  ['M5.6 11.6a6.4 6.4 0 1112.8 0v3.6a2 2 0 01-2 2H7.6a2 2 0 01-2-2z', 'M9.4 11a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z', 'M14.6 11a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z', 'M9.4 17.2v3.2', 'M12 17.2v3.6', 'M14.6 17.2v3.2'],
  // staff
  ['M7.4 21.8L15.2 8.4', 'M16.4 6.2a3.6 3.6 0 10-3.4-2', 'M16.4 6.2c1.8-1 2.6-2.4 2.4-4.2'],
  // lantern
  ['M9.4 2.4h5.2', 'M12 2.4v2.2', 'M7.2 4.6h9.6l-1.2 12.2H8.4z', 'M9.6 20.6h4.8', 'M12 16.8v3.8', 'M12 8.2v5'],
  // eye
  ['M1.8 12.2S5.8 5.8 12 5.8s10.2 6.4 10.2 6.4-4 6.4-10.2 6.4S1.8 12.2 1.8 12.2z', 'M12 15.2a3 3 0 100-6 3 3 0 000 6z'],
  // horn
  ['M3.4 19.6c8.4 2.2 15-3.2 17.2-13-6.6 1.1-10.2 3.4-12.4 6.8', 'M6.4 15.4c2.8.4 5-.8 6.6-3.4'],
  // mask
  ['M5.2 4.6h13.6v6.8a6.8 6.8 0 01-13.6 0z', 'M8 9.4h3', 'M13 9.4h3', 'M12 13.8v2.4'],
  // hourglass
  ['M6.6 2.6h10.8', 'M6.6 21.4h10.8', 'M8 2.6c0 5.2 4 6.9 4 9.4s-4 4.2-4 9.4', 'M16 2.6c0 5.2-4 6.9-4 9.4s4 4.2 4 9.4'],
  // bell
  ['M5.8 17.4c2.2-1.2 2.2-3.4 2.2-6.6a4 4 0 018 0c0 3.2 0 5.4 2.2 6.6z', 'M10 20a2 2 0 004 0', 'M12 4.8V2.4'],
  // thorned branch
  ['M3.4 20.6C8 16.4 13.4 10 20.6 3.4', 'M20.6 3.4c-4.4-.2-6.8 1.8-7.6 5.4 3.4.2 5.8-1.6 7.6-5.4z', 'M11.4 12.4c-3.2-.4-5.4.8-6.4 3.8 3.2.4 5.2-.8 6.4-3.8z'],
];

/**
 * Pick a silhouette by what the relic actually *is*, falling back to the hash.
 *
 * A hash alone gives every relic a stable mark, but it also cheerfully draws a
 * branch for something called "The Bone Crown", and that one mismatch makes the
 * whole grid read as placeholder art. Keyword-first, hash-second: content-
 * agnostic, but it gets the obvious cases right. Order is significant — the
 * more specific rule has to win ("Heartwood Stake" is a stake, not a heart).
 */
const GLYPH_RULES: [RegExp, number][] = [
  [/crown|diadem|circlet|coronet/, 0],
  [/\bkey\b|keys/, 6],
  [/hourglass|clock|\bhour\b/, 13],
  [/lens|\beye\b|sight|spyglass/, 10],
  [/lantern|lamp|candle|censer|torch|beacon/, 9],
  [/blade|dagger|knife|sword|stake|spike|nail|shard/, 2],
  [/skull|bone|marrow|regret|death/, 7],
  [/tooth|teeth|tusk|horn|antler|fang/, 11],
  [/mask|mantle|veil|shroud|cloak|hood|face/, 12],
  [/bell|chime|iron|oath|weight|anvil/, 14],
  [/staff|\brod\b|wand|reed|sceptre|scepter|cane/, 8],
  [/book|tome|ledger|grimoire|thesis|writ|codex|scroll|tally|folio|footnote/, 4],
  [/chalice|\bcup\b|grail|goblet|reliquary|vessel|\burn\b|censer/, 1],
  [/ring|band|coin|seal|brand|sigil|token/, 3],
  [/orb|globe|sphere|heart|\bgem\b|stone|pearl|ember|cinder/, 5],
  [/seed|thorn|branch|root|vine|briar|moss|leaf|bough/, 15],
];

function glyphIndex(id: string, name?: string): number {
  const haystack = `${name ?? ''} ${id.replace(/_/g, ' ')}`.toLowerCase();
  for (const [pattern, index] of GLYPH_RULES) {
    if (pattern.test(haystack)) return index;
  }
  return hashString(id) % ARTIFACT_PATHS.length;
}

/** A relic silhouette, stable for a given artifact. */
export function ArtifactGlyph({
  id,
  name,
  size = 34,
  className,
  locked,
}: GlyphProps & { id: string; name?: string }) {
  const paths = ARTIFACT_PATHS[glyphIndex(id, name)];
  return (
    <svg {...BASE} width={size} height={size} className={className} strokeWidth={locked ? 1.9 : 1.35}>
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lair glyphs — indexed by tier, so the ladder is visible at a glance
// ---------------------------------------------------------------------------

const LAIR_PATHS: string[][] = [
  // 0 — a hole in the ground
  ['M2.6 20.4h18.8', 'M6 20.4c0-3.6 2.6-6.4 6-6.4s6 2.8 6 6.4', 'M9.6 20.4v-2.6a2.4 2.4 0 014.8 0v2.6'],
  // 1 — a shack
  ['M2.6 20.4h18.8', 'M5.4 20.4v-6.8L12 8.2l6.6 5.4v6.8', 'M10.2 20.4v-3.8h3.6v3.8'],
  // 2 — a cave mouth
  ['M2.2 20.4h19.6', 'M3.8 20.4C3.8 11.4 7.4 6 12 6s8.2 5.4 8.2 14.4', 'M8.6 20.4v-3.6a3.4 3.4 0 016.8 0v3.6'],
  // 3 — a tower
  ['M2.6 20.4h18.8', 'M7.4 20.4V7.8L12 2.6l4.6 5.2v12.6', 'M10 20.4v-5h4v5', 'M10.4 11.2h3.2'],
  // 4 — a keep
  ['M2.6 20.4h18.8', 'M4.6 20.4V8.6h14.8v11.8', 'M4.6 8.6V5.8h2.6v2.8h2.6V5.8h2.8v2.8h2.6V5.8h2.2v2.8', 'M10.2 20.4v-5.2h3.6v5.2'],
  // 5 — twin-towered fortress
  ['M1.8 20.4h20.4', 'M3.4 20.4V9.4l3.4-3 3.4 3v11', 'M13.8 20.4v-11l3.4-3 3.4 3v11', 'M10.2 20.4v-6.2h3.6v6.2', 'M5.4 13h2.8', 'M15.8 13h2.8'],
  // 6 — a spire
  ['M2.6 20.4h18.8', 'M9 20.4V9.6L12 1.6l3 8v10.8', 'M8.4 13h7.2', 'M8.8 16.6h6.4', 'M10.6 20.4v-3h2.8v3'],
  // 7 — a citadel with a hanging star
  ['M1.8 20.4h20.4', 'M4 20.4v-8.6l3-2.6 3 2.6v8.6', 'M14 20.4v-8.6l3-2.6 3 2.6v8.6', 'M10 20.4v-6h4v6', 'M12 1.6l1.4 3 3 1.4-3 1.4L12 10.4l-1.4-3-3-1.4 3-1.4z'],
];

export function LairGlyph({ tier, size = 30, className }: GlyphProps & { tier: number }) {
  const idx = Math.max(0, Math.min(LAIR_PATHS.length - 1, Math.round(tier)));
  return (
    <svg {...BASE} width={size} height={size} className={className} strokeWidth={1.3}>
      {LAIR_PATHS[idx].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Faction marks
// ---------------------------------------------------------------------------

const FACTION_PATHS: Record<FactionId, string[]> = {
  // A downturned flame inside a broken circle.
  ashen_covenant: [
    'M12 21.6a9.6 9.6 0 100-19.2 9.6 9.6 0 000 19.2',
    'M12 17.6c2.2 0 3.8-1.6 3.8-3.6 0-2.8-3.8-4-3.8-7.6 0 3.6-3.8 4.8-3.8 7.6 0 2 1.6 3.6 3.8 3.6z',
    'M12 17.6c-1 0-1.7-.8-1.7-1.8 0-1.4 1.7-2 1.7-3.4',
  ],
  // A merchant's balance.
  gilded_hand: [
    'M12 3.4v17.2',
    'M6.6 20.6h10.8',
    'M3.4 8.4h17.2',
    'M3.4 8.4L1 14.2a3 3 0 004.8 0z',
    'M20.6 8.4l2.4 5.8a3 3 0 01-4.8 0z',
    'M12 3.4a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z',
  ],
  // An open book beneath a fixed star.
  pale_academy: [
    'M2.6 10.4h8c.9 0 1.4.5 1.4 1.2v8.2c0-.7-.5-1.2-1.4-1.2h-8z',
    'M21.4 10.4h-8c-.9 0-1.4.5-1.4 1.2v8.2c0-.7.5-1.2 1.4-1.2h8z',
    'M12 2.2l1.3 2.9 3 .4-2.2 2.2.6 3-2.7-1.5-2.7 1.5.6-3L7.7 5.5l3-.4z',
  ],
  // Antlers.
  verdant_choir: [
    'M12 21.4V10.6',
    'M12 10.6L7.4 6',
    'M7.4 6L4.2 7.2',
    'M7.4 6L6.4 2.4',
    'M12 10.6L16.6 6',
    'M16.6 6l3.2 1.2',
    'M16.6 6l1-3.6',
    'M9.6 14.6l-3 1.2',
    'M14.4 14.6l3 1.2',
  ],
  // A crown over a shield.
  crownlands: [
    'M4.6 9.6h14.8v4.2c0 4-3.2 6.6-7.4 8-4.2-1.4-7.4-4-7.4-8z',
    'M5.4 7.4l-1-4.4 3.6 2.4L12 1.6l4 3.8 3.6-2.4-1 4.4z',
    'M12 12v4',
  ],
  // A coiled worm.
  worm_below: [
    'M12 21.6c-4.4 0-6.4-3-6.4-6 0-2.6 1.8-4.6 4.2-4.6 2 0 3.4 1.4 3.4 3.2 0 1.4-1 2.4-2.2 2.4-1 0-1.8-.7-1.8-1.6',
    'M12 21.6c4.6 0 8-3.6 8-8.4S16.4 2.4 12 2.4',
    'M12 2.4c-2 0-3.6.8-4.8 2',
    'M14.8 6.4l1.8-1.2',
    'M15.8 9.2l2.2-.4',
  ],
};

export function FactionGlyph({ id, size = 22, className }: GlyphProps & { id: FactionId }) {
  return (
    <svg {...BASE} width={size} height={size} className={className} strokeWidth={1.25}>
      {FACTION_PATHS[id].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Ending marks
// ---------------------------------------------------------------------------

const ENDING_PATHS: Record<EndingId, string[]> = {
  slain_by_chosen_one: [
    'M12 1.8v14.4',
    'M8.4 16.2h7.2',
    'M12 16.2v5.6',
    'M9.4 21.8h5.2',
    'M12 1.8l2 3.4v11H10v-11z',
  ],
  sealed_in_gem: [
    'M7.4 3.4h9.2l4.4 6-9 11.2-9-11.2z',
    'M3 9.4h18',
    'M7.4 3.4L12 9.4l4.6-6',
    'M12 9.4v11.2',
  ],
  betrayed_by_apprentice: [
    'M8.6 9.6a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8z',
    'M2.6 21.2c0-3.6 2.6-6.2 6-6.2 1.6 0 3 .6 4.1 1.5',
    'M17.6 4.2l3.2 3.2-8 8-3.2-3.2z',
    'M9.6 12.2l-2.2 5.4 5.4-2.2',
  ],
  lichdom: [
    'M6 13.6a6 6 0 1112 0v3.2a2 2 0 01-2 2H8a2 2 0 01-2-2z',
    'M9.6 13.2a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    'M14.4 13.2a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    'M9.4 18.8v2.6',
    'M14.6 18.8v2.6',
    'M5.6 7.6L4.8 2.6l3.4 2.2L12 1.4l3.8 3.4 3.4-2.2-.8 5',
  ],
  retired_to_swamp: [
    'M2.4 17.4c2-1.4 3.4-1.4 5.4 0s3.4 1.4 5.4 0 3.4-1.4 5.4 0c1 .7 1.9 1 2.9.9',
    'M2.4 21c2-1.4 3.4-1.4 5.4 0s3.4 1.4 5.4 0 3.4-1.4 5.4 0c1 .7 1.9 1 2.9.9',
    'M7 14.6c0-5.4.8-8.6 2.4-11',
    'M12.6 14.6c0-4 .6-6.6 1.8-8.4',
    'M17.4 14.6c0-3 .4-5 1.4-6.6',
  ],
  consumed_by_pact: [
    'M12 21.8a9.8 9.8 0 100-19.6 9.8 9.8 0 000 19.6z',
    'M8.2 17.6c0-2.4.6-3.6 1.4-4.8',
    'M12 18.2V9.6',
    'M15.8 17.6c0-2.4-.6-3.6-1.4-4.8',
    'M8.2 12.8c-1.2-1.4-1.6-2.8-1.4-4.4 1.8.6 3 1.6 3.8 3',
    'M15.8 12.8c1.2-1.4 1.6-2.8 1.4-4.4-1.8.6-3 1.6-3.8 3',
  ],
  ascension: [
    'M12 2.2l2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z',
    'M12 19.4v2.6',
    'M4.6 15.4l-1.8 1.8',
    'M19.4 15.4l1.8 1.8',
    'M2 11.4H.4',
    'M22 11.4h1.6',
  ],
  // A crate with a flame in it: stock, not a person.
  eternally_repurposed: [
    'M4.4 8.8h15.2v11.6H4.4z',
    'M4.4 12.4h15.2',
    'M9.2 8.8V6.4a2.8 2.8 0 015.6 0v2.4',
    'M12 19a2.1 2.1 0 002.1-2.1c0-1.7-2.1-2.4-2.1-4.5 0 2.1-2.1 2.8-2.1 4.5A2.1 2.1 0 0012 19z',
  ],
  // An auctioneer's hammer, and the last coin off the table.
  liquidated: [
    'M13.6 2.8l7.4 7.4-2.9 2.9-7.4-7.4z',
    'M11.5 9.5L3.4 17.6',
    'M2 21.4h9.8',
    'M17.6 20.4a2.7 2.7 0 100-5.4 2.7 2.7 0 000 5.4z',
  ],
  // A sprout out of a mound, and the furrows either side of it.
  turned_to_fertilizer: [
    'M2.6 17.6h18.8',
    'M5.2 17.6c0-3.5 3-6.2 6.8-6.2s6.8 2.7 6.8 6.2',
    'M12 11.4V4.4',
    'M12 8.4c0-1.9 1.5-3.3 3.5-3.5-.2 2-1.6 3.5-3.5 3.5z',
    'M12 10c0-1.9-1.5-3.3-3.5-3.5.2 2 1.6 3.5 3.5 3.5z',
    'M4.8 20.8h3.6',
    'M10.2 20.8h3.6',
    'M15.6 20.8h3.6',
  ],
  // A border post pointing outward, and the briar on the far side of it.
  exiled_and_overrun: [
    'M2.6 20.6h18.8',
    'M6.4 20.6V6.6',
    'M6.4 8.6h7.6l2.4 2.2-2.4 2.2H6.4',
    'M16.8 20.6c0-3.6 1.6-6 4.4-7',
    'M19.6 16.4c-1.7-.7-2.5-2-2.4-3.7 1.9.3 2.9 1.4 3.1 3.3z',
  ],
  // A quill over a folded contract: the terms, and the hand that writes them.
  contract_writer: [
    'M4.2 19.8h15.6',
    'M6.6 16.8V5.2h8.2l3 2.9v8.7z',
    'M9.2 8.4h5.4',
    'M9.2 11.4h5.4',
    'M17.6 3.4c-2 3.9-4.3 6.4-7 7.6l1.7 1.8c2.8-1.1 4.9-3.9 5.3-9.4z',
  ],
  // A balance at rest, with the beam locked level.
  grand_arbiter: [
    'M12 3.6v16.8',
    'M6.8 20.4h10.4',
    'M4 8.6h16',
    'M4 8.6L1.8 13.8a2.6 2.6 0 004.4 0z',
    'M20 8.6l2.2 5.2a2.6 2.6 0 01-4.4 0z',
    'M9 5.8h6',
  ],
  // A star held above an open book — the Academy's own mark, granted rather
  // than withheld.
  archmage: [
    'M3.2 12.4h7.2c.8 0 1.2.5 1.2 1.1v7.4c0-.6-.4-1.1-1.2-1.1H3.2z',
    'M20.8 12.4h-7.2c-.8 0-1.2.5-1.2 1.1v7.4c0-.6.4-1.1 1.2-1.1h7.2z',
    'M12 2.2l1.5 3.3 3.5.4-2.6 2.5.7 3.5L12 10.2 8.9 11.9l.7-3.5L7 5.9l3.5-.4z',
  ],
  // Antlers crowned with a leaf: the Choir's shape, worn.
  archdruid: [
    'M12 21.6V12.4',
    'M12 12.4L7.6 8',
    'M7.6 8L4.4 9.2',
    'M7.6 8L6.6 4.6',
    'M12 12.4L16.4 8',
    'M16.4 8l3.2 1.2',
    'M16.4 8l1-3.4',
    'M12 6.4c0-2.1 1.7-3.7 4-3.9-.2 2.3-1.9 3.9-4 3.9z',
    'M9.4 16.4l-3 1.2',
    'M14.6 16.4l3 1.2',
  ],
  // A crown resting on a toppled throne.
  overthrown_the_kingdom: [
    'M2.6 20.6h18.8',
    'M6.4 20.6l1.6-8.4h7.4l1.6 8.4',
    'M8.4 12.2V6.6',
    'M15.4 12.2V6.6',
    'M5.6 5.2l-1-3.6 3 2 2.4-3 2.4 3 3-2-1 3.6z',
  ],
  // A funnel of ground, seen from directly above.
  consumed: [
    'M12 21.4c-5 0-9-3.8-9-8.6S7 3.6 12.4 3.6s8.8 3.4 8.8 7.6-3 6.6-6.4 6.6-5.4-2.2-5.4-4.6 1.9-4 3.8-4 3 1.3 3 2.8',
    'M1.6 9.6l-1.4-1',
    'M22.6 15l1.4-1',
  ],
  // A sprouting seed cupped in an open hand: a small act, held out plainly.
  good_wizard: [
    'M4 15.4c0-3.4 2-6.6 5-8.2',
    'M20 15.4c0-3.4-2-6.6-5-8.2',
    'M4 15.4c1.6 4 4.6 6 8 6s6.4-2 8-6',
    'M12 15.4V9.6',
    'M12 9.6c0-2.4 1.9-4.2 4.2-4.4-.2 2.3-2 4.2-4.2 4.4z',
    'M12 9.6c0-2.4-1.9-4.2-4.2-4.4.2 2.3 2 4.2 4.2 4.4z',
  ],
};

export function EndingGlyph({ id, size = 30, className, locked }: GlyphProps & { id: EndingId }) {
  return (
    <svg {...BASE} width={size} height={size} className={className} strokeWidth={locked ? 1.9 : 1.3}>
      {ENDING_PATHS[id].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small ornament
// ---------------------------------------------------------------------------

/** Four corner ticks, absolutely positioned against the nearest ancestor. */
export function CornerMarks({ className, inset = 10, length = 13 }: { className?: string; inset?: number; length?: number }) {
  const corners = [
    { pos: { top: inset, left: inset }, rot: 0 },
    { pos: { top: inset, right: inset }, rot: 90 },
    { pos: { bottom: inset, right: inset }, rot: 180 },
    { pos: { bottom: inset, left: inset }, rot: 270 },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <svg
          key={i}
          className={className}
          width={length}
          height={length}
          viewBox="0 0 13 13"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          aria-hidden
          focusable="false"
          style={{ position: 'absolute', ...c.pos, transform: `rotate(${c.rot}deg)` }}
        >
          <path d="M0.5 6V0.5H6" />
        </svg>
      ))}
    </>
  );
}

/** A single hairline flourish: rule, diamond, rule. */
export function Flourish({ className, tone = 'quiet' }: { className?: string; tone?: 'quiet' | 'tier' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 8"
      width="120"
      height="8"
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M0 4h44" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <path d="M76 4h44" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <path
        d="M60 0.8l3.2 3.2L60 7.2 56.8 4z"
        stroke="currentColor"
        strokeWidth="1"
        fill={tone === 'tier' ? 'currentColor' : 'none'}
        fillOpacity={tone === 'tier' ? 0.55 : 0}
      />
      <path d="M50 4h3.2M66.8 4H70" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}
