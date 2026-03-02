/**
 * determinism_provider.js
 * Unified interface for RNG, Clock, and ID generation to ensure replayability.
 */

export class DeterminismProvider {
  /**
   * Returns a random number between 0 and 1.
   */
  random() {
    throw new Error("Not implemented");
  }

  /**
   * Returns the current timestamp (number of milliseconds).
   */
  now() {
    throw new Error("Not implemented");
  }

  /**
   * Returns a unique ID.
   */
  nextId(prefix = 'det') {
    throw new Error("Not implemented");
  }

  /**
   * Returns the current ISO string for time.
   */
  toISOString() {
    return new Date(this.now()).toISOString();
  }
}

/**
 * RealWorldProvider uses the actual system time and Math.random().
 */
export class RealWorldProvider extends DeterminismProvider {
  random() {
    return Math.random();
  }

  now() {
    return Date.now();
  }

  nextId(prefix = 'det') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

/**
 * DeterministicProvider uses a seedable RNG and a manual clock.
 */
export class DeterministicProvider extends DeterminismProvider {
  constructor(seed = 12345, startTime = 1600000000000) {
    super();
    this._seed = seed;
    this._currentTime = startTime;
    this._idCounter = 0;
  }

  // Mulberry32 RNG
  random() {
    let t = this._seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  now() {
    return this._currentTime;
  }

  advanceTime(ms) {
    this._currentTime += ms;
  }

  nextId(prefix = 'det') {
    this._idCounter++;
    return `${prefix}-${this._idCounter}-${this._seed}`;
  }
}
