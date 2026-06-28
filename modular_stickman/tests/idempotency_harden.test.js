import { LimbDetachmentService } from '../limb_detachment_service.js';

function testIdempotencyHardener() {
  console.log('--- Starting Idempotency Hardener Tests ---');

  const logs = [];
  const logger = (log) => logs.push(log);

  const service = new LimbDetachmentService({
    threshold: 15,
    logger: logger
  });

  // Mock stickman
  const stickman = {
    id: 'stick-99',
    limbs: {
      head: { attached: true, body: { label: 'head' }, originalPosition: { x: 0, y: 0 } },
      rightArm: { attached: true, body: { label: 'rightArm' }, originalPosition: { x: 10, y: 0 } }
    }
  };

  // --- Scenario 1: Adversarial double invocation (same key) ---
  console.log('Scenario 1: Adversarial double invocation...');

  // First call
  const result1 = service.detachLimb(stickman, 'head', 20, 'cid-1');

  // Second call (simulated double-click or retry)
  const result2 = service.detachLimb(stickman, 'head', 20, 'cid-2');

  const idempHits = logs.filter(l => l.step === 'IDEMPOTENCY_HIT');

  const scenario1Pass =
    result1.state === 'DETACHED' &&
    result2.state === 'DETACHED' &&
    result2.dedupe_hit === true &&
    idempHits.length === 1;

  if (scenario1Pass) {
    console.log('✅ PASS: Double invocation deduped correctly.');
  } else {
    console.error('❌ FAIL: Double invocation failed.', {
      res1: result1.state,
      res2: result2.state,
      dedupe: result2.dedupe_hit,
      idempHits: idempHits.length
    });
  }

  // --- Scenario 2: Retry after transient failure (eventual consistency) ---
  console.log('Scenario 2: Retry after transient failure...');

  const result3 = service.detachLimb(stickman, 'rightArm', 20, 'cid-3');
  // Caller retries:
  const result4 = service.detachLimb(stickman, 'rightArm', 20, 'cid-4');

  const scenario2Pass =
    result3.state === 'DETACHED' &&
    result4.state === 'DETACHED' &&
    result4.dedupe_hit === true;

  if (scenario2Pass) {
    console.log('✅ PASS: Retry after "success" returned cached result.');
  } else {
    console.error('❌ FAIL: Retry scenario failed.', { res3: result3.state, res4: result4.state });
  }

  // --- Observability Check ---
  console.log('Checking Observability...');
  const lastLog = logs[logs.length - 1];

  // Checking for essential fields in the hardened log
  const observabilityPass =
    lastLog.correlation_id !== undefined &&
    lastLog.idempotency_key !== undefined &&
    lastLog.outcome !== undefined &&
    lastLog.timestamp !== undefined;

  if (observabilityPass) {
    console.log('✅ PASS: Observability requirements met.');
  } else {
    console.error('❌ FAIL: Observability logs missing required fields.', lastLog);
  }

  console.log('--- Idempotency Hardener Tests Complete ---');

  if (scenario1Pass && scenario2Pass && observabilityPass) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testIdempotencyHardener();
