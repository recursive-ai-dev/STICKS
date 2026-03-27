/**
 * error_taxonomy.js
 * Defines the precise error model for Logic Chains in STICKS: Godfall Echoes.
 */

export class BaseChainError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.errorClass = options.errorClass || 'UNKNOWN';
    this.retryable = options.retryable || false;
    this.causeType = options.causeType || 'INTERNAL';
    this.code = options.code || 'BASE_ERROR';

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      error_class: this.errorClass,
      retryable: this.retryable,
      cause_type: this.causeType,
      message: this.message,
      code: this.code
    };
  }
}

/**
 * Domain Invariant Errors: Non-retryable.
 * Thrown when a business rule or domain invariant is violated.
 */
export class DomainInvariantError extends BaseChainError {
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
 * Thrown when inputs or external data fail validation at the boundary.
 */
export class BoundaryValidationError extends BaseChainError {
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
 * Thrown when an infrastructure component fails temporarily (e.g., network timeout).
 */
export class InfraTransientError extends BaseChainError {
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
 * Thrown when an infrastructure component fails permanently (e.g., misconfiguration).
 */
export class InfraPermanentError extends BaseChainError {
  constructor(message, code = 'INFRA_PERMANENT_FAILURE') {
    super(message, {
      errorClass: 'INFRA_PERMANENT',
      retryable: false,
      causeType: 'INFRASTRUCTURE',
      code
    });
  }
}
