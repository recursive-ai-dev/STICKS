
import { loadAnimation } from "./animations.js";

// Function to apply animation data to character rendering
function applyAnimationFrame(ctx, character, frame, direction, traits, animationName, animationFrame) {
    const animation = loadAnimation(animationName);
    if (!animation) {
        return; // No animation found, use default behavior
    }

    const frameData = animation.frames.find(f => f.frame === animationFrame);
    if (!frameData) {
        return; // No frame data found
    }

    // Apply animation-specific modifications to the rendering
    const bodyParts = frameData.bodyParts;
    
    // Draw gun if visible
    if (bodyParts.gun && bodyParts.gun.visible) {
        const SCALE = 1; // Match the original scale
        const SIZE = 100 * SCALE;
        const cx = SIZE / 2;
        const bodyTop = 42 * SCALE;
        const shoulderY = bodyTop + 6 * SCALE;
        
        ctx.save();
        ctx.strokeStyle = "#444444";
        ctx.fillStyle = "#666666";
        
        // Calculate gun position based on arm angle
        const armAngle = (bodyParts.rightArm.angle * Math.PI) / 180;
        const armLength = bodyParts.rightArm.length * SCALE;
        const gunX = cx + Math.cos(armAngle) * armLength;
        const gunY = shoulderY + Math.sin(armAngle) * armLength;
        
        // Draw gun barrel
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX + 12 * SCALE, gunY - 2 * SCALE);
        ctx.lineWidth = 3 * SCALE;
        ctx.stroke();
        
        // Draw gun handle
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX - 3 * SCALE, gunY + 8 * SCALE);
        ctx.stroke();
        
        // Draw trigger guard
        ctx.beginPath();
        ctx.arc(gunX - 1 * SCALE, gunY + 4 * SCALE, 3 * SCALE, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }

    // Add visual effects for impact frame
    if (animationName === "bar_fight" && animationFrame === 2 && bodyParts.rightArm.position === "impact") {
        const SCALE = 1;
        const SIZE = 100 * SCALE;
        const cx = SIZE / 2;
        
        ctx.save();
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2 * SCALE;
        
        // Draw impact lines
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const startX = cx + Math.cos(angle) * 15 * SCALE;
            const startY = 50 * SCALE + Math.sin(angle) * 15 * SCALE;
            const endX = cx + Math.cos(angle) * 25 * SCALE;
            const endY = 50 * SCALE + Math.sin(angle) * 25 * SCALE;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Add motion lines during jump
    if (animationName === "jump" && animationFrame >= 2 && animationFrame <= 5) {
        const SCALE = 1;
        const SIZE = 100 * SCALE;
        const cx = SIZE / 2;
        
        ctx.save();
        ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
        ctx.lineWidth = 1 * SCALE;
        
        // Draw motion lines
        for (let i = 0; i < 3; i++) {
            const y = 70 * SCALE + i * 5 * SCALE;
            ctx.beginPath();
            ctx.moveTo(cx - 20 * SCALE, y);
            ctx.lineTo(cx + 20 * SCALE, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    return bodyParts; // Return the body parts data to be used in rendering
}

export {
    applyAnimationFrame,
};
