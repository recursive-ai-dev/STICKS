// cowboy_environment_generator.js
// Environment generator for cowboy western setting
// Run: node cowboy_environment_generator.js
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// ----------------------------------------------------
// Config
// ----------------------------------------------------
const SPRITE_SIZE = 200; // Larger sprites for environment elements
const SCALE = 1; // set to 2 for high-DPI then downscale in engine if desired
const SIZE = SPRITE_SIZE * SCALE;
const OUTPUT_DIR = path.join(__dirname, "cowboy_environment");
const SHEET_DIR = path.join(OUTPUT_DIR, "sheets");
const VARIATIONS = 4; // Number of variations per environment element
const LINE_WIDTH = 2 * SCALE;
const ENABLE_SPRITE_SHEETS = true;

// Environment element types
const ENV_TYPES = ["cactus", "rock", "tumbleweed", "saloon", "sheriff_office", "general_store", "well", "fence",  "wagon", "mountain", "sign", "campfire"];

// Animated environment elements
const ANIMATED_TYPES = ["tumbleweed", "campfire"];
const FRAME_COUNT = 6; // For animated elements

// ----------------------------------------------------
// Setup
// ----------------------------------------------------
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
if (ENABLE_SPRITE_SHEETS && !fs.existsSync(SHEET_DIR)) {
  fs.mkdirSync(SHEET_DIR);
}

// ----------------------------------------------------
// Utility: seeded RNG for reproducible variations
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
// Palettes for environment elements
// ----------------------------------------------------
const palettes = [
  {
    name: "desert",
    line: "#2b2b2b",
    sand: "#e0c9a6",
    rock: "#a89b8d",
    cactus: "#2d5a2d",
    wood: "#8b6239",
    wood_light: "#a67c52",
    metal: "#8a8a8a",
    red: "#a83c3c",
    blue: "#3c5ea8",
    yellow: "#d9b84f",
    orange: "#d9773c",
    mountain: "#7a8b7a",
    sky: "#87ceeb",
  },
  {
    name: "dusk",
    line: "#202020",
    sand: "#d4b896",
    rock: "#9a8a7a",
    cactus: "#235023",
    wood: "#7a5530",
    wood_light: "#966c42",
    metal: "#7a7a7a",
    red: "#983232",
    blue: "#345498",
    yellow: "#c9a83f",
    orange: "#c96732",
    mountain: "#6a7b6a",
    sky: "#a87cb0",
  },
  {
    name: "sagebrush",
    line: "#262626",
    sand: "#d4c0a0",
    rock: "#b4a89a",
    cactus: "#3a6a3a",
    wood: "#9a7249",
    wood_light: "#b68c62",
    metal: "#9a9a9a",
    red: "#b84c4c",
    blue: "#4c6eb8",
    yellow: "#e9c85f",
    orange: "#e9874c",
    mountain: "#8a9b8a",
    sky: "#a0c4a8",
  },
];

// ----------------------------------------------------
// Environment element variations
// ----------------------------------------------------
function buildElementVariations(elementType, variationId) {
  const rng = mulberry32(variationId * 9301 + 49297);
  const palette = pick(rng, palettes);
  
  // Base properties
  const scale = lerp(0.8, 1.2, rng());
  let rotation = lerp(-15, 15, rng());
  
  // Element-specific properties
  let properties = {
    palette,
    scale,
    rotation,
  };
  
  switch (elementType) {
    case "cactus":
      properties.type = pick(rng, ["barrel", "saguaro", "prickly_pear"]);
      properties.armCount = properties.type === "saguaro" ? Math.floor(rng() * 3) + 1 : 0;
      properties.flower = rng() < 0.3;
      break;
      
    case "rock":
      properties.type = pick(rng, ["boulder", "pile", "mesa"]);
      properties.cracks = rng() < 0.5;
      break;
      
    case "tumbleweed":
      properties.density = lerp(0.7, 1.3, rng());
      break;
      
    case "saloon":
      properties.storyCount = pick(rng, [1, 2]);
      properties.hasPorch = rng() < 0.8;
      properties.hasSign = true;
      properties.rotation = 0;
      break;
      
    case "sheriff_office":
      properties.hasJail = rng() < 0.7;
      properties.hasWantedPoster = true;
      properties.rotation = 0;
      break;
      
    case "general_store":
      properties.hasPorch = rng() < 0.6;
      properties.hasSign = true;
      properties.rotation = 0;
      break;
      
    case "well":
      properties.roofType = pick(rng, ["none", "simple", "elaborate"]);
      properties.hasBucket = rng() < 0.9;
      break;
      
    case "fence":
      properties.type = pick(rng, ["rail", "picket", "corral"]);
      properties.length = Math.floor(rng() * 3) + 2; // segments
      break;
      
    case "wagon":
      properties.type = pick(rng, ["covered", "open"]);
      break;
      
    case "mountain":
      properties.type = pick(rng, ["single", "range"]);
      properties.hasSnow = rng() < 0.3;
      break;
      
    case "sign":
      properties.shape = pick(rng, ["rectangle", "arrow", "oval"]);
      properties.text = pick(rng, ["Saloon", "Sheriff", "Hotel", "Bank", "General Store"]);
      break;
      
    case "campfire":
      properties.size = lerp(0.8, 1.2, rng());
      properties.hasLogs = rng() < 0.9;
      properties.hasPot = rng() < 0.3;
      break;
  }
  
  return properties;
}

