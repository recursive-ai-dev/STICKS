# Code Review Request: Determinism & Hidden-Global Exorcist

## Summary
Eliminated non-deterministic leaks (system time, Math.random) by introducing a `DeterminismProvider` layer.

## Key Changes
- **New Provider**: Created `modular_stickman/determinism_provider.js` with `RealWorldProvider` and seedable `DeterministicProvider`.
- **LogicChain Integration**: Refactored `LogicChainBase` to use the provider for correlation IDs and timestamps.
- **Physics & Game**: Updated `StickmanPhysics` and `StickGame` to use the provider for all RNG and time-based logic (delusion bursts, world pulses, IDs, animations).
- **Tests**: Added `modular_stickman/tests/determinism.test.js` verifying identical seeds produce identical states.

## Verification
- Ran existing tests: `logic_chain_base.test.js`, `limb_detachment.test.js`, `madness_field.test.js`.
- Ran new test: `determinism.test.js`.
- Verified UI still loads via Playwright.

Please review for DI cleanliness and any missed global state leaks.
