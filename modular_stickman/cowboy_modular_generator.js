// cowboy_modular_generator.js
// Enhanced version with modular animation system
// Run: node cowboy_modular_generator.js

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { loadAnimation } from "./animations.js";
import { 
    applyAnimationFrame
} from "./animation_renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------
// Config
// ----------------------------------------------------
const SPRITE_SIZE = 100; // logical pixels per frame
const SCALE = 1; // set to 2 for high-DPI then downscale in engine if desired
const SIZE = SPRITE_SIZE * SCALE;

const OUTPUT_DIR = path.join(__dirname, "cowboy_sprites");
const SHEET_DIR = path.join(OUTPUT_DIR, "sheets");

const DIRECTIONS = ["right", "left", "front", "back"];
const FRAME_COUNT = 6; // smoother walk
const LINE_WIDTH = 2 * SCALE;

const ENABLE_SPRITE_SHEETS = true;

// Available animations
const ANIMATIONS = ["walk", "shoot", "bar_fight", "jump", "wave", "moonwalk"];

// ----------------------------------------------------
// Characters (your originals)
// ----------------------------------------------------
const sillyCowboys = [
  { id: 1, hat: "cowboy", bandana: true, type: "cowboy" },
  { id: 2, hat: "cowboy", bandana: false, type: "cowboy" },
  { id: 3, hat: "cowboy", bandana: true, type: "cowboy" },
  { id: 4, hat: "cowboy", bandana: false, type: "cowboy" },
  { id: 5, hat: "cowboy", bandana: true, type: "cowboy" },
  { id: 6, hat: "cowboy", bandana: false, type: "cowboy" },
];

const sillyCowgirls = [
  { id: 7, bonnet: true, type: "cowgirl" },
  { id: 8, bonnet: false, type: "cowgirl" },
];

// ----------------------------------------------------
// Setup
// ----------------------------------------------------
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (ENABLE_SPRITE_SHEETS && !fs.existsSync(SHEET_DIR)) {
  fs.mkdirSync(SHEET_DIR);
}

// ----------------------------------------------------
// Utility: seeded RNG for reproducible flair per id
// ----------------------------------------------------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ----------------------------------------------------
// Palettes and traits
// ----------------------------------------------------
// Load shared palette presets that encapsulate distinct eras/styles/genres.
const palettePresetsPath = path.join(
  __dirname,
  "..",
  "stickemup_character_generator",
  "cowboy",
  "palette_presets.json"
);
const palettes = JSON.parse(fs.readFileSync(palettePresetsPath, "utf8"));

function buildTraits(character) {
  const rng = mulberry32(character.id * 9301 + 49297);
  const palette = pick(rng, palettes);

  // Cowboy/cowgirl common
  const hasBadge = rng() < 0.25; // sheriff-ish
  const hasPoncho = rng() < 0.35;
  const hasChaps = rng() < 0.5;
  const hasLasso = rng() < 0.5;
  const hasMustache = character.type === "cowboy" && rng() < 0.6;
  const hairLength =
    character.type === "cowgirl" ? (rng() < 0.5 ? "short" : "long") : "short";
  const bootStyle = rng() < 0.5 ? "pointed" : "square";
  const spurSize = rng() < 0.8 ? 1 : 2;

  // Slight size/timing variations for life
  const bobScale = lerp(0.6, 1.1, rng());
  const armSwing = lerp(14, 24, rng()); // degrees
  const legSwing = lerp(12, 18, rng()); // degrees
  const stride = lerp(12, 18, rng()); // px
  const hatTilt = lerp(-8, 8, rng()); // degrees

  return {
    palette,
    hasBadge,
    hasPoncho,
    hasChaps,
    hasLasso,
    hasMustache,
    hairLength,
    bootStyle,
    spurSize,
    bobScale,
    armSwing,
    legSwing,
    stride,
    hatTilt,
  };
}

// ----------------------------------------------------
// Core drawing
// ----------------------------------------------------
function deg(v) {
  return (v * Math.PI) / 180;
}

function applyDirection(ctx, direction) {
  // Base pose is facing right. We'll mirror/rotate as needed.
  switch (direction) {
    case "left":
      ctx.scale(-1, 1);
      ctx.translate(-SIZE, 0);
      break;
    case "front":
      // No rotation; draw features that suggest facing camera in details.
      break;
    case "back":
      // Same orientation as front; change details to back view.
      break;
    case "right":
    default:
      // default
      break;
  }
}

function drawLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawCircle(ctx, x, y, r, fill, stroke = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Enhanced renderStickCowperson with animation support
function renderStickCowperson(ctx, character, frame, direction, traits, animationName = "walk", animationFrame = 0) {
  // Canvas base
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = traits.palette.line;
  ctx.fillStyle = traits.palette.line;

  // Slight shadow for depth
  ctx.shadowColor = "rgba(0,0,0,0.06)";
  ctx.shadowBlur = 2 * SCALE;
  ctx.shadowOffsetY = 1 * SCALE;

  applyDirection(ctx, direction);

  // Layout anchors (facing right space)
  const cx = SIZE / 2;
  const headY = 28 * SCALE;
  const bodyTop = 42 * SCALE;
  const bodyBottom = 74 * SCALE;
  const groundY = 90 * SCALE;

  // Get animation data
  let animationBodyParts = applyAnimationFrame(ctx, character, frame, direction, traits, animationName, animationFrame);

  // Default walk animation calculations
  const t = (frame / FRAME_COUNT) * Math.PI * 2;
  const legPhase = Math.sin(t);
  const armPhase = Math.sin(t + Math.PI); // opposing
  let bob = Math.sin(t * 2) * (2 * SCALE) * traits.bobScale;

  // Apply animation modifications
  if (animationBodyParts && animationBodyParts.body && animationBodyParts.body.verticalOffset !== undefined) {
    bob += animationBodyParts.body.verticalOffset * SCALE;
  }

  // Convert swing degrees to offsets
  let armSwing = traits.armSwing * (Math.PI / 180) * armPhase;
  let legSwing = traits.legSwing * (Math.PI / 180) * legPhase;
  const stride = traits.stride * SCALE;

  // Apply animation arm modifications
  if (animationBodyParts && animationBodyParts.rightArm) {
    armSwing = (animationBodyParts.rightArm.angle * Math.PI) / 180;
  }

  // Body vertical bob
  const by = bob;

  // Colors
  const P = traits.palette;

  // Head
  ctx.save();
  ctx.translate(0, by);
  
  // Apply head tilt from animation
  let headTilt = traits.hatTilt;
  if (animationBodyParts && animationBodyParts.head && animationBodyParts.head.tilt !== undefined) {
    headTilt += animationBodyParts.head.tilt;
  }
  
  ctx.fillStyle = P.skin;
  ctx.strokeStyle = P.line;
  drawCircle(ctx, cx, headY, 10 * SCALE, true, true);

  // Simple face depending on direction
  ctx.strokeStyle = P.line;
  if (direction === "right" || direction === "left" || direction === "front") {
    // Eyes
    ctx.beginPath();
    ctx.moveTo(cx - 3 * SCALE, headY - 1 * SCALE);
    ctx.lineTo(cx - 1 * SCALE, headY - 1 * SCALE);
    ctx.moveTo(cx + 1 * SCALE, headY - 1 * SCALE);
    ctx.lineTo(cx + 3 * SCALE, headY - 1 * SCALE);
    ctx.stroke();

    // Mustache
    if (traits.hasMustache && character.type === "cowboy") {
      ctx.beginPath();
      ctx.moveTo(cx - 5 * SCALE, headY + 3 * SCALE);
      ctx.quadraticCurveTo(
        cx - 2 * SCALE,
        headY + 6 * SCALE,
        cx,
        headY + 3 * SCALE
      );
      ctx.moveTo(cx, headY + 3 * SCALE);
      ctx.quadraticCurveTo(
        cx + 2 * SCALE,
        headY + 6 * SCALE,
        cx + 5 * SCALE,
        headY + 3 * SCALE
      );
      ctx.stroke();
    }
  }

  // Hair (cowgirl gets more hair)
  if (character.type === "cowgirl") {
    ctx.strokeStyle = P.line;
    const hl = traits.hairLength === "long" ? 10 * SCALE : 4 * SCALE;
    drawLine(
      ctx,
      cx - 6 * SCALE,
      headY + 8 * SCALE,
      cx - 6 * SCALE,
      headY + 8 * SCALE + hl
    );
    drawLine(
      ctx,
      cx + 6 * SCALE,
      headY + 8 * SCALE,
      cx + 6 * SCALE,
      headY + 8 * SCALE + hl
    );
  }

  // Hat / Bonnet
  ctx.save();
  ctx.translate(cx, headY - 11 * SCALE);
  ctx.rotate(deg(headTilt) + Math.sin(t) * 0.05);
  ctx.translate(-cx, -(headY - 11 * SCALE));
  if (character.hat === "cowboy" || character.type === "cowboy") {
    // Crown
    ctx.fillStyle = P.hat;
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(cx - 9 * SCALE, headY - 12 * SCALE);
    ctx.lineTo(cx + 9 * SCALE, headY - 12 * SCALE);
    ctx.lineTo(cx + 7 * SCALE, headY - 20 * SCALE);
    ctx.lineTo(cx - 7 * SCALE, headY - 20 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Brim (slight curve)
    ctx.beginPath();
    ctx.moveTo(cx - 16 * SCALE, headY - 11 * SCALE);
    ctx.quadraticCurveTo(
      cx,
      headY - 7 * SCALE,
      cx + 16 * SCALE,
      headY - 11 * SCALE
    );
    ctx.stroke();
  } else if (character.bonnet) {
    ctx.fillStyle = P.poncho2;
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(cx - 14 * SCALE, headY - 14 * SCALE);
    ctx.lineTo(cx + 14 * SCALE, headY - 14 * SCALE);
    ctx.quadraticCurveTo(
      cx + 16 * SCALE,
      headY - 4 * SCALE,
      cx + 14 * SCALE,
      headY + 0 * SCALE
    );
    ctx.lineTo(cx - 14 * SCALE, headY + 0 * SCALE);
    ctx.quadraticCurveTo(
      cx - 16 * SCALE,
      headY - 4 * SCALE,
      cx - 14 * SCALE,
      headY - 14 * SCALE
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore(); // hat tilt

  // Bandana (under head)
  if (character.bandana) {
    ctx.fillStyle = P.bandana;
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * SCALE, headY + 6 * SCALE);
    ctx.lineTo(cx + 8 * SCALE, headY + 6 * SCALE);
    ctx.lineTo(cx, headY + 12 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // head group (bob)

  // Torso
  ctx.save();
  ctx.translate(0, by);
  
  // Apply body lean from animation
  if (animationBodyParts && animationBodyParts.body && animationBodyParts.body.lean !== undefined) {
    ctx.rotate(deg(animationBodyParts.body.lean));
  }
  
  ctx.strokeStyle = P.line;

  // Body line
  drawLine(ctx, cx, bodyTop, cx, bodyBottom);

  // Vest hint
  ctx.fillStyle = P.leather;
  ctx.beginPath();
  ctx.moveTo(cx - 6 * SCALE, bodyTop + 2 * SCALE);
  ctx.lineTo(cx, bodyTop + 12 * SCALE);
  ctx.lineTo(cx + 6 * SCALE, bodyTop + 2 * SCALE);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Badge (sheriff)
  if (traits.hasBadge && direction !== "back") {
    ctx.fillStyle = P.badge;
    drawCircle(ctx, cx + 6 * SCALE, bodyTop + 6 * SCALE, 2 * SCALE, true, false);
    ctx.strokeStyle = P.line;
    drawCircle(
      ctx,
      cx + 6 * SCALE,
      bodyTop + 6 * SCALE,
      2 * SCALE,
      false,
      true
    );
  }

  // Poncho
  if (traits.hasPoncho) {
    ctx.fillStyle = P.poncho1;
    const flutter = Math.sin(t * 2 + 1) * (2 * SCALE);
    ctx.beginPath();
    ctx.moveTo(cx - 14 * SCALE, bodyTop - 2 * SCALE);
    ctx.lineTo(cx + 14 * SCALE, bodyTop - 2 * SCALE);
    ctx.lineTo(cx + 16 * SCALE, bodyTop + 18 * SCALE + flutter);
    ctx.lineTo(cx - 16 * SCALE, bodyTop + 18 * SCALE - flutter);
    ctx.closePath();
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.stroke();
    // Trim stripe
    ctx.strokeStyle = P.poncho2;
    drawLine(
      ctx,
      cx - 16 * SCALE,
      bodyTop + 15 * SCALE - flutter,
      cx + 16 * SCALE,
      bodyTop + 15 * SCALE + flutter
    );
    ctx.strokeStyle = P.line;
  }

  // Arms
  // Shoulder point
  const shoulderY = bodyTop + 6 * SCALE;
  const armLen = 18 * SCALE;
  
  // Apply animation-specific arm positions
  let rightArmAngle = armSwing;
  let leftArmAngle = -armSwing;
  
  if (animationBodyParts && animationBodyParts.rightArm) {
    rightArmAngle = (animationBodyParts.rightArm.angle * Math.PI) / 180;
  }
  if (animationBodyParts && animationBodyParts.leftArm) {
    leftArmAngle = (animationBodyParts.leftArm.angle * Math.PI) / 180;
  }
  
  // Right arm
  const rax = Math.cos(rightArmAngle) * armLen;
  const ray = Math.sin(rightArmAngle) * armLen;
  drawLine(ctx, cx, shoulderY, cx + rax, shoulderY + ray);
  
  // Left arm
  const lax = Math.cos(leftArmAngle) * armLen;
  const lay = Math.sin(leftArmAngle) * armLen;
  drawLine(ctx, cx, shoulderY, cx + lax, shoulderY + lay);

  // Lasso (attached to forward hand if enabled)
  if (traits.hasLasso && (direction === "right" || direction === "left") && animationName === "walk") {
    const fx = cx + rax;
    const fy = shoulderY + ray;
    ctx.strokeStyle = "#8a6b3a";
    // Rope to loop
    drawLine(ctx, fx, fy, fx + 10 * SCALE, fy - 10 * SCALE);
    // Rotating loop above hand
    const loopR = 8 * SCALE;
    const rot = t + (direction === "left" ? Math.PI : 0);
    ctx.beginPath();
    ctx.ellipse(
      fx + 14 * SCALE,
      fy - 16 * SCALE,
      loopR * 1.6,
      loopR * 0.7,
      rot,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.strokeStyle = P.line;
  }

  ctx.restore(); // torso

  // Legs
  ctx.save();
  ctx.translate(0, by);
  const hipX = cx;
  const hipY = bodyBottom;
  const footY = groundY;

  // Apply animation-specific leg positions
  let rightLegAngle = legSwing;
  let leftLegAngle = -legSwing;

  if (animationBodyParts && animationBodyParts.rightLeg) {
    rightLegAngle = (animationBodyParts.rightLeg.angle * Math.PI) / 180;
  }
  if (animationBodyParts && animationBodyParts.leftLeg) {
    leftLegAngle = (animationBodyParts.leftLeg.angle * Math.PI) / 180;
  }

  const spread = stride;

  let rightFootX = hipX + spread * Math.cos(rightLegAngle);
  let rightFootY = footY;
  let leftFootX = hipX + spread * Math.cos(leftLegAngle);
  let leftFootY = footY;

  if (animationBodyParts && animationBodyParts.rightLeg) {
    const { footOffsetX, footOffsetY } = animationBodyParts.rightLeg;
    if (
      typeof footOffsetX === "number" &&
      typeof footOffsetY === "number"
    ) {
      rightFootX = hipX + footOffsetX * SCALE;
      rightFootY = Math.min(footY, hipY + footOffsetY * SCALE);
    }
  }

  if (animationBodyParts && animationBodyParts.leftLeg) {
    const { footOffsetX, footOffsetY } = animationBodyParts.leftLeg;
    if (
      typeof footOffsetX === "number" &&
      typeof footOffsetY === "number"
    ) {
      leftFootX = hipX + footOffsetX * SCALE;
      leftFootY = Math.min(footY, hipY + footOffsetY * SCALE);
    }
  }

  drawLine(ctx, hipX, hipY, rightFootX, rightFootY);
  drawLine(ctx, hipX, hipY, leftFootX, leftFootY);

  // Chaps hint
  if (traits.hasChaps) {
    ctx.strokeStyle = P.leather;
    drawLine(
      ctx,
      hipX - 6 * SCALE,
      hipY - 2 * SCALE,
      hipX - 6 * SCALE,
      footY - 6 * SCALE
    );
    drawLine(
      ctx,
      hipX + 6 * SCALE,
      hipY - 2 * SCALE,
      ctx + 6 * SCALE,
      footY - 6 * SCALE
    );
    ctx.strokeStyle = P.line;
  }

  // Boots + spurs
  function drawBoot(x, y) {
    ctx.strokeStyle = P.line;
    // Heel
    drawLine(ctx, x - 2 * SCALE, y, x + 6 * SCALE, y);
    // Toe style
    if (traits.bootStyle === "pointed") {
      drawLine(ctx, x + 6 * SCALE, y, x + 9 * SCALE, y - 2 * SCALE);
    } else {
      drawLine(ctx, x + 6 * SCALE, y, x + 9 * SCALE, y);
    }
    // Spur
    ctx.fillStyle = P.spur;
    drawCircle(ctx, x - 4 * SCALE, y - 1 * SCALE, 1 * SCALE, true, false);
    if (traits.spurSize > 1) {
      drawCircle(
        ctx,
        x - 6 * SCALE,
        y - 1 * SCALE,
        1 * SCALE,
        true,
        false
      );
    }
  }

  drawBoot(rightFootX - 4 * SCALE, rightFootY);
  drawBoot(leftFootX - 4 * SCALE, leftFootY);

  ctx.restore();

  // Direction-specific tweaks (front/back insignia)
  if (direction === "back") {
    ctx.save();
    ctx.translate(0, by);
    // back bandana tails if wearing
    if (character.bandana) {
      ctx.strokeStyle = P.bandana;
      drawLine(
        ctx,
        cx,
        headY + 10 * SCALE,
        cx - 6 * SCALE,
        headY + 14 * SCALE
      );
      drawLine(
        ctx,
        cx,
        headY + 10 * SCALE,
        cx + 6 * SCALE,
        headY + 14 * SCALE
      );
      ctx.strokeStyle = P.line;
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// Generation (frames + optional sprite sheets + metadata)
// ----------------------------------------------------
function renderAll() {
  const characters = [...sillyCowboys, ...sillyCowgirls];
  let totalFrames = 0;

  for (const character of characters) {
    const traits = buildTraits(character);
    
    // Generate sprites for each animation
    for (const animationName of ANIMATIONS) {
      const animation = loadAnimation(animationName);
      const frameCount = animation ? animation.frameCount || animation.frames.length : FRAME_COUNT;
      
      const meta = {
        id: character.id,
        type: character.type,
        animation: animationName,
        palette: traits.palette.name,
        paletteInfo: {
          label: traits.palette.label || traits.palette.name,
          era: traits.palette.metadata?.era || null,
          style: traits.palette.metadata?.style || null,
          genre: traits.palette.metadata?.genre || null,
          description: traits.palette.metadata?.description || null,
        },
        frames: {},
        frameCount: frameCount,
        size: SPRITE_SIZE,
        directions: DIRECTIONS,
        extras: {
          badge: traits.hasBadge,
          poncho: traits.hasPoncho,
          chaps: traits.hasChaps,
          lasso: traits.hasLasso,
          mustache: traits.hasMustache,
          hairLength: traits.hairLength,
        },
      };

      // Prepare sprite sheet canvas per direction
      const sheets = {};
      const ctxs = {};

      if (ENABLE_SPRITE_SHEETS) {
        for (const dir of DIRECTIONS) {
          sheets[dir] = createCanvas(SIZE * frameCount, SIZE);
          ctxs[dir] = sheets[dir].getContext("2d");
          ctxs[dir].lineWidth = LINE_WIDTH;
          ctxs[dir].lineCap = "round";
          ctxs[dir].lineJoin = "round";
        }
      }

      for (const direction of DIRECTIONS) {
        meta.frames[direction] = [];
        for (let frame = 0; frame < frameCount; frame++) {
          const canvas = createCanvas(SIZE, SIZE);
          const ctx = canvas.getContext("2d");
          renderStickCowperson(ctx, character, frame, direction, traits, animationName, frame);

          // Individual frame output
          const filename = `${character.id}_${animationName}_${direction}_${frame}.png`;
          const outPath = path.join(OUTPUT_DIR, filename);
          const out = fs.createWriteStream(outPath);
          const stream = canvas.createPNGStream();
          stream.pipe(out);
          out.on("finish", () => {
            // console.log(`Generated: ${filename}`);
          });

          // Add to sheet
          if (ENABLE_SPRITE_SHEETS) {
            const sctx = ctxs[direction];
            sctx.drawImage(canvas, frame * SIZE, 0);
          }

          // Metadata frame rect (logical size for engine)
          meta.frames[direction].push({
            x: frame * SPRITE_SIZE,
            y: 0,
            w: SPRITE_SIZE,
            h: SPRITE_SIZE,
          });

          totalFrames++;
        }
      }

      // Save sprite sheets
      if (ENABLE_SPRITE_SHEETS) {
        for (const direction of DIRECTIONS) {
          const sheetPath = path.join(SHEET_DIR, `${character.id}_${animationName}_${direction}.png`);
          const out = fs.createWriteStream(sheetPath);
          const stream = sheets[direction].createPNGStream();
          stream.pipe(out);
          out.on("finish", () => {
            // console.log(`Generated sheet: ${character.id}_${animationName}_${direction}.png`);
          });
        }
      }

      // Save metadata
      const metaPath = path.join(OUTPUT_DIR, `${character.id}_${animationName}_meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }
  }

  console.log(`✅ Generated ${totalFrames} total frames across ${ANIMATIONS.length} animations`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  if (ENABLE_SPRITE_SHEETS) {
    console.log(`📄 Sprite sheets: ${SHEET_DIR}`);
  }
  console.log(`🎭 Available animations: ${ANIMATIONS.join(", ")}`);
}

// ----------------------------------------------------
// Run
// ----------------------------------------------------
if (require.main === module) {
  renderAll();
}

export { renderStickCowperson, buildTraits, ANIMATIONS };

