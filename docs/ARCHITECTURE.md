# REVIVE — System Architecture Specification

**Product**: REVIVE (Revenue Intelligence & Value Intervention for Viable Earnings)  
**Category**: Autonomous AI Revenue Recovery Agent  
**Current Phase**: Phase 2 — Recovery Simulator (IMPLEMENTED)

---

## 1. Architectural Topology & Component Status

```text
┌────────────────────────────────────────────────────────┐
│               REVIVE Command Center (UI)               │ [IMPLEMENTED - Phase 0 & 2]
│  - React 19 + TypeScript + Tailwind CSS               │
│  - Simulation Lab Interactive Workbench                │
│  - Editorial Command Center Shell & Nav                │
│  - Agent Status & Lifecycle Timeline Components        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST
┌──────────────────────────▼─────────────────────────────┐
│                 Full-Stack API Server                  │ [IMPLEMENTED - Phase 0, 1 & 2]
│  - Node.js / Express Server on port 3000              │
│  - /health, /api, /api/recovery/*, /api/simulator/*    │
│  - CORS & JSON Request Pipelines                      │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│     Agent Orchestrator    │       │     Policy / Guardrail    │
│  - Gemini Reasoning Model │       │  - MAX_RETRIES = 3        │
│  - LangGraph State Engine │       │  - MAX_CONTACTS_24H = 2   │
│  - Structured Tools       │       │  - MAX_AMOUNT = ₹25,000   │
│     [PLANNED: Phase 4-5]  │       │     [PLANNED: Phase 6]    │
└──────────────┬────────────┘       └─────────────┬─────────────┘
               │                                  │
               ▼                                  ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│    Recovery Simulator     │       │     Database & Store      │
│  - 7 Deterministic Tools  │       │  - 8 Relational Tables    │
│  - State Mutation Engine  │       │  - Repository Pattern     │
│  - Outcome Verification   │       │  - Synthetic Generator    │
│     [IMPLEMENTED: Phase 2]│       │     [IMPLEMENTED: Phase 1]│
└───────────────────────────┘       └───────────────────────────┘
```

---

## 2. Implementation Status Matrix

| Component | Target Phase | Status in Phase 2 | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Shell & Design System** | Phase 0 | **IMPLEMENTED** | Editorial command center layout, status badges, timeline visualizer, and navigation tabs. |
| **API Health & Discovery Endpoints** | Phase 0 | **IMPLEMENTED** | `GET /health`, `GET /api`, `GET /api/health` with JSON response contracts. |
| **Database Schema (PostgreSQL)** | Phase 1 | **IMPLEMENTED** | 8 core relational tables (`customers`, `subscriptions`, `payments`, `invoices`, `checkout_events`, `recovery_cases`, `recovery_actions`, `audit_logs`). |
| **Deterministic Synthetic Generator**| Phase 1 | **IMPLEMENTED** | Seeded data generator with 6 Ground Truth golden benchmark scenarios. |
| **Data Access Layer / Repositories** | Phase 1 | **IMPLEMENTED** | Clean repository pattern exposing CRUD and contextual queries for all entities. |
| **Payment & Recovery Simulator** | Phase 2 | **IMPLEMENTED** | 7 deterministic recovery tools (`retry_payment`, `schedule_payment_retry`, `generate_payment_link`, `send_customer_notification`, `request_payment_method_update`, `escalate_to_human`, `stop_recovery`), state transitions, and audit trails. |
| **Outcome Verification Tools** | Phase 2 | **IMPLEMENTED** | `check_payment_status` and `check_recovery_status` endpoints verifying simulated state changes. |
| **Simulation Lab UI** | Phase 2 | **IMPLEMENTED** | Interactive workbench to trigger simulated actions, view `simulated: true` JSON outputs, inspect audit trails, and run verifications. |
| **Deterministic Recovery Engine** | Phase 3 | **IMPLEMENTED** | Rule-based recovery pipeline (Detection → Investigation → Diagnosis → Strategy → Execution → Verification → Outcome) with metrics & test suite. |
| **Gemini AI Reasoning Engine** | Phase 4 | *PLANNED* | Gemini structured context understanding and strategy formulation. |
| **LangGraph Orchestration** | Phase 5 | *PLANNED* | Stateful graph execution, conditional branch routing, and replanning loops. |
| **Guardrails & Audit Logger** | Phase 6 | *PLANNED* | Deterministic policy engine and immutable decision audit trail. |
| **Evaluation Benchmark Harness** | Phase 7 | *PLANNED* | 100+ scenario evaluation dataset and metric calculations. |
| **Live Dynamic Telemetry & Stream**| Phase 8 | *PLANNED* | Real-time event streaming and interactive case inspector. |
| **Demo Modes** | Phase 9 | *PLANNED* | 3 judge-ready reproducible demo flows. |

---

## 3. Core Bounded-Autonomy Loop

```text
1. DETECT (Risk Event Triggered)
   ↓
2. INVESTIGATE (Context Retrieval)
   ↓
3. DIAGNOSE (Root Cause Analysis)
   ↓
4. REASON (Strategy Selection)
   ↓
5. GUARDRAIL CHECK (Deterministic Policy Authorization)
   ├── APPROVED ──► 6. EXECUTE (Bounded Tool Call) ──► 7. VERIFY ──► 8. AUDIT / RESOLVE
   └── BLOCKED  ──► ESCALATE TO HUMAN / STOP ───────► AUDIT
```
