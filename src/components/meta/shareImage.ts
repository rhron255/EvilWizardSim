/**
 * The shareable object.
 *
 * Renders the ending card to a 1080×1350 PNG entirely client-side — no backend,
 * no html2canvas, no image assets. The card is redrawn on a canvas rather than
 * rasterised from the DOM, because DOM rasterisation is exactly the thing that
 * breaks on mobile Safari, and this screen is the one element the whole design
 * is betting on being shared.
 *
 * Degradation is deliberate and layered:
 *
 *   1. `navigator.share` with a file, when the platform supports it.
 *   2. Otherwise a download of the same PNG.
 *   3. If anything at all throws — no 2D context, tainted canvas, a Safari
 *      quirk, a blocked download — we return `{ ok: false }` and the caller
 *      shows a "screenshot this" affordance. Never an error dialog.
 */

import type { Artifact, Ending, Lair, RunState } from '../../types';
import { ink, surface, tierColor, tierFor } from '../../theme/tokens';
import { makeRng } from './hash';
import { buildSigilGeometry, sigilPoint, SIGIL_FIELD } from './sigilGeometry';
import { lairTenures, roman } from './tenure';

export type ShareResult =
  | { ok: true; method: 'share' | 'download' }
  | { ok: false; reason: 'unsupported' | 'failed' | 'cancelled' };

export type ShareEndingInput = {
  run: RunState;
  ending: Ending;
  lairs: Lair[];
  artifacts: Artifact[];
};

const W = 1080;
const H = 1350;
const MARGIN = 46;

const DISPLAY = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const UI = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---------------------------------------------------------------------------
// Text helpers — canvas `letterSpacing` is not universal, so tracking is manual
// ---------------------------------------------------------------------------

type TextOpts = {
  font: string;
  color: string;
  align?: 'left' | 'center' | 'right';
  /** Extra px between glyphs. */
  tracking?: number;
  alpha?: number;
};

function measure(ctx: CanvasRenderingContext2D, str: string, o: TextOpts): number {
  ctx.font = o.font;
  const base = ctx.measureText(str).width;
  return o.tracking ? base + o.tracking * Math.max(0, str.length - 1) : base;
}

function drawText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.textBaseline = 'alphabetic';

  const total = measure(ctx, str, o);
  let cursor = x;
  if (o.align === 'center') cursor = x - total / 2;
  else if (o.align === 'right') cursor = x - total;

  if (!o.tracking) {
    ctx.textAlign = 'left';
    ctx.fillText(str, cursor, y);
  } else {
    ctx.textAlign = 'left';
    for (const ch of str) {
      ctx.fillText(ch, cursor, y);
      cursor += ctx.measureText(ch).width + o.tracking;
    }
  }
  ctx.restore();
}

/** Shrink the font until the string fits, down to a floor. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  str: string,
  maxWidth: number,
  weight: string,
  startPx: number,
  minPx: number,
  family: string,
): string {
  let px = startPx;
  for (;;) {
    const font = `${weight} ${px}px ${family}`;
    ctx.font = font;
    if (ctx.measureText(str).width <= maxWidth || px <= minPx) return font;
    px -= 2;
  }
}

function wrap(ctx: CanvasRenderingContext2D, str: string, maxWidth: number, font: string): string[] {
  ctx.font = font;
  const words = str.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hairline(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, color: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y + 0.5);
  ctx.lineTo(x2, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Rule, diamond, rule. The same flourish the DOM card uses. */
