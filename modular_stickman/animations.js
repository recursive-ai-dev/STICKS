/**
 * animations.js
 * Optimized animation data loader for STICKS: Godfall Echoes.
 * Supports both Node.js (for sprite generation) and Browser (for live gameplay) environments.
 * Features an in-memory cache and security hardening against path traversal.
 */

import fs from 'fs';
import path from 'path';

/**
 * Performance: Cache for animation data to avoid redundant I/O and parsing.
 * @type {Map<string, Object>}
 */
const animationCache = new Map();

/**
 * Loads animation data from JSON.
 * @param {string} animationName - The name of the animation (e.g., 'walk').
 * @returns {Object|null} The animation data object or null if not found/invalid.
 */
export function loadAnimation(animationName) {
    // 1. Security: Prevent path traversal and input validation
    if (typeof animationName !== 'string' ||
        animationName.includes('..') ||
        animationName.includes('/') ||
        animationName.includes('\\')) {
        console.error(`[Animations] Security Warning: Invalid animation name: ${animationName}`);
        return null;
    }

    // 2. Performance: Return cached data if available
    if (animationCache.has(animationName)) {
        return animationCache.get(animationName);
    }

    // 3. Environment-specific loading
    // Since this project is ESM and uses Node for generation, we can use synchronous fs
    try {
        const animationsDir = path.join(process.cwd(), 'modular_stickman', 'animations');
        const filePath = path.join(animationsDir, `${animationName}.json`);

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            animationCache.set(animationName, data);
            return data;
        }
    } catch (e) {
        // Fallback or silent fail for browser context where fs might not be available
        // if bundled. In our current ESM setup, imports will fail if fs isn't there.
    }

    return null;
}

/**
 * Async version of loadAnimation for browser fetching.
 * @param {string} animationName
 * @param {string} [baseUrl='/modular_stickman/animations/']
 * @returns {Promise<Object|null>}
 */
export async function fetchAnimation(animationName, baseUrl = './animations/') {
    if (animationCache.has(animationName)) {
        return animationCache.get(animationName);
    }

    try {
        const response = await fetch(`${baseUrl}${animationName}.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        animationCache.set(animationName, data);
        return data;
    } catch (e) {
        console.error(`[Animations] Failed to fetch animation ${animationName}:`, e.message);
        return null;
    }
}
