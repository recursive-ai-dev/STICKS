/**
 * animation_renderer.js
 * Applies procedural animation data to stickman rendering in STICKS: Godfall Echoes.
 * Decouples logic from the specific drawing implementation.
 */

import { loadAnimation } from "./animations.js";

/**
 * @typedef {Object} BodyPartState
 * @property {number} angle - Rotation in degrees.
 * @property {number} [length] - Length of the limb.
 * @property {boolean} [visible] - Whether the part should be drawn.
 * @property {string} [position] - Special position state (e.g., 'impact').
 */

/**
 * Applies a specific frame of an animation to a character's context.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {Object} character - The stickman entity.
 * @param {number} frame - Global frame count.
 * @param {string} direction - 'left', 'right', 'front', 'back'.
 * @param {Object} traits - Visual traits (palette, etc).
 * @param {string} animationName - Name of the animation to apply.
 * @param {number} animationFrame - Specific frame index within the animation.
 * @returns {Object|null} The resolved body parts state for this frame.
 */
function applyAnimationFrame(ctx, character, frame, direction, traits, animationName, animationFrame) {
    const animation = loadAnimation(animationName);
    if (!animation) {
        return null;
    }

    const frameData = animation.frames.find(f => f.frame === animationFrame);
    if (!frameData) {
        return null;
    }

    const bodyParts = frameData.bodyParts;
    
    // 1. Render Layer: Background/Equipment Effects
    renderEquipmentEffects(ctx, bodyParts, traits);

    // 2. Render Layer: Animation-Specific Visuals (Impacts, Motion Lines)
    renderAnimationVFX(ctx, animationName, animationFrame, bodyParts);

    return bodyParts;
}

/**
 * Renders equipment-specific visuals like weapons.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} bodyParts
 * @param {Object} traits
 */
function renderEquipmentEffects(ctx, bodyParts, traits) {
    if (bodyParts.gun && bodyParts.gun.visible) {
        const SCALE = 1;
        const cx = 50; // Logical center for 100x100 sprites
        const shoulderY = 48; // Logic match to physics
        
        ctx.save();
        ctx.strokeStyle = traits.palette?.line || "#444";
        ctx.fillStyle = traits.palette?.metal || "#666";
        
        const armAngle = (bodyParts.rightArm.angle * Math.PI) / 180;
        const armLength = (bodyParts.rightArm.length || 18) * SCALE;
        const gunX = cx + Math.cos(armAngle) * armLength;
        const gunY = shoulderY + Math.sin(armAngle) * armLength;
        
        // Draw gun
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX + 12 * SCALE, gunY - 2 * SCALE);
        ctx.lineWidth = 3 * SCALE;
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Renders procedural VFX based on the active animation.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} animationName
 * @param {number} animationFrame
 * @param {Object} bodyParts
 */
function renderAnimationVFX(ctx, animationName, animationFrame, bodyParts) {
    // Impact Frame for combat
    if (animationName === "bar_fight" && animationFrame === 2 && bodyParts.rightArm.position === "impact") {
        drawImpactBurst(ctx, 50, 50, "#ffff00");
    }

    // Motion lines for high-velocity movement
    if (animationName === "jump" && animationFrame >= 2 && animationFrame <= 5) {
        drawMotionLines(ctx, 50, 70, "rgba(150, 150, 150, 0.4)");
    }
}

/**
 * Helper to draw starburst impact effect.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} color
 */
function drawImpactBurst(ctx, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
        ctx.lineTo(x + Math.cos(angle) * 25, y + Math.sin(angle) * 25);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Helper to draw speed lines.
 */
function drawMotionLines(ctx, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        const offset = i * 6;
        ctx.beginPath();
        ctx.moveTo(x - 20, y + offset);
        ctx.lineTo(x + 20, y + offset);
        ctx.stroke();
    }
    ctx.restore();
}

export {
    applyAnimationFrame,
};
