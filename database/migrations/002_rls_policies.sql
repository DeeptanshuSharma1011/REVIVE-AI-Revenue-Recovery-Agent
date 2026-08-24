-- ============================================================
-- REVIVE DATABASE SCHEMA: 002_rls_policies.sql
-- Row Level Security (RLS) Configuration
-- Phase 1 — Data Foundation
-- ============================================================

-- Enable RLS on all 8 tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Backend Service Role has full access across all tables
-- (FastAPI backend communicates via Service Role / Secure server connection)

-- Read-only policies for authenticated read access
CREATE POLICY "Allow service role full access on customers" 
ON customers FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on subscriptions" 
ON subscriptions FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on payments" 
ON payments FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on invoices" 
ON invoices FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on checkout_events" 
ON checkout_events FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on recovery_cases" 
ON recovery_cases FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on recovery_actions" 
ON recovery_actions FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access on audit_logs" 
ON audit_logs FOR ALL 
USING (true) WITH CHECK (true);
