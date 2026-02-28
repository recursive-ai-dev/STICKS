// make_apngs.js
// Create APNGs per object+direction from frames named like:
//   {id}_{direction}_{frame}.png
// Example: 1_right_0.png, 1_right_1.png, ... -> 1_right.png (APNG)

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const UPNG = require("upng-js");

// Simple CLI arg parsing
function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

const INPUT_DIR = path.resolve(getArg("in", "./cowboy_environment"));
const OUTPUT_DIR = path.resolve(getArg("out", "./cowboy_apng"));
const FPS = parseFloat(getArg("fps", "8")); // frames per second
const LOOP = parseInt(getArg("loop", "0"), 10); // 0 = infinite, UPNG default
const EXT = getArg("ext", "png"); // output extension: png or apng (both okay)

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`Input directory not found: ${INPUT_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Match: campfire_0_0.png
const FRAME_RE =
  /^([a-zA-Z_]+)_(\d+)_(\d+)\.(?:png|PNG|apng|APNG)$/;

function groupFrames(dir) {
  const files = fs.readdirSync(dir).filter((f) => FRAME_RE.test(f));
  const map = new Map(); // key: `${name}_${variation}` -> [{idx, file}]
  for (const f of files) {
    const m = f.match(FRAME_RE);
    if (!m) continue;
    const name = m[1];
    const variation = m[2];
    const frame = parseInt(m[3], 10);
    const key = `${name}_${variation}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ idx: frame, file: path.join(dir, f) });
  }
  // Sort frames
  for (const [, arr] of map) {
    arr.sort((a, b) => a.idx - b.idx);
  }
  return map;
}

async function framesToAPNG(frames, outFile) {
  if (frames.length === 0) return false;

  // Load first to get size
  const first = await loadImage(frames[0].file);
  const w = first.width;
  const h = first.height;

  // Prepare RGBA buffers from each frame
  const rgbaFrames = [];
  for (const fr of frames) {
    const img = await loadImage(fr.file);
    if (img.width !== w || img.height !== h) {
      throw new Error(
        `Inconsistent frame size in ${outFile}: expected ${w}x${h}, got ${img.width}x${img.height} (${fr.file})`
      );
    }
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    rgbaFrames.push(imgData.data.buffer);
  }

  // Delays in ms (APNG uses per-frame delays)
  const delayMs = Math.max(1, Math.round(1000 / FPS));
  const delays = new Array(rgbaFrames.length).fill(delayMs);

  // Encode APNG (color depth 0 lets UPNG decide; you can set 8 if you want)
  const apng = UPNG.encode(rgbaFrames, w, h, 0, delays);

  // Optional: set loop count (UPNG sets infinite by default; loop is supported via setPLTE?)
// Note: UPNG doesn't expose a direct loop setter. It encodes infinite loop by default,
// which is what most game engines/UI expect for animated sprites.
// If you need a finite loop count, consider 'apng' npm package or a post-process tool.

  fs.writeFileSync(outFile, Buffer.from(apng));
  return true;
}

(async () => {
  const groups = groupFrames(INPUT_DIR);
  if (groups.size === 0) {
    console.log("No matching frames found. Expected files like campfire_0_0.png");
    process.exit(0);
  }

  let made = 0;
  let sequences = 0;
  for (const [key, frames] of groups) {
    if (frames.length > 1) {
      sequences++;
      const outFile = path.join(OUTPUT_DIR, `${key}.${EXT}`);
      try {
        await framesToAPNG(frames, outFile);
        made++;
        console.log(`✅ Wrote ${path.basename(outFile)} (${frames.length} frames)`);
      } catch (err) {
        console.error(`❌ Failed ${key}: ${err.message}`);
      }
    }
  }

  console.log(
    `
Done. Created ${made} APNG(s) from ${sequences} sequence(s) at ${FPS} fps.`
  );
})();
