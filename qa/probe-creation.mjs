// Where the creation screen's height actually goes, at the reference device.
//
// "the initialization screen's starting options should be shorter" — but the
// screen is five sections and a footer, and eyeballing which one is the problem
// is how you end up trimming the wrong 40px. This prints the box of every
// section, plus the height of one origin card broken down by part.
import { chromium } from 'playwright';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const W = Number(arg('--width', '393'));
const H = Number(arg('--height', '852'));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.goto(arg('--url', 'http://localhost:5173'), { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /begin a career/i }).click();
await page.waitForTimeout(300);
await page.getByRole('textbox').first().fill('Malachar the Unpaid');
await page.evaluate(() => document.fonts?.ready);
await page.waitForTimeout(500);

const out = await page.evaluate(() => {
  const form = document.querySelector('form');
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top + scrollY), h: Math.round(r.height) };
  };
  const sections = [...form.children].map((el) => ({
    tag: el.tagName.toLowerCase(),
    label: (el.querySelector('legend, label, p')?.textContent ?? el.textContent ?? '')
      .trim()
      .slice(0, 34),
    ...box(el),
  }));
  const cards = [...form.querySelectorAll('label')].filter((l) =>
    l.querySelector('[class*="originInner"]'),
  );
  const first = cards[0];
  const parts = first
    ? [...first.querySelector('[class*="originInner"]').children].map((el) => ({
        cls: el.className.replace(/_[a-zA-Z0-9]+$/, '').split(' ')[0],
        h: Math.round(el.getBoundingClientRect().height),
        text: el.textContent.trim().slice(0, 40),
      }))
    : [];
  const commit = form.querySelector('button[type="submit"]');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    scrollHeight: document.documentElement.scrollHeight,
    screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(2),
    commitTop: Math.round(commit.getBoundingClientRect().top + scrollY),
    sections,
    originCards: cards.length,
    originCardHeight: first ? Math.round(first.getBoundingClientRect().height) : null,
    originCardParts: parts,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
