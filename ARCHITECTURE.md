# REVIVE — System Architecture

This document tracks the technical and operational architecture of **REVIVE** across each development phase.

---

## 1. System Overview (Phase 3 Deterministic Recovery Engine)

REVIVE operates as an autonomous, bounded-autonomy agent for revenue recovery. Phase 3 establishes the end-to-end, deterministic recovery workflow without an LLM.

```
┌────────────────────────────────────────────────────────┐
│               REVIVE Command Center (UI)               │
│        (React 19 + Tailwind CSS + Lucide Icons)        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / API
┌──────────────────────────▼─────────────────────────────┐
│                 Full-Stack API Server                  │
│               (Express + Node TypeScript)              │
│  - /api/health (Health check & telemetry)              │
│  - /api/recovery/process/:case_id                      │
│  - /api/recovery/context/:case_id                      │
│  - /api/recovery/diagnosis/:case_id                    │
│  - /api/recovery/decision/:case_id                     │
│  - /api/recovery/cases/:case_id/timeline               │
│  - /api/recovery/metrics                               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│       PHASE 3: DETERMINISTIC RECOVERY ENGINE           │
│                                                        │
│  1. DETECTION       ─── Risk event identified          │
│  2. INVESTIGATION   ─── Full context assembled         │
│  3. DIAGNOSIS       ─── Root cause determined          │
│  4. STRATEGY        ─── Deterministic rules matched    │
│  5. EXECUTION       ─── Recovery simulator tool called │
│  6. VERIFICATION    ─── True state change confirmed    │
│  7. OUTCOME         ─── Status, metrics & audit logged │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│         PHASE 2: RECOVERY SIMULATOR & DATABASE         │
│  - 7 Action Tools (retry, schedule, link, notify, etc.)│
│  - State Mutation & Isolation (simulated: true)        │
│  - Repositories (Cases, Payments, Invoices, Audits)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Entities

1. `customers`: User profiles, lifetime values, segments, preferred communication channels.
2. `subscriptions`: Recurring plans, billing cycles, status, amounts.
3. `payments`: Payment records, failure reasons, attempts, payment methods.
4. `invoices`: Commercial invoices, due dates, overdue intervals, reminder counts.
5. `checkout_events`: Funnel events (e.g., `CHECKOUT_STARTED`, `CHECKOUT_ABANDONED`).
6. `recovery_cases`: At-risk revenue cases under active recovery.
7. `recovery_actions`: Individual executed interventions with amounts recovered.
8. `audit_logs`: Detailed execution traces with policy evaluation summaries.

---

## 3. Pipeline Stages (Deterministic Recovery Engine)

The deterministic recovery engine orchestrates recovery through seven distinct, decoupled modules:

- **Detection**: Ingests risk events from failed payments, overdue invoices, and abandoned carts.
- **Investigation (`InvestigationService`)**: Aggregates multi-table context including past payment histories, subscription terms, customer segments, overdue age, and prior actions.
- **Diagnosis (`DiagnosisService`)**: Analyzes failure signals deterministically into standard diagnosis codes (`TEMPORARY_PAYMENT_FAILURE`, `EXPIRED_PAYMENT_METHOD`, `INSUFFICIENT_FUNDS`, `CHECKOUT_ABANDONMENT`, `OVERDUE_INVOICE`, `HIGH_VALUE_DELINQUENCY`, `MAX_RETRIES_EXCEEDED`).
- **Strategy Selection (`StrategyEngine` & `StrategyRules`)**: Applies deterministic business rules based on failure type, retry count, customer history, and policy thresholds. Designed to be cleanly swapped with Gemini in Phase 4.
- **Execution (`ExecutionService`)**: Dispatches the chosen strategy to the isolated Phase 2 Recovery Simulator tools.
- **Verification (`VerificationService`)**: Confirms true underlying ledger and payment state changes before concluding outcome.
- **Outcome & Metrics (`OutcomeService` & `RecoveryMetricsEngine`)**: Updates case status (`RECOVERED`, `ACTION_PENDING`, `ESCALATED`, `CLOSED`), records audit logs, and computes live financial recovery rates.

---

## 4. Current Phase Status

- **Current Active Phase**: `Phase 3 — Deterministic Recovery Engine`
- **Status**: Completed & Verified. 45/45 test assertions passed across 9 suites. Full UI and API integration.
- **Next Phase**: `Phase 4 — Gemini Reasoning Engine`.
