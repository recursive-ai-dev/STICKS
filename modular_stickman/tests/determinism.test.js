/**
 * determinism.test.js
 * Verifies that the DeterministicProvider ensures identical outputs for identical seeds.
 */

import { DeterministicProvider } from '../determinism_provider.js';
import { StickmanPhysics } from '../physics_engine.js';
import pkg from 'matter-js';
const { Engine } = pkg;

async function runDeterminismTest() {
  console.log("--- Starting Determinism Replay Test ---");

  const seed = 42;
  const startTime = 1600000000000;

  // Run 1
  const provider1 = new DeterministicProvider(seed, startTime);
  const physics1 = new StickmanPhysics('testCanvas1', { determinismProvider: provider1 });
  const stickman1 = physics1.createStickman(100, 100);

  // Advance time and update physics a few times
  for (let i = 0; i < 10; i++) {
    provider1.advanceTime(16); // ~60fps
    Engine.update(physics1.engine, 16);
  }

  const state1 = {
      id: stickman1.id,
      torsoPos: { x: stickman1.body.position.x, y: stickman1.body.position.y },
      torsoAngle: stickman1.body.angle,
      randomVal: provider1.random()
  };

  // Run 2 (Same Seed)
  const provider2 = new DeterministicProvider(seed, startTime);
  const physics2 = new StickmanPhysics('testCanvas2', { determinismProvider: provider2 });
  const stickman2 = physics2.createStickman(100, 100);

  for (let i = 0; i < 10; i++) {
    provider2.advanceTime(16);
    Engine.update(physics2.engine, 16);
  }

  const state2 = {
      id: stickman2.id,
      torsoPos: { x: stickman2.body.position.x, y: stickman2.body.position.y },
      torsoAngle: stickman2.body.angle,
      randomVal: provider2.random()
  };

  // Run 3 (Different Seed)
  const provider3 = new DeterministicProvider(99, startTime);
  const physics3 = new StickmanPhysics('testCanvas3', { determinismProvider: provider3 });
  const stickman3 = physics3.createStickman(100, 100);

  for (let i = 0; i < 10; i++) {
    provider3.advanceTime(16);
    Engine.update(physics3.engine, 16);
  }

  const state3 = {
      id: stickman3.id,
      torsoPos: { x: stickman3.body.position.x, y: stickman3.body.position.y },
      torsoAngle: stickman3.body.angle,
      randomVal: provider3.random()
  };

  let failures = 0;

  // Verify Run 1 vs Run 2 (Match)
  if (state1.id !== state2.id) {
    console.error("❌ FAIL: Stickman IDs do not match for same seed");
    failures++;
  } else {
    console.log("✅ PASS: Stickman IDs match for same seed");
  }

  if (Math.abs(state1.torsoPos.x - state2.torsoPos.x) > 0.0001 ||
      Math.abs(state1.torsoPos.y - state2.torsoPos.y) > 0.0001) {
    console.error("❌ FAIL: Stickman positions do not match for same seed", state1.torsoPos, state2.torsoPos);
    failures++;
  } else {
    console.log("✅ PASS: Stickman positions match for same seed");
  }

  if (state1.randomVal !== state2.randomVal) {
    console.error("❌ FAIL: RNG outputs do not match for same seed");
    failures++;
  } else {
    console.log("✅ PASS: RNG outputs match for same seed");
  }

  // Verify Run 1 vs Run 3 (Divergence)
  if (state1.id === state3.id) {
    console.error("❌ FAIL: Stickman IDs matched despite different seed");
    failures++;
  } else {
    console.log("✅ PASS: Stickman IDs diverged for different seed");
  }

  if (state1.randomVal === state3.randomVal) {
    console.error("❌ FAIL: RNG outputs matched despite different seed");
    failures++;
  } else {
    console.log("✅ PASS: RNG outputs diverged for different seed");
  }

  console.log("--- Determinism Replay Test Complete ---");
  if (failures > 0) {
    process.exit(1);
  }
}

runDeterminismTest().catch(err => {
  console.error(err);
  process.exit(1);
});
