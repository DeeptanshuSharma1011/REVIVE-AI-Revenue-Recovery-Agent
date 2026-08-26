# REVIVE — System Architecture Specification

**Product**: REVIVE (Revenue Intelligence & Value Intervention for Viable Earnings)  
**Category**: Autonomous AI Revenue Recovery Agent  
**Current State**: Fully Implemented (Phases 0–7)

---

## 1. High-Level Architectural Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        REVIVE Frontend (React 19)                      │
│   - Overview Dashboard            - Recovery Cases Inspector           │
│   - Live Agent Console (Graph)    - Human Review Escalation Queue      │
│   - Policy & Guardrails Engine    - Evaluation Intelligence Benchmark  │
│   - Simulation Lab Workbench      - Revenue Analytics & Reporting      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Full-Stack Express API Server                       │
│   - /api/recovery/*       - /api/agent/*          - /api/policy/*      │
│   - /api/evaluation/*     - /api/simulator/*      - /api/customers/*   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       Agentic Orchestration          │  │       Bounded AI Intelligence        │
│  - LangGraph State Machine (11 Nodes)│  │  - Gemini 3.7 Flash Advisory Engine  │
│  - Iterative Re-evaluation Loop      │  │  - Structured JSON Output Schema     │
│  - 11 Registered Agent Tools         │  │  - Deterministic Fallback Logic      │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   └───────────────────┬─────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Deterministic Policy Engine                       │
│  - Max Retries Guard (<= 2)       - High-Value Escalate (> ₹25,000)    │
│  - Duplicate Action Block         - Expired Card Routing Protection    │
│  - Low Confidence Interceptor     - Terminal State Idempotency         │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
    ┌──────────────────────────────────┴──────────────────────────────────┐
    ▼                                                                     ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│     Recovery Execution Engine        │  │     Auditing & Metrics Engine        │
│  - 7 Recovery Intervention Tools     │  │  - Cryptographic & Typed Audit Logs  │
│  - Outcome Verification Subsystem    │  │  - Real-time Recovery & Loss KPIs    │
│  - State Mutation & Simulators       │  │  - 12 Ground-Truth Evaluation Matrix │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   └───────────────────┬─────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Relational Database & Repositories                   │
│  - 8 Relational Tables (Customers, Subscriptions, Payments, Invoices,  │
│    Checkout Events, Recovery Cases, Recovery Actions, Audit Logs)      │
│  - In-Memory & PostgreSQL Compatible Repositories                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### 2.1 Frontend (`/src`)
- **React 19 SPA**: Fast, responsive UI with Tailwind CSS and Lucide React icons.
- **Pages**:
  - `OverviewPage`: Executive KPIs, recovery breakdown, and system status.
  - `RecoveryCasesPage`: Full tabular case inspector with filters and drawer view.
  - `LiveAgentPage`: Interactive LangGraph node visualizer and step-by-step execution.
  - `HumanReviewPage`: Escalated case management queue for human revenue operators.
  - `PolicyGuardrailsPage`: Live safety rule configuration and violation telemetry.
  - `EvaluationIntelligencePage`: Ground truth benchmark comparison matrix and CSV export.
  - `SimulationLabPage`: Raw tool execution and testing workbench.
  - `AnalyticsPage`: Cohort analysis, failure cause breakdown, and revenue charts.

### 2.2 Backend API Server (`server.ts`)
- Runs Express on port 3000.
- Handles routing, request validation, middleware, error boundaries, and serves the static production SPA build.

### 2.3 Agentic Orchestrator (`/database/engine/agent`)
- **State Machine**: LangGraph-inspired stateful workflow graph with 11 execution nodes:
  `START` → `OBSERVE` → `INVESTIGATE` → `DIAGNOSE` → `STRATEGY_SELECTION` → `POLICY_GATE` → `EXECUTION` → `VERIFICATION` → `OUTCOME_EVALUATION` → (`RE_EVALUATE` loop or `END`).
- **Tool Registry**: 11 formal agent tools with strict parameter schemas.

### 2.4 AI Decision Intelligence (`/database/engine/ai`)
- **Model**: Gemini 3.7 Flash using the official `@google/genai` SDK.
- **Prompts**: Isolated in `/database/engine/ai/prompts.ts` with strict system instructions and structured JSON response schema enforcement.
- **Safety**: Automated confidence scoring (< 0.70 routes to human review) and 100% reliable fallback to deterministic rules on API downtime, rate limits, or parse errors.

### 2.5 Policy & Guardrails Engine (`/database/engine/policy`)
- Zero-trust deterministic rules enforced before any financial or customer-facing action:
  1. `HIGH_VALUE_TRANSACTION`: Cases with revenue >= ₹25,000 automatically escalate.
  2. `MAX_RETRIES_EXCEEDED`: Immediate retries capped at 2; subsequent attempts modified to scheduled delays or payment method updates.
  3. `DUPLICATE_ACTION`: Blocks consecutive identical failing actions to prevent loop traps.
  4. `INCOMPATIBLE_ACTION`: Blocks invalid actions (e.g., retrying an expired card).
  5. `LOW_AI_CONFIDENCE`: Routes uncertain AI decisions to human supervisors.
  6. `TERMINAL_STATE`: Blocks actions on already recovered or stopped cases.

### 2.6 Recovery Engine (`/database/engine`)
- Modular 7-stage deterministic recovery pipeline:
  1. *Detection*: Scans for failed payments, overdue invoices, and checkout drops.
  2. *Investigation*: Compiles holistic customer profile, churn risk, and billing history.
  3. *Diagnosis*: Determines failure classification (hard decline, soft decline, expired card, abandonment).
  4. *Strategy*: Proposes optimal intervention strategy.
  5. *Execution*: Dispatches recovery action.
  6. *Verification*: Confirms payment status and state transition.
  7. *Outcome*: Computes final recovery status and updates database.

### 2.7 Database & Storage (`/database`)
- **8 Relational Tables**:
  - `customers`
  - `subscriptions`
  - `payments`
  - `invoices`
  - `checkout_events`
  - `recovery_cases`
  - `recovery_actions`
  - `audit_logs`
- Exposes typed CRUD operations via the repository pattern (`/database/repositories`).

### 2.8 Evaluation & Benchmark Harness (`/database/engine/evaluation`)
- 12 Golden Ground-Truth Scenarios testing every failure mode and recovery pathway.
- Compares Ground Truth vs. Deterministic Strategy vs. Gemini AI Strategy.
- Computes agreement rates, recovery lift, false positive rates, and provides one-click CSV export.
