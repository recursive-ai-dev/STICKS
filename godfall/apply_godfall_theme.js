#!/usr/bin/env node
/**
 * apply_godfall_theme.js
 * Lightweight post-processor: tints and overlays generated PNGs to match Godfall visual themes.
 * Converted to ESM for consistency.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';

/**
 * Utility to get command line arguments.
 * @param {string} name
 * @param {string} def
 * @returns {string}
 */
function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1];
  return def;
}

const INPUT = path.resolve(getArg('in', './'));
const OUTPUT = path.resolve(getArg('out', './godfall_out'));
const THEME = getArg('theme', 'divine_corruption');
const ALPHA = parseFloat(getArg('alpha', '0.25'));

const THEMES = {
  divine_corruption: { tint: '#ff6b6b', overlay: '#2a0a0a' },
  neural_forest: { tint: '#50fa7b', overlay: '#0b2a1a' },
  osseous_citadel: { tint: '#f8f8f2', overlay: '#2b1f1a' }
};

if (!fs.existsSync(INPUT)) {
  console.error('[GodfallTheme] Input directory not found:', INPUT);
  process.exit(1);
}
if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

const theme = THEMES[THEME] || THEMES.divine_corruption;

/**
 * Recursively lists all PNG files in a directory.
 * @param {string} dir
 * @returns {Array<string>}
 */
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

/**
 * Processes a single PNG file applying the theme.
 * @param {string} file
 */
async function processFile(file) {
  try {
    const img = await loadImage(file);
    const w = img.width;
    const h = img.height;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Apply tint using multiply blend
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = theme.tint;
    ctx.globalAlpha = ALPHA;
    ctx.fillRect(0, 0, w, h);

    // Soft overlay to darken edges / add mood
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = theme.overlay;
    ctx.fillRect(0, 0, w, h);

    // Reset and save
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const rel = path.relative(INPUT, file);
    const outPath = path.join(OUTPUT, rel);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buf);
    console.log(`[GodfallTheme] Processed: ${rel}`);
  } catch (err) {
    console.error(`[GodfallTheme] Failed to process ${file}:`, err.message);
  }
}

(async () => {
  const files = listPngFiles(INPUT);
  if (files.length === 0) {
    console.log('[GodfallTheme] No PNG files found in', INPUT);
    process.exit(0);
  }
  for (const f of files) {
    await processFile(f);
  }
  console.log(`\n[GodfallTheme] Done. Themed assets written to ${OUTPUT}`);
})();
