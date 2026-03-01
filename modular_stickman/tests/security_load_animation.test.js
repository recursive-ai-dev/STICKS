import { loadAnimation } from '../animations.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    console.log("Running Security Test for loadAnimation...");

    // Test 1: Valid animation name
    console.log("\nTest 1: Valid animation name");
    // Ensure an animation file exists for testing
    const animDir = path.join(__dirname, '../animations');
    if (!fs.existsSync(animDir)) fs.mkdirSync(animDir);
    fs.writeFileSync(path.join(animDir, 'test_anim.json'), JSON.stringify({ name: 'test' }));

    const validResult = loadAnimation('test_anim');
    if (validResult && validResult.name === 'test') {
        console.log("✅ Valid animation loaded successfully.");
    } else {
        console.error("❌ Failed to load valid animation.");
        process.exit(1);
    }

    // Test 2: Path traversal attempt (..)
    console.log("\nTest 2: Path traversal attempt (..)");
    const traversalResult = loadAnimation('../package');
    if (traversalResult === null) {
        console.log("✅ Path traversal (..) blocked.");
    } else {
        console.error("❌ Path traversal (..) was NOT blocked!");
        process.exit(1);
    }

    // Test 3: Absolute path attempt (/)
    console.log("\nTest 3: Path separator attempt (/)");
    const slashResult = loadAnimation('subdir/test');
    if (slashResult === null) {
        console.log("✅ Path separator (/) blocked.");
    } else {
        console.error("❌ Path separator (/) was NOT blocked!");
        process.exit(1);
    }

    // Test 4: Backslash attempt (\)
    console.log("\nTest 4: Backslash attempt (\\)");
    const backslashResult = loadAnimation('subdir\\test');
    if (backslashResult === null) {
        console.log("✅ Backslash (\\) blocked.");
    } else {
        console.error("❌ Backslash (\\) was NOT blocked!");
        process.exit(1);
    }

    console.log("\nAll security tests passed! 🎉");

    // Cleanup
    fs.unlinkSync(path.join(animDir, 'test_anim.json'));
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
