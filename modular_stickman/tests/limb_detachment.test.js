import { LimbDetachmentService, InvalidLimbError } from '../limb_detachment_service.js';

function testLimbDetachment() {
  console.log('--- Starting Limb Detachment Tests ---');

  // Deterministic providers for testing
  const testIdProvider = () => 'test-correlation-id';
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
  const result1 = service.detachLimb(stickman, 'head', 20);
  if (result1.success && result1.state === 'DETACHED' && !stickman.limbs.head.attached && result1.correlationId === 'test-correlation-id') {
    console.log('✅ PASS: Happy path detached limb correctly and used deterministic ID.');
  } else {
    console.error('❌ FAIL: Happy path failed.', result1);
  }

  // 2. Idempotency (Already Detached)
  console.log('Test 2: Idempotent Call (Already Detached)');
  const result2 = service.detachLimb(stickman, 'head', 20);
  if (result2.success && result2.state === 'ALREADY_DETACHED') {
    console.log('✅ PASS: Idempotent call handled correctly.');
  } else {
    console.error('❌ FAIL: Idempotency failed.', result2);
  }

  // 3. Insufficient Impulse
  console.log('Test 3: Insufficient Impulse');
  const result3 = service.detachLimb(stickman, 'rightArm', 10);
  if (!result3.success && result3.state === 'INSUFFICIENT_IMPULSE' && stickman.limbs.rightArm.attached) {
    console.log('✅ PASS: Low impulse did not detach limb.');
  } else {
    console.error('❌ FAIL: Low impulse test failed.', result3);
  }

  // 4. Invalid Limb
  console.log('Test 4: Invalid Limb Error');
  try {
    service.detachLimb(stickman, 'tail', 20);
    console.error('❌ FAIL: Should have thrown InvalidLimbError.');
  } catch (e) {
    if (e instanceof InvalidLimbError) {
      console.log('✅ PASS: Correctly threw InvalidLimbError.');
    } else {
      console.error('❌ FAIL: Threw wrong error type.', e);
    }
  }

  console.log('--- Limb Detachment Tests Complete ---');
}

testLimbDetachment();
