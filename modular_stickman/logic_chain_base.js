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
      this.logStep(cid, stepName, "ERROR", {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      // Preserve original error but ensure it's logged
      throw error;
    }
  }

  /**
   * Creates a transactional result object to avoid "torn writes" by
   * separating logic from side-effect application.
   */
  createTransaction(cid) {
    const self = this;
    return {
      cid,
      changes: [],
      addChange: function(type, targetId, payload) {
        this.changes.push({ type, targetId, payload });
      },
      commit: function(applier) {
        self.logStep(cid, "COMMIT_START", "SUCCESS", { changeCount: this.changes.length });
        try {
          applier(this.changes);
          self.logStep(cid, "COMMIT_END", "SUCCESS");
        } catch (error) {
          self.logStep(cid, "COMMIT_FAILED", "ERROR", { error: error.message });
          throw error;
        }
      }
    };
  }
}
