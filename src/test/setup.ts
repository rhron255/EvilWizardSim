import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no layout, so it implements no scrolling at all — `Element.scrollTo`
 * is simply absent, and calling it throws.
 *
 * The ledger pins itself to its newest row on every append (see `Ledger.tsx`),
 * which is behaviour worth keeping and impossible to assert without a viewport.
 * Stubbing it here keeps the gap in the ENVIRONMENT rather than pushing a
 * `typeof el.scrollTo === 'function'` guard into product code, where it would
 * read as defensiveness about a browser API that every browser has.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

/**
 * Same gap, same fix: `RunScreen` calls `scrollIntoView` on the tab strip so
 * switching between Decision and Career doesn't leave a player scrolled
 * mid-way into whichever panel comes up next. jsdom does not implement it
 * either.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
