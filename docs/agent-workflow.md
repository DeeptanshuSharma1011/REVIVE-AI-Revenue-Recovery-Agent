# REVIVE — Agent Workflow & State Machine

This document details the LangGraph-inspired stateful agent orchestrator that coordinates REVIVE's autonomous recovery operations.

---

## 1. Graph State Diagram

```text
        [ START ]
            │
            ▼
       [ OBSERVE ] ──► (Validates case state, checks for idempotency)
            │
            ▼
     [ INVESTIGATE ] ──► (Calls get_case_context, fetches customer & payment data)
            │
            ▼
       [ DIAGNOSE ] ──► (Maps error codes, determines root cause)
            │
            ▼
        [ DECIDE ] ──► (Invokes Gemini 3.7 Flash or Deterministic Strategy Provider)
            │
            ▼
     [ POLICY GATE ] ──► (Zero-trust policy validation; allows, modifies, or escalates)
            │
            ▼
         [ ACT ] ──► (Executes authorized recovery tool e.g. retry_payment)
            │
            ▼
        [ VERIFY ] ──► (Verifies payment settlement and state transitions)
            │
            ▼
 [ OUTCOME EVALUATION ]
            │
  ┌─────────┼──────────────┬──────────────┐
  ▼         ▼              ▼              ▼
[RECOVERED] [RE-EVALUATE] [ESCALATED]  [STOPPED]
(Complete)  (Max 3 loops) (Human Review) (Conclude)
```

---

## 2. Graph Node Definitions

### Node 1: OBSERVE
- **Goal**: Check current case viability and ensure idempotency.
- **Guard**: If case is already `RECOVERED`, `CANCELLED`, or `ESCALATED`, immediately transitions to `OUTCOME_EVALUATION` without executing duplicate actions.

### Node 2: INVESTIGATE
- **Goal**: Compile complete context.
- **Tool**: `get_case_context`
- **Output**: Returns full customer history, previous payment attempts, subscription terms, and risk profile.

### Node 3: DIAGNOSE
- **Goal**: Classify the core payment barrier.
- **Tool**: `diagnose_payment_failure`
- **Output**: Categorizes failure into hard decline, temporary insufficient funds, expired instrument, or checkout abandonment.

### Node 4: DECIDE (Strategy Selection)
- **Goal**: Formulate optimal intervention.
- **Tool**: `gemini_decision_engine` or `deterministic_strategy_engine`
- **Output**: Proposed strategy, business rationale, operator explanation, confidence score, and risk level.

### Node 5: POLICY GATE
- **Goal**: Enforce deterministic safety rules before execution.
- **Evaluator**: `PolicyEngine`
- **Decisions**:
  - `ALLOW`: Strategy executes as planned.
  - `MODIFY`: Unsafe strategy altered to safe alternative (e.g. immediate retry changed to scheduled retry).
  - `ESCALATE`: High value or low confidence routed to human queue.
  - `BLOCK` / `STOP`: Illegal action rejected.

### Node 6: ACT (Execution)
- **Goal**: Execute approved action.
- **Tools**:
  - `retry_payment`
  - `schedule_payment_retry`
  - `generate_payment_link`
  - `send_customer_notification`
  - `request_payment_method_update`
  - `escalate_to_human`
  - `stop_recovery`

### Node 7: VERIFY
- **Goal**: Validate financial outcome.
- **Tools**: `check_payment_status`, `check_recovery_status`
- **Output**: Confirms if the payment succeeded, remains pending, or failed.

### Node 8: OUTCOME EVALUATION & RE-EVALUATION
- **Goal**: Conclude case or trigger iterative retry loop.
- **Conditions**:
  - If payment settled: Status → `RECOVERED`. End graph.
  - If action failed and iterations < `MAX_ITERATIONS` (3): Status → `RE_EVALUATING`. Loop back to `INVESTIGATE`.
  - If iterations reached limit or unrecoverable: Status → `STOPPED` or `ESCALATED`. End graph.
