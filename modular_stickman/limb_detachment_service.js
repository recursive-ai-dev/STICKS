/**
 * LimbDetachmentService.js
 * Handles the logic chain for detaching limbs from stickmen.
 */

import { LogicChainBase } from './logic_chain_base.js';

export class LimbAlreadyDetachedError extends Error {
  constructor(limbId) {
    super(`Limb ${limbId} is already detached.`);
    this.name = 'LimbAlreadyDetachedError';
    this.code = 'ALREADY_DETACHED';
  }
}

export class InvalidLimbError extends Error {
  constructor(limbId) {
    super(`Limb ${limbId} is not valid for this stickman.`);
    this.name = 'InvalidLimbError';
    this.code = 'INVALID_LIMB';
  }
}

export class LimbDetachmentService extends LogicChainBase {
  constructor(config = {}) {
    super("Limb Detachment", "1.2", config);
    this.threshold = config.threshold || 15;
  }

  /**
   * Orchestrates the limb detachment logic chain.
   */
  detachLimb(stickman, limbId, impulse, correlationId = null) {
    const cid = this.getCorrelationId(correlationId);

    this.logStep(cid, "START", "SUCCESS", { limbId, impulse });

    try {
      // 1. Validation
      const limb = this.executeStep(cid, "VALIDATE", () => {
        const targetLimb = stickman.limbs[limbId];
        if (!targetLimb) {
          throw new InvalidLimbError(limbId);
        }

        if (!targetLimb.attached) {
          return { skipped: true, reason: "Already detached" };
        }

        if (impulse < this.threshold) {
          return { skipped: true, reason: "Insufficient impulse" };
        }

        return targetLimb;
      });

      if (limb.skipped) {
        this.logStep(cid, "END", "SKIPPED", { reason: limb.reason });
        return {
          success: limb.reason === "Already detached",
          state: limb.reason === "Already detached" ? "ALREADY_DETACHED" : "INSUFFICIENT_IMPULSE",
          correlationId: cid
        };
      }

      // 2. Atomic Transition
      this.executeStep(cid, "TRANSITION", () => {
        limb.attached = false;
        return { limbId };
      });

      // 3. Side Effect Calculation
      const sideEffects = this.executeStep(cid, "SIDE_EFFECTS", () => {
        return this._calculateSideEffects(limbId);
      });

      this.logStep(cid, "END", "SUCCESS", { limbId, outcome: "DETACHED" });

      return {
        success: true,
        state: "DETACHED",
        correlationId: cid,
        limb: limb,
        sideEffects: sideEffects
      };

    } catch (error) {
      this.logStep(cid, "END", "ERROR", { error: error.message, code: error.code });
      throw error;
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
