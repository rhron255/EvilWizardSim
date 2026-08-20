/**
 * Content barrel.
 *
 * The fixed recurring cast (factions, artifacts, lairs, origins, endings,
 * epithets) is authored in the sibling modules below. Offers live in
 * `./offers` and are owned separately.
 */

export { factions } from './factions';
export { artifacts } from './artifacts';
export { lairs } from './lairs';
export { origins } from './origins';
export { endings } from './endings';
export { epithets, CREATION_EPITHETS } from './epithets';
export type { Epithet } from './epithets';

export { offers } from './offers';
