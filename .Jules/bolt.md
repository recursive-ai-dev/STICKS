## 2023-10-27 - Determinism Provider Optimization
**Learning:** Decoupling RNG/Clock from the global `Math` and `Date` objects is critical for replayability in physics engines. Using a seedable Mulberry32 algorithm provides fast, deterministic results for game logic updates.
**Action:** Always inject a `DeterminismProvider` into core game loops and logic chains to ensure testability and bug reproduction. Avoid `setInterval` for game logic events in deterministic systems; use tick-based or provider-clock-based checks instead.
