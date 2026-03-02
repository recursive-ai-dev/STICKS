
import { LogicChainBase } from '../logic_chain_base.js';

function testLogicChainBase() {
    console.log('--- Starting Logic Chain Base Tests ---');

    const testIdProvider = () => 'test-cid';
    const testTimeProvider = () => '2023-10-27T12:00:00Z';
    let lastLog = null;
    const testLogger = (log) => { lastLog = log; };

    const base = new LogicChainBase("Test Chain", "1.0", {
        idProvider: testIdProvider,
        timeProvider: testTimeProvider,
        logger: testLogger
    });

    // 1. Test correlation ID generation
    console.log('Test 1: Correlation ID Generation');
    const cid = base.getCorrelationId();
    if (cid === 'test-cid') {
        console.log('✅ PASS: Correctly used ID provider.');
    } else {
        console.error('❌ FAIL: ID provider not used.');
    }

    // 2. Test logging
    console.log('Test 2: Logging Format');
    base.logStep('cid-1', 'STEP_NAME', 'SUCCESS', { extra: 'data' });
    if (lastLog &&
        lastLog.correlation_id === 'cid-1' &&
        lastLog.chain_name === 'Test Chain' &&
        lastLog.step === 'STEP_NAME' &&
        lastLog.extra === 'data') {
        console.log('✅ PASS: Log format is correct.');
    } else {
        console.error('❌ FAIL: Log format incorrect.', lastLog);
    }

    // 3. Test executeStep success
    console.log('Test 3: executeStep Success');
    const result = base.executeStep('cid-2', 'SUCCESS_STEP', () => {
        return { value: 42 };
    });
    if (result.value === 42 && lastLog.step === 'SUCCESS_STEP' && lastLog.outcome === 'SUCCESS') {
        console.log('✅ PASS: executeStep logged success and returned value.');
    } else {
        console.error('❌ FAIL: executeStep success failed.', result, lastLog);
    }

    // 4. Test executeStep failure
    console.log('Test 4: executeStep Failure');
    try {
        base.executeStep('cid-3', 'FAIL_STEP', () => {
            const err = new Error('boom');
            err.code = 'BOOM_CODE';
            throw err;
        });
        console.error('❌ FAIL: Should have thrown error.');
    } catch (e) {
        if (lastLog.step === 'FAIL_STEP' && lastLog.outcome === 'ERROR' && lastLog.code === 'BOOM_CODE') {
            console.log('✅ PASS: executeStep logged error and rethrew.');
        } else {
            console.error('❌ FAIL: executeStep failure logging incorrect.', lastLog);
        }
    }

    console.log('--- Logic Chain Base Tests Complete ---');
}

testLogicChainBase();
