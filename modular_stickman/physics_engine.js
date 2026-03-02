// physics_engine.js
// Core physics system for STICKS: Godfall Echoes
// Uses Matter.js for rigid body physics with limb detachment mechanics

import pkg from 'matter-js';
const { Engine, Render, World, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = pkg;

import { applyAnimationFrame } from './animation_renderer.js';
import { LimbDetachmentService } from './limb_detachment_service.js';
import { RealWorldProvider } from './determinism_provider.js';

/**
 * Harmonic Madness Field
 * Calculates physics perturbations using evolving Fourier series.
 */
class MadnessField {
  constructor(baseGravity, baseFriction) {
    this.baseGravity = baseGravity;
    this.baseFriction = baseFriction;
    this.intensity = 0;
    this.harmonics = [
      { amplitude: 0.1, frequency: 0.001, phase: 0 }, // Low-freq drift
      { amplitude: 0.05, frequency: 0.005, phase: Math.PI / 4 }, // Mid-freq jitter
      { amplitude: 0.02, frequency: 0.015, phase: Math.PI / 2 }  // High-freq micro-oscillations
    ];
    this.time = 0;
  }

  update(deltaTime, stickmanCount) {
    this.time += deltaTime;
    // Intensity scales with the number of stickmen or other chaos factors
    this.intensity = Math.min(1.0, 0.2 + (stickmanCount * 0.1));
  }

  /**
   * Calculates the current harmonic perturbation for a given property.
   */
  calculatePerturbation() {
    return this.harmonics.reduce((acc, h) => {
      return acc + h.amplitude * Math.sin(this.time * h.frequency + h.phase);
    }, 0) * this.intensity;
  }

  getCurrentGravity() {
    const perturbation = this.calculatePerturbation();
    return this.baseGravity * (1 + perturbation);
  }

  getCurrentFriction() {
    const perturbation = this.calculatePerturbation();
    return this.baseFriction * (1 + perturbation);
  }
}

// Physics constants
const GRAVITY = 0.8;
const FRICTION = 0.005;
const RESTITUTION = 0.3;
const LIMB_DETACH_THRESHOLD = 15; // velocity threshold for limb detachment

// Limb types with metadata
const LIMB_TYPES = {
  head: { mass: 0.5, width: 20, height: 20, type: 'head' },
  torso: { mass: 1.5, width: 30, height: 40, type: 'torso' },
  rightArm: { mass: 0.7, width: 10, height: 30, type: 'arm' },
  leftArm: { mass: 0.7, width: 10, height: 30, type: 'arm' },
  rightLeg: { mass: 0.9, width: 10, height: 40, type: 'leg' },
  leftLeg: { mass: 0.9, width: 10, height: 40, type: 'leg' }
};

class StickmanPhysics {
  constructor(canvasId = 'gameCanvas', config = {}) {
    this.canvas = (typeof document !== 'undefined' && document.getElementById(canvasId)) || null;
    if (!this.canvas) {
      // Mock canvas for tests if needed
      this.canvas = { width: 800, height: 600, getBoundingClientRect: () => ({ left: 0, top: 0 }), addEventListener: () => {} };
    }

    this.determinismProvider = config.determinismProvider || new RealWorldProvider();

    // Initialize Matter.js
    this.engine = Engine.create();
    this.engine.gravity.y = GRAVITY;
    
    // In node environment, Render might fail due to lack of document
    try {
        this.render = Render.create({
          element: typeof document !== 'undefined' ? (document.body || {}) : {},
          engine: this.engine,
          options: {
            width: this.canvas.width,
            height: this.canvas.height,
            wireframes: false,
            showAngleIndicator: false,
            showVelocity: false,
            showCollisions: false,
            showPositions: false,
            showSleep: false
          }
        });
    } catch (e) {
        this.render = { options: {}, canvas: this.canvas };
    }

    // Create world
    this.world = this.engine.world;
    
    // Store stickmen and detached limbs
    this.stickmen = [];
    this.detachedLimbs = [];
    
    // Initialize Madness Field
    this.madnessField = new MadnessField(GRAVITY, FRICTION);

    // Initialize Logic Chain Services
    this.detachmentService = new LimbDetachmentService({
      threshold: LIMB_DETACH_THRESHOLD,
      determinismProvider: this.determinismProvider
    });

    // Input handling
    try {
        this.mouse = Mouse.create(this.canvas);
        this.mouseConstraint = MouseConstraint.create(this.engine, {
          mouse: this.mouse,
          constraint: {
            stiffness: 0.2,
            render: {
              visible: false
            }
          }
        });
        Composite.add(this.world, this.mouseConstraint);
    } catch (e) {
        // Silently fail mouse init in Node
    }
    
    // Event listeners
    this.setupEventListeners();

    // Harmonic Madness Field hook
    Events.on(this.engine, 'beforeUpdate', (event) => {
      this.madnessField.update(event.delta, this.stickmen.length);
      this.engine.gravity.y = this.madnessField.getCurrentGravity();
    });
    
    // Start rendering
    if (typeof window !== 'undefined' && this.render.run) {
      Render.run(this.render);
    }

    this.lastDelusionBurstTime = 0;
    this.lastWorldPulseTime = this.determinismProvider.now();
  }

  setupEventListeners() {
    if (!this.canvas || typeof this.canvas.addEventListener !== 'function') return;

    // Mouse events for grabbing limbs
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getMousePosition(e);
      this.handleMouseDown(pos);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getMousePosition(e);
      this.handleMouseMove(pos);
    });

    this.canvas.addEventListener('mouseup', () => {
      this.handleMouseUp();
    });

    // Keyboard events
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
          this.triggerDelusionBurst();
        } else if (e.code === 'KeyQ') {
          this.cycleAttachment(-1);
        } else if (e.code === 'KeyE') {
          this.cycleAttachment(1);
        }
      });
    }
  }

  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handleMouseDown(pos) {
    // Check if clicking on a limb
    for (let i = 0; i < this.detachedLimbs.length; i++) {
      const limb = this.detachedLimbs[i];
      if (this.isPointInBody(pos, limb.body)) {
        this.grabbedLimb = limb;
        if (this.mouseConstraint) this.mouseConstraint.body = limb.body;
        return;
      }
    }

    // Check if clicking on a stickman limb
    for (let stickman of this.stickmen) {
      for (let limbName in stickman.limbs) {
        const limb = stickman.limbs[limbName];
        if (this.isPointInBody(pos, limb.body)) {
          this.grabbedLimb = limb;
          if (this.mouseConstraint) this.mouseConstraint.body = limb.body;
          return;
        }
      }
    }
  }

  handleMouseMove(pos) {
    if (this.grabbedLimb && this.mouse) {
      // Update mouse constraint position
      this.mouse.position.x = pos.x;
      this.mouse.position.y = pos.y;
    }
  }

  handleMouseUp() {
    if (this.grabbedLimb) {
      this.grabbedLimb = null;
      if (this.mouseConstraint) this.mouseConstraint.body = null;
    }
  }

  isPointInBody(point, body) {
    const vertices = body.vertices;
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) && 
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Create a new stickman with modular parts
  createStickman(x = 400, y = 100, traits = {}) {
    const stickman = {
      id: this.determinismProvider.now() + this.determinismProvider.random(),
      body: null,
      limbs: {},
      attachments: [],
      currentAttachment: 0,
      delusionTraits: [],
      isDetaching: false,
      lastPulseTime: 0
    };

    // Create main body (torso)
    const torso = Bodies.rectangle(x, y, LIMB_TYPES.torso.width, LIMB_TYPES.torso.height, {
      friction: FRICTION,
      restitution: RESTITUTION,
      render: {
        fillStyle: '#666666',
        strokeStyle: '#444444',
        lineWidth: 2
      },
      label: 'torso',
      isStatic: false,
      mass: LIMB_TYPES.torso.mass
    });

    // Create limbs
    const limbPositions = {
      head: { x: x, y: y - 30 },
      rightArm: { x: x + 15, y: y - 10 },
      leftArm: { x: x - 15, y: y - 10 },
      rightLeg: { x: x + 10, y: y + 20 },
      leftLeg: { x: x - 10, y: y + 20 }
    };

    for (let limbName in LIMB_TYPES) {
      const limbType = LIMB_TYPES[limbName];
      const pos = limbPositions[limbName] || { x, y };
      
      const limb = Bodies.rectangle(
        pos.x, pos.y,
        limbType.width, limbType.height,
        {
          friction: FRICTION,
          restitution: RESTITUTION,
          render: {
            fillStyle: limbType.type === 'head' ? '#888888' : 
                     limbType.type === 'torso' ? '#666666' : '#555555',
            strokeStyle: '#444444',
            lineWidth: 2
          },
          label: limbName,
          isStatic: false,
          mass: limbType.mass,
          limbData: {
            type: limbType.type,
            name: limbName,
            originalPosition: { x: pos.x, y: pos.y }
          }
        }
      );

      stickman.limbs[limbName] = {
        body: limb,
        attached: true,
        originalPosition: { x: pos.x, y: pos.y }
      };
    }

    // Add to world
    Composite.add(this.world, [torso, ...Object.values(stickman.limbs).map(l => l.body)]);
    stickman.body = torso;

    // Store stickman
    this.stickmen.push(stickman);

    // Add collision event listener for limb detachment
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      for (let pair of pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        // Check if one body is a limb and collision is high velocity
        if (bodyA.label && bodyA.label !== 'torso' && bodyB.label === 'torso') {
          this.checkLimbDetachment(bodyA, bodyB, pair);
        } else if (bodyB.label && bodyB.label !== 'torso' && bodyA.label === 'torso') {
          this.checkLimbDetachment(bodyB, bodyA, pair);
        }
      }
    });

    return stickman;
  }

  checkLimbDetachment(limbBody, torsoBody, pair) {
    if (!pair || !pair.contact) return;
    const impulse = Math.abs(pair.contact.normalImpulse);
    const limbId = limbBody.label;
    
    const stickman = this.findStickmanByLimb(limbBody);
    if (!stickman) return;

    try {
      const result = this.detachmentService.detachLimb(stickman, limbId, impulse);

      if (result.success && result.state === "DETACHED") {
        // Atomic infra update
        this.detachedLimbs.push({
          body: result.limb.body,
          stickmanId: stickman.id,
          limbName: limbId,
          originalPosition: result.limb.originalPosition
        });

        // Execute side effects
        this.addDetachmentEffect(result.limb.body);
        this.addDelusionTrait(result.sideEffects.trait);
      }
    } catch (error) {
      console.error(`[PhysicsEngine] Detachment failed: ${error.message}`);
    }
  }

  findStickmanByLimb(limbBody) {
    for (let stickman of this.stickmen) {
      for (let limbName in stickman.limbs) {
        if (stickman.limbs[limbName].body === limbBody) {
          return stickman;
        }
      }
      if (stickman.body === limbBody) {
        return stickman;
      }
    }
    return null;
  }

  addDetachmentEffect(limbBody) {
    // Add particle effect or visual indicator
    // This would be implemented with canvas drawing in render loop
    console.log(`Limb detached: ${limbBody.label}`);
  }

  triggerLimbDetachmentEffect(limbType) {
    // Apply delusion effects based on limb type
    switch (limbType) {
      case 'head':
        this.addDelusionTrait('hallucinate_enemies_as_cows');
        break;
      case 'rightArm':
      case 'leftArm':
        this.addDelusionTrait('weaponized_limbs');
        break;
      case 'rightLeg':
      case 'leftLeg':
        this.addDelusionTrait('gravity_distortion');
        break;
      default:
        this.addDelusionTrait('random_hallucination');
    }
  }

  addDelusionTrait(trait) {
    // Add trait to all stickmen or current stickman
    for (let stickman of this.stickmen) {
      if (!stickman.delusionTraits.includes(trait)) {
        stickman.delusionTraits.push(trait);
      }
    }
  }

  // Delusion Burst system
  triggerDelusionBurst() {
    const now = this.determinismProvider.now();
    const cooldown = 8000; // 8 seconds
    
    if (now - this.lastDelusionBurstTime < cooldown) return;
    
    this.lastDelusionBurstTime = now;
    
    // Apply temporary reality warp
    this.applyDelusionBurstEffects();
    
    // Visual feedback
    this.showDelusionBurstVisual();
  }

  applyDelusionBurstEffects() {
    // Temporarily modify physics properties
    for (let stickman of this.stickmen) {
      for (let limbName in stickman.limbs) {
        const limb = stickman.limbs[limbName];
        if (limb.body) {
          // Make limbs more elastic during burst
          Body.set(limb.body, {
            restitution: 0.8,
            friction: 0.001
          });
        }
      }
    }
    
    // Intensify Madness Field instead of simple gravity flip
    const originalIntensity = this.madnessField.intensity;
    this.madnessField.intensity = 1.5; // Overdrive

    setTimeout(() => {
      this.madnessField.intensity = originalIntensity;
    }, 5000);
  }

  showDelusionBurstVisual() {
    // This would be handled by the renderer
    console.log('Delusion Burst activated!');
  }

  // Modular attachment system
  cycleAttachment(direction) {
    for (let stickman of this.stickmen) {
      stickman.currentAttachment = (stickman.currentAttachment + direction + 3) % 3;
      
      // Update attachment based on current index
      switch (stickman.currentAttachment) {
        case 0:
          stickman.attachments = ['gun', 'hook', 'bone-saw'];
          break;
        case 1:
          stickman.attachments = ['flame_thrower', 'grappling_hook', 'spike_glove'];
          break;
        case 2:
          stickman.attachments = ['teleporter', 'gravity_gun', 'time_dilation_field'];
          break;
      }
    }
  }

  // World Pulse Events (every 60 seconds)
  startWorldPulseTimer() {
    // Use a poll instead of setInterval for better determinism support if needed,
    // but for now we'll just check time in a game loop or similar.
    // To maintain existing behavior but allow determinism:
    this.worldPulseInterval = setInterval(() => {
      if (this.determinismProvider instanceof RealWorldProvider) {
          this.triggerWorldPulse();
      }
    }, 60000); // 60 seconds
  }

  updateWorldPulse() {
    const now = this.determinismProvider.now();
    if (now - this.lastWorldPulseTime >= 60000) {
      this.triggerWorldPulse();
      this.lastWorldPulseTime = now;
    }
  }

  triggerWorldPulse() {
    console.log('World Pulse Event triggered!');
    
    // Fracture terrain, spawn hazards, intensify delusions
    for (let stickman of this.stickmen) {
      stickman.delusionTraits.push('intensified_delusion');
    }
    
    // Add visual effects
    this.showWorldPulseVisual();
  }

  showWorldPulseVisual() {
    // Would be handled by renderer
    console.log('World Pulse visual effect');
  }

  // Rendering integration
  renderFrame(ctx, deltaTime) {
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Check world pulse for determinism
    this.updateWorldPulse();

    // Draw stickmen and limbs
    for (let stickman of this.stickmen) {
      this.drawStickman(ctx, stickman, deltaTime);
    }
    
    // Draw detached limbs
    for (let limb of this.detachedLimbs) {
      this.drawLimb(ctx, limb.body);
    }
  }

  drawStickman(ctx, stickman, deltaTime) {
    // Get current animation frame based on state
    const animationName = 'walk'; // Default animation
    const animationFrame = Math.floor(this.determinismProvider.now() / 100) % 6;
    
    // Apply animation to rendering
    const bodyParts = applyAnimationFrame(
      ctx, 
      stickman, 
      animationFrame, 
      'right', 
      {}, 
      animationName, 
      animationFrame
    );
    
    // Draw limbs with physics positions
    for (let limbName in stickman.limbs) {
      const limb = stickman.limbs[limbName];
      if (limb.body && limb.attached) {
        this.drawLimb(ctx, limb.body, limbName);
      }
    }
  }

  drawLimb(ctx, body, limbName = '') {
    const pos = body.position;
    const angle = body.angle;
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    
    // Draw limb as rectangle
    ctx.fillStyle = body.render.fillStyle;
    ctx.strokeStyle = body.render.strokeStyle;
    ctx.lineWidth = body.render.lineWidth;
    
    const width = body.bounds.max.x - body.bounds.min.x;
    const height = body.bounds.max.y - body.bounds.min.y;
    
    ctx.fillRect(-width/2, -height/2, width, height);
    ctx.strokeRect(-width/2, -height/2, width, height);
    
    ctx.restore();
  }

  // Cleanup
  destroy() {
    if (this.worldPulseInterval) clearInterval(this.worldPulseInterval);
    if (this.render && this.render.run) Render.stop(this.render);
    World.clear(this.world);
    Engine.clear(this.engine);
    if (this.canvas.removeEventListener) {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    }
    if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', this.handleKeyDown);
    }
  }
}

export { StickmanPhysics };