// ----------------------------------------------------
// Core drawing functions
// ----------------------------------------------------
function deg(v) {
  return (v * Math.PI) / 180;
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

function drawRect(ctx, x, y, w, h, fill, stroke = true) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Main environment element renderer
function renderEnvironmentElement(ctx, elementType, variationId, frame = 0) {
  // Canvas base
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  const properties = buildElementVariations(elementType, variationId);
  const P = properties.palette;
  
  // Apply base transformations
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.rotate(deg(properties.rotation));
  ctx.scale(properties.scale, properties.scale);
  ctx.translate(-SIZE / 2, -SIZE / 2);
  
  // Set colors
  ctx.strokeStyle = P.line;
  
  // Render based on element type
  switch (elementType) {
    case "cactus":
      renderCactus(ctx, properties, frame);
      break;
      
    case "rock":
      renderRock(ctx, properties);
      break;
      
    case "tumbleweed":
      renderTumbleweed(ctx, properties, frame);
      break;
      
    case "saloon":
      renderSaloon(ctx, properties);
      break;
      
    case "sheriff_office":
      renderSheriffOffice(ctx, properties);
      break;
      
    case "general_store":
      renderGeneralStore(ctx, properties);
      break;
      
    case "well":
      renderWell(ctx, properties);
      break;
      
    case "fence":
      renderFence(ctx, properties);
      break;
      
    case "wagon":
      renderWagon(ctx, properties);
      break;
      
    case "mountain":
      renderMountain(ctx, properties);
      break;
      
    case "sign":
      renderSign(ctx, properties);
      break;
      
    case "campfire":
      renderCampfire(ctx, properties, frame);
      break;
  }
  
  ctx.restore();
}

// Individual element renderers
function renderCactus(ctx, props, frame) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  ctx.fillStyle = P.cactus;
  
  // Animation sway
  const sway = Math.sin((frame / FRAME_COUNT) * Math.PI * 2) * 2;
  
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(deg(sway));
  ctx.translate(-cx, -cy);
  
  if (props.type === "barrel") {
    // Barrel cactus
    drawRect(ctx, cx - 20 * SCALE, cy - 30 * SCALE, 40 * SCALE, 60 * SCALE, true);
    
    // Ribs
    for (let i = -15; i <= 15; i += 10) {
      drawLine(ctx, cx + i * SCALE, cy - 30 * SCALE, cx + i * SCALE, cy + 30 * SCALE);
    }
  } else if (props.type === "saguaro") {
    // Main trunk
    drawRect(ctx, cx - 15 * SCALE, cy - 50 * SCALE, 30 * SCALE, 100 * SCALE, true);
    
    // Arms
    for (let i = 0; i < props.armCount; i++) {
      const armY = cy - 20 * SCALE + (i * 30 * SCALE);
      const armDir = i % 2 === 0 ? 1 : -1;
      
      ctx.save();
      ctx.translate(cx + (15 * armDir * SCALE), armY);
      ctx.rotate(deg(armDir * 45));
      ctx.translate(-(cx + (15 * armDir * SCALE)), -armY);
      
      drawRect(ctx, cx + (15 * armDir * SCALE), armY - 10 * SCALE, 30 * SCALE, 20 * SCALE, true);
      
      ctx.restore();
    }
  } else if (props.type === "prickly_pear") {
    // Main pad
    drawCircle(ctx, cx, cy, 30 * SCALE, true);
    
    // Additional pads
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const px = cx + Math.cos(angle) * 40 * SCALE;
      const py = cy + Math.sin(angle) * 40 * SCALE;
      drawCircle(ctx, px, py, 20 * SCALE, true);
    }
  }
  
  // Spines
  ctx.strokeStyle = P.line;
  for (let i = 0; i < 20; i++) {
    const spineX = cx + (Math.random() - 0.5) * 60 * SCALE;
    const spineY = cy + (Math.random() - 0.5) * 100 * SCALE;
    drawLine(ctx, spineX, spineY, spineX + (Math.random() - 0.5) * 5 * SCALE, spineY - 5 * SCALE);
  }
  
  // Flower
  if (props.flower) {
    ctx.fillStyle = P.red;
    drawCircle(ctx, cx, cy - 50 * SCALE, 8 * SCALE, true);
  }
  
  ctx.restore();
}

