/**
 * LimbDetachmentService.js
 * Handles the logic chain for detaching limbs from stickmen.
 */

import { LogicChainBase } from './logic_chain_base.js';
import { DomainInvariantError, BoundaryValidationError } from './error_taxonomy.js';

export class LimbAlreadyDetachedError extends DomainInvariantError {
  constructor(limbId) {
    super(`Limb ${limbId} is already detached.`, 'ALREADY_DETACHED');
    this.limbId = limbId;
  }
}

export class InvalidLimbError extends BoundaryValidationError {
  constructor(limbId) {
    super(`Limb ${limbId} is not valid for this stickman.`, 'INVALID_LIMB');
    this.limbId = limbId;
  }
}

export class InsufficientImpulseError extends DomainInvariantError {
  constructor(limbId, impulse, threshold) {
    super(`Impulse ${impulse} is below threshold ${threshold} for limb ${limbId}.`, 'INSUFFICIENT_IMPULSE');
    this.limbId = limbId;
    this.impulse = impulse;
    this.threshold = threshold;
  }
}

export class LimbDetachmentService extends LogicChainBase {
  constructor(config = {}) {
    super("Limb Detachment", "1.4", config);
    this.threshold = config.threshold || 15;
  }

  /**
   * Orchestrates the limb detachment logic chain.
   */
  detachLimb(stickman, limbId, impulse, correlationId = null) {
    const cid = this.getCorrelationId(correlationId);

    // Idempotency Key Definition: stickmanId + limbId
    const idempotencyKey = `detachment:${stickman.id}:${limbId}`;

    // 0. Idempotency Check (Double-Invoke Hardener)
    const cachedResult = this.checkIdempotency(idempotencyKey);
    if (cachedResult) {
      const dedupedResult = { ...cachedResult, dedupe_hit: true };
      this.logStep(cid, "DEDUPE", "SUCCESS", {
        idempotency_key: idempotencyKey,
        dedupe_hit: true,
        outcome: dedupedResult.state
      });
      return dedupedResult;
    }

    this.logStep(cid, "START", "SUCCESS", { limbId, impulse, idempotency_key: idempotencyKey });

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

        return targetLimb;
      });

      // 2. Atomic Transition
      this.executeStep(cid, "TRANSITION", () => {
        limb.attached = false;
        return { limbId };
      });

      // 3. Side Effect Calculation
      const sideEffects = this.executeStep(cid, "SIDE_EFFECTS", () => {
        return this._calculateSideEffects(limbId);
      });

      const finalResult = {
        success: true,
        state: "DETACHED",
        correlationId: cid,
        limb: limb,
        sideEffects: sideEffects,
        idempotency_key: idempotencyKey,
        dedupe_hit: false
      };

      this.markProcessed(idempotencyKey, finalResult);
      this.logStep(cid, "END", "SUCCESS", { limbId, outcome: "DETACHED", ...finalResult });

      return finalResult;

    } catch (error) {
      // Mapping errors to deterministic result objects for the caller (Presenter)
      const errorResult = {
        success: false,
        state: error.code || "ERROR",
        correlationId: cid,
        error_class: error.errorClass || 'UNKNOWN',
        retryable: error.retryable || false,
        cause_type: error.causeType || 'INTERNAL',
        message: error.message,
        idempotency_key: idempotencyKey,
        dedupe_hit: false
      };

      this.logStep(cid, "END", "ERROR", errorResult);

      // We still throw if it's a critical logic failure, but here we return for precise handling
      return errorResult;
    }
  }

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
