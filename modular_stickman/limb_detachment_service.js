/**
 * LimbDetachmentService.js
 * Handles the logic chain for detaching limbs from stickmen.
 */

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

export class LimbDetachmentService {
  constructor(config = {}) {
    this.threshold = config.threshold || 15;
    this.version = "1.1";
    this.chainName = "Limb Detachment";

    // Injected providers for determinism
    this.idProvider = config.idProvider || (() => `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    this.timeProvider = config.timeProvider || (() => new Date().toISOString());
  }

  /**
   * Orchestrates the limb detachment logic chain.
   */
  detachLimb(stickman, limbId, impulse, correlationId = null) {
    const cid = correlationId || this.idProvider();

    this._log(cid, "START", "SUCCESS", { limbId, impulse });

    try {
      // 1. Validation
      this._log(cid, "VALIDATE", "SUCCESS", { limbId });

      const limb = stickman.limbs[limbId];
      if (!limb) {
        throw new InvalidLimbError(limbId);
      }

      if (!limb.attached) {
        this._log(cid, "VALIDATE", "SKIPPED", { reason: "Already detached" });
        return { success: true, state: "ALREADY_DETACHED", correlationId: cid };
      }

      if (impulse < this.threshold) {
        this._log(cid, "VALIDATE", "SKIPPED", { reason: "Insufficient impulse" });
        return { success: false, state: "INSUFFICIENT_IMPULSE", correlationId: cid };
      }

      // 2. Atomic Transition
      limb.attached = false;
      this._log(cid, "TRANSITION", "SUCCESS", { limbId });

      // 3. Side Effect Calculation
      const sideEffects = this._calculateSideEffects(limbId);
      this._log(cid, "SIDE_EFFECTS", "SUCCESS", { effects: sideEffects });

      this._log(cid, "END", "SUCCESS", { limbId, outcome: "DETACHED" });

      return {
        success: true,
        state: "DETACHED",
        correlationId: cid,
        limb: limb,
        sideEffects: sideEffects
      };

    } catch (error) {
      this._log(cid, "END", "ERROR", { error: error.message, code: error.code });
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

  _log(correlation_id, step, outcome, data = {}) {
    const logEntry = {
      correlation_id,
      chain_name: this.chainName,
      chain_version: this.version,
      step,
      outcome,
      timestamp: this.timeProvider(),
      ...data
    };
    console.log(`[LOG_CHAIN] ${JSON.stringify(logEntry)}`);
  }
}
