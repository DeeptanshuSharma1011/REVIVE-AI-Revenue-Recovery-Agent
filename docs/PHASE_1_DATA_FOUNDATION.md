# REVIVE — Phase 1: Data Foundation Documentation

## 1. Overview
REVIVE's Data Foundation establishes the relational data architecture, synthetic event generator, and data-access layer required to support bounded-autonomy revenue recovery interventions across:
1. **Subscription recurring billing failures** (e.g., card expiry, bank timeouts, insufficient funds)
2. **Abandoned checkout funnels** (high-intent cart drop-offs)
3. **Overdue enterprise invoices** (credit terms and payment delays)

---

## 2. Database Schema Architecture (8 Tables)

### `customers`
- **Primary Key**: `customer_id` (UUID)
- **Attributes**: `name`, `email` (UNIQUE), `phone`, `segment` (`STANDARD` | `PREMIUM` | `ENTERPRISE`), `lifetime_value` (NUMERIC), `preferred_channel` (`EMAIL` | `SMS` | `WHATSAPP`), `created_at`

### `subscriptions`
- **Primary Key**: `subscription_id` (UUID)
- **Foreign Key**: `customer_id` -> `customers.customer_id` (CASCADE)
- **Attributes**: `plan_name`, `amount`, `billing_cycle` (`MONTHLY` | `QUARTERLY` | `ANNUAL`), `status` (`ACTIVE` | `PAUSED` | `CANCELLED` | `PAST_DUE`), `next_billing_date`, `created_at`

### `payments`
- **Primary Key**: `payment_id` (UUID)
- **Foreign Keys**: `customer_id` -> `customers.customer_id`, `subscription_id` -> `subscriptions.subscription_id`
- **Attributes**: `amount`, `status` (`SUCCESS` | `FAILED` | `PENDING` | `REFUNDED`), `failure_reason` (`insufficient_funds` | `expired_card` | `bank_timeout` | `payment_method_error` | `temporary_failure` | `unknown`), `attempt_number`, `payment_method` (`CARD` | `UPI` | `NETBANKING` | `WALLET`), `created_at`, `updated_at`

### `invoices`
- **Primary Key**: `invoice_id` (UUID)
- **Foreign Key**: `customer_id` -> `customers.customer_id`
- **Attributes**: `amount`, `issue_date`, `due_date`, `status` (`PAID` | `PENDING` | `OVERDUE` | `CANCELLED`), `days_overdue`, `last_reminder_at`, `created_at`

### `checkout_events`
- **Primary Key**: `event_id` (UUID)
- **Foreign Key**: `customer_id` -> `customers.customer_id`
- **Attributes**: `session_id`, `cart_value`, `event_type` (`CHECKOUT_STARTED` | `PAYMENT_PAGE_REACHED` | `PAYMENT_INITIATED` | `PAYMENT_SUCCESS` | `CHECKOUT_ABANDONED`), `timestamp`

### `recovery_cases` (Central Entity)
- **Primary Key**: `case_id` (UUID)
- **Foreign Key**: `customer_id` -> `customers.customer_id`
- **Attributes**: `source_type` (`PAYMENT` | `CHECKOUT` | `INVOICE`), `source_id` (UUID), `revenue_at_risk` (NUMERIC), `priority` (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`), `status` (`OPEN` | `INVESTIGATING` | `ACTION_PENDING` | `RECOVERED` | `ESCALATED` | `CLOSED`), `current_strategy`, `scenario_tag`, `created_at`, `resolved_at`

### `recovery_actions`
- **Primary Key**: `action_id` (UUID)
- **Foreign Key**: `case_id` -> `recovery_cases.case_id` (CASCADE)
- **Attributes**: `action_type`, `reason`, `status` (`PENDING` | `EXECUTED` | `SUCCESS` | `FAILED` | `BLOCKED`), `executed_at`, `result` (JSONB), `amount_recovered` (NUMERIC)

### `audit_logs`
- **Primary Key**: `log_id` (UUID)
- **Foreign Key**: `case_id` -> `recovery_cases.case_id` (CASCADE)
- **Attributes**: `agent_step`, `tool_name`, `input_summary` (JSONB), `output_summary` (JSONB), `policy_result` (JSONB), `timestamp`

---

## 3. Row Level Security (RLS) Configuration
- SQL migration in `database/migrations/002_rls_policies.sql`.
- RLS enabled on all 8 tables.
- Server-side access restricted to backend service-role / authenticated access layers; browser client does not hold direct database credentials.

---

## 4. Deterministic Ground Truth Benchmark Scenarios

| Scenario Tag | Customer / Entity | Core Issue | Expected Strategy |
| :--- | :--- | :--- | :--- |
| **`GT_SUCCESSFUL_RETRY`** | Rahul Sharma (LTV ₹32,487, 13 success payments) | Payment failed (`temporary_failure`, attempt 1) | `RETRY_PAYMENT` or `SCHEDULE_RETRY` |
| **`GT_PAYMENT_METHOD_UPDATE`** | Priya Patel (Active sub ₹4,999) | `expired_card` failure, attempt 3 (retries exhausted) | `REQUEST_PAYMENT_METHOD_UPDATE` |
| **`GT_HIGH_VALUE_ESCALATION`** | Apex Global Tech (ENTERPRISE) | Invoice ₹85,000 overdue (> ₹25k limit) | `ESCALATE` |
| **`GT_CHECKOUT_ABANDONMENT`** | Ananya Verma (Premium) | Cart ₹12,500 abandoned at checkout | `GENERATE_PAYMENT_LINK` / `SEND_NOTIFICATION` |
| **`GT_OVERDUE_RELIABLE`** | Rajesh Gupta (ENTERPRISE, 5 paid invoices) | Invoice ₹65,000, 15 days overdue | `SEND_NOTIFICATION` (reminder before escalate) |
| **`GT_MAX_RETRY_STOP`** | Vikram Malhotra | 3 previous failed retries already executed | `STOP` (policy limit reached) |

---

## 5. API Endpoints Reference

- `GET /api/health` — API and Database connectivity health
- `GET /api/database/health` — Database stats and seed metadata
- `GET /api/customers` — Paginated customer listings
- `GET /api/customers/:id` — Full customer domain profile with financial metrics
- `GET /api/subscriptions` & `GET /api/subscriptions/:id` — Subscription records
- `GET /api/payments` & `GET /api/payments/:id` — Payment records & failure analysis
- `GET /api/invoices` & `GET /api/invoices/:id` — Invoices & overdue calculations
- `GET /api/checkout-events` — Checkout funnel session telemetry
- `GET /api/recovery/cases` — Recovery case repository with multi-attribute filtering
- `GET /api/recovery/cases/:id` — Comprehensive case intelligence inspector
- `GET /api/ground-truth` — Ground truth benchmark test suites
- `POST /api/database/seed` — Deterministic seeding with customizable seed and multiplier
- `POST /api/database/reset` — Reset to default state (Seed 42)
