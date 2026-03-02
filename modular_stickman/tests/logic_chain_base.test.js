import { LogicChainBase } from '../logic_chain_base.js';

function testLogicChainBase() {
  console.log('--- Starting Logic Chain Base Tests ---');

  const logs = [];
  const testLogger = (log) => logs.push(log);

  const chain = new LogicChainBase("TestChain", "1.0", {
    idProvider: () => 'test-id',
    timeProvider: () => '2023-10-27T12:00:00Z',
    logger: testLogger
  });

  // 1. Correlation ID
  console.log('Test 1: Correlation ID Generation');
  if (chain.getCorrelationId() === 'test-id') {
    console.log('✅ PASS: Correctly used ID provider.');
  } else {
    console.error('❌ FAIL: ID provider not used.');
  }

  // 2. Logging Format
  console.log('Test 2: Logging Format');
  chain.logStep('cid-1', 'STEP1', 'SUCCESS', { extra: 'data' });
  const log = logs[0];
  if (log.correlation_id === 'cid-1' && log.chain_name === 'TestChain' && log.extra === 'data') {
    console.log('✅ PASS: Log format is correct.');
  } else {
    console.error('❌ FAIL: Log format incorrect.', log);
  }

  // 3. executeStep success
  console.log('Test 3: executeStep Success');
  const val = chain.executeStep('cid-2', 'STEP2', () => 'hello');
  if (val === 'hello' && logs[1].step === 'STEP2' && logs[1].outcome === 'SUCCESS') {
    console.log('✅ PASS: executeStep logged success and returned value.');
  } else {
    console.error('❌ FAIL: executeStep success failed.', logs[1]);
  }

  // 4. executeStep failure
  console.log('Test 4: executeStep Failure');
  try {
    chain.executeStep('cid-3', 'STEP3', () => {
        const err = new Error('boom');
        err.errorClass = 'FATAL';
        err.retryable = false;
        err.causeType = 'TEST';
        throw err;
    });
  } catch (e) {
    const errorLog = logs[2];
    if (errorLog.outcome === 'ERROR' && errorLog.error_class === 'FATAL' && errorLog.retryable === false) {
      console.log('✅ PASS: executeStep logged error and rethrew.');
    } else {
      console.error('❌ FAIL: executeStep failure logging incorrect.', errorLog);
    }
  }

  console.log('--- Logic Chain Base Tests Complete ---');
}

testLogicChainBase();
