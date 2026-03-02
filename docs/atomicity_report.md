# Atomicity Boundary Report: STICKS: Godfall Echoes

## Overview
This report identifies multi-step state transitions where persistence or in-memory state is updated more than once, leading to potential "torn writes" or inconsistent states during failures.

## 1. Limb Detachment Chain
**Location:** `LimbDetachmentService.detachLimb` and `StickmanPhysics.checkLimbDetachment`

### Steps that must be atomic:
1. Mark limb as detached in Stickman data.
2. Calculate side effects (delusion traits).
3. Add detached limb to Physics Engine tracking (`detachedLimbs`).
4. Apply delusion traits to the game world.

### Transactions:
- **Existing:** None. Steps are executed sequentially with try/catch blocks that log but don't roll back.
- **Missing:** A unified transaction boundary between the Logic Service and the Physics Engine.

### Partial Success Scenarios (Torn Writes):
- **Scenario A:** `limb.attached = false` is set, but `_calculateSideEffects` throws. The limb is gone, but no delusion is gained.
- **Scenario B:** `detachLimb` succeeds, but `PhysicsEngine` fails during `addDelusionTrait`. The limb is detached and tracked, but the world state is missing the required trait.
- **Scenario C:** Crash after `limb.attached = false` but before returning to `PhysicsEngine`. Stickman is corrupted (limb detached but not in world's `detachedLimbs` list).

### Corruption / Bad States:
- "Ghost Limbs": Limb is detached in logic but still physically constrained or rendered as attached because the infra update failed.
- "Silent Detachment": Limb is removed without triggering the corresponding gameplay mutations (traits/effects).

## 2. Procedural Animation Generation
**Location:** `procedural_animation_generator.js`

### Steps that must be atomic:
1. Evolve population (Genetic Algorithm).
2. Build animation payload.
3. Write to file system.

### Risks:
- Partial file writes (though `fs.writeFileSync` is generally atomic for small files on modern OS, it's mixed with heavy CPU work).
- Security validation happens late in `main`.

## Recommendation for Limb Detachment
Implement a **Transactional Result Pattern**:
1. `LimbDetachmentService` should NOT mutate the stickman directly.
2. It should return a "Proposed State Change" object.
3. `PhysicsEngine` should apply this change-set in a guarded block.
4. Add a "Rollback" or "Compensation" log if the infra update fails.
