/**
 * physics_engine.js
 * Core physics system for STICKS: Godfall Echoes.
 * Uses Matter.js for rigid body physics with limb detachment mechanics.
 * Optimized for determinism and high-fidelity ragdoll physics.
 */

import pkg from 'matter-js';
const {
    Engine,
    Render,
    World,
    Bodies,
    Body,
    Composite,
    Constraint,
    Events,
    Mouse,
    MouseConstraint,
    Query,
    Vector
} = pkg;

import { applyAnimationFrame } from './animation_renderer.js';
import { LimbDetachmentService } from './limb_detachment_service.js';
import { RealWorldProvider } from './determinism_provider.js';

/**
 * Harmonic Madness Field
 * Calculates physics perturbations using evolving Fourier series.
 * This ensures "natural" looking chaos that is still fully deterministic.
 */
class MadnessField {
  /**
   * @param {number} baseGravity
   * @param {number} baseFriction
   */
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

  /**
   * Updates field state.
   * @param {number} deltaTime
   * @param {number} stickmanCount
   */
  update(deltaTime, stickmanCount) {
    this.time += deltaTime;
    // Intensity scales with the number of stickmen or other chaos factors
    this.intensity = Math.min(1.0, 0.2 + (stickmanCount * 0.1));
  }

  /**
   * Calculates the current harmonic perturbation.
   * @returns {number}
   */
  calculatePerturbation() {
    return this.harmonics.reduce((acc, h) => {
      return acc + h.amplitude * Math.sin(this.time * h.frequency + h.phase);
    }, 0) * this.intensity;
  }

  /** @returns {number} */
  getCurrentGravity() {
    const perturbation = this.calculatePerturbation();
    return this.baseGravity * (1 + perturbation);
  }

  /** @returns {number} */
  getCurrentFriction() {
    const perturbation = this.calculatePerturbation();
    return this.baseFriction * (1 + perturbation);
  }
}

// Physics constants
const GRAVITY = 0.8;
const FRICTION = 0.005;
const RESTITUTION = 0.3;
const LIMB_DETACH_THRESHOLD = 15; // impulse threshold for limb detachment

// Limb types with metadata
const LIMB_TYPES = {
  head: { mass: 0.5, width: 20, height: 20, type: 'head', offset: { x: 0, y: -30 } },
  torso: { mass: 1.5, width: 30, height: 40, type: 'torso', offset: { x: 0, y: 0 } },
  rightArm: { mass: 0.7, width: 10, height: 30, type: 'arm', offset: { x: 15, y: -10 } },
  leftArm: { mass: 0.7, width: 10, height: 30, type: 'arm', offset: { x: -15, y: -10 } },
  rightLeg: { mass: 0.9, width: 10, height: 40, type: 'leg', offset: { x: 10, y: 25 } },
  leftLeg: { mass: 0.9, width: 10, height: 40, type: 'leg', offset: { x: -10, y: 25 } }
};

/**
 * Main Physics Controller for STICKS: Godfall Echoes.
 */
class StickmanPhysics {
  /**
   * @param {string} canvasId
   * @param {Object} [config={}]
   * @param {import('./determinism_provider.js').DeterminismProvider} [config.determinismProvider]
   */
  constructor(canvasId = 'gameCanvas', config = {}) {
    this.determinismProvider = config.determinismProvider || new RealWorldProvider();

    // Canvas setup with mock fallback for headless tests
    if (typeof document !== 'undefined') {
        this.canvas = document.getElementById(canvasId);
    }

    if (!this.canvas) {
      this.canvas = {
          width: 800,
          height: 600,
          getBoundingClientRect: () => ({ left: 0, top: 0 }),
          addEventListener: () => {}
      };
    }

    // Initialize Matter.js Engine
    this.engine = Engine.create();
    this.engine.gravity.y = GRAVITY;
    this.world = this.engine.world;
    
    // Store game entities
    this.stickmen = [];
    this.detachedLimbs = [];
    this.madnessField = new MadnessField(GRAVITY, FRICTION);

    // Initialize Services
    this.detachmentService = new LimbDetachmentService({
      threshold: LIMB_DETACH_THRESHOLD,
      determinismProvider: this.determinismProvider
    });

    // Renderer setup (if in browser)
    try {
        if (typeof document !== 'undefined') {
            this.render = Render.create({
              element: document.body,
              engine: this.engine,
              options: {
                width: this.canvas.width,
                height: this.canvas.height,
                wireframes: false,
                background: 'transparent'
              }
            });
        }
    } catch (e) {
        console.warn("[PhysicsEngine] Renderer failed to initialize:", e.message);
    }

    // Input handling with sanitization
    this.setupInputHandling();
    
    // Core physics event hooks
    this.setupPhysicsHooks();

    // World pulse state
    this.lastWorldPulseTime = this.determinismProvider.now();
  }

