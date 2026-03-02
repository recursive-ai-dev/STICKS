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

// Performance: Cache for animation data to avoid redundant disk I/O and parsing
const animationCache = new Map();

/**
 * Function to load animation data from JSON files
 * Optimized with an in-memory cache for high-frequency rendering loops.
 */
function loadAnimation(animationName) {
    // Security: Prevent path traversal by ensuring animationName doesn't contain path separators or parent directory references
    if (typeof animationName !== 'string' || animationName.includes('..') || animationName.includes('/') || animationName.includes('\\')) {
        console.error(`Security Warning: Invalid animation name provided: ${animationName}`);
        return null;
    }

    // Performance: Return cached animation data if available
    if (animationCache.has(animationName)) {
        return animationCache.get(animationName);
    }

    const animationPath = path.join(ANIMATIONS_DIR, `${animationName}.json`);
    if (fs.existsSync(animationPath)) {
        try {
            const animationData = JSON.parse(fs.readFileSync(animationPath, "utf8"));

            // Performance: Store in cache for future requests
            animationCache.set(animationName, animationData);

            return animationData;
        } catch (error) {
            console.error(`Error parsing animation file ${animationPath}:`, error);
            return null;
        }
    } else {
        console.warn(`Animation file not found: ${animationPath}`);
        return null;
    }
}

export { loadAnimation };