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

    // Ensure error metadata is top-level if provided in data
    if (data.error_class) logEntry.error_class = data.error_class;
    if (data.retryable !== undefined) logEntry.retryable = data.retryable;
    if (data.cause_type) logEntry.cause_type = data.cause_type;

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
      // First log: technical error details
      this.logStep(cid, stepName, "ERROR", {
        error_classification: error.code || 'UNKNOWN_ERROR',
        error_message: error.message,
        preserved_cause: error.cause || null,
        step_latency_ms: stepLatency
      });
      // Second log: structured error data for observability
      const errorData = {
        error: error.message,
        code: error.code,
        error_class: error.errorClass || 'UNKNOWN',
        retryable: error.retryable || false,
        cause_type: error.causeType || 'INTERNAL'
      };
      this.logStep(cid, stepName, "ERROR", errorData);
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

  /**
   * Commits an event to the outbox for eventual consistency / event sourcing.
   * This enables reliable event publishing after successful transaction completion.
   * @param {string} correlationId - The correlation ID for tracing
   * @param {string} eventType - The type of event being published
   * @param {string} version - The schema version of the event
   * @param {object} payload - The event payload data
   */
  commitToOutbox(correlationId, eventType, version, payload) {
    if (!this.outbox) {
      this.outbox = [];
    }
    const event = {
      eventId: this.idProvider(),
      correlationId,
      eventType,
      version,
      timestamp: this.timeProvider(),
      payload,
      chainName: this.chainName,
      chainVersion: this.version
    };
    this.outbox.push(event);
    
    // Log the event commitment for observability
    this.logStep(correlationId, "OUTBOX_COMMIT", "SUCCESS", {
      event_type: eventType,
      event_id: event.eventId
    });
    
    return event;
  }

  /**
   * Retrieves and clears the outbox, returning all pending events.
   * @returns {Array} Array of pending events
   */
  flushOutbox() {
    if (!this.outbox || this.outbox.length === 0) {
      return [];
    }
    const events = [...this.outbox];
    this.outbox = [];
    return events;
  }

  /**
   * Gets the current outbox without clearing it.
   * @returns {Array} Array of pending events
   */
  getOutbox() {
    return this.outbox || [];
  }
}
