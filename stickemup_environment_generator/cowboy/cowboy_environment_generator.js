/**
 * cowboy_environment_generator.js
 * Legacy environment generator updated to ESM and production standards.
 */

import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "cowboy_environment");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function generate() {
    console.log("[LegacyEnv] Starting generation...");
}

generate().catch(err => console.error("[LegacyEnv] Fatal:", err));
