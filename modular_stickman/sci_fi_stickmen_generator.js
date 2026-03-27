// sci_fi_stickmen_generator.js
// Sci-Fi themed stickman generator with futuristic elements
// Run: node sci_fi_stickmen_generator.js

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { loadAnimation } from "./animations.js";
import { applyAnimationFrame } from "./animation_renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------
// Config
// ----------------------------------------------------
const SPRITE_SIZE = 100;
const SCALE = 1;
const SIZE = SPRITE_SIZE * SCALE;

const OUTPUT_DIR = path.join(__dirname, "sci_fi_sprites");
const SHEET_DIR = path.join(OUTPUT_DIR, "sheets");

const DIRECTIONS = ["right", "left", "front", "back"];
const FRAME_COUNT = 6;
const LINE_WIDTH = 2 * SCALE;

const ENABLE_SPRITE_SHEETS = true;

const ANIMATIONS = ["walk", "shoot", "bar_fight", "jump", "wave", "moonwalk"];

// ----------------------------------------------------
// Sci-Fi Characters
// ----------------------------------------------------
const sciFiSoldiers = [
  { id: 1, helmet: "combat_helm", visor: true, class: "soldier" },
  { id: 2, helmet: "tactical_helm", visor: false, class: "soldier" },
  { id: 3, helmet: "recon_helm", visor: true, class: "soldier" },
  { id: 4, helmet: "combat_helm", visor: false, class: "soldier" },
];

const sciFiScientists = [
  { id: 5, helmet: "lab_helm", visor: true, class: "scientist" },
  { id: 6, helmet: "neural_link", visor: false, class: "scientist" },
];

const sciFiEngineers = [
  { id: 7, helmet: "tech_helm", visor: true, class: "engineer" },
  { id: 8, helmet: "visor_only", visor: false, class: "engineer" },
];

const sciFiAliens = [
  { id: 9, helmet: "none", visor: false, class: "alien" },
  { id: 10, helmet: "bio_suit", visor: true, class: "alien" },
];

// ----------------------------------------------------
// Setup
// ----------------------------------------------------
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (ENABLE_SPRITE_SHEETS && !fs.existsSync(SHEET_DIR)) {
  fs.mkdirSync(SHEET_DIR);
}

// ----------------------------------------------------
// Utility: seeded RNG
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
// Sci-Fi Palettes
// ----------------------------------------------------
const palettes = [
  {
    name: "cyberpunk",
    label: "Neon Nights",
    line: "#1a1a2e",
    skin: "#a8d8ea",
    armor: "#ff006e",
    neon_primary: "#00f5ff",
    neon_secondary: "#ff00ff",
    metal: "#4a4a6a",
    circuit: "#ffd700",
    visor: "#ff3c00",
  },
  {
    name: "space_marine",
    label: "Stellar Defense",
    line: "#0d1b2a",
    skin: "#e0c0a0",
    armor: "#2d5a7a",
    neon_primary: "#00ff88",
    neon_secondary: "#00ccff",
    metal: "#6a7a8a",
    circuit: "#00ffaa",
    visor: "#00ffff",
  },
  {
    name: "corporate",
    label: "MegaCorp Elite",
    line: "#1a1a1a",
    skin: "#f0d0b0",
    armor: "#3a3a5a",
    neon_primary: "#ffcc00",
    neon_secondary: "#ff6600",
    metal: "#8a8a9a",
    circuit: "#ff9900",
    visor: "#ffaa00",
  },
  {
    name: "alien_tech",
    label: "Xeno Technology",
    line: "#0a1a0a",
    skin: "#80ffa0",
    armor: "#2a4a3a",
    neon_primary: "#00ff66",
    neon_secondary: "#66ff00",
    metal: "#5a6a5a",
    circuit: "#88ff88",
    visor: "#00ff88",
  },
];

function buildTraits(character) {
  const rng = mulberry32(character.id * 9301 + 49297);
  const palette = pick(rng, palettes);

  // Sci-fi traits
  const hasJetpack = rng() < 0.4;
  const hasExoSuit = rng() < 0.5;
  const hasWeapon = rng() < 0.8;
  const hasShield = rng() < 0.3;
  const hasAntenna = character.class === "alien" || rng() < 0.2;
  const weaponType = pick(rng, ["blaster", "plasma_rifle", "laser_pistol", "energy_sword"]);
  const suitVariant = pick(rng, ["light", "medium", "heavy"]);
  
  // Animation variations
  const hoverHeight = lerp(0, 5, rng());
  const glowIntensity = lerp(0.5, 1.0, rng());
  const armSwing = lerp(10, 20, rng());
  const legSwing = lerp(8, 15, rng());
  const stride = lerp(10, 16, rng());

  return {
    palette,
    hasJetpack,
    hasExoSuit,
    hasWeapon,
    hasShield,
    hasAntenna,
    weaponType,
    suitVariant,
    hoverHeight,
    glowIntensity,
    armSwing,
    legSwing,
    stride,
  };
}

