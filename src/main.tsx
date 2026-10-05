import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/ornaments.css';
import './theme/tokens.css';
// The shared primitives every screen composes, loaded before any screen can
// be. A screen class that composes `.btn` or `.plateDoubleFrame` and then
// overrides one of its properties wins only by coming later in the cascade at
// equal specificity. Left to the module graph, craft is reached only through
// `composes:`, and the production build placed it AFTER every screen module —
// so every such override (the Prophecy's continue height, the ending card's
// phone frame, the wordmark's size) lost in production and won in dev.
// Importing it here, ahead of App, puts it first in both. cascade.test.ts holds
// the order of these three imports, and the built CSS's.
import './components/meta/craft.module.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
