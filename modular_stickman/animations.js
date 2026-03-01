import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANIMATIONS_DIR = path.join(__dirname, "animations");

// Ensure animations directory exists
if (!fs.existsSync(ANIMATIONS_DIR)) {
    fs.mkdirSync(ANIMATIONS_DIR);
}

// Function to load animation data from JSON files
function loadAnimation(animationName) {
    // Security: Prevent path traversal by ensuring animationName doesn't contain path separators or parent directory references
    if (typeof animationName !== 'string' || animationName.includes('..') || animationName.includes('/') || animationName.includes('\\')) {
        console.error(`Security Warning: Invalid animation name provided: ${animationName}`);
        return null;
    }

    const animationPath = path.join(ANIMATIONS_DIR, `${animationName}.json`);
    if (fs.existsSync(animationPath)) {
        const animationData = JSON.parse(fs.readFileSync(animationPath, "utf8"));
        return animationData;
    } else {
        console.warn(`Animation file not found: ${animationPath}`);
        return null;
    }
}

export { loadAnimation };