/**
 * determinism_provider.js
 * Unified interface for RNG, Clock, and ID generation to ensure replayability.
 * By using this provider instead of global Math.random or Date.now, the entire
 * game state can be recreated given the same initial seeds and inputs.
 */

/**
 * Abstract base class for determinism providers.
 */
export class DeterminismProvider {
  /**
   * Returns a random number between 0 and 1.
   * @abstract
   * @returns {number}
   */
  random() {
    throw new Error("Not implemented");
  }

  /**
   * Returns the current timestamp in milliseconds.
   * @abstract
   * @returns {number}
   */
  now() {
    throw new Error("Not implemented");
  }

  /**
   * Returns a unique ID, optionally prefixed.
   * @abstract
   * @param {string} [prefix='det']
   * @returns {string}
   */
  nextId(prefix = 'det') {
    throw new Error("Not implemented");
  }

  /**
   * Returns the current ISO string for time based on the provider's clock.
   * @returns {string}
   */
  toISOString() {
    return new Date(this.now()).toISOString();
  }
}

/**
 * RealWorldProvider uses the actual system time and Math.random().
 * Suitable for live gameplay where replayability is not strictly required.
 */
export class RealWorldProvider extends DeterminismProvider {
  /** @inheritdoc */
  random() {
    return Math.random();
  }

  /** @inheritdoc */
  now() {
    return Date.now();
  }

  /** @inheritdoc */
  nextId(prefix = 'det') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

/**
 * DeterministicProvider uses a seedable RNG and a manual clock.
 * Essential for testing, debugging, and networked state synchronization.
 */
export class DeterministicProvider extends DeterminismProvider {
  /**
   * @param {number} [seed=12345] - Initial seed for the RNG.
   * @param {number} [startTime=1600000000000] - Initial timestamp in milliseconds.
   */
  constructor(seed = 12345, startTime = 1600000000000) {
    super();
    this._seed = seed;
    this._currentTime = startTime;
    this._idCounter = 0;
  }

  /**
   * Mulberry32 RNG implementation.
   * @inheritdoc
   */
  random() {
    let t = this._seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /** @inheritdoc */
  now() {
    return this._currentTime;
  }

  /**
   * Manually advance the clock.
   * @param {number} ms - Milliseconds to advance.
   */
  advanceTime(ms) {
    this._currentTime += ms;
  }

  /** @inheritdoc */
  nextId(prefix = 'det') {
    this._idCounter++;
    return `${prefix}-${this._idCounter}-${this._seed}`;
  }
}