  /**
   * Configures mouse constraint and input listeners.
   */
  setupInputHandling() {
    try {
        if (typeof document !== 'undefined') {
            this.mouse = Mouse.create(this.canvas);
            this.mouseConstraint = MouseConstraint.create(this.engine, {
              mouse: this.mouse,
              constraint: {
                stiffness: 0.2,
                render: { visible: false }
              }
            });
            Composite.add(this.world, this.mouseConstraint);
        }
    } catch (e) {
        // Headless mode
    }
  }

  /**
   * Sets up periodic and event-based physics hooks.
   */
  setupPhysicsHooks() {
    // Harmonic Madness Field update
    Events.on(this.engine, 'beforeUpdate', (event) => {
      this.madnessField.update(event.delta, this.stickmen.length);
      this.engine.gravity.y = this.madnessField.getCurrentGravity();
    });

    // Collision-based limb detachment
    Events.on(this.engine, 'collisionStart', (event) => {
      for (let pair of event.pairs) {
        this.processCollision(pair);
      }
    });
  }

  /**
   * Processes a single collision pair for potential detachment.
   * @param {Object} pair
   */
  processCollision(pair) {
    const { bodyA, bodyB } = pair;

    // We only care about high-impulse collisions involving stickman parts
    const impulse = pair.collision.depth * 5; // Heuristic impulse for 2D

    const stickmanA = this.findStickmanByBody(bodyA);
    const stickmanB = this.findStickmanByBody(bodyB);

    if (stickmanA) this.checkDetachment(stickmanA, bodyA, impulse);
    if (stickmanB) this.checkDetachment(stickmanB, bodyB, impulse);
  }

  /**
   * Checks if a specific body should detach from its stickman.
   * @param {Object} stickman
   * @param {Object} body
   * @param {number} impulse
   */
  checkDetachment(stickman, body, impulse) {
    const limbId = body.label;
    if (limbId === 'torso' || !stickman.limbs[limbId]) return;

    const result = this.detachmentService.detachLimb(stickman, limbId, impulse);

    if (result.success && result.state === "DETACHED") {
        this.executeLimbDetachment(stickman, limbId);
    }
  }

  /**
   * Atomically performs the physics removal of a limb.
   * @param {Object} stickman
   * @param {string} limbId
   */
  executeLimbDetachment(stickman, limbId) {
    const limb = stickman.limbs[limbId];
    if (!limb || !limb.constraint) return;

    // Remove the constraint from the world
    World.remove(this.world, limb.constraint);
    limb.constraint = null;
    limb.attached = false;

    // Move to detached list for tracking
    this.detachedLimbs.push({
      body: limb.body,
      stickmanId: stickman.id,
      limbName: limbId
    });

    console.log(`[PhysicsEngine] Limb ${limbId} detached from ${stickman.id}`);
  }

