import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/ornaments.css';
import './theme/tokens.css';
// The shared primitives every screen composes, loaded before any screen can
// be. A screen class that composes `.btn` or `.plateDoubleFrame` and then
// overrides one of its properties wins only by coming later in the cascade at
// equal specificity. This is the one copy of craft in the app: `composes:` no
// longer pastes it into every module that composes from it (that is what put
// it AFTER the screens in the production build — see
// scripts/composesLoader.ts). After tokens.css, whose properties it reads;
// before App, so before every screen module App reaches, in dev and in the
// build alike. cascade.test.ts holds this order; cssOrder.test.ts reads it
// off a real build.
import './components/meta/craft.module.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
