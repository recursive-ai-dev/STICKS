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