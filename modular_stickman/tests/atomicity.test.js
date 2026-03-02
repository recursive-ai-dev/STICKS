import { LimbDetachmentService } from '../limb_detachment_service.js';

async function runTests() {
  console.log("Running Atomicity & Torn-Write Eliminator Tests...");

  // Mock Stickman
  const createMockStickman = () => ({
    id: 'sm-1',
    limbs: {
      head: { attached: true, body: { label: 'head' }, originalPosition: { x: 0, y: 0 } }
    },
    delusionTraits: []
  });

  // Test 1: Successful Transaction Preparation
  (() => {
    console.log("Test 1: Preparation should not mutate state...");
    const stickman = createMockStickman();
    const service = new LimbDetachmentService();
    const result = service.detachLimb(stickman, 'head', 20);

    if (result.state !== 'PREPARED') throw new Error("Expected state PREPARED");
    if (stickman.limbs.head.attached !== true) throw new Error("State should NOT be mutated yet");
    console.log("  ✅ Preparation isolated state changes.");
  })();

  // Test 2: Simulated Crash during Side Effect Calculation
  (() => {
    console.log("Test 2: Failure mid-chain should leave state intact...");
    const stickman = createMockStickman();
    const service = new LimbDetachmentService();

    // Sabotage side effect calculation
    service._calculateSideEffects = () => {
      throw new Error("Simulated Crash");
    };

    try {
      service.detachLimb(stickman, 'head', 20);
      throw new Error("Should have thrown");
    } catch (e) {
      if (e.message !== "Simulated Crash") throw e;
    }

    if (stickman.limbs.head.attached !== true) throw new Error("State should be intact after crash");
    console.log("  ✅ Mid-chain failure preserved consistency.");
  })();

  // Test 3: Atomic Application
  (() => {
    console.log("Test 3: Transaction commit should apply all changes...");
    const stickman = createMockStickman();
    const service = new LimbDetachmentService();
    const result = service.detachLimb(stickman, 'head', 20);

    const detachedLimbs = [];
    const applyChange = (changes) => {
      changes.forEach(c => {
        if (c.type === 'DETACH_LIMB') stickman.limbs[c.payload.limbId].attached = false;
        if (c.type === 'ADD_DELUSION') stickman.delusionTraits.push(c.payload.trait);
        if (c.type === 'TRACK_DETACHED_LIMB') detachedLimbs.push(c.payload);
      });
    };

    result.transaction.commit(applyChange);

    if (stickman.limbs.head.attached !== false) throw new Error("Limb should be detached");
    if (stickman.delusionTraits.length === 0) throw new Error("Trait should be added");
    if (detachedLimbs.length === 0) throw new Error("Infra should be updated");
    console.log("  ✅ Transaction commit applied all changes atomically.");
  })();

  console.log("\nAll Atomicity tests passed!");
}

runTests().catch(err => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
