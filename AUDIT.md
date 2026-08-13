# Code Quality Audit Report

**Project:** STICKS: Godfall Echoes & Related Generators  
**Scope:** JavaScript source files in `/workspace`  
**Audit Type:** Read-only quality assessment for bugs, correctness risks, and inefficiencies

---

## Ranked Findings by Impact

### 1. Event Listener Cleanup Failure - Memory Leak Risk

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 136-151 (add), 552-555 (remove)

**Problem:** Event listeners are registered using inline arrow functions but removal attempts reference method names that don't exist as bound properties. The `addEventListener` calls use inline closures `(e) => { this.handleMouseDown(pos); }`, while `removeEventListener` tries to remove `this.handleMouseDown` directly—these are different function references, so removal fails.

**Why it matters:** Every time `destroy()` is called and a new `StickmanPhysics` instance is created (e.g., via `game.reset()`), new event listeners accumulate without the old ones being removed. This causes memory leaks, duplicate event firing, and degraded performance over time.

**Proposed fix:** Store references to the handler functions as class properties in the constructor, then use those same references for both add and remove:
```javascript
// In constructor:
this._onMouseDown = (e) => { this.handleMouseDown(this.getMousePosition(e)); };
this._onMouseMove = (e) => { this.handleMouseMove(this.getMousePosition(e)); };
this._onMouseUp = () => { this.handleMouseUp(); };
this._onKeyDown = (e) => { /* keyboard logic */ };

// In setupEventListeners():
this.canvas.addEventListener('mousedown', this._onMouseDown);
// ... etc

// In destroy():
this.canvas.removeEventListener('mousedown', this._onMouseDown);
// ... etc
```

**Overlap:** None.

---

### 2. Undefined Property Access - Runtime Crash

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 400, 233

**Problem:** `triggerDelusionBurst()` at line 400 references `this.lastDelusionBurstTime` which is never initialized anywhere in the class. The property `lastPulseTime` exists on stickman objects (line 233) but `lastDelusionBurstTime` on the physics engine itself does not.

**Why it matters:** The first call to `triggerDelusionBurst()` will compute `now - undefined` which yields `NaN`, causing the cooldown check to fail unpredictably. Subsequent behavior depends on how JavaScript handles `NaN < cooldown` (always false), meaning the cooldown mechanism is completely broken.

**Proposed fix:** Initialize `this.lastDelusionBurstTime = 0;` in the constructor alongside other state properties like `this.stickmen` and `this.detachedLimbs`.

**Overlap:** None.

---

### 3. Missing Method Definition - ReferenceError on Cleanup

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 151-159 (listener registration), 555 (removal)

**Problem:** Line 555 attempts to remove a listener for `this.handleKeyDown`, but no such method exists. The keyboard handling logic is defined inline within `setupEventListeners()` at lines 151-159 as an anonymous arrow function passed directly to `addEventListener`.

**Why it matters:** Calling `destroy()` will throw a `ReferenceError` or fail silently depending on strict mode, leaving the keyboard listener permanently attached. This compounds the memory leak issue and can cause unexpected behavior if multiple instances are created.

**Proposed fix:** Extract the keyboard handler into a named class method `handleKeyDown(e)` and store a reference to it for proper cleanup, similar to Fix #1.

**Overlap:** Overlaps with Item #1 (same root cause: improper event listener management).

---

### 4. Invalid Matter.js Render Option - Silent Failure or Crash

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Line:** 90

**Problem:** The render options include `show休眠：false` which contains Chinese characters ("休眠" means "sleep"). This is not a valid Matter.js render option and appears to be leftover debug code or an encoding artifact.

**Why it matters:** Matter.js will either ignore this unknown property (silent failure masking other issues) or throw an error during renderer initialization, preventing the game from starting.

**Proposed fix:** Remove the invalid `show休眠：false` line entirely. If sleep debugging was intended, use the correct Matter.js option `showSleeping: false`.

**Overlap:** None.

---

### 5. Collision Event Listener Leak - Performance Degradation

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 301-314

**Problem:** Inside `createStickman()`, a new collision event listener is added via `Events.on(this.engine, 'collisionStart', ...)` every time a stickman is created. These listeners are never removed when stickmen are destroyed or when the physics engine is cleaned up.

**Why it matters:** Creating 10 stickmen results in 10 identical collision listeners executing on every collision event. This causes O(n²) growth in collision processing time, severe performance degradation, and duplicate limb detachment checks.

