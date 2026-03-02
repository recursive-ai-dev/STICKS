/**
 * logic_chain_base.js
 * Base class for all deterministic Logic Chains in STICKS: Godfall Echoes.
 * Provides observability, correlation tracking, and structured execution.
 */

import { RealWorldProvider } from './determinism_provider.js';

export class LogicChainBase {
  constructor(name, version, config = {}) {
    this.chainName = name;
    this.version = version;

    // Injected provider for determinism
    this.determinismProvider = config.determinismProvider || new RealWorldProvider();

    // Legacy support for individual providers if passed
    this.idProvider = config.idProvider || (() => this.determinismProvider.nextId());
    this.timeProvider = config.timeProvider || (() => this.determinismProvider.toISOString());
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
      this.logStep(cid, stepName, "ERROR", { error: error.message, code: error.code });
      throw error;
    }
  }
}
