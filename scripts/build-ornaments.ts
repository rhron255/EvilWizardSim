/**
 * Writes src/theme/ornaments.css from the drawings in src/theme/ornamentShapes.ts.
 *
 *   npm run ornaments
 *
 * The stylesheet is committed (the browser needs it before any script runs),
 * and `src/theme/ornaments.test.ts` regenerates it in memory and fails if the
 * committed copy has drifted — so a shape edited without running this does not
 * reach a player as the old shape.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderOrnamentsCss } from '../src/theme/ornamentShapes';
import { SHAPE_IDS } from '../src/theme/ornaments';

const out = resolve(process.cwd(), 'src/theme/ornaments.css');
writeFileSync(out, renderOrnamentsCss());
console.log(`wrote ${SHAPE_IDS.length} shapes to ${out}`);
