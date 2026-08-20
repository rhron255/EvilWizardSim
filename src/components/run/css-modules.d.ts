/**
 * Ambient types for Vite's asset imports (`*.module.css`, `?url`, `import.meta.env`).
 *
 * This is a triple-slash reference rather than a hand-written `declare module`
 * precisely so it cannot collide: if the orchestrator later adds the canonical
 * `src/vite-env.d.ts` with the same reference, TypeScript loads `vite/client`
 * once and nothing is redeclared. Delete this file at that point.
 */

/// <reference types="vite/client" />
