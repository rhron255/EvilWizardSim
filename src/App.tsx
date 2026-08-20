/**
 * Placeholder shell.
 *
 * Replaced at integration with the real wiring: `useGame()` from the engine
 * driving the screens. Deliberately imports nothing outside `src/theme/` so
 * that `npm run typecheck` stays green while the engine, UI and content are
 * authored in parallel.
 */
export default function App() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        height: '100%',
        fontFamily: 'var(--ew-font-display)',
        color: 'var(--ew-ink-faint)',
        letterSpacing: '0.08em',
      }}
    >
      Evil Wizard Simulator
    </div>
  );
}
