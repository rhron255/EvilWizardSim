import type { Offer } from '../../types';
import { ascentOffers } from './ascent';
import { declineOffers } from './decline';
import { anyOffers } from './any';
import { scriptedOffers } from './scripted';
import { concordatOffers } from './concordats';

export { ascentOffers, declineOffers, anyOffers, scriptedOffers, concordatOffers };

/** The whole choice-card catalog. Ids are unique across all five files. */
export const offers: Offer[] = [
  ...ascentOffers,
  ...declineOffers,
  ...anyOffers,
  ...scriptedOffers,
  ...concordatOffers,
];
