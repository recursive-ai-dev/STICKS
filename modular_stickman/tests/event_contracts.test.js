/**
 * event_contracts.test.js
 * Verifies that events produced by logic chains adhere to the versioned schema contracts.
 * Lightweight version for CI/Environment compatibility.
 */

import assert from 'assert';
import { StickmanGenerationService } from '../stickman_generation_service.js';
import { LimbDetachmentService } from '../limb_detachment_service.js';
import { DeterministicProvider } from '../determinism_provider.js';

async function runTests() {
    console.log("--- RUNNING EVENT CONTRACT TESTS (LIGHTWEIGHT) ---");

    const detProvider = new DeterministicProvider();

    // Mock Physics to avoid Canvas/Matter-js binary issues
    const mockPhysics = {
        createStickman: (x, y) => ({
            id: 'mock-id',
            limbs: {
                rightArm: { attached: true }
            },
            delusionTraits: []
        }),
        stickmen: []
    };

    const genService = new StickmanGenerationService(mockPhysics, { determinismProvider: detProvider });
    const detachService = new LimbDetachmentService({ determinismProvider: detProvider });

    // Test 1: StickmanGenerated Event Contract
    console.log("Test 1: StickmanGenerated Event Contract");
    const correlationId = "test-cid-gen";
    const sm = genService.generateStickman(100, 200, correlationId);

    const genEvent = genService.outbox[0];
    assert.strictEqual(genEvent.event_name, "StickmanGenerated");
    assert.strictEqual(genEvent.event_version, "1.0");
    assert.strictEqual(genEvent.correlation_id, correlationId);
    assert.ok(genEvent.payload.stickman_id);
    assert.strictEqual(genEvent.payload.x, 100);
    assert.strictEqual(genEvent.payload.y, 200);
    console.log("  ✅ StickmanGenerated contract passed");

    // Test 2: LimbDetached Event Contract
    console.log("Test 2: LimbDetached Event Contract");
    const detachCid = "test-cid-detach";
    const stickman = {
        id: sm.id,
        limbs: sm.limbs
    };

    const detachResult = detachService.detachLimb(stickman, "rightArm", 50, detachCid);
    const detachEvent = detachService.outbox[0];

    assert.strictEqual(detachEvent.event_name, "LimbDetached");
    assert.strictEqual(detachEvent.event_version, "1.0");
    assert.strictEqual(detachEvent.correlation_id, detachCid);
    assert.strictEqual(detachEvent.payload.stickman_id, sm.id);
    assert.strictEqual(detachEvent.payload.limb_id, "rightArm");
    assert.strictEqual(detachEvent.payload.impulse, 50);
    console.log("  ✅ LimbDetached contract passed");

    console.log("--- ALL EVENT CONTRACT TESTS PASSED ---");
}

runTests().catch(err => {
    console.error("❌ TEST FAILED:");
    console.error(err);
    process.exit(1);
});
