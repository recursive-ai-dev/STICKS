/**
 * limb_detachment_service.js
 * Handles the logic chain for detaching limbs from stickmen.
 * This service orchestrates the high-level decision to detach, while the
 * PhysicsEngine handles the low-level constraint removal.
 */

import { LogicChainBase } from './logic_chain_base.js';
import { DomainInvariantError, BoundaryValidationError } from './error_taxonomy.js';

/**
 * Thrown when attempting to detach a limb that is already gone.
 */
export class LimbAlreadyDetachedError extends DomainInvariantError {
  /** @param {string} limbId */
  constructor(limbId) {
    super(`Limb ${limbId} is already detached.`, 'ALREADY_DETACHED');
    this.limbId = limbId;
  }
}

/**
 * Thrown when the requested limb ID does not exist on the stickman.
 */
export class InvalidLimbError extends BoundaryValidationError {
  /** @param {string} limbId */
  constructor(limbId) {
    super(`Limb ${limbId} is not valid for this stickman.`, 'INVALID_LIMB');
    this.limbId = limbId;
  }
}

/**
 * Thrown when the impact impulse is not strong enough to cause detachment.
 */
export class InsufficientImpulseError extends DomainInvariantError {
  /**
   * @param {string} limbId
   * @param {number} impulse
   * @param {number} threshold
   */
  constructor(limbId, impulse, threshold) {
    super(`Impulse ${impulse} is below threshold ${threshold} for limb ${limbId}.`, 'INSUFFICIENT_IMPULSE');
    this.limbId = limbId;
    this.impulse = impulse;
    this.threshold = threshold;
  }
}

/**
 * Logic Chain for Limb Detachment events.
 */
export class LimbDetachmentService extends LogicChainBase {
  /**
   * @param {Object} [config={}]
   * @param {number} [config.threshold=15] - Minimum impulse required for detachment.
   */
  constructor(config = {}) {
    super("Limb Detachment", "1.5", config);
    this.threshold = config.threshold || 15;
  }

  /**
   * Orchestrates the limb detachment logic chain.
   * Enforces the Observability Contract and ensure atomic state transitions.
   *
   * @param {Object} stickman - The stickman entity.
   * @param {string} limbId - The ID of the limb to detach.
   * @param {number} impulse - The force of the impact.
   * @param {string} [correlationId] - Optional tracing ID.
   * @returns {Object} Result object indicating success and outcome.
   */
  detachLimb(stickman, limbId, impulse, correlationId = null) {
    const cid = this.getCorrelationId(correlationId);
    const actor_id = stickman.id;

    // Idempotency Key Definition: stickmanId + limbId
    // This prevents a single impact from firing multiple detachment events for the same limb.
    const idempotencyKey = `detachment:${actor_id}:${limbId}`;

    this.setChainContext(cid, {
      actor_id,
      idempotency_key: idempotencyKey
    });

    this.logStep(cid, "START", "SUCCESS", { limbId, impulse });

    // 0. Idempotency Check
    const dedupeCheck = this.checkIdempotency(idempotencyKey);
    if (dedupeCheck) {
      return { ...dedupeCheck, dedupe_hit: true };
    }

    try {
      // 1. Validation
      const limb = this.executeStep(cid, "VALIDATE", () => {
        const targetLimb = stickman.limbs[limbId];
        if (!targetLimb) {
          throw new InvalidLimbError(limbId);
        }

        if (!targetLimb.attached) {
          throw new LimbAlreadyDetachedError(limbId);
        }

        if (impulse < this.threshold) {
          throw new InsufficientImpulseError(limbId, impulse, this.threshold);
        }

        // Return a safe projection to prevent circular JSON serialization crashes
        // from Matter.js Body and Constraint objects when logging the outbox event
        return {
          attached: targetLimb.attached,
          bodyLabel: targetLimb.body ? targetLimb.body.label : limbId
        };
      });

      // 2. Side Effect Calculation (Traits/Delusions)
      const sideEffects = this.executeStep(cid, "SIDE_EFFECTS", () => {
        return this._calculateSideEffects(limbId);
      });

      // 3. Prepare result (Transition is handled by the caller/PhysicsEngine after this success)
      const finalResult = {
        success: true,
        state: "DETACHED",
        correlationId: cid,
        limb: limb,
        sideEffects: sideEffects,
        idempotency_key: idempotencyKey,
        dedupe_hit: false
      };

      // 4. Outbox Commitment (Event Sourcing)
      this.commitToOutbox(cid, "LimbDetached", "1.0", {
          stickman_id: actor_id,
          limb_id: limbId,
          impulse,
          trait_gained: sideEffects.trait
      });

      this.markProcessed(idempotencyKey, finalResult);

      this.logStep(cid, "END", "SUCCESS", {
        limbId,
        outcome: "DETACHED"
      });

      return finalResult;

    } catch (error) {
      // Map domain errors to deterministic result objects
      const errorResult = {
        success: error instanceof LimbAlreadyDetachedError, // already detached is a "success" state for idempotency
        state: error.code || "ERROR",
        correlationId: cid,
        message: error.message,
        idempotency_key: idempotencyKey,
        dedupe_hit: false
      };

      if (error instanceof LimbAlreadyDetachedError) {
          this.markProcessed(idempotencyKey, errorResult);
      }

      this.logStep(cid, "END", errorResult.success ? "SUCCESS" : "ERROR", {
        error_code: error.code,
        outcome: errorResult.state
      });

      return errorResult;
    }
  }

  /**
   * Internal logic to determine side effects of losing a specific limb.
   * @private
   * @param {string} limbId
   * @returns {Object}
   */
  _calculateSideEffects(limbId) {
    const traits = {
      head: ['hallucinate_enemies_as_cows'],
      rightArm: ['weaponized_limbs'],
      leftArm: ['weaponized_limbs'],
      rightLeg: ['gravity_distortion'],
      leftLeg: ['gravity_distortion']
    };

    return {
      trait: traits[limbId] ? traits[limbId][0] : 'random_hallucination',
      effectType: 'detachment_visual'
    };
  }
}
