import { LimbDetachmentService } from '../limb_detachment_service.js';
import { InvalidLimbError } from '../limb_detachment_service.js';

function testLimbDetachment() {
  console.log('--- Starting Limb Detachment Tests ---');

  // Deterministic providers for testing
  const testIdProvider = (prefix) => `${prefix}-correlation-id`;
  const testTimeProvider = () => '2023-10-27T12:00:00Z';

  const service = new LimbDetachmentService({
    threshold: 15,
    idProvider: testIdProvider,
    timeProvider: testTimeProvider
  });

  // Mock stickman
  const stickman = {
    id: 's1',
    limbs: {
      head: { attached: true, body: { label: 'head' }, originalPosition: { x: 0, y: 0 } },
      rightArm: { attached: true, body: { label: 'rightArm' }, originalPosition: { x: 10, y: 0 } }
    }
  };

  // 1. Happy Path
  console.log('Test 1: Happy Path Detachment');
  const result1 = service.detachLimb(stickman, 'head', 20, 'cor-correlation-id');

  // NOTE: Transition is now handled by the physics engine AFTER the service confirms detachment.
  // We check if the service returned the correct state.
  if (result1.success && result1.state === 'DETACHED' && result1.correlationId === 'cor-correlation-id') {
    console.log('✅ PASS: Happy path returned DETACHED state.');
  } else {
    console.error('❌ FAIL: Happy path failed.', result1);
  }

  // 2. Idempotency (Already Detached)
  console.log('Test 2: Idempotent Call (Already Detached)');
  const result2 = service.detachLimb(stickman, 'head', 20, 'cor-correlation-id');
  if (result2.success && result2.state === 'DETACHED' && result2.dedupe_hit === true) {
    console.log('✅ PASS: Idempotent call handled correctly (hit dedupe).');
  } else {
    console.error('❌ FAIL: Idempotency failed.', result2);
  }

  // 3. Insufficient Impulse
  console.log('Test 3: Insufficient Impulse');
  const result3 = service.detachLimb(stickman, 'rightArm', 10, 'cor-correlation-id');
  if (!result3.success && result3.state === 'INSUFFICIENT_IMPULSE') {
    console.log('✅ PASS: Low impulse did not detach limb.');
  } else {
    console.error('❌ FAIL: Low impulse test failed.', result3);
  }

  // 4. Invalid Limb
  console.log('Test 4: Invalid Limb Error');
  const result4 = service.detachLimb(stickman, 'tail', 20, 'cor-correlation-id');
  if (!result4.success && result4.state === 'INVALID_LIMB') {
    console.log('✅ PASS: Correctly returned INVALID_LIMB state.');
  } else {
    console.error('❌ FAIL: Failed to handle invalid limb.', result4);
  }

  console.log('--- Limb Detachment Tests Complete ---');
}

testLimbDetachment();
