/**
 * LimbDetachmentService.js
 * Handles the logic chain for detaching limbs from stickmen.
 * Refactored to use a transactional approach to prevent torn writes.
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
    super("Limb Detachment", "2.0", config); // Version bump for atomicity
    this.threshold = config.threshold || 15;
  }

  /**
   * Orchestrates the limb detachment logic chain.
   * Now returns a transaction instead of mutating state directly.
   */
  detachLimb(stickman, limbId, impulse, correlationId = null) {
    const cid = this.getCorrelationId(correlationId);
    this.logStep(cid, "START", "SUCCESS", { limbId, impulse });

    try {
      // 1. Validation (Read-only)
      const validation = this.executeStep(cid, "VALIDATE", () => {
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

        return { skipped: false, limb: targetLimb };
      });

      if (validation.skipped) {
        this.logStep(cid, "END", "SKIPPED", { reason: validation.reason });
        return {
          success: validation.reason === "Already detached",
          state: validation.reason === "Already detached" ? "ALREADY_DETACHED" : "INSUFFICIENT_IMPULSE",
          correlationId: cid,
          transaction: null
        };
      }

      // 2. Prepare Transaction (No mutation yet!)
      const tx = this.createTransaction(cid);

      // Stage 1: Mark limb detached
      tx.addChange('DETACH_LIMB', stickman.id, { limbId });

      // Stage 2: Calculate Side Effects
      const sideEffects = this.executeStep(cid, "SIDE_EFFECTS", () => {
        const effects = this._calculateSideEffects(limbId);
        tx.addChange('ADD_DELUSION', stickman.id, { trait: effects.trait });
        return effects;
      });

      // Stage 3: Physics Infra Update
      tx.addChange('TRACK_DETACHED_LIMB', stickman.id, {
        limbId,
        body: validation.limb.body,
        originalPosition: validation.limb.originalPosition
      });

      this.logStep(cid, "END", "SUCCESS", { limbId, outcome: "PREPARED" });

      return {
        success: true,
        state: "PREPARED",
        correlationId: cid,
        limb: validation.limb,
        sideEffects: sideEffects,
        transaction: tx
      };

    } catch (error) {
      this.logStep(cid, "END", "ERROR", {
        error: error.message,
        code: error.code,
        phase: "PREPARATION"
      });
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
