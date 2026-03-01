# Logic Chain Contract: Limb Detachment v1

## Metadata
- **ChainName:** Limb Detachment
- **Version:** 1.0
- **Primary Owner:** Physics Engine / Domain Logic

## Trigger
- **Entry Point:** `StickmanPhysics.checkLimbDetachment`
- **Causal Event:** Matter.js `collisionStart` event with impulse exceeding `LIMB_DETACH_THRESHOLD`.

## Inputs (DTO)
```json
{
  "stickmanId": "string",
  "limbId": "string",
  "impulse": "number",
  "correlation_id": "string"
}
```
- **Normalization:** `limbId` must be trimmed and matched against `LIMB_TYPES`.
- **Invariants:** `impulse` must be a positive number.

## Outputs / Resolution
- **Terminal States:**
  - `SUCCESS`: Limb detached, state updated, effects triggered.
  - `FAILURE_ALREADY_DETACHED`: Limb was already detached (Idempotent exit).
  - `FAILURE_INVALID_LIMB`: `limbId` does not exist for this stickman.
  - `FAILURE_INSUFFICIENT_IMPULSE`: Impulse did not meet threshold (Guard exit).

## State Machine
1. **Step: Initialization**
   - Log `START`.
   - Generate/Validate `correlation_id`.
2. **Step: Invariant Check**
   - Check if limb is already detached.
   - If detached: Terminate with `FAILURE_ALREADY_DETACHED`.
3. **Step: Impulse Validation**
   - Check `impulse >= LIMB_DETACH_THRESHOLD`.
   - If below: Terminate with `FAILURE_INSUFFICIENT_IMPULSE`.
4. **Step: State Transition (Atomic)**
   - Set `stickman.limbs[limbId].attached = false`.
   - Push to `physics.detachedLimbs` collection.
   - Log `STATE_TRANSITION`.
5. **Step: Side Effects**
   - Trigger `addDetachmentEffect(limbBody)`.
   - Trigger `triggerLimbDetachmentEffect(limbId)`.
6. **Step: Resolution**
   - Log `END` with outcome `SUCCESS`.
   - Return result DTO.

## Invariants
- **Domain Invariant:** A limb cannot be in both `attached` and `detached` states simultaneously.
- **Domain Invariant:** Detachment must trigger exactly one delusion trait mapping.
- **Infra Invariant:** Detached limbs must remain in the Matter.js world but lose logical parentage to the stickman.

## Failure Semantics
- **Typed Errors:**
  - `LimbAlreadyDetachedError`: Non-retryable.
  - `InvalidLimbError`: Non-retryable.
- **State Safety:** On any error before Step 4, state remains untouched. Step 4 must be atomic.

## Observability Contract
- **Structured Logs:**
  - `correlation_id`: String
  - `chain_name`: "Limb Detachment"
  - `chain_version`: "1.0"
  - `step`: ["START", "VALIDATE", "TRANSITION", "SIDE_EFFECTS", "END"]
  - `outcome`: ["SUCCESS", "ERROR", "SKIPPED"]
  - `limb_id`: String
  - `impulse`: Number

## Exit Criteria
- `test_happy_path_detachment`: Prove limb moves from stickman to detached collection.
- `test_idempotent_detachment`: Prove second call for same limb is safe and does nothing.
- `test_insufficient_impulse`: Prove no state change if impulse is low.