function renderRock(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  ctx.fillStyle = P.rock;
  
  if (props.type === "boulder") {
    // Large boulder
    drawCircle(ctx, cx, cy, 40 * SCALE, true);
    
    // Highlight
    ctx.fillStyle = P.sand;
    drawCircle(ctx, cx - 15 * SCALE, cy - 15 * SCALE, 10 * SCALE, true);
  } else if (props.type === "pile") {
    // Rock pile
    for (let i = 0; i < 5; i++) {
      const size = lerp(15, 30, Math.random());
      const x = cx + (Math.random() - 0.5) * 60 * SCALE;
      const y = cy + (Math.random() - 0.5) * 40 * SCALE;
      drawCircle(ctx, x, y, size * SCALE, true);
    }
  } else if (props.type === "mesa") {
    // Mesa formation
    drawRect(ctx, cx - 60 * SCALE, cy - 20 * SCALE, 120 * SCALE, 40 * SCALE, true);
    drawRect(ctx, cx - 40 * SCALE, cy - 40 * SCALE, 80 * SCALE, 20 * SCALE, true);
    drawRect(ctx, cx - 20 * SCALE, cy - 60 * SCALE, 40 * SCALE, 20 * SCALE, true);
  }
  
  // Cracks
  if (props.cracks) {
    ctx.strokeStyle = P.line;
    for (let i = 0; i < 3; i++) {
      const startX = cx + (Math.random() - 0.5) * 60 * SCALE;
      const startY = cy + (Math.random() - 0.5) * 60 * SCALE;
      const endX = startX + (Math.random() - 0.5) * 30 * SCALE;
      const endY = startY + (Math.random() - 0.5) * 30 * SCALE;
      drawLine(ctx, startX, startY, endX, endY);
    }
  }
}

function renderTumbleweed(ctx, props, frame) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  // Animation rotation
  const rotation = (frame / FRAME_COUNT) * 360;
  
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(deg(rotation));
  ctx.translate(-cx, -cy);
  
  ctx.strokeStyle = P.wood_light;
  
  // Tumbleweed structure
  const radius = 30 * SCALE * props.density;
  const strands = 20;
  
  for (let i = 0; i < strands; i++) {
    const angle = (i / strands) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    // Draw a curved strand
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle + Math.PI/4) * radius * 0.7,
      cy + Math.sin(angle + Math.PI/4) * radius * 0.7,
      x, y
    );
    ctx.stroke();
    
    // Add smaller branches
    for (let j = 0; j < 3; j++) {
      const branchAngle = angle + (j - 1) * 0.3;
      const branchLength = radius * 0.4;
      const startX = cx + Math.cos(angle) * radius * 0.5;
      const startY = cy + Math.sin(angle) * radius * 0.5;
      const endX = startX + Math.cos(branchAngle) * branchLength;
      const endY = startY + Math.sin(branchAngle) * branchLength;
      
      drawLine(ctx, startX, startY, endX, endY);
    }
  }
  
  ctx.restore();
}

