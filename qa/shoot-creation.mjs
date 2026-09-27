// Creation screen, reference device, in two halves — the fold is the point.
import { chromium } from 'playwright';
const arg = (f, d) => { const i = process.argv.indexOf(f); return i !== -1 && process.argv[i+1] ? process.argv[i+1] : d; };
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));
const tag = arg('--tag', 'creation');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /begin a career/i }).click();
await p.waitForTimeout(300);
await p.getByRole('textbox').first().fill('Malachar the Unpaid');
await p.evaluate(() => document.fonts?.ready);
await p.waitForTimeout(600);
await p.screenshot({ path: `qa/screenshots/${tag}-top.png` });
await p.evaluate(() => scrollTo(0, innerHeight * 0.86));
await p.waitForTimeout(300);
await p.screenshot({ path: `qa/screenshots/${tag}-scrolled.png` });
await b.close();
