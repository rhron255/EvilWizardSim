/// <reference types="vite/client" />

// tsconfig.json pins `types` to the test globals, which suppresses the
// automatic pickup of `vite/client`. Without this reference every
// `import styles from './X.module.css'` fails to typecheck. Referencing the
// types (rather than re-declaring `declare module '*.module.css'`) keeps this
// idempotent: any other agent adding the same reference elsewhere is a no-op
// rather than a duplicate-identifier error.
