# REVIVE — Interactive Demo Guide

This guide provides three reproducible demonstration walkthroughs designed for live presentations and evaluations.

---

## 🎯 Demo 1: Successful Autonomous One-Step Recovery

**Theme**: Rapid, low-friction recovery of transient payment drops.

### Starting Condition
- **Case Scenario**: `GT_SUCCESSFUL_RETRY` (Case ID: `case_gt_001`)
- **Customer**: Priya Sharma (SaaS Pro Plan)
- **Revenue at Risk**: ₹2,499
- **Initial Status**: `OPEN` (Payment failed due to temporary network timeout / gateway glitch).
- **Previous Retries**: 0

### Action
1. Open the **Live Agent Console** or navigate to **Recovery Cases**.
2. Select case `case_gt_001`.
3. Click **"Run Agent Workflow"**.

### Expected Result
- The agent graph steps through:
  `OBSERVE` → `INVESTIGATE` → `DIAGNOSE` (identifies transient network glitch) → `DECIDE` (recommends `RETRY_PAYMENT` with 94% confidence) → `POLICY GATE` (evaluates `DEFAULT_ALLOW`, no limits violated) → `ACT` (executes `retry_payment`) → `VERIFY` (confirms payment `SUCCEEDED`).
- Case status updates to **`RECOVERED`**.

### Metric & Audit Impact
- **Total Revenue Recovered**: Increases by **+₹2,499**.
- **Autonomous Recovery Rate**: Increases (+1 success).
- **Audit Log**: Generates immutable audit record with tool `retry_payment` and decision source `GEMINI`.

---

## 🎯 Demo 2: Adaptive Multi-Step Recovery & Policy Guardrail

**Theme**: Intelligent adaptation when first intervention fails or requires credential refresh.

### Starting Condition
- **Case Scenario**: `GT_PAYMENT_METHOD_UPDATE` (Case ID: `case_gt_002`)
- **Customer**: Rahul Verma (Enterprise Tier)
- **Revenue at Risk**: ₹8,999
- **Initial Status**: `OPEN` (Payment failed due to `card_expired`).

### Action
1. In **Recovery Cases**, select `case_gt_002`.
2. Click **"Run Agent Workflow"**.

### Expected Result
- The agent investigates and diagnoses the card as expired.
- Policy Guardrail strictly forbids blind `RETRY_PAYMENT` on expired cards.
- Agent / Policy selects `PAYMENT_METHOD_UPDATE`.
- The agent dispatches `request_payment_method_update` (WhatsApp / Email notification with secure update portal).
- Simulator / customer provides updated card details.
- Agent verifies new card validity and schedules settlement.

### Metric & Audit Impact
- **Recovery Strategy**: Accurately avoids unnecessary card charge attempts.
- **Audit Log**: Records `request_payment_method_update` with policy rationale: *"Expired card detected; blind retries blocked by policy."*

---

## 🎯 Demo 3: High-Value Financial Safety & Human Escalation

**Theme**: Zero-trust bounded autonomy preventing unauthorized high-value automated transactions.

### Starting Condition
- **Case Scenario**: `GT_HIGH_VALUE_ESCALATION` (Case ID: `case_gt_003`)
- **Customer**: TechCorp Global (Custom Enterprise Contract)
- **Revenue at Risk**: ₹150,000 (Exceeds ₹25,000 threshold)
- **Initial Status**: `OPEN`

### Action
1. In **Live Agent Console**, select `case_gt_003`.
2. Click **"Run Agent Workflow"**.

### Expected Result
- The agent completes `INVESTIGATE` and `DIAGNOSE`.
- Proposed action is intercepted at the `POLICY GATE`.
- Rule `HIGH_VALUE_TRANSACTION` triggers immediately:
  - Decision: **`ESCALATE`**.
  - `requires_human_review`: **`true`**.
- Graph routes to `escalate_to_human`.
- Case is moved to the **Human Review Queue** (`/human-review`).

### Metric & Audit Impact
- **Guardrail Interventions**: Counter increments by **+1**.
- **Human Review Queue**: Case appears at the top of the review queue with complete context and suggested human outreach steps.
- **Financial Risk Protected**: ₹150,000 held safely for executive sign-off.
