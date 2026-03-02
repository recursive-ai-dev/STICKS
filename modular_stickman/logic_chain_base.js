/**
 * logic_chain_base.js
 * Base class for all deterministic Logic Chains in STICKS: Godfall Echoes.
 * Provides observability, correlation tracking, and structured execution.
 */

export class LogicChainBase {
  constructor(name, version, config = {}) {
    this.chainName = name;
    this.version = version;

    // Injected providers for determinism
    this.idProvider = config.idProvider || (() => `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    this.timeProvider = config.timeProvider || (() => new Date().toISOString());
    this.logger = config.logger || ((log) => console.log(`[LOG_CHAIN] ${JSON.stringify(log)}`));

    // Idempotency Ledger (At-Least-Once Reality Hardener)
    this.idempotencyLedger = new Map();
  }

  /**
   * Generates a correlation ID if one isn't provided.
   */
  getCorrelationId(cid) {
    return cid || this.idProvider();
  }

  /**
   * Logs a step in the logic chain with a standard format.
   */
  logStep(correlation_id, step, outcome, data = {}) {
    const logEntry = {
      correlation_id,
      chain_name: this.chainName,
      chain_version: this.version,
      step,
      outcome,
      timestamp: this.timeProvider(),
      ...data
    };
    this.logger(logEntry);

    // Dispatch event for UI if in browser
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('logic-chain-event', { detail: logEntry }));
    }
  }

  /**
   * Executes a step with built-in logging.
   */
  executeStep(cid, stepName, fn) {
    try {
      const result = fn();
      this.logStep(cid, stepName, "SUCCESS", result || {});
      return result;
    } catch (error) {
      this.logStep(cid, stepName, "ERROR", { error: error.message, code: error.code });
      throw error;
    }
  }

  /**
   * Idempotency Check
   * Returns the cached result if the key has already been processed.
   */
  checkIdempotency(idempotencyKey) {
    if (this.idempotencyLedger.has(idempotencyKey)) {
      const cached = this.idempotencyLedger.get(idempotencyKey);
      this.logStep(cached.correlationId, "IDEMPOTENCY_HIT", "SUCCESS", {
        idempotency_key: idempotencyKey,
        originalOutcome: cached.state
      });
      return cached;
    }
    return null;
  }

  /**
   * Marks a request as processed in the ledger.
   */
  markProcessed(idempotencyKey, result) {
    if (idempotencyKey) {
      this.idempotencyLedger.set(idempotencyKey, result);
    }
  }
}
