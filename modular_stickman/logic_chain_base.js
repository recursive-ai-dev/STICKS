/**
 * logic_chain_base.js
 * Base class for all deterministic Logic Chains in STICKS: Godfall Echoes.
 * Provides observability, correlation tracking, structured execution, and transactional outbox.
 */

import { RealWorldProvider } from './determinism_provider.js';

/**
 * Represents a logic chain with built-in observability and determinism.
 * Logic chains are the atomic units of complex game logic.
 */
export class LogicChainBase {
  /**
   * @param {string} name - The human-readable name of the chain.
   * @param {string} version - The version of the logic implemented.
   * @param {Object} [config={}] - Configuration and dependency injection.
   * @param {import('./determinism_provider.js').DeterminismProvider} [config.determinismProvider]
   * @param {Function} [config.logger] - Custom logger function.
   * @param {string} [config.session_id] - Session identifier for cross-chain tracing.
   */
  constructor(name, version, config = {}) {
    this.chainName = name;
    this.version = version;

    // Injected provider for determinism (RNG, Clock, IDs)
    this.determinismProvider = config.determinismProvider || new RealWorldProvider();

    // Standardized providers derived from determinismProvider
    this.idProvider = config.idProvider || ((prefix) => this.determinismProvider.nextId(prefix));
    this.timeProvider = config.timeProvider || (() => this.determinismProvider.toISOString());
    this.logger = config.logger || ((log) => console.log(`[LOG_CHAIN][${log.chain_name}] ${JSON.stringify(log)}`));

    // Session-level context for tracing
    this.sessionContext = {
      session_id: config.session_id || null,
      actor_id: config.actor_id || null,
      request_id: config.request_id || this.idProvider('req')
    };

    // Per-correlation context tracking for nested or concurrent chains
    this.chainContexts = new Map(); // correlation_id -> context object

    // Idempotency Ledger (Ensures At-Least-Once delivery doesn't cause double processing)
    this.idempotencyLedger = new Map();

    // Latency tracking per correlation
    this.chainStartTimes = new Map(); // correlation_id -> start_timestamp

    // Transactional Outbox for event sourcing and reliable publishing
    this.outbox = [];
  }

  /**
   * Generates or retrieves a correlation ID.
   * @param {string} [cid] - Existing correlation ID to reuse.
   * @returns {string}
   */
  getCorrelationId(cid) {
    return cid || this.idProvider('cor');
  }

  /**
   * Sets context for a specific correlation ID.
   * @param {string} correlation_id
   * @param {Object} context
   */
  setChainContext(correlation_id, context) {
    this.chainContexts.set(correlation_id, {
      ...this.sessionContext,
      ...context
    });
  }

  /**
   * Logs a step in the logic chain with standardized metadata.
   * Enforces the Observability Contract.
   * @param {string} correlation_id
   * @param {string} step - The name of the step (e.g., START, VALIDATE, END).
   * @param {string} outcome - SUCCESS, ERROR, or SKIPPED.
   * @param {Object} [data={}] - Domain-specific data for the log.
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
      // Logic Chain Identity
      correlation_id,
      chain_name: this.chainName,
      version: this.version,
      step,
      outcome,
      latency_ms,

      // Trace Context
      ...context,
      idempotency_key: data.idempotency_key || context.idempotency_key || null,
      causal_event_id: data.causal_event_id || context.causal_event_id || null,

      // Metadata
      timestamp: this.timeProvider(),
      ...data
    };

    // Standardized error fields
    if (data.error_class) logEntry.error_class = data.error_class;
    if (data.retryable !== undefined) logEntry.retryable = data.retryable;
    if (data.cause_type) logEntry.cause_type = data.cause_type;

    this.logger(logEntry);

    // Browser-specific event dispatching for UI debuggers
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('logic-chain-event', { detail: logEntry }));
    }

    // Clean up tracking on terminal steps to prevent memory leaks
    if (step === "END") {
      this.chainStartTimes.delete(correlation_id);
      this.chainContexts.delete(correlation_id);
    }
  }

  /**
   * Executes a step with automatic logging and performance tracking.
   * @template T
   * @param {string} cid - Correlation ID.
   * @param {string} stepName
   * @param {() => T} fn - The logic to execute.
   * @returns {T}
   * @throws {BaseChainError}
   */
  executeStep(cid, stepName, fn) {
    const stepStart = this.determinismProvider.now();
    try {
      const result = fn();
      const stepLatency = this.determinismProvider.now() - stepStart;
      this.logStep(cid, stepName, "SUCCESS", {
        ...(typeof result === 'object' && result !== null ? result : { result }),
        step_latency_ms: stepLatency
      });
      return result;
    } catch (error) {
      const stepLatency = this.determinismProvider.now() - stepStart;

      const errorPayload = {
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        error_class: error.errorClass || 'TECHNICAL',
        retryable: error.retryable || false,
        cause_type: error.causeType || 'INTERNAL',
        step_latency_ms: stepLatency
      };

      this.logStep(cid, stepName, "ERROR", errorPayload);
      throw error;
    }
  }

  /**
   * Checks if an operation with the given idempotency key has already been processed.
   * @param {string} idempotencyKey
   * @returns {Object|null} The cached result if hit, otherwise null.
   */
  checkIdempotency(idempotencyKey) {
    if (!idempotencyKey) return null;
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
   * Records a processed request in the idempotency ledger.
   * @param {string} idempotencyKey
   * @param {Object} result
   */
  markProcessed(idempotencyKey, result) {
    if (idempotencyKey) {
      this.idempotencyLedger.set(idempotencyKey, result);
    }
  }

  /**
   * Commits an event to the outbox. Events are only dispatched if the chain completes.
   * @param {string} correlationId
   * @param {string} eventType
   * @param {string} version - Schema version of the event.
   * @param {Object} payload
   * @returns {Object} The created event object.
   */
  commitToOutbox(correlationId, eventType, version, payload) {
    const event = {
      eventId: this.idProvider('evt'),
      correlationId,
      eventType,
      version,
      timestamp: this.timeProvider(),
      payload,
      chainName: this.chainName,
      chainVersion: this.version
    };
    this.outbox.push(event);
    
    this.logStep(correlationId, "OUTBOX_COMMIT", "SUCCESS", {
      event_type: eventType,
      event_id: event.eventId
    });
    
    // In browser, also dispatch as a window event for immediate consumption by UI systems
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('outbox-debug-event', { detail: event }));
    }

    return event;
  }

  /**
   * Retrieves and clears the outbox. Typically called by the orchestration layer.
   * @returns {Array<Object>}
   */
  flushOutbox() {
    const events = [...this.outbox];
    this.outbox = [];
    return events;
  }

  /**
   * Peek at the current outbox without clearing it.
   * @returns {Array<Object>}
   */
  getOutbox() {
    return [...this.outbox];
  }
}
