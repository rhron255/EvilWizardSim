import type { Offer } from '../../types';
import { ascentOffers } from './ascent';
import { declineOffers } from './decline';
import { anyOffers } from './any';
import { scriptedOffers } from './scripted';

export { ascentOffers, declineOffers, anyOffers, scriptedOffers };

/** The whole choice-card catalog. Ids are unique across all four files. */
export const offers: Offer[] = [
  ...ascentOffers,
  ...declineOffers,
  ...anyOffers,
  ...scriptedOffers,
];
