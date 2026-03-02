## 2026-03-02 - Idempotency Observability
**Learning:** For critical logic chains, idempotency keys and deduplication status must be explicitly logged to facilitate debugging of "at-least-once" message delivery and UI double-clicks.
**Action:** Include `idempotency_key` and `dedupe_hit` in the terminal log entry of every hardened Logic Chain.