**Proposed fix:** Register the collision listener once in the constructor and store all stickmen in `this.stickmen`. The existing listener logic should iterate over `this.stickmen` rather than creating per-stickman listeners.

**Overlap:** Related to Items #1 and #3 (event listener lifecycle management).

---

### 6. Stale Closure in Animation Loop - Incorrect Delta Time

**File:** `/workspace/modular_stickman/game.js`  
**Lines:** 53-68

**Problem:** The `gameLoop` function captures `this.lastTime` and `this.deltaTime` but these are updated inside the loop before being used for rendering. On the first frame, `this.lastTime` is 0, causing `deltaTime` to be the full timestamp since page load (~tens of thousands of milliseconds).

**Why it matters:** The first rendered frame will have an enormous delta time value, potentially causing physics explosions, animation jumps, or division-by-zero issues in any code that divides by deltaTime. The FPS calculation at line 124 also shows garbage on the first frame.

**Proposed fix:** Initialize `this.lastTime` to `performance.now()` in `init()` instead of 0, or add a guard in `gameLoop` to skip the first frame's update logic:
```javascript
if (this.lastTime === 0) {
  this.lastTime = timestamp;
  requestAnimationFrame((ts) => this.gameLoop(ts));
  return;
}
```

**Overlap:** None.

---

### 7. Uninitialized Canvas Dimensions - Null Reference Crash

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 79-84

**Problem:** The Matter.js renderer is configured with `width: this.canvas.width` and `height: this.canvas.height` immediately after getting the canvas element. If the canvas exists but has no explicit width/height attributes set, these default to 300x150, which may not match the intended game resolution (800x600 as seen in game.js).

**Why it matters:** The renderer creates a mismatched coordinate system. Mouse input coordinates won't align with rendered positions, and the game world appears incorrectly scaled.

**Proposed fix:** Explicitly set canvas dimensions before creating the renderer, or read from CSS-computed values:
```javascript
this.canvas.width = 800;
this.canvas.height = 600;
// OR
const rect = this.canvas.getBoundingClientRect();
options: { width: rect.width, height: rect.height, ... }
```

**Overlap:** None.

---

### 8. Synchronous File I/O in Test Cleanup - Race Condition

**File:** `/workspace/modular_stickman/tests/security_load_animation.test.js`  
**Lines:** 59-60

**Problem:** The test cleanup at line 60 uses `fs.unlinkSync()` synchronously after async tests complete, but this runs outside the promise chain. If the test runner exits before cleanup completes (or if an earlier assertion calls `process.exit(1)`), the temporary file remains.

**Why it matters:** Repeated test runs accumulate temporary files in the animations directory, eventually causing disk space issues or test failures when the directory reaches filesystem limits.

**Proposed fix:** Include cleanup in the promise chain or use a try/finally block:
```javascript
async function runTest() {
  try {
    // ... tests ...
  } finally {
    try { fs.unlinkSync(path.join(animDir, 'test_anim.json')); } catch(e) {}
  }
}
```

**Overlap:** None.

---

### 9. Duplicate Array Entry in Generator List - Redundant Execution

**File:** `/workspace/godfall/integrate_godfall.js`  
**Line:** 154

**Problem:** The `charGens` array includes `generators.cowboy_apng_characters` twice: `[generators.cowboy_characters, generators.medieval_characters, generators.modular_cowboy, generators.cowboy_apng_characters, generators.cowboy_apng_characters]`.

**Why it matters:** When running `godfall_characters` target, the APNG generator executes twice consecutively, doubling processing time and potentially overwriting outputs unnecessarily.

**Proposed fix:** Remove the duplicate entry:
```javascript
const charGens = [
  generators.cowboy_characters,
  generators.medieval_characters,
  generators.modular_cowboy,
  generators.cowboy_apng_characters
].filter(Boolean);
```

**Overlap:** None.

---

### 10. Missing Bounds Check in Procedural Animation - Index Out of Range

**File:** `/workspace/modular_stickman/procedural_animation_generator.js`  
**Lines:** 107-176

**Problem:** The `evaluateChromosome` function accesses `prevDelta` at line 164 before checking if it exists. While `prevDelta` is set to `null` initially and assigned at line 172, the conditional `if (prevDelta)` only guards the jerk calculation, but the delta object itself is built using `prev.rightLegRaw` etc. which could be undefined on edge cases.