function flourish(ctx: CanvasRenderingContext2D, cx: number, y: number, width: number, accent: string) {
  const half = width / 2;
  hairline(ctx, cx - half, y, cx - 16, surface.lineStrong, 0.9);
  hairline(ctx, cx + 16, y, cx + half, surface.lineStrong, 0.9);
  ctx.save();
  ctx.translate(cx, y + 0.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The sigil, on canvas
// ---------------------------------------------------------------------------

function drawSigil(ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, diameter: number, accent: string) {
  const g = buildSigilGeometry(name);
  const s = diameter / SIGIL_FIELD;

  ctx.save();
  ctx.translate(cx - diameter / 2, cy - diameter / 2);
  ctx.scale(s, s);
  ctx.lineWidth = 1 / s;

  const ring = (r: number, color: string, dash?: [number, number], alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.setLineDash(dash ?? []);
    ctx.beginPath();
    ctx.arc(100, 100, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  ring(95, surface.lineStrong);
  ring(88, surface.lineStrong, g.dashOuter, 0.85);
  ring(68, surface.line);
  ring(62, ink.ghost, g.dashInner, 0.8);
  ring(34, surface.lineStrong);

  // Rim arcs in the accent.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.4 / s;
  for (const arc of g.arcs) {
    const from = ((arc.start - 90) * Math.PI) / 180;
    const to = ((arc.start + arc.sweep - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(100, 100, arc.radius, from, to);
    ctx.stroke();
  }
  ctx.restore();

  // Ticks.
  ctx.save();
  ctx.strokeStyle = ink.ghost;
  ctx.beginPath();
  for (const t of g.ticks) {
    ctx.moveTo(t.inner.x, t.inner.y);
    ctx.lineTo(t.outer.x, t.outer.y);
  }
  ctx.stroke();
  ctx.restore();

  // The star figure.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 1.5 / s;
  ctx.beginPath();
  for (const e of g.starEdges) {
    ctx.moveTo(e.a.x, e.a.y);
    ctx.lineTo(e.b.x, e.b.y);
  }
  ctx.stroke();
  ctx.restore();

  // Vertex nodes.
  ctx.save();
  ctx.fillStyle = accent;
  g.nodes.forEach((n, i) => {
    ctx.globalAlpha = i % 2 === 0 ? 0.95 : 0.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Inner polygon.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1.2 / s;
  ctx.beginPath();
  g.innerPolygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Centre.
  ctx.save();
  ctx.strokeStyle = ink.dim;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.1 / s;
  ctx.beginPath();
  for (const m of g.centreMarks) {
    ctx.moveTo(m.a.x, m.a.y);
    ctx.lineTo(m.b.x, m.b.y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(100, 100, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // Keep the reference to sigilPoint meaningful for future ornament work.
  void sigilPoint;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

function paintCard(ctx: CanvasRenderingContext2D, input: ShareEndingInput) {
  const { run, ending, lairs, artifacts } = input;
  const peak = run.eras.reduce((m, e) => Math.max(m, e.notoriety), run.notoriety);
  const tier = tierFor(peak);
  const accent = tierColor[tier.id];
  const cx = W / 2;
  const inner = W - MARGIN * 2 - 44;

  // --- ground ---
  ctx.fillStyle = surface.void;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(cx, 250, 0, cx, 250, 720);
  glow.addColorStop(0, hexWithAlpha(accent, 0.1));
  glow.addColorStop(1, hexWithAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const vign = ctx.createRadialGradient(cx, H * 0.42, H * 0.2, cx, H * 0.42, H * 0.78);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Grain, seeded from the run so the same run always exports the same image.
  const rng = makeRng(run.seed >>> 0);
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    ctx.globalAlpha = 0.02 + rng() * 0.035;
    ctx.fillStyle = rng() > 0.5 ? ink.bright : '#000000';
    ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * H), 1, 1);
  }
  ctx.restore();

  // --- frame ---
  ctx.strokeStyle = surface.lineStrong;
  ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN + 0.5, MARGIN + 0.5, W - MARGIN * 2 - 1, H - MARGIN * 2 - 1);
  ctx.strokeStyle = surface.line;
  ctx.strokeRect(MARGIN + 10.5, MARGIN + 10.5, W - MARGIN * 2 - 21, H - MARGIN * 2 - 21);

  // Corner ticks.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.6;
  const t = 18;
  const corners: [number, number, number, number][] = [
    [MARGIN, MARGIN, 1, 1],
    [W - MARGIN, MARGIN, -1, 1],
    [W - MARGIN, H - MARGIN, -1, -1],
    [MARGIN, H - MARGIN, 1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * t, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * t);
    ctx.stroke();
  }
  ctx.restore();

  // --- header ---
  let y = MARGIN + 66;
  drawText(ctx, 'EVIL WIZARD SIMULATOR', cx, y, {
    font: `600 15px ${UI}`,
    color: ink.faint,
    align: 'center',
    tracking: 6,
  });

  // --- sigil ---
  drawSigil(ctx, run.wizardName, cx, y + 150, 214, accent);
  y += 292;

  // --- identity ---
  const nameFont = fitFont(ctx, run.wizardName, inner - 40, '600', 82, 40, DISPLAY);
  drawText(ctx, run.wizardName, cx, y, { font: nameFont, color: ink.bright, align: 'center' });
  y += 46;

  if (run.epithet) {
    drawText(ctx, run.epithet, cx, y, {
      font: `italic 400 34px ${DISPLAY}`,
      color: ink.dim,
      align: 'center',
    });
    y += 34;
  }

  flourish(ctx, cx, y, 320, accent);
  y += 40;

  drawText(
    ctx,
    `AGED ${20} TO ${run.age}  ·  ${run.eras.length} ERAS  ·  ${tier.name.toUpperCase()}`,
    cx,
    y,
    { font: `600 14px ${UI}`, color: ink.faint, align: 'center', tracking: 4.5 },
  );
  y += 62;

  // --- the ending ---
  const endingFont = fitFont(ctx, ending.name, inner - 60, '600', 52, 30, DISPLAY);
  drawText(ctx, ending.name, cx, y, { font: endingFont, color: ink.bright, align: 'center' });
  y += 40;

  const narrationFont = `italic 400 25px ${DISPLAY}`;
  const narrationLines = wrap(ctx, ending.narration, inner - 120, narrationFont).slice(0, 5);
  for (const line of narrationLines) {
    drawText(ctx, line, cx, y, { font: narrationFont, color: ink.dim, align: 'center' });
    y += 34;
  }
  y += 26;

  // --- lifetime totals ---
  const boxX = MARGIN + 34;
  const boxW = W - (MARGIN + 34) * 2;
  const cells: [string, string][] = [
    ['PEAK NOTORIETY', String(peak)],
    ['FOLLOWERS', run.followers.toLocaleString('en-US')],
    ['LAIRS', String(new Set(run.eras.map((e) => e.lairId)).size)],
    ['RELICS', String(run.heldArtifactIds.length)],
  ];
  const cellW = boxW / cells.length;
  const boxH = 104;

  ctx.strokeStyle = surface.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, y + 0.5, boxW - 1, boxH - 1);
  cells.forEach(([label, value], i) => {
    const x = boxX + cellW * i;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, y);
      ctx.lineTo(Math.round(x) + 0.5, y + boxH);
      ctx.stroke();
    }
    drawText(ctx, label, x + cellW / 2, y + 32, {
      font: `600 11px ${UI}`,
      color: ink.faint,
      align: 'center',
      tracking: 2.6,
    });
    drawText(ctx, value, x + cellW / 2, y + 78, {
      font: `600 40px ${DISPLAY}`,
      color: i === 0 ? accent : ink.bright,
      align: 'center',
    });
  });
  y += boxH + 46;

  // --- lairs held ---
  const tenures = lairTenures(run, lairs).slice(0, 8);
  drawText(ctx, 'LAIRS HELD', boxX, y, { font: `600 12px ${UI}`, color: ink.faint, tracking: 3.4 });
  hairline(ctx, boxX + 120, y - 4, boxX + boxW, surface.line);
  y += 26;

  const colW = boxW / 2;
  const rowH = 46;
  tenures.forEach((tn, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = boxX + col * colW;
    const ry = y + row * rowH;

    ctx.strokeStyle = surface.line;
    ctx.strokeRect(x + 0.5, ry + 0.5, colW - 14, rowH - 10);

    drawText(ctx, roman(tn.lair.tier + 1), x + 16, ry + 25, {
      font: `600 13px ${UI}`,
      color: tn.last ? accent : ink.faint,
      tracking: 1.5,
    });
    const lairFont = fitFont(ctx, tn.lair.name, colW - 150, '600', 24, 15, DISPLAY);
    drawText(ctx, tn.lair.name, x + 62, ry + 26, { font: lairFont, color: ink.bright });
    drawText(ctx, `${tn.fromAge}–${tn.toAge}`, x + colW - 26, ry + 25, {
      font: `500 13px ${UI}`,
      color: ink.faint,
      align: 'right',
    });
  });
  y += Math.ceil(tenures.length / 2) * rowH + 22;

  // --- relics ---
  const held = run.heldArtifactIds
    .map((id) => artifacts.find((a) => a.id === id))
    .filter((a): a is Artifact => Boolean(a));

  drawText(ctx, 'RELICS RECOVERED', boxX, y, { font: `600 12px ${UI}`, color: ink.faint, tracking: 3.4 });
  hairline(ctx, boxX + 178, y - 4, boxX + boxW, surface.line);
  y += 28;

  if (held.length === 0) {
    drawText(ctx, 'None. Not one, in a whole life.', boxX, y, {
      font: `italic 400 22px ${DISPLAY}`,
      color: ink.faint,
    });
    y += 30;
  } else {
    const relicFont = `500 21px ${DISPLAY}`;
    const relicLines = wrap(ctx, held.map((a) => a.name).join('   ·   '), boxW, relicFont).slice(0, 3);
    for (const line of relicLines) {
      drawText(ctx, line, boxX, y, { font: relicFont, color: ink.base });
      y += 29;
    }
  }

  // --- footer ---
  const footY = H - MARGIN - 40;
  hairline(ctx, boxX, footY - 24, boxX + boxW, surface.line, 0.8);
  drawText(ctx, tier.line, boxX, footY, { font: `italic 400 20px ${DISPLAY}`, color: ink.faint });
  drawText(ctx, 'evil-wizard-simulator', boxX + boxW, footY, {
    font: `600 12px ${UI}`,
    color: ink.ghost,
    align: 'right',
    tracking: 2.6,
  });
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

/** Cheap synchronous capability probe. Never throws. */
export function canRenderShareImage(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas');
    return typeof c.toBlob === 'function' && Boolean(c.getContext('2d'));
  } catch {
    return false;
  }
}

/**
 * Warm the display/UI faces so the canvas draw is not the first thing that
 * needs them. Call on mount; the share tap then stays inside the user gesture,
 * which is what mobile Safari cares about.
 */
export async function preloadShareFonts(): Promise<void> {
  try {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) return;
    await Promise.all([
      fonts.load(`600 82px ${DISPLAY}`),
      fonts.load(`italic 400 34px ${DISPLAY}`),
      fonts.load(`600 15px ${UI}`),
    ]);
    await fonts.ready;
  } catch {
    // Fallback faces are perfectly legible; nothing to do.
  }
}

/** Render the ending card to a PNG blob. Resolves `null` on any failure. */
export async function renderEndingImage(input: ShareEndingInput): Promise<Blob | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await preloadShareFonts();
    paintCard(ctx, input);

    return await new Promise<Blob | null>((resolve) => {
      // Some engines never call back on a bad state; do not hang the button.
      const timer = setTimeout(() => resolve(null), 6000);
      canvas.toBlob(
        (blob) => {
          clearTimeout(timer);
          resolve(blob);
        },
        'image/png',
        0.98,
      );
    });
  } catch {
    return null;
  }
}

function fileNameFor(run: RunState): string {
  const slug =
    run.wizardName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'wizard';
  return `${slug}-evil-wizard.png`;
}

/**
 * Produce the share image and hand it to the platform.
 *
 * Returns a result rather than throwing so the ending screen can swap in the
 * "screenshot this card" affordance instead of showing the player an error.
 */
export async function shareEndingImage(input: ShareEndingInput): Promise<ShareResult> {
  if (!canRenderShareImage()) return { ok: false, reason: 'unsupported' };

  const blob = await renderEndingImage(input);
  if (!blob) return { ok: false, reason: 'failed' };

  const fileName = fileNameFor(input.run);
  const title = `${input.run.wizardName} ${input.run.epithet}`.trim();
  const text = `${input.ending.name} — aged ${input.run.age}, after ${input.run.eras.length} eras.`;

  // 1. Native share sheet with the file attached.
  try {
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title, text });
      return { ok: true, method: 'share' };
    }
  } catch (err) {
    // A user dismissing the sheet is a success, not a fallback case.
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, reason: 'cancelled' };
    }
  }

  // 2. Download.
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { ok: true, method: 'download' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
