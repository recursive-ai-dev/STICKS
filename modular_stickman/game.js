// game.js
// Main game entry point for STICKS: Godfall Echoes
// Integrates physics, animation, and Godfall delusion systems

import { StickmanPhysics } from './physics_engine.js';
import { loadAnimation } from './animations.js';

// Game state
class StickGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) {
      // Create canvas if it doesn't exist
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'gameCanvas';
      this.canvas.width = 800;
      this.canvas.height = 600;
      document.body.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d');
    this.physics = new StickmanPhysics('gameCanvas');
    
    // Game state
    this.gameRunning = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    
    // Initialize game
    this.init();
  }

  init() {
    // Create initial stickman
    const stickman = this.physics.createStickman(400, 100);
    
    // Start world pulse timer
    this.physics.startWorldPulseTimer();
    
    // Setup game loop
    this.gameRunning = true;
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    
    console.log('STICKS: Godfall Echoes - Game initialized!');
    console.log('Controls:');
    console.log('- Mouse drag: Pull/throw limbs');
    console.log('- Space: Trigger Delusion Burst');
    console.log('- Q/E: Cycle attachments');
    console.log('- Click on limbs to grab them');
  }

  gameLoop(timestamp) {
    if (!this.gameRunning) return;

    // Calculate delta time
    this.deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Update physics
    this.physics.engine.update(1000 / 60); // Fixed timestep

    // Render
    this.render();

    // Continue game loop
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background with Godfall theme
    this.drawBackground();
    
    // Draw physics objects
    this.physics.renderFrame(this.ctx, this.deltaTime);
    
    // Draw UI
    this.drawUI();
  }

  drawBackground() {
    // Godfall-themed background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e'); // Deep purple
    gradient.addColorStop(1, '#0d0d33'); // Dark blue
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Add subtle static effect for delusion
    if (Math.random() > 0.7) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      this.ctx.fillRect(Math.random() * this.canvas.width, Math.random() * this.canvas.height, 2, 2);
    }
  }

  drawUI() {
    // Draw instructions
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('STICKS: GODFALL ECHOES', 20, 20);
    
    // Draw controls
    this.ctx.fillText('Controls:', 20, 40);
    this.ctx.fillText('- Mouse drag: Pull/throw limbs', 20, 60);
    this.ctx.fillText('- Space: Delusion Burst', 20, 80);
    this.ctx.fillText('- Q/E: Cycle attachments', 20, 100);
    
    // Draw delusion status
    if (this.physics.stickmen.length > 0) {
      const stickman = this.physics.stickmen[0];
      if (stickman.delusionTraits.length > 0) {
        this.ctx.fillText(`Delusions: ${stickman.delusionTraits.join(', ')}`, 20, 120);
      }
    }
    
    // Draw FPS
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${Math.round(1000 / this.deltaTime) || 0}`, this.canvas.width - 20, 20);
  }

  // Helper methods for game state
  addStickman(x, y) {
    return this.physics.createStickman(x, y);
  }

  triggerDelusionBurst() {
    this.physics.triggerDelusionBurst();
  }

  start() {
    this.gameRunning = true;
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  pause() {
    this.gameRunning = false;
  }

  reset() {
    this.physics.destroy();
    this.physics = new StickmanPhysics('gameCanvas');
    this.init();
  }
}

// Export for module usage
export { StickGame };

// Auto-initialize if running in browser
if (typeof window !== 'undefined' && window.document) {
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new StickGame();
  });
}