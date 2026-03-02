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

    // Context tracking for observability
    this.sessionContext = {
      session_id: config.session_id || null,
      actor_id: config.actor_id || null,
      request_id: config.request_id || null
    };

    // Per-correlation context tracking
    this.chainContexts = new Map(); // correlation_id -> context object

    // Idempotency Ledger (At-Least-Once Reality Hardener)
    this.idempotencyLedger = new Map();

    // Latency tracking
    this.chainStartTimes = new Map(); // correlation_id -> start_timestamp
  }

  /**
   * Generates a correlation ID if one isn't provided.
   */
  getCorrelationId(cid) {
    return cid || this.idProvider();
  }

  /**
   * Sets context for a specific correlation ID.
   */
  setChainContext(correlation_id, context) {
    this.chainContexts.set(correlation_id, {
      ...this.sessionContext,
      ...context
    });
  }

  /**
   * Logs a step in the logic chain with a standard format.
   * Enforces the Observability Contract.
   */
  logStep(correlation_id, step, outcome, data = {}) {
    const now = this.determinismProvider.now();

    // Calculate latency since chain start if available
    let latency_ms = 0;
    if (step === "START") {
      this.chainStartTimes.set(correlation_id, now);
    } else if (this.chainStartTimes.has(correlation_id)) {
      latency_ms = now - this.chainStartTimes.get(correlation_id);
    }

    const context = this.chainContexts.get(correlation_id) || this.sessionContext;

    const logEntry = {
      // Required fields
      correlation_id,
      chain_name: this.chainName,
      version: this.version,
      step,
      outcome,
      latency_ms,

      // Domain-specific fields
      ...context,
      idempotency_key: data.idempotency_key || context.idempotency_key || null,
      causal_event_id: data.causal_event_id || context.causal_event_id || null,

      // Metadata
      timestamp: this.timeProvider(),
      ...data
    };

    this.logger(logEntry);

    // Dispatch event for UI if in browser
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('logic-chain-event', { detail: logEntry }));
    }

    // Clean up tracking on terminal steps
    if (step === "END") {
      this.chainStartTimes.delete(correlation_id);
      this.chainContexts.delete(correlation_id);
    }
  }

  /**
   * Executes a step with built-in logging and latency tracking.
   */
  executeStep(cid, stepName, fn) {
    const stepStart = this.determinismProvider.now();
    try {
      const result = fn();
      const stepLatency = this.determinismProvider.now() - stepStart;
      this.logStep(cid, stepName, "SUCCESS", {
        ...(result || {}),
        step_latency_ms: stepLatency
      });
      return result;
    } catch (error) {
      const stepLatency = this.determinismProvider.now() - stepStart;
      this.logStep(cid, stepName, "ERROR", {
        error_classification: error.code || 'UNKNOWN_ERROR',
        error_message: error.message,
        preserved_cause: error.cause || null,
        step_latency_ms: stepLatency
      });
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