  /**
   * Creates a new ragdoll stickman with joint constraints.
   * @param {number} x
   * @param {number} y
   * @returns {Object}
   */
  createStickman(x = 400, y = 100) {
    const stickman = {
      id: this.determinismProvider.nextId('sm'),
      limbs: {},
      delusionTraits: [],
      lastPulseTime: 0
    };

    // 1. Create Torso (Root)
    const torso = Bodies.rectangle(x, y, LIMB_TYPES.torso.width, LIMB_TYPES.torso.height, {
      friction: FRICTION,
      restitution: RESTITUTION,
      label: 'torso',
      mass: LIMB_TYPES.torso.mass,
      render: { fillStyle: '#666666' }
    });
    stickman.body = torso;

    // 2. Create Limbs and Constraints
    for (let [limbId, config] of Object.entries(LIMB_TYPES)) {
      if (limbId === 'torso') continue;

      const limbBody = Bodies.rectangle(
        x + config.offset.x,
        y + config.offset.y,
        config.width,
        config.height,
        {
          friction: FRICTION,
          restitution: RESTITUTION,
          label: limbId,
          mass: config.mass,
          render: { fillStyle: '#444444' }
        }
      );

      // Create Joint (Constraint)
      const joint = Constraint.create({
        bodyA: torso,
        bodyB: limbBody,
        pointA: { x: config.offset.x, y: config.offset.y },
        pointB: { x: 0, y: 0 },
        stiffness: 0.6,
        length: 2,
        render: { visible: true, strokeStyle: '#333333' }
      });

      stickman.limbs[limbId] = {
        body: limbBody,
        constraint: joint,
        attached: true
      };
    }

    // 3. Add to World
    const allBodies = [torso, ...Object.values(stickman.limbs).map(l => l.body)];
    const allConstraints = Object.values(stickman.limbs).map(l => l.constraint);
    Composite.add(this.world, [...allBodies, ...allConstraints]);

    this.stickmen.push(stickman);
    return stickman;
  }

  /**
   * Finds a stickman entity by one of its bodies.
   * @param {Object} body
   * @returns {Object|null}
   */
  findStickmanByBody(body) {
    for (let sm of this.stickmen) {
      if (sm.body === body) return sm;
      for (let limb of Object.values(sm.limbs)) {
        if (limb.body === body) return sm;
      }
    }
    return null;
  }

  /**
   * Triggers a Delusion Burst (temporary high-chaos mode).
   */
  triggerDelusionBurst() {
    const now = this.determinismProvider.now();
    if (now - (this.lastBurst || 0) < 5000) return; // Cooldown
    this.lastBurst = now;

    console.log("[PhysicsEngine] DELUSION BURST ACTIVATED");
    
    // Temporary overdrive
    const oldIntensity = this.madnessField.intensity;
    this.madnessField.intensity = 2.0;

    // Apply impulse to all entities
    for (let sm of this.stickmen) {
        Body.applyForce(sm.body, sm.body.position, {
            x: (this.determinismProvider.random() - 0.5) * 0.1,
            y: -0.2
        });
    }

    setTimeout(() => {
      this.madnessField.intensity = oldIntensity;
    }, 3000);
  }

  /**
   * Updates world pulse logic (every 60s).
   */
  updateWorldPulse() {
    const now = this.determinismProvider.now();
    if (now - this.lastWorldPulseTime >= 60000) {
      this.lastWorldPulseTime = now;
      this.triggerWorldPulse();
    }
  }

  triggerWorldPulse() {
    console.log("[PhysicsEngine] WORLD PULSE: Gravity inverted");
    this.engine.gravity.y *= -1;
    setTimeout(() => { this.engine.gravity.y *= -1; }, 5000);
  }

  /**
   * Main render loop integration.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} deltaTime
   */
  renderFrame(ctx, deltaTime) {
    this.updateWorldPulse();

    // Draw stickmen
    for (let sm of this.stickmen) {
      this.drawStickman(ctx, sm);
    }

    // Draw loose limbs
    for (let limb of this.detachedLimbs) {
      this.drawBody(ctx, limb.body);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} sm
   */
  drawStickman(ctx, sm) {
    this.drawBody(ctx, sm.body);
    for (let limb of Object.values(sm.limbs)) {
      if (limb.attached) this.drawBody(ctx, limb.body);
    }
  }

  /**
   * Optimized body drawing using Matter.js vertices.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} body
   */
  drawBody(ctx, body) {
    ctx.beginPath();
    const vertices = body.vertices;
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = body.render.fillStyle || '#666';
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Deterministic point-in-body check using Matter.js Query.
   * @param {{x: number, y: number}} point
   * @returns {Object|null}
   */
  queryPoint(point) {
    const bodies = Query.point(Composite.allBodies(this.world), point);
    return bodies.length > 0 ? bodies[0] : null;
  }

  /**
   * Cleans up all physics resources.
   */
  destroy() {
    if (this.render) {
        Render.stop(this.render);
        this.render.canvas.remove();
        this.render.canvas = null;
        this.render.context = null;
        this.render.textures = {};
    }
    World.clear(this.world);
    Engine.clear(this.engine);
  }
}

export { StickmanPhysics };
