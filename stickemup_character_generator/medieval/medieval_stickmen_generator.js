// medieval_stickmen_generator.js
// Run: node medieval_stickmen_generator.js

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const { createGenreTemplate } = require("../templates/base_character_template.cjs");

// ----------------------------------------------------
// Config
// ----------------------------------------------------
const medievalTemplate = createGenreTemplate();
const SPRITE_SIZE = medievalTemplate.sprite.size;
const SCALE = medievalTemplate.sprite.scale;
const SIZE = SPRITE_SIZE * SCALE;

const OUTPUT_DIR = path.join(__dirname, "medieval_sprites");
const SHEET_DIR = path.join(OUTPUT_DIR, "sheets");

const DIRECTIONS = medievalTemplate.sprite.directions;
const FRAME_COUNT = medievalTemplate.sprite.frameCount;
const LINE_WIDTH = medievalTemplate.sprite.lineWidth * SCALE;

const BASE_ANCHORS = medievalTemplate.anchors;
const BASE_ANIMATION = medievalTemplate.animation;

const ENABLE_SPRITE_SHEETS = true;

// ----------------------------------------------------
// Medieval Characters
// ----------------------------------------------------
const medievalKnights = [
  { id: 1, headwear: "great_helm", scarf: true, class: "knight" },
  { id: 2, headwear: "bascinet", scarf: false, class: "knight" },
  { id: 3, headwear: "sallet", scarf: true, class: "knight" },
  { id: 4, headwear: "great_helm", scarf: false, class: "knight" },
];

const medievalArchers = [
  { id: 5, headwear: "hood", scarf: false, class: "archer" },
  { id: 6, headwear: "coif", scarf: true, class: "archer" },
];

const medievalMages = [
  { id: 7, headwear: "circlet", scarf: false, class: "mage" },
  { id: 8, headwear: "hood", scarf: true, class: "mage" },
];