**Why it matters:** If `frameCount` is 1 or the loop exits early due to an error, accessing properties of `prev` when it's still `null` causes a crash.

**Proposed fix:** Add explicit null check before accessing prev properties:
```javascript
if (prev) {
  const delta = { ... };
  smoothness += ...;
  if (prevDelta) { jerk += ...; }
  prevDelta = delta;
}
```
(This is already partially done but the structure could be clearer.)

**Overlap:** None.

---

### 11. Hardcoded Animation Name - Missing Default Behavior

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Line:** 502

**Problem:** The `drawStickman` method hardcodes `const animationName = 'walk';` with no fallback if the animation doesn't exist. If `loadAnimation('walk')` returns null, `applyAnimationFrame` receives invalid data.

**Why it matters:** If the walk.json file is missing or corrupted, the rendering silently fails (returns early at line 8 of animation_renderer.js), leaving stickmen invisible without any error indication.

**Proposed fix:** Add a fallback mechanism:
```javascript
const animationName = 'walk';
const animation = loadAnimation(animationName);
if (!animation) {
  console.warn('Walk animation not found, using default rendering');
  // Fall back to basic physics-based rendering
}
```

**Overlap:** None.

---

### 12. Floating Point Precision Issue in Intensity Check

**File:** `/workspace/modular_stickman/tests/madness_field.test.js`  
**Lines:** 60-65

**Problem:** Test asserts exact equality `field.intensity === 0.5` after computing `0.2 + (3 * 0.1)`. Due to floating point representation, `0.2 + 0.3` may not equal exactly `0.5` in all JavaScript engines.

**Why it matters:** The test may intermittently fail depending on the JS engine's floating point implementation, causing false negatives in CI/CD pipelines.

**Proposed fix:** Use approximate comparison:
```javascript
if (Math.abs(field.intensity - 0.5) < 0.0001 && Math.abs(field.time - 16.6) < 0.0001)
```

**Overlap:** None.

---

### 13. Unused Export in Limb Detachment Service

**File:** `/workspace/modular_stickman/limb_detachment_service.js`  
**Lines:** 8-14

**Problem:** `LimbAlreadyDetachedError` is defined and exported but never thrown or referenced anywhere in the codebase. The service returns `{ success: true, state: "ALREADY_DETACHED" }` instead of throwing this error.

**Why it matters:** Dead code increases bundle size and confuses developers about the intended error handling strategy. It suggests an incomplete refactor where error throwing was planned but never implemented.

**Proposed fix:** Either remove the unused export or implement consistent error throwing:
```javascript
if (!targetLimb.attached) {
  throw new LimbAlreadyDetachedError(limbId);
}
```

**Overlap:** None.

---

### 14. Inconsistent Return Type in Detachment Logic

**File:** `/workspace/modular_stickman/limb_detachment_service.js`  
**Lines:** 57-64

**Problem:** When impulse is insufficient, the function returns `{ success: false, ... }`, but when already detached, it returns `{ success: true, ... }`. Both are "skipped" states but have opposite success values.

**Why it matters:** Callers checking `result.success` cannot distinguish between "successfully confirmed already detached" vs "failed to detach due to low impulse". This forces callers to also check `result.state`, creating fragile conditional logic.

**Proposed fix:** Standardize return semantics. Consider making "already detached" also return `success: false` with a distinct state, or document the current behavior clearly:
```javascript
return {
  success: false,  // Changed from true
  state: limb.reason === "Already detached" ? "ALREADY_DETACHED" : "INSUFFICIENT_IMPULSE",
  correlationId: cid
};
```

**Overlap:** None.

---

### 15. Magic Number in World Pulse Timer

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Line:** 464

**Problem:** The interval `60000` (60 seconds) is hardcoded without explanation or configuration. No constant name documents what this represents.

**Why it matters:** If game design changes the pulse frequency, developers must hunt through the codebase to find this value. Multiple pulse timers might be added with different intervals, creating inconsistency.

**Proposed fix:** Define a named constant at the top of the file:
```javascript
const WORLD_PULSE_INTERVAL_MS = 60000; // 60 seconds
// ...
setInterval(() => { this.triggerWorldPulse(); }, WORLD_PULSE_INTERVAL_MS);
```

**Overlap:** None.

---

### 16. Missing Error Handling in File Write Stream

**File:** `/workspace/stickemup_character_generator/medieval/medieval_stickmen_generator.js`  
**Lines:** 898-903

