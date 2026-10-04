// Types for `theme-ids.mjs`, so `src/theme/qaThemeIds.test.ts` can import the
// reader the probes use rather than a copy of it. qa/ is plain node and is
// never compiled; this file is only here for that one import.
export declare const THEMES_SOURCE: string;
export declare function parseThemeIds(source: string): string[];
export declare function parseThemeEndingIds(source: string): string[];
export declare function themeIds(): string[];
export declare function themeEndingIds(): string[];
