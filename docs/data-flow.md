# REVIVE — End-to-End Data Flow Specification

This document details how data moves through REVIVE from the initial risk event to financial recovery and reporting.

---

## 1. Complete System Data Flow Diagram

```text
[ Synthetic / Real Event ] 
(Failed Payment / Abandoned Checkout / Overdue Invoice)
           │
           ▼
┌──────────────────────────────────────┐
│        1. Ingestion & Case Creation  │
│  - Creates recovery_case record      │
│  - Sets status = 'DETECTED' / 'OPEN' │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        2. Investigation Service      │
│  - Queries CustomerRepository        │
│  - Queries Payment/Invoice/Checkout  │
│  - Builds InvestigationContext       │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        3. Diagnosis Service          │
│  - Maps error codes & behavior       │
│  - Identifies root cause & risk level│
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        4. Decision Intelligence      │
│  - Gemini 3.7 Flash Model OR         │
│  - Deterministic Strategy Provider   │
│  - Outputs proposed CaseStrategy     │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        5. Policy Engine & Guardrails │
│  - Evaluates financial safety limits │
│  - Checks max retries & duplicates   │
│  - Decision: ALLOW | MODIFY |        │
│              ESCALATE | BLOCK | STOP │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        6. Tool Execution             │
│  - Dispatches authorized action      │
│  - Mutates payment/invoice/case state│
│  - Records recovery_action entry     │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        7. Verification Service       │
│  - Checks payment instrument state   │
│  - Verifies balance / receipt        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        8. Audit Logging Service      │
│  - Writes immutable audit_log record │
│  - Captures inputs, decision, policy │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        9. Metrics & UI Telemetry     │
│  - Aggregates recovery rates & lift  │
│  - Broadcasts live timeline to UI    │
└──────────────────────────────────────┘
```

---

## 2. Step-by-Step Data Lifecycle

### Step 1: Event Detection & Case Record
- A payment fails (e.g. `insufficient_funds`, `card_expired`), checkout is abandoned, or an invoice surpasses its due date.
- A `RecoveryCase` record is registered in `RecoveryCaseRepository` with initial metadata, source reference ID, priority, and revenue at risk.

### Step 2: Context Gathering (Investigation)
- The agent calls `get_case_context` / `investigationService.investigateCase(caseId)`.
- It aggregates:
  - Customer profile: Tier, lifetime value (LTV), past recovery success history.
  - Payment details: Card network, bank code, attempt count, last failure reason.
  - Risk factors: Time since failure, invoice amount.

### Step 3: Diagnostic Mapping
- `diagnosisService.diagnoseCase(context)` analyzes the failure codes and behavioral signals to categorize the root issue (`TEMPORARY_INSUFFICIENT_FUNDS`, `EXPIRED_CARD`, `ABANDONED_CHECKOUT_HIGH_INTENT`, etc.).

### Step 4: Decision Formulation
- Depending on the system mode, either `AIRecoveryDecisionService` (Gemini 3.7 Flash) or `DeterministicStrategyProvider` formulates a proposed recovery strategy (`RETRY_PAYMENT`, `PAYMENT_METHOD_UPDATE`, `PAYMENT_LINK`, `SCHEDULE_RETRY`, `CUSTOMER_NOTIFICATION`, `ESCALATE`, `STOP`).
- AI decisions include structured reasoning, operator explanation, confidence score (0.0 to 1.0), and risk assessment.

### Step 5: Policy Gate Validation
- The proposed strategy passes through `policyEngine.evaluate({ context, diagnosis, proposed_strategy })`.
- If safety thresholds are violated (e.g. revenue >= ₹25,000 or retries >= 2), the policy modifies the action or escalates the case to human review.

### Step 6: Action Execution
- The approved tool is executed via the `RecoverySimulator` or live payment gateway.
- Updates the database records (`payments`, `invoices`, `recovery_cases`, `recovery_actions`).

### Step 7: Outcome Verification
- Verification tools (`check_payment_status`, `check_recovery_status`) query the payment gateway / database to confirm whether funds were captured.
- If recovered, status is set to `RECOVERED`. If failed, the agent decides whether to re-evaluate or conclude.

### Step 8: Comprehensive Audit Trail
- An immutable `AuditLog` is created containing:
  - `case_id`, `agent_step`, `tool_name`, `tool_input`, `tool_output`, `policy_result`, `policy_explanation_card`.
  - Stored permanently in `AuditRepository`.

### Step 9: Real-Time Metrics & Evaluation
- Recovery rates, revenue saved, autonomous intervention rates, and guardrail interception statistics are recomputed and rendered in the command center.