**Problem:** PNG stream piping uses `stream.pipe(out)` but only handles the `finish` event. If the write fails (disk full, permission denied), the error event is never caught, causing unhandled stream errors.

**Why it matters:** Failed writes leave partial/corrupt files and may crash the entire generation process without clear error messages about which sprite failed.

**Proposed fix:** Add error handler:
```javascript
out.on("finish", () => { /* log */ });
out.on("error", (err) => {
  console.error(`Failed to write ${filename}:`, err.message);
});
```

**Overlap:** Similar pattern exists in environment generator (lines vary).

---

### 17. Security Bypass via Prototype Pollution in Argument Parsing

**File:** `/workspace/godfall/integrate_godfall.js`  
**Lines:** 95-107

**Problem:** The `parseArgs` function blindly assigns user-provided values to the output object including prototype-polluting keys like `__proto__` or `constructor`. An attacker could pass `--__proto__.polluted=true` to modify Object.prototype.

**Why it matters:** While this script runs locally, prototype pollution can cause unexpected behavior in downstream code that checks for object properties, potentially leading to security vulnerabilities if the parsed args influence file paths or command execution.

**Proposed fix:** Use `Object.create(null)` for the output object or explicitly filter dangerous keys:
```javascript
const out = Object.create(null);
// ... parsing logic ...
// Or validate keys before assignment
if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
```

**Overlap:** None.

---

### 18. Off-by-One in Frame Index Calculation

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Line:** 503

**Problem:** Animation frame is calculated as `Math.floor(Date.now() / 100) % 6`, assuming 6 frames. However, if the loaded animation JSON has a different `frameCount`, this hardcoded `% 6` will either skip frames or access non-existent frame indices.

**Why it matters:** Animations with more or fewer than 6 frames will display incorrectly—either looping too fast/slow or crashing when accessing undefined frame data.

**Proposed fix:** Read frame count from the loaded animation:
```javascript
const animation = loadAnimation(animationName);
const frameCount = animation?.frameCount || 6;
const animationFrame = Math.floor(Date.now() / 100) % frameCount;
```

**Overlap:** Related to Item #11 (animation handling).

---

### 19. Unchecked Array Access in Madness Field Harmonics

**File:** `/workspace/modular_stickman/physics_engine.js`  
**Lines:** 18-22, 36-38

**Problem:** The `harmonics` array is hardcoded with 3 entries, but the `calculatePerturbation` method uses `reduce` without validating that harmonics exist. If someone modifies the harmonics array to be empty, the reduce returns 0 without error, silently disabling the madness field.

**Why it matters:** Configuration errors or dynamic modifications to harmonics could disable gameplay mechanics without any warning, making debugging difficult.

**Proposed fix:** Add validation:
```javascript
if (this.harmonics.length === 0) {
  console.warn('MadnessField: No harmonics configured');
  return 0;
}
```

**Overlap:** None.

---

### 20. Resource Leak in APNG/Theme Processors

**File:** `/workspace/godfall/apply_godfall_theme.js` and `/workspace/godfall/apply_godfall_style.js`  
**Pattern:** Lines 46-81 (theme), 69-141 (style)

**Problem:** Both processors use async image loading and canvas operations but never explicitly clean up canvas resources or handle image decode failures gracefully. If processing hundreds of files, accumulated canvas contexts may exhaust memory.

**Why it matters:** Large batch processing jobs may fail partway through with out-of-memory errors, requiring manual restart and losing progress.

**Proposed fix:** Add explicit cleanup after each file and batch processing with concurrency limits:
```javascript
// After saving:
canvas.width = 0;
canvas.height = 0;
// Or process in batches of N files with Promise.all()
```

**Overlap:** Similar pattern in both theme and style processors.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Real Bugs (crashes, leaks, faults) | 8 |
| Correctness Risks (state desync, silent failures) | 6 |
| Redundant Work (duplicates, inefficiencies) | 3 |
| Dead Code (unused exports, artifacts) | 2 |
| Resilience Issues (null crashes, missing fallbacks) | 4 |

**Total Items:** 20 (some items span multiple categories)

**Files with Most Issues:**
1. `/workspace/modular_stickman/physics_engine.js` - 9 issues
2. `/workspace/modular_stickman/game.js` - 1 issue  
3. `/workspace/godfall/integrate_godfall.js` - 2 issues
4. `/workspace/modular_stickman/limb_detachment_service.js` - 2 issues

---

*End of Audit Report*
