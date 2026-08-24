-- ============================================================
-- REVIVE DATABASE SCHEMA: 001_initial_schema.sql
-- Autonomous AI Revenue Recovery Agent
-- Phase 1 — Data Foundation
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('STANDARD', 'PREMIUM', 'ENTERPRISE')),
    lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (lifetime_value >= 0),
    preferred_channel TEXT NOT NULL CHECK (preferred_channel IN ('EMAIL', 'SMS', 'WHATSAPP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE')),
    next_billing_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(subscription_id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED')),
    failure_reason TEXT CHECK (failure_reason IN ('insufficient_funds', 'expired_card', 'bank_timeout', 'payment_method_error', 'temporary_failure', 'unknown') OR failure_reason IS NULL),
    attempt_number INT NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CARD', 'UPI', 'NETBANKING', 'WALLET')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'OVERDUE', 'CANCELLED')),
    days_overdue INT NOT NULL DEFAULT 0 CHECK (days_overdue >= 0),
    last_reminder_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- 5. CHECKOUT_EVENTS TABLE
CREATE TABLE IF NOT EXISTS checkout_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    cart_value NUMERIC(10, 2) NOT NULL CHECK (cart_value > 0),
    event_type TEXT NOT NULL CHECK (event_type IN ('CHECKOUT_STARTED', 'PAYMENT_PAGE_REACHED', 'PAYMENT_INITIATED', 'PAYMENT_SUCCESS', 'CHECKOUT_ABANDONED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_events_customer_id ON checkout_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_events_session_id ON checkout_events(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_events_event_type ON checkout_events(event_type);
CREATE INDEX IF NOT EXISTS idx_checkout_events_timestamp ON checkout_events(timestamp);

-- 6. RECOVERY_CASES TABLE (Central REVIVE Entity)
CREATE TABLE IF NOT EXISTS recovery_cases (
    case_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('PAYMENT', 'CHECKOUT', 'INVOICE')),
    source_id UUID NOT NULL,
    revenue_at_risk NUMERIC(12, 2) NOT NULL CHECK (revenue_at_risk >= 0),
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'INVESTIGATING', 'ACTION_PENDING', 'RECOVERED', 'ESCALATED', 'CLOSED')),
    current_strategy TEXT CHECK (current_strategy IN ('RETRY_PAYMENT', 'SCHEDULE_RETRY', 'PAYMENT_LINK', 'PAYMENT_METHOD_UPDATE', 'CUSTOMER_NOTIFICATION', 'ESCALATE', 'STOP') OR current_strategy IS NULL),
    scenario_tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recovery_cases_customer_id ON recovery_cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON recovery_cases(status);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_priority ON recovery_cases(priority);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_source_type ON recovery_cases(source_type);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_created_at ON recovery_cases(created_at);

-- 7. RECOVERY_ACTIONS TABLE
CREATE TABLE IF NOT EXISTS recovery_actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES recovery_cases(case_id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('RETRY_PAYMENT', 'SCHEDULE_RETRY', 'GENERATE_PAYMENT_LINK', 'SEND_NOTIFICATION', 'REQUEST_PAYMENT_METHOD_UPDATE', 'ESCALATE', 'STOP')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'EXECUTED', 'SUCCESS', 'FAILED', 'BLOCKED')),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    amount_recovered NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_recovered >= 0)
);

CREATE INDEX IF NOT EXISTS idx_recovery_actions_case_id ON recovery_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_status ON recovery_actions(status);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_executed_at ON recovery_actions(executed_at);

-- 8. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES recovery_cases(case_id) ON DELETE CASCADE,
    agent_step TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    policy_result JSONB NOT NULL DEFAULT '{"status": "PASSED"}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
