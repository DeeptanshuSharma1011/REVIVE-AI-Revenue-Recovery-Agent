import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { db } from './database/db';
import { customerRepository } from './database/repositories/CustomerRepository';
import { subscriptionRepository } from './database/repositories/SubscriptionRepository';
import { paymentRepository } from './database/repositories/PaymentRepository';
import { invoiceRepository } from './database/repositories/InvoiceRepository';
import { checkoutRepository } from './database/repositories/CheckoutRepository';
import { recoveryCaseRepository } from './database/repositories/RecoveryCaseRepository';
import { recoveryActionRepository } from './database/repositories/RecoveryActionRepository';
import { auditRepository } from './database/repositories/AuditRepository';
import { dataService } from './database/services/dataService';
import { recoverySimulator } from './database/simulator/recoverySimulator';
import { recoveryEngine } from './database/engine/RecoveryEngine';
import { strategyEngine } from './database/engine/strategy';
import { aiRecoveryDecisionService } from './database/engine/ai/AIRecoveryDecisionService';
import { aiEvaluationEngine } from './database/engine/ai/AIEvaluationEngine';
import { reviveAgentGraph } from './database/engine/agent/graph';
import { agentToolRegistry } from './database/engine/agent/tools';
import { policyEngine } from './database/engine/policy/PolicyEngine';
import { getPolicyConfig } from './database/engine/policy/config';
import { evaluationEngine, evaluationRepository } from './database/engine/evaluation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic Middleware & CORS configuration
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ==========================================
  // HEALTH & DIAGNOSTIC ENDPOINTS
  // ==========================================

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'REVIVE API',
      version: '1.4.0',
      phase: 'Phase 4 — AI Decision Engine',
      strategyMode: strategyEngine.getStrategyMode(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'REVIVE API',
      version: '1.4.0',
      phase: 'Phase 4 — AI Decision Engine',
      strategyMode: strategyEngine.getStrategyMode(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      aiStatus: aiRecoveryDecisionService.getStatus(),
      database: db.getHealth(),
    });
  });

  app.get('/api/database/health', (req, res) => {
    res.status(200).json(db.getHealth());
  });

  app.get('/api', (req, res) => {
    res.status(200).json({
      service: 'REVIVE',
      name: 'Revenue Intelligence & Value Intervention for Viable Earnings',
      category: 'Autonomous AI Revenue Recovery Agent',
      phase: 'Phase 4 — AI Decision Engine',
      status: 'operational',
      version: '1.4.0',
      strategyMode: strategyEngine.getStrategyMode(),
      endpoints: {
        databaseHealth: '/api/database/health',
        customers: '/api/customers',
        subscriptions: '/api/subscriptions',
        payments: '/api/payments',
        invoices: '/api/invoices',
        checkoutEvents: '/api/checkout-events',
        recoveryCases: '/api/recovery/cases',
        recoveryMetrics: '/api/recovery/metrics',
        strategyMode: '/api/recovery/strategy-mode',
        aiStatus: '/api/recovery/ai/status',
        aiEvaluation: '/api/recovery/ai/evaluation',
        groundTruth: '/api/ground-truth',
        seedDatabase: 'POST /api/database/seed',
        resetDatabase: 'POST /api/database/reset',
      },
    });
  });

  // ==========================================
  // CUSTOMER DATA ACCESS
  // ==========================================

  app.get('/api/customers', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const segment = req.query.segment as string;
    const result = customerRepository.findAll(limit, offset, segment);
    res.status(200).json(result);
  });

  app.get('/api/customers/:id', (req, res) => {
    const profile = dataService.getCustomerProfile(req.params.id);
    if (!profile) {
      res.status(404).json({ error: 'Customer not found', customerId: req.params.id });
      return;
    }
    res.status(200).json(profile);
  });

  app.get('/api/customers/:id/payments', (req, res) => {
    const payments = paymentRepository.findByCustomerId(req.params.id);
    res.status(200).json({ payments, total: payments.length });
  });

  app.get('/api/customers/:id/subscriptions', (req, res) => {
    const subscriptions = subscriptionRepository.findByCustomerId(req.params.id);
    res.status(200).json({ subscriptions, total: subscriptions.length });
  });

  app.get('/api/customers/:id/invoices', (req, res) => {
    const invoices = invoiceRepository.findByCustomerId(req.params.id);
    res.status(200).json({ invoices, total: invoices.length });
  });

  app.get('/api/customers/:id/checkout-events', (req, res) => {
    const events = checkoutRepository.findByCustomerId(req.params.id);
    res.status(200).json({ events, total: events.length });
  });

  // ==========================================
  // SUBSCRIPTIONS & PAYMENTS
  // ==========================================

  app.get('/api/subscriptions', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = req.query.status as string;
    res.status(200).json(subscriptionRepository.findAll(limit, offset, status));
  });

  app.get('/api/subscriptions/:id', (req, res) => {
    const sub = subscriptionRepository.findById(req.params.id);
    if (!sub) {
      res.status(404).json({ error: 'Subscription not found', subscriptionId: req.params.id });
      return;
    }
    res.status(200).json(sub);
  });

  app.get('/api/payments', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = req.query.status as string;
    res.status(200).json(paymentRepository.findAll(limit, offset, status));
  });

  app.get('/api/payments/:id', (req, res) => {
    const payment = paymentRepository.findById(req.params.id);
    if (!payment) {
      res.status(404).json({ error: 'Payment not found', paymentId: req.params.id });
      return;
    }
    res.status(200).json(payment);
  });

  // ==========================================
  // INVOICES & CHECKOUT
  // ==========================================

  app.get('/api/invoices', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = req.query.status as string;
    res.status(200).json(invoiceRepository.findAll(limit, offset, status));
  });

  app.get('/api/invoices/:id', (req, res) => {
    const invoice = invoiceRepository.findById(req.params.id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found', invoiceId: req.params.id });
      return;
    }
    res.status(200).json(invoice);
  });

  app.get('/api/checkout-events', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const eventType = req.query.eventType as string;
    res.status(200).json(checkoutRepository.findAll(limit, offset, eventType));
  });

  // ==========================================
  // RECOVERY CASES & METRICS
  // ==========================================

  app.get('/api/recovery/cases', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const sourceType = req.query.sourceType as string;

    const result = recoveryCaseRepository.findAll(limit, offset, { status, priority, sourceType });
    res.status(200).json(result);
  });

  app.get('/api/recovery/cases/:id', (req, res) => {
    const details = dataService.getRecoveryCaseDetails(req.params.id);
    if (!details) {
      res.status(404).json({ error: 'Recovery case not found', caseId: req.params.id });
      return;
    }
    res.status(200).json(details);
  });

  app.get('/api/recovery/actions', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const status = req.query.status as string;
    res.status(200).json(recoveryActionRepository.findAll(limit, offset, status));
  });

  app.get('/api/recovery/audit-logs', (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    res.status(200).json(auditRepository.findAll(limit, offset));
  });

  app.get('/api/recovery/metrics', (req, res) => {
    const metrics = recoveryEngine.getMetrics();
    const legacyMetrics = dataService.getRecoveryMetrics();
    res.status(200).json({
      ...legacyMetrics,
      ...metrics,
    });
  });

  // ==========================================
  // PHASE 4: AI DECISION ENGINE & STRATEGY MODE ENDPOINTS
  // ==========================================

  // Get active strategy mode
  app.get('/api/recovery/strategy-mode', (req, res) => {
    res.status(200).json({
      mode: strategyEngine.getStrategyMode(),
      aiStatus: aiRecoveryDecisionService.getStatus(),
    });
  });

  // Set active strategy mode (deterministic vs ai)
  app.post('/api/recovery/strategy-mode', (req, res) => {
    const requestedMode = req.body?.mode;
    if (requestedMode !== 'deterministic' && requestedMode !== 'ai') {
      res.status(400).json({ error: "mode must be 'deterministic' or 'ai'" });
      return;
    }
    strategyEngine.setStrategyMode(requestedMode);
    res.status(200).json({
      mode: strategyEngine.getStrategyMode(),
      message: `Strategy selection mode set to ${requestedMode.toUpperCase()}`,
      aiStatus: aiRecoveryDecisionService.getStatus(),
    });
  });

  // Get AI status and configuration
  app.get('/api/recovery/ai/status', (req, res) => {
    res.status(200).json(aiRecoveryDecisionService.getStatus());
  });

  // Run AI Evaluation comparing Ground Truth, Deterministic, and AI across all scenarios
  app.get('/api/recovery/ai/evaluation', async (req, res) => {
    try {
      const evaluation = await aiEvaluationEngine.evaluateGroundTruth();
      res.status(200).json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI evaluation failed' });
    }
  });

  // Process case through end-to-end recovery workflow (supports AI or Deterministic mode)
  app.post('/api/recovery/process/:case_id', async (req, res) => {
    try {
      const caseId = req.params.case_id;
      const strategyMode = req.body?.strategy_mode;
      const result = await recoveryEngine.processCaseAsync(caseId, { strategyMode });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // Get investigation context for a case
  app.get('/api/recovery/cases/:case_id/context', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const context = recoveryEngine.getCaseContext(caseId);
      res.status(200).json(context);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // Get diagnosis for a case
  app.get('/api/recovery/cases/:case_id/diagnosis', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const diagnosis = recoveryEngine.getCaseDiagnosis(caseId);
      res.status(200).json(diagnosis);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // Get strategy decision for a case (supports ?mode=ai|deterministic)
  app.get('/api/recovery/cases/:case_id/decision', async (req, res) => {
    try {
      const caseId = req.params.case_id;
      const mode = (req.query.mode as any) || undefined;
      const decision = await recoveryEngine.getCaseDecisionAsync(caseId, mode);
      res.status(200).json(decision);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // Get chronological recovery lifecycle timeline for a case
  app.get('/api/recovery/cases/:case_id/timeline', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const timeline = recoveryEngine.getCaseTimeline(caseId);
      res.status(200).json({
        case_id: caseId,
        timeline,
        count: timeline.length,
        simulated: true,
      });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // ==========================================
  // GROUND TRUTH BENCHMARK SCENARIOS
  // ==========================================

  app.get('/api/ground-truth', (req, res) => {
    const groundTruth = dataService.getGroundTruthCases();
    res.status(200).json({
      scenarios: groundTruth,
      count: groundTruth.length,
      description: 'Standardized Ground Truth Scenarios for deterministic recovery evaluation',
    });
  });

  // ==========================================
  // SEED & RESET CONTROLS
  // ==========================================

  app.post('/api/database/seed', (req, res) => {
    const seed = req.body?.seed ? parseInt(req.body.seed, 10) : 42;
    const multiplier = req.body?.multiplier ? parseFloat(req.body.multiplier) : 1.0;
    const result = dataService.resetAndSeed(seed, multiplier);
    res.status(200).json({
      message: 'Database seeded successfully',
      seed,
      multiplier,
      counts: result.counts,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/database/reset', (req, res) => {
    aiRecoveryDecisionService.clearCache();
    const result = dataService.resetAndSeed(42, 1.0);
    res.status(200).json({
      message: 'Database reset to default seed (42)',
      counts: result.counts,
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // PHASE 5: LANGGRAPH AGENT ORCHESTRATION ENDPOINTS
  // ==========================================

  // 1. Recover case using LangGraph Multi-Step Agent
  app.post('/api/agent/recover/:case_id', async (req, res) => {
    try {
      const caseId = req.params.case_id;
      const forceDeterministic = Boolean(req.body?.force_deterministic);
      const result = await reviveAgentGraph.runCase(caseId, { forceDeterministic });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 2. Get specific agent run details
  app.get('/api/agent/runs/:run_id', (req, res) => {
    const run = reviveAgentGraph.getRunById(req.params.run_id);
    if (!run) {
      res.status(404).json({ error: 'Agent run not found', runId: req.params.run_id });
      return;
    }
    res.status(200).json(run);
  });

  // 3. Get all agent runs history
  app.get('/api/agent/runs', (req, res) => {
    const runs = reviveAgentGraph.getAllRuns();
    res.status(200).json({ runs, count: runs.length });
  });

  // 4. Get comprehensive agent & safety metrics
  app.get('/api/agent/metrics', (req, res) => {
    const metrics = reviveAgentGraph.getMetrics();
    res.status(200).json(metrics);
  });

  // 5. List registered agent tools
  app.get('/api/agent/tools', (req, res) => {
    res.status(200).json({
      tools: agentToolRegistry.listTools(),
      count: agentToolRegistry.listTools().length,
      unrestricted_access: false,
    });
  });

  app.get('/api/agent/status', (req, res) => {
    res.status(200).json({
      status: 'READY',
      currentCaseId: null,
      currentStep: null,
      lastUpdated: new Date().toISOString(),
      phase: 'Phase 6 — Guardrails & Policy Engine Active',
      metrics: reviveAgentGraph.getMetrics(),
    });
  });

  // ==========================================
  // PHASE 6: GUARDRAILS & POLICY ENGINE ENDPOINTS
  // ==========================================

  // 1. Get active Policy Configuration & Thresholds
  app.get('/api/policy/config', (req, res) => {
    res.status(200).json({
      config: getPolicyConfig(),
      version: getPolicyConfig().POLICY_VERSION,
      description: 'REVIVE Deterministic Policy Firewall and Safety Thresholds',
    });
  });

  // 2. Get real-time Policy & Safety Metrics
  app.get('/api/policy/metrics', (req, res) => {
    const metrics = policyEngine.getMetrics();
    res.status(200).json(metrics);
  });

  // 3. Get Policy Evaluation History
  app.get('/api/policy/history', (req, res) => {
    const history = policyEngine.getHistory();
    res.status(200).json({
      history,
      count: history.length,
    });
  });

  // 4. Test/Simulate Policy Evaluation on arbitrary context
  app.post('/api/policy/evaluate', (req, res) => {
    try {
      const { case_id, strategy, confidence, reason } = req.body;
      const caseContext = case_id ? recoveryEngine.getCaseContext(case_id) : null;
      const diagnosis = case_id ? recoveryEngine.getCaseDiagnosis(case_id) : null;

      const proposed = {
        strategy: strategy || 'RETRY_PAYMENT',
        confidence: typeof confidence === 'number' ? confidence : 0.9,
        reason: reason || 'Test evaluation',
      };

      const result = policyEngine.evaluate(caseContext, proposed, diagnosis);
      const explanationCard = policyEngine.generateExplanationCard(proposed, result);

      res.status(200).json({
        proposed,
        result,
        explanation_card: explanationCard,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // PHASE 7: EVALUATION & REVENUE INTELLIGENCE
  // ==========================================

  // 1. Run full evaluation suite across ground truth benchmark scenarios
  app.post('/api/evaluation/run', async (req, res) => {
    try {
      const { runName, forceDeterministic, scenarioTags } = req.body || {};
      const run = await evaluationEngine.runEvaluation({
        runName,
        forceDeterministic: Boolean(forceDeterministic),
        scenarioTags: Array.isArray(scenarioTags) ? scenarioTags : undefined,
      });
      res.status(200).json(run);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Evaluation run failed', details: String(err) });
    }
  });

  // 2. Get list of all evaluation runs
  app.get('/api/evaluation/runs', (req, res) => {
    const summaries = evaluationRepository.findSummaries();
    res.status(200).json({
      runs: summaries,
      count: summaries.length,
      latest: evaluationRepository.getLatest(),
    });
  });

  // 3. Get specific evaluation run details
  app.get('/api/evaluation/runs/:id', (req, res) => {
    const run = evaluationRepository.findById(req.params.id);
    if (!run) {
      res.status(404).json({ error: `Evaluation run '${req.params.id}' not found` });
      return;
    }
    res.status(200).json(run);
  });

  // 4. Get evaluation run metrics breakdown
  app.get('/api/evaluation/runs/:id/metrics', (req, res) => {
    const run = evaluationRepository.findById(req.params.id);
    if (!run) {
      res.status(404).json({ error: `Evaluation run '${req.params.id}' not found` });
      return;
    }
    res.status(200).json({
      evaluation_run_id: run.evaluation_run_id,
      run_name: run.run_name,
      primary_metrics: {
        total_cases: run.total_cases,
        successful_recoveries: run.successful_recoveries,
        revenue_at_risk: run.revenue_at_risk,
        revenue_recovered: run.revenue_recovered,
        recovery_rate: run.recovery_rate,
        revenue_recovery_rate: run.revenue_recovery_rate,
      },
      agentic_metrics: {
        multi_step_recovery_rate: run.multi_step_recovery_rate,
        first_action_recovery_rate: run.first_action_recovery_rate,
        re_evaluation_recovery_rate: run.re_evaluation_recovery_rate,
        avg_actions_to_recovery: run.avg_actions_to_recovery,
        avg_iterations: run.avg_iterations,
        recovery_after_reevaluation_count: run.recovery_after_reevaluation_count,
      },
      ai_metrics: {
        ai_decisions_count: run.ai_decisions_count,
        avg_ai_confidence: run.avg_ai_confidence,
        low_confidence_rate: run.low_confidence_rate,
        ai_fallback_rate: run.ai_fallback_rate,
      },
      policy_metrics: {
        policy_evaluations: run.policy_evaluations,
        policy_allowed: run.policy_allowed,
        policy_modified: run.policy_modified,
        policy_blocked: run.policy_blocked,
        policy_escalated: run.policy_escalated,
        policy_stopped: run.policy_stopped,
        guardrail_intervention_rate: run.guardrail_intervention_rate,
      },
      safety_metrics: run.safety_metrics,
      operational_efficiency: run.operational_efficiency,
    });
  });

  // 5. Get deterministic baseline comparison
  app.get('/api/evaluation/runs/:id/comparison', (req, res) => {
    const run = evaluationRepository.findById(req.params.id);
    if (!run) {
      res.status(404).json({ error: `Evaluation run '${req.params.id}' not found` });
      return;
    }
    res.status(200).json({
      evaluation_run_id: run.evaluation_run_id,
      run_name: run.run_name,
      baseline_comparison: run.baseline_comparison,
      scenario_performance: run.scenario_performance,
    });
  });

  // 6. Get case-level evaluation results with filtering and search
  app.get('/api/evaluation/runs/:id/cases', (req, res) => {
    const run = evaluationRepository.findById(req.params.id);
    if (!run) {
      res.status(404).json({ error: `Evaluation run '${req.params.id}' not found` });
      return;
    }

    let cases = [...run.cases];
    const status = req.query.status as string;
    const scenario = req.query.scenario as string;
    const search = req.query.search as string;

    if (status) {
      cases = cases.filter((c) => c.final_status === status);
    }
    if (scenario) {
      cases = cases.filter((c) => c.scenario_id.toLowerCase().includes(scenario.toLowerCase()));
    }
    if (search) {
      const q = search.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(q) ||
          c.case_id.toLowerCase().includes(q) ||
          c.scenario_id.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      cases,
      total: cases.length,
      total_unfiltered: run.cases.length,
    });
  });

  // 7. Export evaluation run as CSV
  app.get('/api/evaluation/runs/:id/export', (req, res) => {
    try {
      const csv = evaluationEngine.exportRunCSV(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=revive_eval_${req.params.id}.csv`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });


  // ==========================================
  // PHASE 2: RECOVERY SIMULATOR ENDPOINTS
  // ==========================================

  // 1. Action: Retry Payment
  app.post('/api/simulator/payments/:payment_id/retry', (req, res) => {
    try {
      const paymentId = req.params.payment_id;
      const caseId = req.body?.case_id;
      const result = recoverySimulator.retryPayment(paymentId, caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') || err.message.includes('does not exist') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 2. Action: Schedule Payment Retry
  app.post('/api/simulator/payments/:payment_id/schedule-retry', (req, res) => {
    try {
      const paymentId = req.params.payment_id;
      const scheduledFor = req.body?.scheduled_for;
      const caseId = req.body?.case_id;
      const result = recoverySimulator.schedulePaymentRetry(paymentId, scheduledFor, caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 3. Action: Generate Payment Link
  app.post('/api/simulator/payment-links', (req, res) => {
    try {
      const customerId = req.body?.customer_id;
      const amount = req.body?.amount ? parseFloat(req.body.amount) : 0;
      const caseId = req.body?.case_id;

      if (!customerId) {
        res.status(400).json({ error: 'customer_id is required', simulated: true });
        return;
      }
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'amount must be greater than 0', simulated: true });
        return;
      }

      const result = recoverySimulator.generatePaymentLink(customerId, amount, caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 4. Action: Send Customer Notification
  app.post('/api/simulator/notifications', (req, res) => {
    try {
      const customerId = req.body?.customer_id;
      const message = req.body?.message;
      const channel = req.body?.channel || 'EMAIL';
      const caseId = req.body?.case_id;

      if (!customerId) {
        res.status(400).json({ error: 'customer_id is required', simulated: true });
        return;
      }
      if (!message) {
        res.status(400).json({ error: 'message content is required', simulated: true });
        return;
      }

      const result = recoverySimulator.sendCustomerNotification(customerId, message, channel, caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 5. Action: Request Payment Method Update
  app.post('/api/simulator/payment-method-update', (req, res) => {
    try {
      const customerId = req.body?.customer_id;
      const caseId = req.body?.case_id;

      if (!customerId) {
        res.status(400).json({ error: 'customer_id is required', simulated: true });
        return;
      }

      const result = recoverySimulator.requestPaymentMethodUpdate(customerId, caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 6. Action: Escalate to Human
  app.post('/api/simulator/cases/:case_id/escalate', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const reason = req.body?.reason;
      const result = recoverySimulator.escalateToHuman(caseId, reason);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // 7. Action: Stop Recovery
  app.post('/api/simulator/cases/:case_id/stop', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const reason = req.body?.reason;
      const result = recoverySimulator.stopRecovery(caseId, reason);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 400).json({
        error: err.message,
        simulated: true,
      });
    }
  });

  // Verification 1: Check Payment Status
  app.get('/api/simulator/payments/:payment_id/status', (req, res) => {
    try {
      const paymentId = req.params.payment_id;
      const result = recoverySimulator.checkPaymentStatus(paymentId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message, simulated: true });
    }
  });

  // Verification 2: Check Recovery Status
  app.get('/api/simulator/cases/:case_id/status', (req, res) => {
    try {
      const caseId = req.params.case_id;
      const result = recoverySimulator.checkRecoveryStatus(caseId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message, simulated: true });
    }
  });

  // Inspector Endpoints
  app.get('/api/simulator/payment-links', (req, res) => {
    res.status(200).json({
      links: recoverySimulator.getSimulatedLinks(),
      count: recoverySimulator.getSimulatedLinks().length,
      simulated: true,
    });
  });

  app.get('/api/simulator/notifications', (req, res) => {
    res.status(200).json({
      notifications: recoverySimulator.getSimulatedNotifications(),
      count: recoverySimulator.getSimulatedNotifications().length,
      simulated: true,
    });
  });

  app.get('/api/simulator/scheduled-retries', (req, res) => {
    res.status(200).json({
      schedules: recoverySimulator.getSimulatedSchedules(),
      count: recoverySimulator.getSimulatedSchedules().length,
      simulated: true,
    });
  });

  app.get('/api/simulator/payment-method-requests', (req, res) => {
    res.status(200).json({
      requests: recoverySimulator.getSimulatedMethodRequests(),
      count: recoverySimulator.getSimulatedMethodRequests().length,
      simulated: true,
    });
  });

  // Vite middleware in dev vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[REVIVE] Backend API server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[REVIVE] Failed to start server:', err);
  process.exit(1);
});