const medievalPeasants = [
  { id: 9, headwear: "hood", scarf: false, class: "peasant" },
  { id: 10, headwear: "coif", scarf: true, class: "peasant" },
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
// Medieval Palettes
// ----------------------------------------------------
const palettes = [
  {
    name: "forest",
    line: "#3A3A3A",
    skin: "#E0C0A0",
    armor_metal: "#808080",
    leather: "#6B4423",
    fabric_main: "#4A7C4A",
    fabric_accent: "#A0522D",
    wood: "#7A5230",
    gem: "#4CAF50",
  },
  {
    name: "castle",
    line: "#2B2B2B",
    skin: "#F0C7A1",
    armor_metal: "#A0A0A0",
    leather: "#5A3A20",
    fabric_main: "#607D8B",
    fabric_accent: "#B71C1C",
    wood: "#8D6E63",
    gem: "#880E4F",
  },
  {
    name: "royal",
    line: "#1A1A1A",
    skin: "#FFDAB9",
    armor_metal: "#D4AF37",
    leather: "#4E342E",
    fabric_main: "#4A148C",
    fabric_accent: "#FFD700",
    wood: "#A1887F",
    gem: "#1A237E",
  },
];

function buildTraits(character) {
  const rng = mulberry32(character.id * 9301 + 49297);
  const palette = pick(rng, palettes);

  // Medieval traits
  const hasEmblem = rng() < 0.3; // shield/armor emblem
  const hasCloak = rng() < 0.4;
  const hasLegArmor = rng() < 0.6;
  const hasBeard = character.class !== "mage" && rng() < 0.5; // less likely for mages
  const hairStyle = rng() < 0.3 ? "long" : rng() < 0.6 ? "short" : "braided";
  const footwear = rng() < 0.7 ? "boots" : "shoes";
  
  // Class-specific traits
  let weapon = "none";
  let armorType = "none";
  let shieldType = "none";
  let hasQuiver = false;
  let hasBeltPouch = false;
  
  switch (character.class) {
    case "knight":
      weapon = pick(rng, ["sword", "mace", "axe"]);
      armorType = pick(rng, ["chainmail", "plate"]);
      shieldType = pick(rng, ["heater", "kite"]);
      break;
    case "archer":
      weapon = "bow";
      armorType = pick(rng, ["leather", "none"]);
      hasQuiver = true;
      break;
    case "mage":
      weapon = pick(rng, ["staff", "wand"]);
      armorType = "none";
      hasBeltPouch = true;
      break;
    case "peasant":
      weapon = pick(rng, ["dagger", "none"]);
      armorType = "none";
      hasBeltPouch = rng() < 0.6;
      break;
  }

  // Animation variations
  const bobScale = lerp(
    BASE_ANIMATION.bobAmplitudeRange[0],
    BASE_ANIMATION.bobAmplitudeRange[1],
    rng()
  );
  const armSwing = lerp(
    BASE_ANIMATION.armSwingDegrees[0],
    BASE_ANIMATION.armSwingDegrees[1],
    rng()
  );
  const legSwing = lerp(
    BASE_ANIMATION.legSwingDegrees[0],
    BASE_ANIMATION.legSwingDegrees[1],
    rng()
  );
  const stride = lerp(
    BASE_ANIMATION.strideRange[0],
    BASE_ANIMATION.strideRange[1],
    rng()
  );
  const headwearTilt = lerp(-8, 8, rng()); // degrees

  return {
    palette,
    hasEmblem,
    hasCloak,
    hasLegArmor,
    hasBeard,
    hairStyle,
    footwear,
    weapon,
    armorType,
    shieldType,
    hasQuiver,
    hasBeltPouch,
    bobScale,
    armSwing,
    legSwing,
    stride,
    headwearTilt,
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

function renderMedievalStickPerson(ctx, character, frame, direction, traits) {
  // Canvas base
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = traits.palette.line;
  ctx.fillStyle = traits.palette.line;

  // Slight shadow for depth
  ctx.shadowColor = "rgba(0,0,0,0.08)";
  ctx.shadowBlur = 2 * SCALE;
  ctx.shadowOffsetY = 1 * SCALE;

  applyDirection(ctx, direction);

  // Layout anchors (facing right space)
  const cx = SIZE / 2;
  const headY = BASE_ANCHORS.headY * SCALE;
  const bodyTop = BASE_ANCHORS.bodyTop * SCALE;
  const bodyBottom = BASE_ANCHORS.bodyBottom * SCALE;
  const groundY = BASE_ANCHORS.groundY * SCALE;

  const t = (frame / FRAME_COUNT) * Math.PI * 2;
  const legPhase = Math.sin(t);
  const armPhase = Math.sin(t + Math.PI); // opposing
  const bob =
    Math.sin(t * BASE_ANIMATION.bobFrequency) *
    (2 * SCALE) *
    traits.bobScale;

  // Convert swing degrees to offsets
  const armSwing = traits.armSwing * (Math.PI / 180) * armPhase;
  const legSwing = traits.legSwing * (Math.PI / 180) * legPhase;
  const stride = traits.stride * SCALE;

  // Body vertical bob
  const by = bob;

  // Colors
  const P = traits.palette;

  // Head
  ctx.save();
  ctx.translate(0, by);
  ctx.fillStyle = P.skin;
  ctx.strokeStyle = P.line;
  ctx.beginPath();
  ctx.arc(cx, headY, 10 * SCALE, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

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

    // Beard
    if (traits.hasBeard && character.class !== "mage") {
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(cx - 4 * SCALE, headY + 6 * SCALE);
      ctx.quadraticCurveTo(
        cx,
        headY + 10 * SCALE,
        cx + 4 * SCALE,
        headY + 6 * SCALE
      );
      ctx.stroke();
    }
  }

  // Hair
  if (traits.hairStyle === "long") {
    ctx.strokeStyle = P.line;
    drawLine(
      ctx,
      cx - 8 * SCALE,
      headY + 6 * SCALE,
      cx - 8 * SCALE,
      headY + 14 * SCALE
    );
    drawLine(
      ctx,
      cx + 8 * SCALE,
      headY + 6 * SCALE,
      cx + 8 * SCALE,
      headY + 14 * SCALE
    );
  } else if (traits.hairStyle === "braided") {
    ctx.strokeStyle = P.line;
    // Simple braided hair representation
    drawLine(
      ctx,
      cx - 6 * SCALE,
      headY + 8 * SCALE,
      cx - 10 * SCALE,
      headY + 16 * SCALE
    );
    drawLine(
      ctx,
      cx + 6 * SCALE,
      headY + 8 * SCALE,
      cx + 10 * SCALE,
      headY + 16 * SCALE
    );
  }

  // Headwear
  ctx.save();
  ctx.translate(cx, headY - 11 * SCALE);
  ctx.rotate(deg(traits.headwearTilt) + Math.sin(t) * 0.05);
  ctx.translate(-cx, -(headY - 11 * SCALE));
  
  switch (character.headwear) {
    case "great_helm":
      // Full face covering helmet
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 12 * SCALE, headY - 22 * SCALE, 24 * SCALE, 26 * SCALE);
      ctx.fill();
      ctx.stroke();
      // Visor slit
      if (direction !== "back") {
        drawLine(
          ctx,
          cx - 8 * SCALE,
          headY - 8 * SCALE,
          cx + 8 * SCALE,
          headY - 8 * SCALE
        );
      }
      break;
    case "bascinet":
      // Pointed helmet
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(cx - 10 * SCALE, headY - 12 * SCALE);
      ctx.lineTo(cx + 10 * SCALE, headY - 12 * SCALE);
      ctx.lineTo(cx + 8 * SCALE, headY - 20 * SCALE);
      ctx.lineTo(cx, headY - 24 * SCALE);
      ctx.lineTo(cx - 8 * SCALE, headY - 20 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "sallet":
      // Rounded helmet with tail
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.arc(cx, headY - 14 * SCALE, 12 * SCALE, 0, Math.PI, true);
      ctx.lineTo(cx - 12 * SCALE, headY - 8 * SCALE);
      ctx.lineTo(cx + 12 * SCALE, headY - 8 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "hood":
      // Simple hood
      ctx.fillStyle = P.fabric_main;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * SCALE, headY - 16 * SCALE);
      ctx.quadraticCurveTo(
        cx,
        headY - 24 * SCALE,
        cx + 14 * SCALE,
        headY - 16 * SCALE
      );
      ctx.lineTo(cx + 12 * SCALE, headY - 4 * SCALE);
      ctx.lineTo(cx - 12 * SCALE, headY - 4 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "coif":
      // Chain mail coif
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.arc(cx, headY - 8 * SCALE, 14 * SCALE, 0, Math.PI, true);
      ctx.lineTo(cx - 14 * SCALE, headY + 4 * SCALE);
      ctx.lineTo(cx + 14 * SCALE, headY + 4 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "circlet":
      // Simple crown/circlet
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 12 * SCALE, headY - 14 * SCALE, 24 * SCALE, 4 * SCALE);
      ctx.fill();
      ctx.stroke();
      // Gem
      ctx.fillStyle = P.gem;
      ctx.beginPath();
      ctx.arc(cx, headY - 12 * SCALE, 2 * SCALE, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore(); // headwear tilt

  // Scarf/Cowl (under head)
  if (character.scarf) {
    ctx.fillStyle = P.fabric_accent;
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
  ctx.strokeStyle = P.line;

  // Body line
  drawLine(ctx, cx, bodyTop, cx, bodyBottom);

  // Armor/Clothing
  switch (traits.armorType) {
    case "plate":
      // Plate armor breastplate
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 8 * SCALE, bodyTop, 16 * SCALE, 20 * SCALE);
      ctx.fill();
      ctx.stroke();
      // Armor lines
      drawLine(
        ctx,
        cx - 6 * SCALE,
        bodyTop + 8 * SCALE,
        cx + 6 * SCALE,
        bodyTop + 8 * SCALE
      );
      drawLine(
        ctx,
        cx - 6 * SCALE,
        bodyTop + 16 * SCALE,
        cx + 6 * SCALE,
        bodyTop + 16 * SCALE
      );
      break;
    case "chainmail":
      // Chainmail representation
      ctx.fillStyle = P.armor_metal;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 7 * SCALE, bodyTop, 14 * SCALE, 24 * SCALE);
      ctx.fill();
      ctx.stroke();
      // Chain pattern (simplified)
      for (let i = 0; i < 3; i++) {
        drawLine(
          ctx,
          cx - 6 * SCALE,
          bodyTop + 4 * SCALE + i * 6 * SCALE,
          cx + 6 * SCALE,
          bodyTop + 4 * SCALE + i * 6 * SCALE
        );
      }
      break;
    case "leather":
      // Leather armor
      ctx.fillStyle = P.leather;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 6 * SCALE, bodyTop + 2 * SCALE, 12 * SCALE, 18 * SCALE);
      ctx.fill();
      ctx.stroke();
      break;
    default:
      // Simple tunic
      ctx.fillStyle = P.fabric_main;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.rect(cx - 6 * SCALE, bodyTop + 2 * SCALE, 12 * SCALE, 20 * SCALE);
      ctx.fill();
      ctx.stroke();
      break;
  }

  // Emblem (on armor/shield)
  if (traits.hasEmblem && direction !== "back") {
    ctx.fillStyle = P.gem;
    ctx.beginPath();
    ctx.arc(cx, bodyTop + 8 * SCALE, 3 * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.arc(cx, bodyTop + 8 * SCALE, 3 * SCALE, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cloak
  if (traits.hasCloak) {
    ctx.fillStyle = P.fabric_accent;
    const flutter = Math.sin(t * 2 + 1) * (2 * SCALE);
    ctx.beginPath();
    ctx.moveTo(cx - 12 * SCALE, bodyTop - 2 * SCALE);
    ctx.lineTo(cx + 12 * SCALE, bodyTop - 2 * SCALE);
    ctx.lineTo(cx + 14 * SCALE, bodyTop + 20 * SCALE + flutter);
    ctx.lineTo(cx - 14 * SCALE, bodyTop + 20 * SCALE - flutter);
    ctx.closePath();
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.stroke();
  }

  // Arms
  const shoulderY = bodyTop + BASE_ANCHORS.shoulderOffset * SCALE;
  const armLen = BASE_ANCHORS.armLength * SCALE;
  const ax = Math.cos(armSwing) * armLen;
  const ay = Math.sin(armSwing) * armLen;
  drawLine(ctx, cx, shoulderY, cx + ax, shoulderY + ay);
  drawLine(ctx, cx, shoulderY, cx - ax, shoulderY - ay);

  // Weapon (attached to forward hand if enabled)
  if (traits.weapon !== "none" && (direction === "right" || direction === "left")) {
    const fx = cx + ax;
    const fy = shoulderY + ay;
    ctx.strokeStyle = P.wood;
    
    switch (traits.weapon) {
      case "sword":
        // Sword blade
        ctx.strokeStyle = P.armor_metal;
        drawLine(ctx, fx, fy, fx + 8 * SCALE, fy - 16 * SCALE);
        // Hilt
        ctx.strokeStyle = P.wood;
        drawLine(ctx, fx - 2 * SCALE, fy, fx + 2 * SCALE, fy);
        break;
      case "bow":
        // Bow arc
        ctx.beginPath();
        ctx.arc(fx + 6 * SCALE, fy - 8 * SCALE, 12 * SCALE, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
        // Bowstring
        ctx.strokeStyle = P.line;
        drawLine(
          ctx,
          fx + 6 * SCALE - 10 * SCALE,
          fy - 8 * SCALE - 6 * SCALE,
          fx + 6 * SCALE - 10 * SCALE,
          fy - 8 * SCALE + 6 * SCALE
        );
        break;
      case "staff":
        // Long staff
        drawLine(ctx, fx, fy, fx + 4 * SCALE, fy - 20 * SCALE);
        // Crystal/orb on top
        ctx.fillStyle = P.gem;
        ctx.beginPath();
        ctx.arc(fx + 4 * SCALE, fy - 20 * SCALE, 2 * SCALE, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "wand":
        // Short wand
        drawLine(ctx, fx, fy, fx + 2 * SCALE, fy - 8 * SCALE);
        // Tip
        ctx.fillStyle = P.gem;
        ctx.beginPath();
        ctx.arc(fx + 2 * SCALE, fy - 8 * SCALE, 1 * SCALE, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "mace":
        // Mace handle
        drawLine(ctx, fx, fy, fx + 4 * SCALE, fy - 12 * SCALE);
        // Mace head
        ctx.fillStyle = P.armor_metal;
        ctx.beginPath();
        ctx.arc(fx + 4 * SCALE, fy - 12 * SCALE, 3 * SCALE, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case "axe":
        // Axe handle
        drawLine(ctx, fx, fy, fx + 4 * SCALE, fy - 12 * SCALE);
        // Axe head
        ctx.fillStyle = P.armor_metal;
        ctx.beginPath();
        ctx.moveTo(fx + 4 * SCALE, fy - 12 * SCALE);
        ctx.lineTo(fx + 8 * SCALE, fy - 10 * SCALE);
        ctx.lineTo(fx + 8 * SCALE, fy - 14 * SCALE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "dagger":
        // Small dagger
        ctx.strokeStyle = P.armor_metal;
        drawLine(ctx, fx, fy, fx + 3 * SCALE, fy - 6 * SCALE);
        // Hilt
        ctx.strokeStyle = P.wood;
        drawLine(ctx, fx - 1 * SCALE, fy, fx + 1 * SCALE, fy);
        break;
    }
    ctx.strokeStyle = P.line;
  }

  // Shield (on back arm for knights)
  if (traits.shieldType !== "none" && character.class === "knight") {
    const bx = cx - ax;
    const by = shoulderY - ay;
    ctx.fillStyle = P.wood;
    ctx.strokeStyle = P.line;
    
    switch (traits.shieldType) {
      case "heater":
        // Heater shield shape
        ctx.beginPath();
        ctx.moveTo(bx - 6 * SCALE, by - 8 * SCALE);
        ctx.lineTo(bx + 6 * SCALE, by - 8 * SCALE);
        ctx.lineTo(bx + 6 * SCALE, by + 4 * SCALE);
        ctx.lineTo(bx, by + 8 * SCALE);
        ctx.lineTo(bx - 6 * SCALE, by + 4 * SCALE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "kite":
        // Kite shield shape
        ctx.beginPath();
        ctx.moveTo(bx - 5 * SCALE, by - 8 * SCALE);
        ctx.lineTo(bx + 5 * SCALE, by - 8 * SCALE);
        ctx.lineTo(bx + 5 * SCALE, by + 2 * SCALE);
        ctx.lineTo(bx, by + 10 * SCALE);
        ctx.lineTo(bx - 5 * SCALE, by + 2 * SCALE);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case "round":
        // Round shield
        ctx.beginPath();
        ctx.arc(bx, by, 6 * SCALE, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }
    
    // Shield emblem
    if (traits.hasEmblem) {
      ctx.fillStyle = P.gem;
      ctx.beginPath();
      ctx.arc(bx, by, 2 * SCALE, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Quiver (for archers)
  if (traits.hasQuiver && character.class === "archer") {
    const qx = cx - 8 * SCALE;
    const qy = bodyTop + 4 * SCALE;
    ctx.fillStyle = P.leather;
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.rect(qx, qy, 4 * SCALE, 12 * SCALE);
    ctx.fill();
    ctx.stroke();
    // Arrow fletching
    drawLine(ctx, qx + 2 * SCALE, qy, qx + 2 * SCALE, qy - 4 * SCALE);
  }

  // Belt pouch
  if (traits.hasBeltPouch) {
    ctx.fillStyle = P.leather;
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.arc(cx + 8 * SCALE, bodyBottom - 4 * SCALE, 3 * SCALE, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // torso

  // Legs
  ctx.save();
  ctx.translate(0, by);
  const hipX = cx;
  const hipY = bodyBottom;
  const footY = groundY;

  const legAngle = legSwing; // radians
  const spread = stride;

  // Left leg
  drawLine(
    ctx,
    hipX,
    hipY,
    hipX - spread * Math.cos(legAngle),
    footY - 0 * SCALE
  );
  // Right leg
  drawLine(
    ctx,
    hipX,
    hipY,
    hipX + spread * Math.cos(legAngle),
    footY - 0 * SCALE
  );

  // Leg armor/greaves
  if (traits.hasLegArmor) {
    ctx.strokeStyle = P.armor_metal;
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
      hipX + 6 * SCALE,
      footY - 6 * SCALE
    );
    ctx.strokeStyle = P.line;
  }

  // Footwear
  function drawFootwear(x) {
    ctx.strokeStyle = P.line;
    ctx.fillStyle = P.leather;
    
    if (traits.footwear === "boots") {
      // Medieval boots
      ctx.beginPath();
      ctx.rect(x - 2 * SCALE, footY - 4 * SCALE, 8 * SCALE, 4 * SCALE);
      ctx.fill();
      ctx.stroke();
      // Boot toe
      drawLine(ctx, x + 6 * SCALE, footY, x + 8 * SCALE, footY - 1 * SCALE);
    } else {
      // Simple shoes
      drawLine(ctx, x - 2 * SCALE, footY, x + 6 * SCALE, footY);
    }
  }

  drawFootwear(hipX - spread * Math.cos(legAngle) - 4 * SCALE);
  drawFootwear(hipX + spread * Math.cos(legAngle) - 4 * SCALE);

  ctx.restore();

  // Direction-specific tweaks (back view details)
  if (direction === "back") {
    ctx.save();
    ctx.translate(0, by);
    // Back scarf/cowl tails if wearing
    if (character.scarf) {
      ctx.strokeStyle = P.fabric_accent;
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
  const characters = [...medievalKnights, ...medievalArchers, ...medievalMages, ...medievalPeasants];
  let totalFrames = 0;

  for (const character of characters) {
    const traits = buildTraits(character);
    const meta = {
      id: character.id,
      class: character.class,
      palette: traits.palette.name,
      frames: {},
      frameCount: FRAME_COUNT,
      size: SPRITE_SIZE,
      directions: DIRECTIONS,
      extras: {
        emblem: traits.hasEmblem,
        cloak: traits.hasCloak,
        legArmor: traits.hasLegArmor,
        weapon: traits.weapon,
        armorType: traits.armorType,
        shieldType: traits.shieldType,
        beard: traits.hasBeard,
        hairStyle: traits.hairStyle,
      },
    };

    // Prepare sprite sheet canvas per direction
    const sheets = {};
    const ctxs = {};

    if (ENABLE_SPRITE_SHEETS) {
      for (const dir of DIRECTIONS) {
        sheets[dir] = createCanvas(SIZE * FRAME_COUNT, SIZE);
        ctxs[dir] = sheets[dir].getContext("2d");
        ctxs[dir].lineWidth = LINE_WIDTH;
        ctxs[dir].lineCap = "round";
        ctxs[dir].lineJoin = "round";
      }
    }

    for (const direction of DIRECTIONS) {
      meta.frames[direction] = [];
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        const canvas = createCanvas(SIZE, SIZE);
        const ctx = canvas.getContext("2d");
        renderMedievalStickPerson(ctx, character, frame, direction, traits);

        // Individual frame output
        const filename = `${character.id}_${direction}_${frame}.png`;
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
          index: frame,
        });

        totalFrames++;
      }

      // Write sheet per direction
      if (ENABLE_SPRITE_SHEETS) {
        const sheetName = `${character.id}_${direction}_sheet.png`;
        const sheetFile = path.join(SHEET_DIR, sheetName);
        const out = fs.createWriteStream(sheetFile);
        const stream = sheets[direction].createPNGStream();
        stream.pipe(out);
      }
    }

    // Write metadata JSON
    const metaPath = path.join(
      ENABLE_SPRITE_SHEETS ? SHEET_DIR : OUTPUT_DIR,
      `${character.id}_meta.json`
    );
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }

  return { totalFrames, charCount: characters.length };
}

const res = renderAll();

console.log(
  `\n⚔️ Generated ${res.totalFrames} medieval frames for ${res.charCount} characters.`
);
console.log(`📁 Frames: ${path.resolve(OUTPUT_DIR)}`);
if (ENABLE_SPRITE_SHEETS) {
  console.log(`🗂  Sprite sheets + metadata: ${path.resolve(SHEET_DIR)}`);
}
console.log(
  "💡 Tip: Use the per-direction sheets with the included frame rects in the " +
    "metadata JSON for quick animation binding in your medieval game!"
);

