import { LimbDetachmentService } from '../limb_detachment_service.js';
import {
  DomainInvariantError,
  BoundaryValidationError,
  InfraTransientError,
  InfraPermanentError
} from '../error_taxonomy.js';

async function testErrorTaxonomy() {
  console.log('--- Starting Error Taxonomy & Failure Semantics Tests ---');

  const logs = [];
  const testLogger = (log) => logs.push(log);

  const service = new LimbDetachmentService({
    threshold: 15,
    idProvider: () => 'test-cid',
    timeProvider: () => '2023-10-27T12:00:00Z',
    logger: testLogger
  });

  const stickman = {
    id: 's1',
    limbs: {
      head: { attached: true, body: { label: 'head' } }
    }
  };

  // 1. Domain Invariant Error (Insufficient Impulse)
  console.log('Test 1: Domain Invariant Error (Insufficient Impulse)');
  const result1 = service.detachLimb(stickman, 'head', 10);

  if (result1.error_class === 'DOMAIN_INVARIANT' && result1.retryable === false && result1.state === 'INSUFFICIENT_IMPULSE') {
    console.log('✅ PASS: Correctly identified as non-retryable DomainInvariantError.');
  } else {
    console.error('❌ FAIL: Wrong error classification for low impulse.', result1);
  }

  // Verify log structure
  const lastLog1 = logs.find(l => l.step === 'END' && l.outcome === 'ERROR');
  if (lastLog1.error_class === 'DOMAIN_INVARIANT' && lastLog1.retryable === false && lastLog1.cause_type === 'DOMAIN') {
    console.log('✅ PASS: Log contains correct error_class, retryable, and cause_type.');
  } else {
    console.error('❌ FAIL: Log structure incorrect.', lastLog1);
  }

  // 2. Boundary Validation Error (Invalid Limb)
  console.log('Test 2: Boundary Validation Error (Invalid Limb)');
  const result2 = service.detachLimb(stickman, 'tail', 20);

  if (result2.error_class === 'BOUNDARY_VALIDATION' && result2.retryable === false && result2.state === 'INVALID_LIMB') {
    console.log('✅ PASS: Correctly identified as non-retryable BoundaryValidationError.');
  } else {
    console.error('❌ FAIL: Wrong error classification for invalid limb.', result2);
  }

  // 3. Side Effects on Precondition Failure (None)
  console.log('Test 3: No side effects on precondition failure');
  if (stickman.limbs.head.attached === true) {
    console.log('✅ PASS: Stickman state preserved after failed detachment attempts.');
  } else {
    console.error('❌ FAIL: Stickman state was modified despite failure.');
  }

  // 4. Test Infra Transient Error (Simulated)
  console.log('Test 4: Infra Transient Error (Retryable)');
  try {
      throw new InfraTransientError('Network timeout', 'TIMEOUT');
  } catch (e) {
      if (e.retryable === true && e.errorClass === 'INFRA_TRANSIENT') {
          console.log('✅ PASS: InfraTransientError is retryable.');
      } else {
          console.error('❌ FAIL: InfraTransientError semantics incorrect.', e);
      }
  }

  // 5. Test Infra Permanent Error (Non-retryable)
  console.log('Test 5: Infra Permanent Error (Non-retryable)');
  try {
      throw new InfraPermanentError('Config missing', 'MISSING_CONFIG');
  } catch (e) {
      if (e.retryable === false && e.errorClass === 'INFRA_PERMANENT') {
          console.log('✅ PASS: InfraPermanentError is non-retryable.');
      } else {
          console.error('❌ FAIL: InfraPermanentError semantics incorrect.', e);
      }
  }

  console.log('--- Error Taxonomy Tests Complete ---');
}

testErrorTaxonomy().catch(console.error);
