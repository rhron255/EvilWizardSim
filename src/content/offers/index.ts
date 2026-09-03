import type { Offer } from '../../types';
import { ascentOffers } from './ascent';
import { declineOffers } from './decline';
import { anyOffers } from './any';
import { scriptedOffers } from './scripted';
import { concordatOffers } from './concordats';
import { grievanceOffers } from './grievances';
import { favorOffers } from './favors';
import { pactOffers } from './pacts';
import { oathOffers } from './oaths';

export {
  ascentOffers,
  declineOffers,
  anyOffers,
  scriptedOffers,
  concordatOffers,
  grievanceOffers,
  favorOffers,
  pactOffers,
  oathOffers,
};

/** The whole choice-card catalog. Ids are unique across all nine files. */
export const offers: Offer[] = [
  ...ascentOffers,
  ...declineOffers,
  ...anyOffers,
  ...scriptedOffers,
  ...concordatOffers,
  ...grievanceOffers,
  ...favorOffers,
  ...pactOffers,
  ...oathOffers,
];
