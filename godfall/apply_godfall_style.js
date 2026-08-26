#!/usr/bin/env node
/**
 * apply_godfall_style.js
 * Enhanced Godfall post-processor: composes procedural overlays (auras, bone masks,
 * class accessories, corruption veins) onto existing sprites.
 * Converted to ESM for consistency.
 *
 * RESTORED: Class-specific visual accessories and robust identity mapping.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1];
  return def;
}

const INPUT = path.resolve(getArg('in', './'));
const OUTPUT = path.resolve(getArg('out', './godfall_styled'));
const THEME = getArg('theme', 'divine_corruption');
const AUTO = getArg('auto', 'true') === 'true';
const MANIFEST = getArg('manifest', null);
const AURA_ALPHA_INNER = parseFloat(getArg('auraAlphaInner', '0.75'));
const AURA_ALPHA_MID = parseFloat(getArg('auraAlphaMid', '0.18'));
const VEIN_ALPHA = parseFloat(getArg('veinAlpha', '0.9'));
const VEIN_COUNT = parseInt(getArg('veinCount', '3'), 10);
const BONE_ALPHA = parseFloat(getArg('boneAlpha', '0.95'));
const MADNESS_THRESHOLD = parseInt(getArg('madnessThreshold', '55'), 10);

const THEMES = {
  divine_corruption: { aura: '#ff6b6b', bone: '#f8f8f2', shadow: '#2a0a0a' },
  neural_forest: { aura: '#50fa7b', bone: '#e6fef0', shadow: '#07210f' },
  osseous_citadel: { aura: '#f8f8f2', bone: '#fffaf0', shadow: '#211511' }
};

if (!fs.existsSync(INPUT)) {
  console.error('[GodfallStyle] Input directory not found:', INPUT);
  process.exit(1);
}
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

let manifestData = null;
if (MANIFEST) {
  try {
    manifestData = JSON.parse(fs.readFileSync(path.resolve(MANIFEST), 'utf8'));
  } catch (e) {
    console.warn('[GodfallStyle] Failed to load manifest:', e.message);
  }
}

function listPngFiles(dir) {
  const out = [];
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listPngFiles(full));
    else if (/\.(png|PNG)$/.test(e.name)) out.push(full);
  }
  return out;
}

function seededRng(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

async function styleSprite(file) {
  try {
    const img = await loadImage(file);
    const w = img.width;
    const h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    const base = path.basename(file);
    const idMatch = base.match(/^(\d+)|([a-zA-Z_]+)/);
    const idKey = idMatch ? idMatch[0] : base;
    let identity = manifestData && manifestData[idKey] ? manifestData[idKey] : null;

    const seed = idKey.split('').reduce((s,c)=>s + c.charCodeAt(0), 0);
    const rng = seededRng(seed);
    if (!identity && AUTO) {
      const races = ['wyrmborn','marrowkin','wasted','nomad','stygian','harrowed','bornless','untethered'];
      const classes = ['harvester','communion','stabilizer','wanderer','purifier','shaman','scavenger','sentinel','anchorer','marrowwright','seer','flayer'];
      identity = { race: pick(rng, races), class: pick(rng, classes), madness: Math.floor(rng()*100) };
    }

    const theme = THEMES[THEME] || THEMES.divine_corruption;

    // Draw aura
    const gx = w/2, gy = h/2 - 6;
    const rad = Math.max(w,h) * 0.7;
    const g = ctx.createRadialGradient(gx, gy, rad*0.05, gx, gy, rad);
    g.addColorStop(0, hexToRgba(theme.aura, AURA_ALPHA_INNER));
    g.addColorStop(0.5, hexToRgba(theme.aura, AURA_ALPHA_MID));
    g.addColorStop(1, hexToRgba(theme.shadow, 0.0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation = 'source-over';

    if (identity?.race?.includes('marrow')) {
      drawBoneMask(ctx, w, h, theme.bone, BONE_ALPHA);
    }

    if (identity?.madness > MADNESS_THRESHOLD) {
      drawVeins(ctx, w, h, theme.aura, rng, VEIN_COUNT, VEIN_ALPHA);
    }

    if (identity?.class) {
      drawAccessory(ctx, w, h, identity.class, theme.aura, rng);
    }

    // Save
    const rel = path.relative(INPUT, file);
    const outPath = path.join(OUTPUT, rel);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    canvas.width = 0;
    canvas.height = 0;
    console.log(`[GodfallStyle] Styled: ${rel}`);
  } catch (err) {
    console.error(`[GodfallStyle] Failed to style ${file}:`, err.message);
  }
}

function hexToRgba(hex, a) {
  const c = hex.replace('#','');
  const bigint = parseInt(c,16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function drawBoneMask(ctx, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const cx = w/2;
  const headY = h*0.28;
  ctx.beginPath();
  ctx.ellipse(cx, headY, w*0.18, h*0.12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawVeins(ctx, w, h, color, rng, count = 3, alpha = 0.9) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1, Math.floor(Math.min(w,h)/60));
  for (let i=0;i<count;i++) {
    const startX = Math.floor(rng()*w*0.6 + w*0.2);
    const startY = Math.floor(rng()*h*0.6 + h*0.2);
    ctx.beginPath(); ctx.moveTo(startX,startY);
    const seg = 4 + Math.floor(rng()*3);
    for (let s=0;s<seg;s++) {
      const nx = startX + (rng()-0.5)*w*0.25;
      const ny = startY + (rng()-0.5)*h*0.25;
      ctx.quadraticCurveTo((startX+nx)/2, (startY+ny)/2, nx, ny);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws class-specific accessories.
 */
function drawAccessory(ctx, w, h, cls, color, rng) {
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#201814';
  const cx = w/2;
  const cy = h*0.62;

  switch(cls) {
    case 'harvester':
        // Scythe-like shard
        ctx.beginPath();
        ctx.moveTo(cx+10, cy-15); ctx.lineTo(cx+15, cy-25); ctx.lineTo(cx+5, cy-10);
        ctx.fill(); ctx.stroke();
        break;
    case 'shaman':
        // Ritual mask/third eye
        ctx.beginPath();
        ctx.arc(cx, h*0.22, 4, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        break;
    case 'purifier':
        // Holy ring
        ctx.beginPath();
        ctx.arc(cx, h*0.18, 12, 0, Math.PI*2);
        ctx.stroke();
        break;
    case 'scavenger':
        // Shoulder scrap
        ctx.fillRect(cx-14, h*0.4, 8, 4);
        break;
    default:
        // Generic Godfall shard
        ctx.beginPath();
        ctx.moveTo(cx, cy-8); ctx.lineTo(cx+6, cy); ctx.lineTo(cx, cy+8); ctx.lineTo(cx-6, cy);
        ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

(async () => {
  const files = listPngFiles(INPUT);
  if (files.length === 0) { console.log('[GodfallStyle] No PNG files found in', INPUT); process.exit(0); }
  for (const f of files) {
    await styleSprite(f);
  }
  console.log(`\n[GodfallStyle] Done. Styled assets written to ${OUTPUT}`);
})();