function renderSaloon(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  const buildingWidth = 120 * SCALE;
  const buildingHeight = props.storyCount === 2 ? 100 * SCALE : 60 * SCALE;
  const buildingX = cx - buildingWidth / 2;
  const buildingY = cy - buildingHeight / 2;
  
  // Main building
  ctx.fillStyle = P.wood_light;
  drawRect(ctx, buildingX, buildingY, buildingWidth, buildingHeight, true);
  
  // Wood grain
  ctx.strokeStyle = P.wood;
  for (let i = 1; i < 4; i++) {
    drawLine(ctx, buildingX, buildingY + (i * buildingHeight / 4), buildingX + buildingWidth, buildingY + (i * buildingHeight / 4));
  }
  
  // Roof
  ctx.fillStyle = P.red;
  ctx.beginPath();
  ctx.moveTo(buildingX - 10 * SCALE, buildingY);
  ctx.lineTo(buildingX + buildingWidth / 2, buildingY - 20 * SCALE);
  ctx.lineTo(buildingX + buildingWidth + 10 * SCALE, buildingY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Second story if applicable
  if (props.storyCount === 2) {
    ctx.fillStyle = P.wood_light;
    drawRect(ctx, buildingX, buildingY - 40 * SCALE, buildingWidth, 40 * SCALE, true);
    
    // Windows
    ctx.fillStyle = P.sky;
    for (let i = 0; i < 3; i++) {
      drawRect(ctx, buildingX + 20 * SCALE + i * 30 * SCALE, buildingY - 30 * SCALE, 15 * SCALE, 20 * SCALE, true);
    }
  }
  
  // Doors
  ctx.fillStyle = P.wood;
  drawRect(ctx, buildingX + buildingWidth / 2 - 15 * SCALE, buildingY + buildingHeight - 40 * SCALE, 30 * SCALE, 40 * SCALE, true);
  
  // Door details
  ctx.strokeStyle = P.line;
  drawCircle(ctx, buildingX + buildingWidth / 2 + 8 * SCALE, buildingY + buildingHeight - 20 * SCALE, 2 * SCALE, false);
  
  // Windows
  ctx.fillStyle = P.sky;
  for (let i = 0; i < 4; i++) {
    if (i !== 1) { // Skip door position
      drawRect(ctx, buildingX + 15 * SCALE + i * 25 * SCALE, buildingY + 20 * SCALE, 15 * SCALE, 20 * SCALE, true);
    }
  }
  
  // Porch
  if (props.hasPorch) {
    ctx.fillStyle = P.wood;
    drawRect(ctx, buildingX - 10 * SCALE, buildingY + buildingHeight, buildingWidth + 20 * SCALE, 10 * SCALE, true);
    
    // Support posts
    for (let i = 0; i < 3; i++) {
      drawLine(ctx, buildingX + i * (buildingWidth / 2), buildingY + buildingHeight, buildingX + i * (buildingWidth / 2), buildingY + buildingHeight + 20 * SCALE);
    }
  }
  
  // Sign
  if (props.hasSign) {
    ctx.fillStyle = P.yellow;
    drawRect(ctx, buildingX + buildingWidth / 2 - 30 * SCALE, buildingY - 10 * SCALE, 60 * SCALE, 15 * SCALE, true);
    
    ctx.fillStyle = P.line;
    ctx.font = `${10 * SCALE}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("SALOON", buildingX + buildingWidth / 2, buildingY);
  }
}

function renderSheriffOffice(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  const buildingWidth = 100 * SCALE;
  const buildingHeight = 60 * SCALE;
  const buildingX = cx - buildingWidth / 2;
  const buildingY = cy - buildingHeight / 2;
  
  // Main building
  ctx.fillStyle = P.wood_light;
  drawRect(ctx, buildingX, buildingY, buildingWidth, buildingHeight, true);
  
  // Wood grain
  ctx.strokeStyle = P.wood;
  for (let i = 1; i < 4; i++) {
    drawLine(ctx, buildingX, buildingY + (i * buildingHeight / 4), buildingX + buildingWidth, buildingY + (i * buildingHeight / 4));
  }
  
  // Roof
  ctx.fillStyle = P.red;
  ctx.beginPath();
  ctx.moveTo(buildingX - 10 * SCALE, buildingY);
  ctx.lineTo(buildingX + buildingWidth / 2, buildingY - 20 * SCALE);
  ctx.lineTo(buildingX + buildingWidth + 10 * SCALE, buildingY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Door
  ctx.fillStyle = P.wood;
  drawRect(ctx, buildingX + buildingWidth / 2 - 10 * SCALE, buildingY + buildingHeight - 30 * SCALE, 20 * SCALE, 30 * SCALE, true);
  
  // Door details
  ctx.strokeStyle = P.line;
  drawCircle(ctx, buildingX + buildingWidth / 2 + 5 * SCALE, buildingY + buildingHeight - 15 * SCALE, 2 * SCALE, false);
  
  // Window
  ctx.fillStyle = P.sky;
  drawRect(ctx, buildingX + 15 * SCALE, buildingY + 15 * SCALE, 20 * SCALE, 20 * SCALE, true);
  
  // Star badge on building
  ctx.fillStyle = P.yellow;
  drawStar(ctx, buildingX + buildingWidth - 20 * SCALE, buildingY + 20 * SCALE, 10 * SCALE, 5, 0.5);
  
  // Jail cell
  if (props.hasJail) {
    ctx.fillStyle = P.metal;
    drawRect(ctx, buildingX + buildingWidth - 40 * SCALE, buildingY + buildingHeight - 30 * SCALE, 30 * SCALE, 30 * SCALE, true);
    
    // Bars
    ctx.strokeStyle = P.line;
    for (let i = 0; i < 4; i++) {
      drawLine(ctx, buildingX + buildingWidth - 35 * SCALE + i * 8 * SCALE, buildingY + buildingHeight - 30 * SCALE, 
               buildingX + buildingWidth - 35 * SCALE + i * 8 * SCALE, buildingY + buildingHeight);
    }
  }
  
  // Wanted poster
  if (props.hasWantedPoster) {
    ctx.fillStyle = P.yellow;
    drawRect(ctx, buildingX + 10 * SCALE, buildingY + 5 * SCALE, 20 * SCALE, 25 * SCALE, true);
    
    ctx.fillStyle = P.line;
    ctx.font = `${6 * SCALE}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("WANTED", buildingX + 20 * SCALE, buildingY + 15 * SCALE);
    
    // Simple stick figure on poster
    drawCircle(ctx, buildingX + 20 * SCALE, buildingY + 22 * SCALE, 3 * SCALE, false);
    drawLine(ctx, buildingX + 20 * SCALE, buildingY + 25 * SCALE, buildingX + 20 * SCALE, buildingY + 27 * SCALE);
    drawLine(ctx, buildingX + 20 * SCALE, buildingY + 27 * SCALE, buildingX + 17 * SCALE, buildingY + 24 * SCALE);
    drawLine(ctx, buildingX + 20 * SCALE, buildingY + 27 * SCALE, buildingX + 23 * SCALE, buildingY + 24 * SCALE);
  }
}

function renderGeneralStore(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  const buildingWidth = 110 * SCALE;
  const buildingHeight = 60 * SCALE;
  const buildingX = cx - buildingWidth / 2;
  const buildingY = cy - buildingHeight / 2;
  
  // Main building
  ctx.fillStyle = P.wood_light;
  drawRect(ctx, buildingX, buildingY, buildingWidth, buildingHeight, true);
  
  // Wood grain
  ctx.strokeStyle = P.wood;
  for (let i = 1; i < 4; i++) {
    drawLine(ctx, buildingX, buildingY + (i * buildingHeight / 4), buildingX + buildingWidth, buildingY + (i * buildingHeight / 4));
  }
  
  // Roof
  ctx.fillStyle = P.red;
  ctx.beginPath();
  ctx.moveTo(buildingX - 10 * SCALE, buildingY);
  ctx.lineTo(buildingX + buildingWidth / 2, buildingY - 20 * SCALE);
  ctx.lineTo(buildingX + buildingWidth + 10 * SCALE, buildingY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Door
  ctx.fillStyle = P.wood;
  drawRect(ctx, buildingX + buildingWidth / 2 - 10 * SCALE, buildingY + buildingHeight - 30 * SCALE, 20 * SCALE, 30 * SCALE, true);
  
  // Door details
  ctx.strokeStyle = P.line;
  drawCircle(ctx, buildingX + buildingWidth / 2 + 5 * SCALE, buildingY + buildingHeight - 15 * SCALE, 2 * SCALE, false);
  
  // Windows
  ctx.fillStyle = P.sky;
  drawRect(ctx, buildingX + 15 * SCALE, buildingY + 15 * SCALE, 20 * SCALE, 20 * SCALE, true);
  drawRect(ctx, buildingX + buildingWidth - 35 * SCALE, buildingY + 15 * SCALE, 20 * SCALE, 20 * SCALE, true);
  
  // Store display items in windows
  ctx.fillStyle = P.yellow;
  drawCircle(ctx, buildingX + 25 * SCALE, buildingY + 25 * SCALE, 3 * SCALE, true);
  drawRect(ctx, buildingX + buildingWidth - 30 * SCALE, buildingY + 20 * SCALE, 10 * SCALE, 10 * SCALE, true);
  
  // Porch
  if (props.hasPorch) {
    ctx.fillStyle = P.wood;
    drawRect(ctx, buildingX - 10 * SCALE, buildingY + buildingHeight, buildingWidth + 20 * SCALE, 10 * SCALE, true);
    
    // Support posts
    for (let i = 0; i < 3; i++) {
      drawLine(ctx, buildingX + i * (buildingWidth / 2), buildingY + buildingHeight, buildingX + i * (buildingWidth / 2), buildingY + buildingHeight + 20 * SCALE);
    }
  }
  
  // Sign
  if (props.hasSign) {
    ctx.fillStyle = P.yellow;
    drawRect(ctx, buildingX + buildingWidth / 2 - 30 * SCALE, buildingY - 10 * SCALE, 60 * SCALE, 15 * SCALE, true);
    
    ctx.fillStyle = P.line;
    ctx.font = `${8 * SCALE}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("GENERAL STORE", buildingX + buildingWidth / 2, buildingY);
  }
}

function renderWell(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  // Well base
  ctx.fillStyle = P.rock;
  drawCircle(ctx, cx, cy + 20 * SCALE, 40 * SCALE, true);
  
  // Well opening
  ctx.fillStyle = P.sky;
  drawCircle(ctx, cx, cy + 20 * SCALE, 25 * SCALE, true);
  
  // Well structure
  ctx.fillStyle = P.wood;
  drawRect(ctx, cx - 5 * SCALE, cy - 30 * SCALE, 10 * SCALE, 50 * SCALE, true);
  
  // Roof
  if (props.roofType !== "none") {
    ctx.fillStyle = P.red;
    
    if (props.roofType === "simple") {
      // Simple triangular roof
      ctx.beginPath();
      ctx.moveTo(cx - 30 * SCALE, cy - 30 * SCALE);
      ctx.lineTo(cx, cy - 50 * SCALE);
      ctx.lineTo(cx + 30 * SCALE, cy - 30 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (props.roofType === "elaborate") {
      // Elaborate roof with support beams
      ctx.beginPath();
      ctx.moveTo(cx - 40 * SCALE, cy - 30 * SCALE);
      ctx.lineTo(cx, cy - 60 * SCALE);
      ctx.lineTo(cx + 40 * SCALE, cy - 30 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Support beams
      ctx.strokeStyle = P.wood;
      drawLine(ctx, cx - 30 * SCALE, cy - 30 * SCALE, cx - 20 * SCALE, cy - 50 * SCALE);
      drawLine(ctx, cx + 30 * SCALE, cy - 30 * SCALE, cx + 20 * SCALE, cy - 50 * SCALE);
    }
  }
  
  // Bucket and rope
  if (props.hasBucket) {
    // Rope
    ctx.strokeStyle = P.wood_light;
    drawLine(ctx, cx, cy - 30 * SCALE, cx, cy + 10 * SCALE);
    
    // Bucket
    ctx.fillStyle = P.metal;
    drawRect(ctx, cx - 10 * SCALE, cy + 10 * SCALE, 20 * SCALE, 15 * SCALE, true);
    
    // Bucket handle
    ctx.strokeStyle = P.line;
    ctx.beginPath();
    ctx.arc(cx, cy + 10 * SCALE, 10 * SCALE, 0, Math.PI);
    ctx.stroke();
  }
}

function renderFence(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  const segmentWidth = 20 * SCALE;
  const fenceWidth = segmentWidth * props.length;
  const startX = cx - fenceWidth / 2;
  
  if (props.type === "rail") {
    // Rail fence
    ctx.strokeStyle = P.wood;
    ctx.lineWidth = 3 * SCALE;
    
    // Rails
    for (let i = 0; i < 3; i++) {
      drawLine(ctx, startX, cy - 20 * SCALE + i * 20 * SCALE, startX + fenceWidth, cy - 20 * SCALE + i * 20 * SCALE);
    }
    
    // Posts
    ctx.lineWidth = LINE_WIDTH;
    for (let i = 0; i <= props.length; i++) {
      drawLine(ctx, startX + i * segmentWidth, cy - 30 * SCALE, startX + i * segmentWidth, cy + 30 * SCALE);
    }
  } else if (props.type === "picket") {
    // Picket fence
    ctx.fillStyle = P.wood_light;
    
    // Pickets
    for (let i = 0; i < props.length; i++) {
      const x = startX + i * segmentWidth + segmentWidth / 2;
      
      ctx.beginPath();
      ctx.moveTo(x - 5 * SCALE, cy + 20 * SCALE);
      ctx.lineTo(x - 5 * SCALE, cy - 10 * SCALE);
      ctx.lineTo(x, cy - 20 * SCALE);
      ctx.lineTo(x + 5 * SCALE, cy - 10 * SCALE);
      ctx.lineTo(x + 5 * SCALE, cy + 20 * SCALE);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    
    // Rails
    ctx.strokeStyle = P.wood;
    drawLine(ctx, startX, cy + 10 * SCALE, startX + fenceWidth, cy + 10 * SCALE);
    drawLine(ctx, startX, cy - 5 * SCALE, startX + fenceWidth, cy - 5 * SCALE);
  } else if (props.type === "corral") {
    // Corral fence (sturdy posts with horizontal rails)
    ctx.strokeStyle = P.wood;
    
    // Posts
    for (let i = 0; i <= props.length; i++) {
      const x = startX + i * segmentWidth;
      
      ctx.lineWidth = 4 * SCALE;
      drawLine(ctx, x, cy - 30 * SCALE, x, cy + 30 * SCALE);
    }
    
    // Rails
    ctx.lineWidth = 3 * SCALE;
    for (let i = 0; i < 4; i++) {
      drawLine(ctx, startX, cy - 20 * SCALE + i * 15 * SCALE, startX + fenceWidth, cy - 20 * SCALE + i * 15 * SCALE);
    }
    
    // Wire
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = P.metal;
    for (let i = 0; i < 2; i++) {
      drawLine(ctx, startX, cy - 10 * SCALE + i * 20 * SCALE, startX + fenceWidth, cy - 10 * SCALE + i * 20 * SCALE);
    }
  }
}

function renderWagon(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  // Wagon body
  ctx.fillStyle = P.wood_light;
  drawRect(ctx, cx - 40 * SCALE, cy - 10 * SCALE, 80 * SCALE, 30 * SCALE, true);
  
  // Wood grain
  ctx.strokeStyle = P.wood;
  for (let i = 1; i < 4; i++) {
    drawLine(ctx, cx - 40 * SCALE, cy - 10 * SCALE + i * 10 * SCALE, cx + 40 * SCALE, cy - 10 * SCALE + i * 10 * SCALE);
  }
  
  // Wheels
  ctx.fillStyle = P.wood;
  drawCircle(ctx, cx - 25 * SCALE, cy + 20 * SCALE, 12 * SCALE, true);
  drawCircle(ctx, cx + 25 * SCALE, cy + 20 * SCALE, 12 * SCALE, true);
  
  // Wheel spokes
  ctx.strokeStyle = P.line;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    drawLine(ctx, cx - 25 * SCALE, cy + 20 * SCALE, 
             cx - 25 * SCALE + Math.cos(angle) * 10 * SCALE, 
             cy + 20 * SCALE + Math.sin(angle) * 10 * SCALE);
    drawLine(ctx, cx + 25 * SCALE, cy + 20 * SCALE, 
             cx + 25 * SCALE + Math.cos(angle) * 10 * SCALE, 
             cy + 20 * SCALE + Math.sin(angle) * 10 * SCALE);
  }
  
  // Wagon cover
  if (props.type === "covered") {
    ctx.fillStyle = P.red;
    ctx.beginPath();
    ctx.moveTo(cx - 40 * SCALE, cy - 10 * SCALE);
    ctx.lineTo(cx - 30 * SCALE, cy - 40 * SCALE);
    ctx.lineTo(cx + 30 * SCALE, cy - 40 * SCALE);
    ctx.lineTo(cx + 40 * SCALE, cy - 10 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
function renderMountain(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  ctx.fillStyle = P.mountain;
  
  if (props.type === "single") {
    // Single mountain peak
    ctx.beginPath();
    ctx.moveTo(cx - 80 * SCALE, cy + 40 * SCALE);
    ctx.lineTo(cx, cy - 60 * SCALE);
    ctx.lineTo(cx + 80 * SCALE, cy + 40 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Snow cap
    if (props.hasSnow) {
      ctx.fillStyle = "#f0f0f0";
      ctx.beginPath();
      ctx.moveTo(cx - 30 * SCALE, cy - 20 * SCALE);
      ctx.lineTo(cx, cy - 60 * SCALE);
      ctx.lineTo(cx + 30 * SCALE, cy - 20 * SCALE);
      ctx.closePath();
      ctx.fill();
    }
  } else if (props.type === "range") {
    // Mountain range
    ctx.beginPath();
    ctx.moveTo(cx - 100 * SCALE, cy + 40 * SCALE);
    ctx.lineTo(cx - 60 * SCALE, cy - 20 * SCALE);
    ctx.lineTo(cx - 20 * SCALE, cy - 50 * SCALE);
    ctx.lineTo(cx + 20 * SCALE, cy - 10 * SCALE);
    ctx.lineTo(cx + 60 * SCALE, cy - 40 * SCALE);
    ctx.lineTo(cx + 100 * SCALE, cy + 40 * SCALE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Snow caps
    if (props.hasSnow) {
      ctx.fillStyle = "#f0f0f0";
      
      // Peak 1
      ctx.beginPath();
      ctx.moveTo(cx - 30 * SCALE, cy - 20 * SCALE);
      ctx.lineTo(cx - 20 * SCALE, cy - 50 * SCALE);
      ctx.lineTo(cx - 10 * SCALE, cy - 20 * SCALE);
      ctx.closePath();
      ctx.fill();
      
      // Peak 2
      ctx.beginPath();
      ctx.moveTo(cx + 50 * SCALE, cy - 20 * SCALE);
      ctx.lineTo(cx + 60 * SCALE, cy - 40 * SCALE);
      ctx.lineTo(cx + 70 * SCALE, cy - 20 * SCALE);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function renderSign(ctx, props) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  // Sign post
  ctx.fillStyle = P.wood;
  drawRect(ctx, cx - 3 * SCALE, cy, 6 * SCALE, 60 * SCALE, true);
  
  // Sign board
  ctx.fillStyle = P.yellow;
  
  if (props.shape === "rectangle") {
    drawRect(ctx, cx - 40 * SCALE, cy - 30 * SCALE, 80 * SCALE, 30 * SCALE, true);
  } else if (props.shape === "arrow") {
    ctx.beginPath();
    ctx.moveTo(cx - 40 * SCALE, cy - 20 * SCALE);
    ctx.lineTo(cx + 20 * SCALE, cy - 20 * SCALE);
    ctx.lineTo(cx + 40 * SCALE, cy - 10 * SCALE);
    ctx.lineTo(cx + 20 * SCALE, cy);
    ctx.lineTo(cx - 40 * SCALE, cy);
    ctx.closePath();
    ctx.fill();
  } else if (props.shape === "oval") {
    drawCircle(ctx, cx, cy - 15 * SCALE, 30 * SCALE, true);
  }
  
  ctx.stroke();
  
  // Text
  ctx.fillStyle = P.line;
  ctx.font = `${12 * SCALE}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(props.text, cx, cy - 15 * SCALE);
}

function renderCampfire(ctx, props, frame) {
  const P = props.palette;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  
  // Fire animation
  const flicker = Math.sin((frame / FRAME_COUNT) * Math.PI * 2) * 5 + 5;
  
  // Logs
  if (props.hasLogs) {
    ctx.fillStyle = P.wood;
    
    // Bottom log
    drawRect(ctx, cx - 30 * SCALE, cy + 10 * SCALE, 60 * SCALE, 10 * SCALE, true);
    
    // Top log
    ctx.save();
    ctx.translate(cx, cy + 15 * SCALE);
    ctx.rotate(deg(90));
    ctx.translate(-cx, -(cy + 15 * SCALE));
    drawRect(ctx, cx - 30 * SCALE, cy + 10 * SCALE, 60 * SCALE, 10 * SCALE, true);
    ctx.restore();
  }
  
  // Fire
  ctx.fillStyle = P.orange;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 15 * SCALE, cy + 10 * SCALE);
  ctx.lineTo(cx - 10 * SCALE, cy - (10 + flicker) * SCALE);
  ctx.lineTo(cx, cy - (20 + flicker) * SCALE);
  ctx.lineTo(cx + 10 * SCALE, cy - (10 + flicker) * SCALE);
  ctx.lineTo(cx + 15 * SCALE, cy + 10 * SCALE);
  ctx.closePath();
  ctx.fill();
  
  // Inner flame
  ctx.fillStyle = P.yellow;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 5 * SCALE);
  ctx.lineTo(cx - 8 * SCALE, cy + 8 * SCALE);
  ctx.lineTo(cx - 5 * SCALE, cy - (5 + flicker/2) * SCALE);
  ctx.lineTo(cx, cy - (10 + flicker/2) * SCALE);
  ctx.lineTo(cx + 5 * SCALE, cy - (5 + flicker/2) * SCALE);
  ctx.lineTo(cx + 8 * SCALE, cy + 8 * SCALE);
  ctx.closePath();
  ctx.fill();
  
  // Pot
  if (props.hasPot) {
    ctx.fillStyle = P.metal;
    drawCircle(ctx, cx, cy - (20 + flicker) * SCALE, 15 * SCALE, true);
    
    // Pot handle
    ctx.strokeStyle = P.metal;
    ctx.lineWidth = 2 * SCALE;
    drawLine(ctx, cx - 15 * SCALE, cy - (20 + flicker) * SCALE, cx - 25 * SCALE, cy - (20 + flicker) * SCALE);
    drawLine(ctx, cx + 15 * SCALE, cy - (20 + flicker) * SCALE, cx + 25 * SCALE, cy - (20 + flicker) * SCALE);
    ctx.lineWidth = LINE_WIDTH;
  }
}

// Helper function to draw a star
function drawStar(ctx, cx, cy, radius, points, innerRadius) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * innerRadius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Helper function to draw a star
function drawStar(ctx, cx, cy, radius, points, innerRadius) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * innerRadius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ----------------------------------------------------
// Generation (frames + optional sprite sheets + metadata)
// ----------------------------------------------------
function renderAll() {
  let totalElements = 0;
  
  for (const elementType of ENV_TYPES) {
    // Determine if this element type is animated
    const isAnimated = ANIMATED_TYPES.includes(elementType);
    const frameCount = isAnimated ? FRAME_COUNT : 1;
    
    for (let variation = 0; variation < VARIATIONS; variation++) {
      const elementId = `${elementType}_${variation}`;
      
      const meta = {
        id: elementId,
        type: elementType,
        palette: buildElementVariations(elementType, variation).palette.name,
        animated: isAnimated,
        frames: {},
        frameCount: frameCount,
        size: SPRITE_SIZE,
      };
      
      // Prepare sprite sheet canvas
      const sheet = createCanvas(SIZE * frameCount, SIZE);
      const sheetCtx = sheet.getContext("2d");
      sheetCtx.lineWidth = LINE_WIDTH;
      sheetCtx.lineCap = "round";
      sheetCtx.lineJoin = "round";
      
      for (let frame = 0; frame < frameCount; frame++) {
        const canvas = createCanvas(SIZE, SIZE);
        const ctx = canvas.getContext("2d");
        renderEnvironmentElement(ctx, elementType, variation, frame);
        
        // Individual frame output
        const filename = `${elementId}_${frame}.png`;
        const outPath = path.join(OUTPUT_DIR, filename);
        const out = fs.createWriteStream(outPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        
        // Add to sheet
        sheetCtx.drawImage(canvas, frame * SIZE, 0);
        
        // Metadata frame rect
        meta.frames[frame] = {
          x: frame * SPRITE_SIZE,
          y: 0,
          w: SPRITE_SIZE,
          h: SPRITE_SIZE,
        };
      }
      
      // Save sprite sheet
      const sheetPath = path.join(SHEET_DIR, `${elementId}_sheet.png`);
      const sheetOut = fs.createWriteStream(sheetPath);
      const sheetStream = sheet.createPNGStream();
      sheetStream.pipe(sheetOut);
      
      // Save metadata
      const metaPath = path.join(OUTPUT_DIR, `${elementId}_meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      
      totalElements++;
    }
  }
  
  console.log(`✅ Generated ${totalElements} environment elements with variations`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  if (ENABLE_SPRITE_SHEETS) {
    console.log(`📄 Sprite sheets: ${SHEET_DIR}`);
  }
  console.log(`🌵 Available environment types: ${ENV_TYPES.join(", ")}`);
  console.log(`🎬 Animated elements: ${ANIMATED_TYPES.join(", ")}`);
}

// ----------------------------------------------------
// Run
// ----------------------------------------------------
if (require.main === module) {
  renderAll();
}

module.exports = { renderEnvironmentElement, buildElementVariations, ENV_TYPES };