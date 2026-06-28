/**
 * error_taxonomy.js
 * Defines the precise error model for Logic Chains in STICKS: Godfall Echoes.
 * This taxonomy ensures that errors across the system are categorized,
 * traceable, and handleable in a deterministic manner.
 */

/**
 * Base class for all logic chain errors.
 * Encapsulates metadata for observability and automated error handling.
 */
export class BaseChainError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {Object} [options={}] - Metadata for categorization.
   * @param {string} [options.errorClass='UNKNOWN'] - High-level classification (e.g., DOMAIN_INVARIANT).
   * @param {boolean} [options.retryable=false] - Whether the operation can be safely retried.
   * @param {string} [options.causeType='INTERNAL'] - Source of the error (INTERNAL, USER_INPUT, INFRASTRUCTURE, DOMAIN).
   * @param {string} [options.code='BASE_ERROR'] - Machine-readable error code.
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.errorClass = options.errorClass || 'UNKNOWN';
    this.retryable = options.retryable || false;
    this.causeType = options.causeType || 'INTERNAL';
    this.code = options.code || 'BASE_ERROR';

    // Capture stack trace for improved debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes the error for logging and API responses.
   * @returns {Object}
   */
  toJSON() {
    return {
      error_class: this.errorClass,
      retryable: this.retryable,
      cause_type: this.causeType,
      message: this.message,
      code: this.code,
      name: this.name
    };
  }
}

/**
 * Domain Invariant Errors: Non-retryable.
 * Thrown when a business rule or domain invariant is violated (e.g., trying to detach a limb that is already gone).
 */
export class DomainInvariantError extends BaseChainError {
  /**
   * @param {string} message
   * @param {string} [code='DOMAIN_INVARIANT_VIOLATION']
   */
  constructor(message, code = 'DOMAIN_INVARIANT_VIOLATION') {
    super(message, {
      errorClass: 'DOMAIN_INVARIANT',
      retryable: false,
      causeType: 'DOMAIN',
      code
    });
  }
}

/**
 * Boundary Validation Errors: Non-retryable.
 * Thrown when inputs or external data fail validation at the boundary (e.g., invalid JSON from an API).
 */
export class BoundaryValidationError extends BaseChainError {
  /**
   * @param {string} message
   * @param {string} [code='BOUNDARY_VALIDATION_FAILED']
   */
  constructor(message, code = 'BOUNDARY_VALIDATION_FAILED') {
    super(message, {
      errorClass: 'BOUNDARY_VALIDATION',
      retryable: false,
      causeType: 'USER_INPUT',
      code
    });
  }
}

/**
 * Infra Transient Errors: Retryable.
 * Thrown when an infrastructure component fails temporarily (e.g., network timeout, temporary storage lock).
 */
export class InfraTransientError extends BaseChainError {
  /**
   * @param {string} message
   * @param {string} [code='INFRA_TRANSIENT_FAILURE']
   */
  constructor(message, code = 'INFRA_TRANSIENT_FAILURE') {
    super(message, {
      errorClass: 'INFRA_TRANSIENT',
      retryable: true,
      causeType: 'INFRASTRUCTURE',
      code
    });
  }
}

/**
 * Infra Permanent Errors: Non-retryable.
 * Thrown when an infrastructure component fails permanently (e.g., misconfiguration, missing file).
 */
export class InfraPermanentError extends BaseChainError {
  /**
   * @param {string} message
   * @param {string} [code='INFRA_PERMANENT_FAILURE']
   */
  constructor(message, code = 'INFRA_PERMANENT_FAILURE') {
    super(message, {
      errorClass: 'INFRA_PERMANENT',
      retryable: false,
      causeType: 'INFRASTRUCTURE',
      code
    });
  }
}
