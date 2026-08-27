import type { Offer } from '../../types';
import { ascentOffers } from './ascent';
import { declineOffers } from './decline';
import { anyOffers } from './any';
import { scriptedOffers } from './scripted';
import { concordatOffers } from './concordats';
import { favorOffers } from './favors';

export { ascentOffers, declineOffers, anyOffers, scriptedOffers, concordatOffers, favorOffers };

/** The whole choice-card catalog. Ids are unique across all six files. */
export const offers: Offer[] = [
  ...ascentOffers,
  ...declineOffers,
  ...anyOffers,
  ...scriptedOffers,
  ...concordatOffers,
  ...favorOffers,
];