// ----------------------------------------------------
// Core drawing
// ----------------------------------------------------
function deg(v) {
  return (v * Math.PI) / 180;
}

function applyDirection(ctx, direction) {
  switch (direction) {
    case "left":
      ctx.scale(-1, 1);
      ctx.translate(-SIZE, 0);
      break;
    case "front":
    case "back":
    case "right":
    default:
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
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawGlowingCircle(ctx, x, y, r, color, glowIntensity) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 * glowIntensity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderStickSciFi(ctx, character, frame, direction, traits, animationName = "walk", animationFrame = 0) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = traits.palette.line;
  ctx.fillStyle = traits.palette.line;

  applyDirection(ctx, direction);

  const cx = SIZE / 2;
  const headY = 28 * SCALE;
  const bodyTop = 42 * SCALE;
  const bodyBottom = 74 * SCALE;
  const groundY = (90 - traits.hoverHeight) * SCALE;

  // Animation data
  let animationBodyParts = applyAnimationFrame(ctx, character, frame, direction, traits, animationName, animationFrame);

  const t = (frame / FRAME_COUNT) * Math.PI * 2;
  const legPhase = Math.sin(t);
  const armPhase = Math.sin(t + Math.PI);
  let bob = Math.sin(t * 2) * (1.5 * SCALE);

  if (animationBodyParts?.body?.verticalOffset !== undefined) {
    bob += animationBodyParts.body.verticalOffset * SCALE;
  }

  let armSwing = traits.armSwing * (Math.PI / 180) * armPhase;
  let legSwing = traits.legSwing * (Math.PI / 180) * legPhase;

  if (animationBodyParts?.rightArm) {
    armSwing = (animationBodyParts.rightArm.angle * Math.PI) / 180;
  }

  const by = bob;
  const P = traits.palette;

  // Hover effect glow underneath
  if (traits.hoverHeight > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = P.neon_primary;
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 2 * SCALE, 15 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Head
  ctx.save();
  ctx.translate(0, by);
  ctx.fillStyle = P.skin;
  ctx.strokeStyle = P.line;
  drawCircle(ctx, cx, headY, 10 * SCALE, true, true);

  // Visor
  if (character.visor) {
    ctx.fillStyle = P.visor;
    ctx.save();
    ctx.shadowColor = P.visor;
    ctx.shadowBlur = 5 * traits.glowIntensity;
    ctx.beginPath();
    ctx.ellipse(cx + 2 * SCALE, headY - 1 * SCALE, 6 * SCALE, 3 * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Eyes
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.moveTo(cx - 3 * SCALE, headY - 1 * SCALE);
    ctx.lineTo(cx - 1 * SCALE, headY - 1 * SCALE);
    ctx.moveTo(cx + 1 * SCALE, headY - 1 * SCALE);
    ctx.lineTo(cx + 3 * SCALE, headY - 1 * SCALE);
    ctx.stroke();
  }

  // Antenna
  if (traits.hasAntenna) {
    ctx.strokeStyle = P.metal;
    drawLine(ctx, cx, headY - 10 * SCALE, cx, headY - 16 * SCALE);
    drawGlowingCircle(ctx, cx, headY - 17 * SCALE, 2 * SCALE, P.neon_primary, traits.glowIntensity);
  }

  // Helmet
  ctx.save();
  ctx.translate(cx, headY - 11 * SCALE);
  ctx.rotate(deg(Math.sin(t) * 2));
  ctx.translate(-cx, -(headY - 11 * SCALE));
  
  if (character.helmet !== "none") {
    ctx.fillStyle = P.armor;
    ctx.strokeStyle = P.line;
    
    // Helmet dome
    ctx.beginPath();
    ctx.moveTo(cx - 10 * SCALE, headY - 8 * SCALE);
    ctx.lineTo(cx + 10 * SCALE, headY - 8 * SCALE);
    ctx.quadraticCurveTo(cx, headY - 22 * SCALE, cx - 10 * SCALE, headY - 8 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Helmet details
    ctx.strokeStyle = P.circuit;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * SCALE, headY - 12 * SCALE);
    ctx.lineTo(cx + 8 * SCALE, headY - 12 * SCALE);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // head group

  // Torso with exosuit
  ctx.save();
  ctx.translate(0, by);
  ctx.strokeStyle = P.line;

  // Body line
  drawLine(ctx, cx, bodyTop, cx, bodyBottom);

  // Exosuit armor
  ctx.fillStyle = P.armor;
  ctx.beginPath();
  ctx.moveTo(cx - 8 * SCALE, bodyTop);
  ctx.lineTo(cx + 8 * SCALE, bodyTop);
  ctx.lineTo(cx + 10 * SCALE, bodyBottom);
  ctx.lineTo(cx - 10 * SCALE, bodyBottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Circuit patterns on suit
  ctx.strokeStyle = P.circuit;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 5 * SCALE, bodyTop + 5 * SCALE);
  ctx.lineTo(cx + 5 * SCALE, bodyTop + 5 * SCALE);
  ctx.lineTo(cx + 3 * SCALE, bodyTop + 15 * SCALE);
  ctx.lineTo(cx - 3 * SCALE, bodyTop + 15 * SCALE);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = LINE_WIDTH;

  // Chest glow
  drawGlowingCircle(ctx, cx, bodyTop + 10 * SCALE, 3 * SCALE, P.neon_primary, traits.glowIntensity);

  // Jetpack
  if (traits.hasJetpack) {
    ctx.fillStyle = P.metal;
    ctx.fillRect(cx - 12 * SCALE, bodyTop - 2 * SCALE, 8 * SCALE, 20 * SCALE);
    ctx.fillRect(cx + 4 * SCALE, bodyTop - 2 * SCALE, 8 * SCALE, 20 * SCALE);
    
    // Thruster glow
    ctx.save();
    ctx.shadowColor = P.neon_secondary;
    ctx.shadowBlur = 8 * traits.glowIntensity;
    ctx.fillStyle = P.neon_secondary;
    const thrust = Math.sin(t * 3) * 2 + 4;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * SCALE, bodyTop + 18 * SCALE);
    ctx.lineTo(cx - 6 * SCALE, bodyTop + 18 * SCALE + thrust);
    ctx.lineTo(cx - 14 * SCALE, bodyTop + 18 * SCALE + thrust);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(cx + 6 * SCALE, bodyTop + 18 * SCALE);
    ctx.lineTo(cx + 10 * SCALE, bodyTop + 18 * SCALE + thrust);
    ctx.lineTo(cx + 14 * SCALE, bodyTop + 18 * SCALE + thrust);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Arms
  const shoulderY = bodyTop + 6 * SCALE;
  const armLen = 18 * SCALE;
  
  let rightArmAngle = armSwing;
  let leftArmAngle = -armSwing;
  
  if (animationBodyParts?.rightArm) {
    rightArmAngle = (animationBodyParts.rightArm.angle * Math.PI) / 180;
  }
  if (animationBodyParts?.leftArm) {
    leftArmAngle = (animationBodyParts.leftArm.angle * Math.PI) / 180;
  }

  // Right arm with armor
  const rax = Math.cos(rightArmAngle) * armLen;
  const ray = Math.sin(rightArmAngle) * armLen;
  ctx.strokeStyle = P.armor;
  ctx.lineWidth = 4 * SCALE;
  drawLine(ctx, cx, shoulderY, cx + rax, shoulderY + ray);
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = P.line;

  // Left arm
  const lax = Math.cos(leftArmAngle) * armLen;
  const lay = Math.sin(leftArmAngle) * armLen;
  ctx.strokeStyle = P.armor;
  ctx.lineWidth = 4 * SCALE;
  drawLine(ctx, cx, shoulderY, cx + lax, shoulderY + lay);
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = P.line;

  // Weapon
  if (traits.hasWeapon && character.class !== "scientist") {
    ctx.fillStyle = P.metal;
    const wx = cx + rax + 5 * SCALE;
    const wy = shoulderY + ray;
    ctx.fillRect(wx, wy - 2 * SCALE, 15 * SCALE, 4 * SCALE);
    
    // Weapon glow
    drawGlowingCircle(ctx, wx + 15 * SCALE, wy, 2 * SCALE, P.neon_secondary, traits.glowIntensity);
  }

  ctx.restore(); // torso

  // Legs with exosuit
  ctx.save();
  ctx.translate(0, by);
  const hipX = cx;
  const hipY = bodyBottom;

  let rightLegAngle = legSwing;
  let leftLegAngle = -legSwing;

  if (animationBodyParts?.rightLeg) {
    rightLegAngle = (animationBodyParts.rightLeg.angle * Math.PI) / 180;
  }
  if (animationBodyParts?.leftLeg) {
    leftLegAngle = (animationBodyParts.leftLeg.angle * Math.PI) / 180;
  }

  const spread = traits.stride * SCALE;

  let rightFootX = hipX + spread * Math.cos(rightLegAngle);
  let rightFootY = groundY;
  let leftFootX = hipX + spread * Math.cos(leftLegAngle);
  let leftFootY = groundY;

  if (animationBodyParts?.rightLeg) {
    const { footOffsetX, footOffsetY } = animationBodyParts.rightLeg;
    if (typeof footOffsetX === "number" && typeof footOffsetY === "number") {
      rightFootX = hipX + footOffsetX * SCALE;
      rightFootY = Math.min(groundY, hipY + footOffsetY * SCALE);
    }
  }

  if (animationBodyParts?.leftLeg) {
    const { footOffsetX, footOffsetY } = animationBodyParts.leftLeg;
    if (typeof footOffsetX === "number" && typeof footOffsetY === "number") {
      leftFootX = hipX + footOffsetX * SCALE;
      leftFootY = Math.min(groundY, hipY + footOffsetY * SCALE);
    }
  }

  // Leg armor
  ctx.strokeStyle = P.armor;
  ctx.lineWidth = 4 * SCALE;
  drawLine(ctx, hipX, hipY, rightFootX, rightFootY);
  drawLine(ctx, hipX, hipY, leftFootX, leftFootY);
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeStyle = P.line;

  // Boots with tech
  function drawTechBoot(x, y) {
    ctx.fillStyle = P.armor;
    ctx.fillRect(x - 3 * SCALE, y - 2 * SCALE, 12 * SCALE, 6 * SCALE);
    
    // Boot glow
    drawGlowingCircle(ctx, x + 2 * SCALE, y + 2 * SCALE, 2 * SCALE, P.neon_primary, traits.glowIntensity);
  }

  drawTechBoot(rightFootX, rightFootY);
  drawTechBoot(leftFootX, leftFootY);

  ctx.restore(); // legs

  // Shield
  if (traits.hasShield) {
    ctx.save();
    ctx.strokeStyle = P.neon_primary;
    ctx.lineWidth = 2 * SCALE;
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = P.neon_primary;
    ctx.shadowBlur = 10 * traits.glowIntensity;
    ctx.beginPath();
    ctx.ellipse(cx + 20 * SCALE, bodyTop + 15 * SCALE, 8 * SCALE, 20 * SCALE, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ----------------------------------------------------
// Sprite sheet generation
// ----------------------------------------------------
function generateSpriteSheet(animationName) {
  console.log(`Generating ${animationName} sprite sheet...`);
  
  const allCharacters = [...sciFiSoldiers, ...sciFiScientists, ...sciFiEngineers, ...sciFiAliens];
  const cols = allCharacters.length;
  const rows = DIRECTIONS.length * FRAME_COUNT;
  
  const sheetWidth = cols * SIZE;
  const sheetHeight = rows * SIZE;
  
  const sheet = createCanvas(sheetWidth, sheetHeight);
  const sheetCtx = sheet.getContext("2d");
  
  let charIndex = 0;
  for (const character of allCharacters) {
    const traits = buildTraits(character);
    const directions = DIRECTIONS;
    
    for (const direction of directions) {
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const x = charIndex * SIZE;
        const y = (directions.indexOf(direction) * FRAME_COUNT + frame) * SIZE;
        
        renderStickSciFi(sheetCtx, character, frame, direction, traits, animationName, frame);
        
        sheetCtx.save();
        sheetCtx.translate(x, y);
        sheetCtx.drawImage(sheet, 0, 0, SIZE, SIZE, 0, 0, SIZE, SIZE);
        sheetCtx.restore();
      }
    }
    
    charIndex++;
  }
  
  const outputPath = path.join(SHEET_DIR, `${animationName}_sheet.png`);
  const buffer = sheet.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Saved: ${outputPath}`);
}

// ----------------------------------------------------
// Single sprite export
// ----------------------------------------------------
function exportSingleSprites() {
  const allCharacters = [...sciFiSoldiers, ...sciFiScientists, ...sciFiEngineers, ...sciFiAliens];
  
  for (const character of allCharacters) {
    const traits = buildTraits(character);
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext("2d");
    
    renderStickSciFi(ctx, character, 0, "right", traits, "walk", 0);
    
    const outputPath = path.join(OUTPUT_DIR, `scifi_char_${character.id}.png`);
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outputPath, buffer);
    console.log(`Exported: ${outputPath}`);
  }
}

// ----------------------------------------------------
// Main execution
// ----------------------------------------------------
console.log("=== Sci-Fi Stickman Generator ===");
console.log("Generating single sprites...");
exportSingleSprites();

console.log("\nGenerating sprite sheets for each animation...");
for (const anim of ANIMATIONS) {
  try {
    generateSpriteSheet(anim);
  } catch (error) {
    console.error(`Error generating ${anim}:`, error.message);
  }
}

console.log("\n✅ Sci-Fi generation complete!");
console.log(`Output directory: ${OUTPUT_DIR}`);

// Export for use in other modules
export { buildTraits, renderStickSciFi, palettes as sciFiPalettes };
