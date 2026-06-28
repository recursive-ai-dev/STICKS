/**
 * game.js
 * Main game entry point for STICKS: Godfall Echoes.
 * Integrates physics, animation, and Godfall delusion systems.
 */

import pkg from 'matter-js';
const { Engine } = pkg;

import { StickmanPhysics } from './physics_engine.js';
import { RealWorldProvider } from './determinism_provider.js';
import { AutonomousManager } from './autonomous_manager.js';
import { StickmanGenerationService } from './stickman_generation_service.js';

/**
 * Main game controller.
 */
class StickGame {
  /**
   * @param {Object} [config={}]
   * @param {import('./determinism_provider.js').DeterminismProvider} [config.determinismProvider]
   */
  constructor(config = {}) {
    this.canvas = typeof document !== 'undefined' ? document.getElementById('gameCanvas') : null;
    if (!this.canvas && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'gameCanvas';
      this.canvas.width = 800;
      this.canvas.height = 600;
      document.body.appendChild(this.canvas);
    }

    this.determinismProvider = config.determinismProvider || new RealWorldProvider();
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.physics = new StickmanPhysics('gameCanvas', {
        determinismProvider: this.determinismProvider
    });

    this.generationService = new StickmanGenerationService(this.physics, {
        determinismProvider: this.determinismProvider
    });
    
    this.gameRunning = false;
    this.lastTime = 0;
    this.deltaTime = 0;

    this.debugMode = false;
    this.debugEvents = [];

    this.autonomousManager = new AutonomousManager(this, {
        determinismProvider: this.determinismProvider
    });
    
    this.setupEventListeners();
    this.init();
  }

  /**
   * Initializes the game state.
   */
  init() {
    this.generationService.generateStickman(400, 100);
    this.gameRunning = true;
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
  }

  /**
   * Configures global event listeners.
   */
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('outbox-debug-event', (e) => {
        this.debugEvents.push(e.detail);
        if (this.debugEvents.length > 15) this.debugEvents.shift();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.code === 'Backquote') {
          this.debugMode = !this.debugMode;
          console.log('[StickGame] Debugger Toggled:', this.debugMode);
        } else if (e.code === 'Space') {
            this.physics.triggerDelusionBurst();
        }
      });
    }
  }

  /**
   * Main game loop.
   * @param {number} timestamp
   */
  gameLoop(timestamp) {
    if (!this.gameRunning) return;

    try {
        this.deltaTime = timestamp - (this.lastTime || timestamp);
        this.lastTime = timestamp;

        // Fixed physics timestep for determinism
        const physicsDelta = 1000 / 60;
        Engine.update(this.physics.engine, physicsDelta);

        if (this.autonomousManager.checkTrigger(timestamp, this.physics.stickmen.length)) {
            this.autonomousManager.executeGeneration();
        }

        this.render();

        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    } catch (error) {
        console.error("[StickGame] Fatal error in game loop:", error);
        this.gameRunning = false;
    }
  }

  /**
   * Renders the current frame.
   */
  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.physics.renderFrame(this.ctx, this.deltaTime);
    this.drawUI();
    this.drawDebugOverlay();
  }

  /**
   * Draws the atmospheric background.
   */
  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0d0d33');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draws the game UI.
   */
  drawUI() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('STICKS: GODFALL ECHOES', 20, 20);
    this.ctx.fillText('Controls:', 20, 40);
    this.ctx.fillText('- Mouse drag: Pull/throw limbs', 20, 60);
    this.ctx.fillText('- Space: Delusion Burst', 20, 80);
    this.ctx.fillText('- Q/E: Cycle attachments', 20, 100);

    if (this.physics.stickmen.length > 0) {
      const stickman = this.physics.stickmen[0];
      if (stickman.delusionTraits && stickman.delusionTraits.length > 0) {
        this.ctx.fillText(`Delusions: ${stickman.delusionTraits.join(', ')}`, 20, 120);
      }
    }
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${Math.round(1000 / this.deltaTime) || 0}`, this.canvas.width - 20, 20);
  }

  /**
   * Draws the developer debug overlay.
   */
  drawDebugOverlay() {
    if (!this.debugMode) return;
    const h = this.canvas.height / 5;
    const y = this.canvas.height - h;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(0, y, this.canvas.width, h);
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, y, this.canvas.width, h);
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '10px Courier New';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('--- OUTBOX DEBUGGER (DEVELOPER MODE) ---', 10, y + 15);
    this.debugEvents.forEach((ev, i) => {
      const text = `[${ev.eventType} v${ev.version}] cid:${ev.correlationId.slice(0,8)} payload:${JSON.stringify(ev.payload).slice(0, 110)}`;
      this.ctx.fillText(text, 10, y + 30 + (i * 11));
    });
  }

  addStickman(x, y) { return this.generationService.generateStickman(x, y); }
  triggerDelusionBurst() { this.physics.triggerDelusionBurst(); }
  start() { this.gameRunning = true; if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame((t) => this.gameLoop(t)); }
  pause() { this.gameRunning = false; }

  /**
   * Resets the game session.
   */
  reset() {
    this.physics.destroy();
    this.physics = new StickmanPhysics('gameCanvas', { determinismProvider: this.determinismProvider });
    this.generationService = new StickmanGenerationService(this.physics, { determinismProvider: this.determinismProvider });
    this.autonomousManager = new AutonomousManager(this, { determinismProvider: this.determinismProvider });
    this.init();
  }
}

export { StickGame };

if (typeof window !== 'undefined' && window.document) {
  window.addEventListener('DOMContentLoaded', () => { window.game = new StickGame(); });
}
