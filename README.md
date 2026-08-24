# REVIVE

**Revenue Intelligence & Value Intervention for Viable Earnings**

*Autonomous AI Revenue Recovery Agent*

REVIVE is an action-oriented, bounded-autonomy agent that autonomously identifies at-risk revenue, investigates underlying context, selects and executes policy-cleared recovery interventions, verifies outcomes, and measures business impact.

---

## 📌 Current Status

**Phase 5 — Agentic Orchestration: LangGraph Multi-Step Recovery Agent (IMPLEMENTED)**

Phases 0 through 5 are fully implemented, verified, and tested:
- **Phase 0**: Project foundation, full-stack server, fintech command center UI shell, and health endpoints.
- **Phase 1**: Complete 8-table relational schema, in-memory repository layer with Supabase/PostgreSQL schema mappings, seeded synthetic generator, and 6 Ground Truth Benchmark scenarios.
- **Phase 2**: Deterministic, isolated Recovery Simulator engine with 7 recovery action tools (`retry_payment`, `schedule_payment_retry`, `generate_payment_link`, `send_customer_notification`, `request_payment_method_update`, `escalate_to_human`, `stop_recovery`), state transition hooks, verification tools (`check_payment_status`, `check_recovery_status`), automated audit logging, and an interactive Simulation Lab workbench.
- **Phase 3**: End-to-end Deterministic Recovery Engine with 7 pipeline stages, metrics computation, and idempotency (45/45 passing tests).
- **Phase 4**: AI Decision Engine using Gemini 3.7 Flash (`@google/genai`) with structured schema output, confidence thresholding, fallback mechanisms, and evaluation matrix (34/34 passing tests).
- **Phase 5**: LangGraph-inspired stateful multi-step agent orchestrator (`ReviveAgentGraph`, `ReviveAgentNodes`, `ReviveAgentToolRegistry`) with 11 discrete graph nodes, real-time node timeline tracking, iterative re-evaluation loop, safety guardrails (max iterations, max actions, anti-looping), and interactive Live Agent Console UI (31/31 passing tests).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion *(IMPLEMENTED)*
- **Backend**: Node.js / Express Server (`tsx` in development, `esbuild` in production) *(IMPLEMENTED)*
- **Database & Data Access**: 8 relational tables, repository pattern, deterministic synthetic data generator *(IMPLEMENTED — Phase 1)*
- **Recovery Simulator**: 7 deterministic action tools, state mutation engine, audit trail, simulation flag enforcement *(IMPLEMENTED — Phase 2)*
- **Deterministic Recovery Engine**: Rule-based recovery workflow with 7 pipeline stages, metrics computation, and idempotency *(IMPLEMENTED — Phase 3)*
- **Reasoning Engine**: Google Gemini API via `@google/genai` with structured JSON schema *(IMPLEMENTED — Phase 4)*
- **Agent Orchestrator**: LangGraph multi-step state machine with iterative re-evaluation & bounded tools *(IMPLEMENTED — Phase 5)*
- **Guardrail Layer**: Deterministic Policy Engine *(PLANNED — Phase 6)*

---

## 📂 Project Structure

```text
REVIVE/
├── .env.example                # Environment variable declarations
├── .gitignore                  # Git exclusions
├── database/
│   ├── db.ts                   # In-memory database instance with relational models
│   ├── repositories/           # Data access repositories (Customer, Payment, RecoveryCase, etc.)
│   ├── simulator/              # Phase 2 Recovery Simulator service & outcome determinism
│   │   ├── models.ts           # Simulator models and action contracts
│   │   ├── outcomes.ts         # Deterministic outcome calculation rules
│   │   ├── paymentSimulator.ts # Core payment action simulations
│   │   ├── recoverySimulator.ts# Orchestrator for all 7 actions & verification tools
│   │   └── index.ts            # Simulator barrel export
│   └── synthetic/              # Deterministic generator & 6 Ground Truth scenarios
├── docs/
│   └── ARCHITECTURE.md         # Technical architecture & implementation status
├── index.html                  # HTML entry point
├── metadata.json               # Platform metadata
├── package.json                # Project dependencies & scripts
├── README.md                   # Project documentation & roadmap
├── scripts/
│   └── test_recovery_simulator.ts # Phase 2 test suite (43 assertions, 100% pass)
├── server.ts                   # Full-stack backend API routes
├── src/
│   ├── components/             # Reusable UI components
│   ├── pages/
│   │   ├── OverviewPage.tsx    # Command center dashboard
│   │   ├── SimulationLabPage.tsx # Phase 2 interactive simulation lab
│   │   ├── RecoveryCasesPage.tsx # Database cases inspector
│   │   ├── GroundTruthPage.tsx # 6 Ground Truth benchmark review
│   │   ├── LiveAgentPage.tsx   # Live agent workspace
│   │   ├── AnalyticsPage.tsx   # Revenue metrics & analytics
│   │   └── HumanReviewPage.tsx # Human escalation review queue
│   ├── services/
│   │   └── api.ts              # Frontend API client
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces & types
│   ├── App.tsx                 # Core App layout & page routing
│   ├── index.css               # Global Tailwind CSS styles
│   └── main.tsx                # Client entry point
├── tsconfig.json               # TypeScript compiler options
└── vite.config.ts              # Vite configuration
```

---

## 🚦 Local Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Run Phase 3 Deterministic Recovery Engine Test Suite
npx tsx scripts/test_recovery_engine.ts

# 3. Run Phase 2 Simulator Test Suite
npx tsx scripts/test_recovery_simulator.ts

# 4. Run Phase 1 Data Foundation Test Suite
npx tsx scripts/test_data_foundation.ts

# 5. Start the local full-stack server (runs Express & Vite on port 3000)
npm run dev

# 6. Verify TypeScript types and linting
npm run lint

# 7. Compile & package for production build
npm run build

# 8. Launch compiled production bundle
npm start
```

---

## 🗺️ Development Roadmap

- [x] **Phase 0 — Project Foundation**: Repository structure, backend health endpoints, environment templates, and UI command-center shell.
- [x] **Phase 1 — Data Foundation**: 8 relational tables, synthetic data generator, ground-truth scenarios, and data access layer.
- [x] **Phase 2 — Recovery Simulator**: 7 deterministic action tools, state mutation engine, outcome determinism, verification tools, and Simulation Lab console.
- [x] **Phase 3 — Deterministic Recovery Engine**: Rule-based recovery workflow with modular pipeline, metrics engine, idempotency, and automated test suite.
- [x] **Phase 4 — Agentic AI**: Gemini-powered context reasoning, schema validation, and fallback mechanisms.
- [x] **Phase 5 — LangGraph Orchestration**: Stateful graph orchestration, bounded tools, and iterative re-evaluation loops.
- [ ] **Phase 6 — Guardrails + Audit**: Deterministic policy enforcement, safety rules engine, and cryptographically verifiable audit trails.
- [ ] **Phase 7 — Evaluation**: 100+ scenario benchmark evaluation harness and regression tracking.
- [ ] **Phase 8 — Premium Frontend**: Live recovery stream and interactive case inspector.
- [ ] **Phase 9 — Demo Mode**: 3 judge-ready reproducible live demonstration flows.
