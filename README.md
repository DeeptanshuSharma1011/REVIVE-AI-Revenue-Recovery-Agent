# REVIVE

**Revenue Intelligence & Value Intervention for Viable Earnings**

*Autonomous AI Revenue Recovery Agent*

REVIVE is an action-oriented, bounded-autonomy agent that autonomously identifies at-risk revenue, investigates underlying context, selects and executes policy-cleared recovery interventions, verifies outcomes, and measures business impact.

---

## 🏛️ REVIVE Architecture

```text
Data Source
    ↓
   API
    ↓
  Agent
    ↓
  Tools
    ↓
  Policy
    ↓
 Recovery
    ↓
Verification
    ↓
  Audit
    ↓
 Metrics
```

### Architectural Components
- **Data Source**: Manages relational entities across 8 core domain tables (customers, subscriptions, payments, invoices, checkout events, cases, actions, audit logs) and deterministic benchmark scenarios.
- **API**: Full-stack Express REST API providing type-safe endpoints for recovery orchestration, live agent streaming, policy rules, and metrics.
- **Agent**: LangGraph-inspired stateful multi-step workflow with 11 discrete nodes, iterative re-evaluation loops, and bounded tool calls.
- **Tools**: Structured registry of 11 formal agent tools for investigation, diagnosis, transaction retries, payment links, and customer communications.
- **Policy**: Deterministic, zero-trust safety guardrail engine enforcing financial limits (> ₹25,000 threshold), max retries (<= 2), anti-looping protection, and human escalation gates.
- **Recovery**: Core execution engine and simulation subsystem that applies targeted recovery strategies and mutates transaction state.
- **Verification**: Dedicated validation tools that query payment gateways and ledger status to verify settlement before closing cases.
- **Audit**: Immutable, structured audit logger recording tool inputs, outputs, policy decisions, and operator explanation cards for complete transparency.
- **Metrics**: Real-time KPI engine computing recovery rates, autonomous intervention lift, financial savings, and benchmark accuracy.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion *(IMPLEMENTED)*
- **Backend**: Node.js / Express Server (`tsx` in development, `esbuild` in production) *(IMPLEMENTED)*
- **Database & Data Access**: 8 relational tables, repository pattern, deterministic synthetic data generator *(IMPLEMENTED)*
- **Recovery Simulator**: 7 deterministic action tools, state mutation engine, audit trail, simulation flag enforcement *(IMPLEMENTED)*
- **Deterministic Recovery Engine**: Rule-based recovery workflow with 7 pipeline stages, metrics computation, and idempotency *(IMPLEMENTED)*
- **Reasoning Engine**: Google Gemini API via `@google/genai` (Gemini 3.7 Flash) with structured JSON schema and prompt versioning *(IMPLEMENTED)*
- **Agent Orchestrator**: LangGraph-inspired multi-step state machine with iterative re-evaluation & bounded tools *(IMPLEMENTED)*
- **Guardrail Layer**: Deterministic Policy Engine with zero-trust safety rules *(IMPLEMENTED)*
- **Evaluation Engine**: 12 Golden Ground-Truth Benchmark Matrix with CSV Export *(IMPLEMENTED)*

---

## 📂 Project Structure

```text
REVIVE/
├── .env.example                      # Environment variable declarations
├── database/                         # Core Backend Engine & Data Layer
│   ├── db.ts                         # In-memory database instance with relational models
│   ├── schema.ts                     # Schema and table definitions
│   ├── migrations/                   # SQL migration scripts
│   ├── repositories/                 # 8 Data access repositories
│   ├── services/                     # Business services (dataService)
│   ├── simulator/                    # Recovery & payment simulator subsystem
│   ├── synthetic/                    # Deterministic generator & 12 Ground Truth scenarios
│   └── engine/                       # Autonomous Recovery Engine Subsystems
│       ├── agent/                    # LangGraph workflow, nodes, tools & state
│       ├── ai/                       # Gemini advisory engine & prompts.ts
│       ├── policy/                   # Deterministic PolicyEngine & safety rules
│       ├── evaluation/               # Benchmark evaluation engine & repository
│       ├── investigation.ts          # Context gathering
│       ├── diagnosis.ts              # Failure root-cause analysis
│       ├── strategy.ts               # Strategy formulation
│       ├── execution.ts              # Action dispatching
│       ├── verification.ts           # State verification
│       ├── outcome.ts                # Case finalization
│       ├── metrics.ts                # Real-time KPIs
│       └── RecoveryEngine.ts         # Main recovery coordinator
├── docs/                             # Architecture & Guide Documentation
│   ├── architecture.md               # Complete architectural specification
│   ├── data-flow.md                  # End-to-end data lifecycle
│   ├── agent-workflow.md             # LangGraph state machine & node transitions
│   └── demo-guide.md                 # 3 live judge demonstration walkthroughs
├── scripts/                          # Automated Verification & Test Suites
│   ├── test_data_foundation.ts       # Data & repository test suite
│   ├── test_recovery_simulator.ts    # Simulator action & verification tests
│   ├── test_recovery_engine.ts       # 7-stage pipeline & idempotency tests
│   ├── test_ai_decision_engine.ts    # Gemini AI & fallback tests
│   ├── test_policy_guardrails.ts     # Policy guardrails & safety tests
│   ├── test_agent_orchestration.ts   # LangGraph agent orchestration tests
│   └── test_evaluation_engine.ts     # Benchmark evaluation tests
├── server.ts                         # Full-stack Express API Server
├── src/                              # Modern React 19 Frontend
│   ├── components/                   # Navigation, Header, Timeline, Status
│   ├── pages/                        # Command center view pages
│   ├── services/                     # Frontend API client
│   ├── types/                        # TypeScript types
│   ├── App.tsx                       # App shell & router
│   └── main.tsx                      # Entry point
└── package.json                      # Build & test scripts
```

---

## 🚦 Local Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Run All Automated Test Suites
npx tsx scripts/test_data_foundation.ts
npx tsx scripts/test_recovery_simulator.ts
npx tsx scripts/test_recovery_engine.ts
npx tsx scripts/test_ai_decision_engine.ts
npx tsx scripts/test_policy_guardrails.ts
npx tsx scripts/test_agent_orchestration.ts
npx tsx scripts/test_evaluation_engine.ts

# 3. Start local development server (Express + Vite on port 3000)
npm run dev

# 4. Check code quality & linting
npm run lint

# 5. Compile production bundle
npm run build
```
