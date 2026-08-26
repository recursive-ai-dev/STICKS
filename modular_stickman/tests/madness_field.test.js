
/**
 * Madness Field Tests
 */
import pkg from 'matter-js';
const { Engine, Events } = pkg;

class MadnessField {
  constructor(baseGravity, baseFriction) {
    this.baseGravity = baseGravity;
    this.baseFriction = baseFriction;
    this.intensity = 0;
    this.harmonics = [
      { amplitude: 0.1, frequency: 0.001, phase: 0 },
      { amplitude: 0.05, frequency: 0.005, phase: Math.PI / 4 },
      { amplitude: 0.02, frequency: 0.015, phase: Math.PI / 2 }
    ];
    this.time = 0;
  }

  update(deltaTime, stickmanCount) {
    this.time += deltaTime;
    this.intensity = Math.min(1.0, 0.2 + (stickmanCount * 0.1));
  }

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

function testMadnessField() {
    console.log('--- Starting Madness Field Tests ---');

    const GRAVITY = 0.8;
    const FRICTION = 0.005;
    const field = new MadnessField(GRAVITY, FRICTION);

    // 1. Initial State
    console.log('Test 1: Initial State');
    if (field.intensity === 0 && field.time === 0) {
        console.log('✅ PASS: Initialized with zero values.');
    } else {
        console.error('❌ FAIL: Initialization incorrect.', field);
    }

    // 2. Update with stickmen
    console.log('Test 2: Update intensity');
    field.update(16.6, 3); // 16.6ms, 3 stickmen
    if (Math.abs(field.intensity - 0.5) < 0.0001 && Math.abs(field.time - 16.6) < 0.0001) {
        console.log('✅ PASS: Intensity and time updated correctly.');
    } else {
        console.error('❌ FAIL: Update incorrect.', field);
    }

    // 3. Gravity perturbation
    console.log('Test 3: Gravity perturbation');
    const g1 = field.getCurrentGravity();
    field.update(1000, 3); // Update by 1s
    const g2 = field.getCurrentGravity();
    if (g1 !== g2 && Math.abs(g2 - GRAVITY) < GRAVITY * 0.2) {
        console.log('✅ PASS: Gravity oscillates within expected bounds.');
    } else {
        console.error('❌ FAIL: Gravity perturbation incorrect.', g1, g2);
    }

    // 4. Intensity capping
    console.log('Test 4: Intensity capping');
    field.update(0, 50); // Many stickmen
    if (field.intensity === 1.0) {
        console.log('✅ PASS: Intensity correctly capped at 1.0.');
    } else {
        console.error('❌ FAIL: Intensity cap failed.', field.intensity);
    }

    console.log('--- Madness Field Tests Complete ---');
}

testMadnessField();
