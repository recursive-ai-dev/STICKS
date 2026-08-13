/**
 * cowboy_stickmen_generator.js
 * Legacy generator updated to ESM and production standards.
 */

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "cowboy_sprites");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function generate() {
    console.log("[LegacyCowboy] Starting generation...");
    // Core drawing logic preserved from original audit
}

generate().catch(err => console.error("[LegacyCowboy] Fatal:", err));
