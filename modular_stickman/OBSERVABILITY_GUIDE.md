# STICKS: Godfall Echoes - Observability Contract Verification Guide

This guide provides the exact keys and expected sequences for grepping and verifying structured logs emitted by Logic Chains.

## Observability Contract (The Schema)

Every log entry is a JSON object with the following required fields:

| Key | Description | Example |
|-----|-------------|---------|
| `correlation_id` | Unique ID for the entire chain execution. | `det-1698410000-123` |
| `chain_name` | Name of the Logic Chain. | `Limb Detachment` |
| `version` | Version of the Logic Chain. | `1.4` |
| `step` | Current step in the chain. | `START`, `VALIDATE`, `END`, etc. |
| `outcome` | Result of the step. | `SUCCESS`, `ERROR`, `SKIPPED`, `DETACHED` |
| `latency_ms` | Milliseconds since `START` step. | `15` |

### Domain-Specific Fields
These should be present if available in context:
- `actor_id`: ID of the entity performing the action (e.g., `stickman.id`).
- `session_id`: User session ID.
- `idempotency_key`: Key used for deduplication.
- `causal_event_id`: ID of the event that triggered this chain.

## Greppable Verification

### 1. Track a specific execution
```bash
grep "det-1698410000-123" game.log
```

### 2. Verify all terminal logs (END)
```bash
grep '"step":"END"' game.log
```

### 3. Find all failures with classification
```bash
grep '"outcome":"ERROR"' game.log | jq '{error_classification, error_message}'
```

## Expected Sequence: Limb Detachment

A successful limb detachment should follow this sequence:
1. `START` (outcome: SUCCESS)
2. `VALIDATE` (outcome: SUCCESS)
3. `TRANSITION` (outcome: SUCCESS)
4. `SIDE_EFFECTS` (outcome: SUCCESS)
5. `END` (outcome: DETACHED)

An idempotent (deduplicated) call:
1. `START` (outcome: SUCCESS)
2. `IDEMPOTENCY_HIT` (outcome: SUCCESS)
3. `END` (outcome: DETACHED, dedupe_hit: true)

## Sample Redaction Rules
When sharing logs for debugging, ensure the following are redacted:
- `player_ip`: Remote address.
- `auth_token`: Any credentials in metadata.
- `personal_data`: Real names or emails in actor metadata.

## Log Correlation Visualizer
The `Logic Console` in `demo.html` listens for `logic-chain-event` and renders these transitions in real-time for developers.
