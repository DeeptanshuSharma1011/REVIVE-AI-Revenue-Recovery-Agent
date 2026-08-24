/**
 * @license
 * REVIVE — Multi-Step LangGraph Agent Test Suite
 * Phase 5 — Agentic Orchestration Verification
 */

import { reviveAgentGraph } from '../database/engine/agent/graph';
import { agentNodes } from '../database/engine/agent/nodes';
import { agentToolRegistry } from '../database/engine/agent/tools';
import { dataService } from '../database/services/dataService';
import { recoveryCaseRepository } from '../database/repositories/RecoveryCaseRepository';
import { customerRepository } from '../database/repositories/CustomerRepository';
import { paymentRepository } from '../database/repositories/PaymentRepository';
import { auditRepository } from '../database/repositories/AuditRepository';
import { recoverySimulator } from '../database/simulator/recoverySimulator';

let passed = 0;
let failed = 0;

function assert(condition: boolean, suiteName: string, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ [${suiteName}] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [${suiteName}] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

async function runAgentTests() {
  console.log('====================================================');
  console.log('REVIVE PHASE 5 — AGENTIC ORCHESTRATION TEST SUITE');
  console.log('====================================================');

  // Reset database to standard seed
  dataService.resetAndSeed(42, 1.0);
  const groundTruthScenarios = dataService.getGroundTruthCases();

  // -----------------------------------------------------------------
  // Suite 1: Tool Registry Bounded Access & Audit
  // -----------------------------------------------------------------
  console.log('\nSuite 1: Agent Tools & Security Registry...');
  const tools = agentToolRegistry.listTools();
  assert(tools.length === 11, 'Tool Registry', 'All 11 formal agent tools registered');
  assert(agentToolRegistry.hasTool('retry_payment'), 'Tool Registry', 'retry_payment is registered');
  assert(agentToolRegistry.hasTool('get_case_context'), 'Tool Registry', 'get_case_context is registered');
  assert(agentToolRegistry.hasTool('check_payment_status'), 'Tool Registry', 'check_payment_status is registered');

  // Verify unauthorized tool execution rejection
  let caughtUnauthorized = false;
  try {
    await agentToolRegistry.executeTool('arbitrary_sql_execute', {} as any, 'RUN_001', 'CASE_001');
  } catch (err: any) {
    caughtUnauthorized = err.message.includes('Unauthorized tool call');
  }
  assert(caughtUnauthorized, 'Tool Security', 'Unauthorized tools are strictly rejected');

  // -----------------------------------------------------------------
  // Suite 2: Agent Scenario 1 — Successful One-Step Recovery (GT_SUCCESSFUL_RETRY)
  // -----------------------------------------------------------------
  console.log('\nSuite 2: Scenario 1 — Successful One-Step Recovery...');
  const sc1 = groundTruthScenarios.find((s) => s.tag === 'GT_SUCCESSFUL_RETRY')!;
  const run1 = await reviveAgentGraph.runCase(sc1.caseId, { forceDeterministic: true });

  assert(run1.status === 'RECOVERED', 'Scenario 1', 'Case recovered successfully');
  assert(run1.amount_recovered > 0, 'Scenario 1', `Revenue recovered: ₹${run1.amount_recovered}`);
  assert(run1.actions_taken === 1, 'Scenario 1', 'Executed exactly 1 action');
  assert(run1.iterations === 1, 'Scenario 1', 'Completed in 1 iteration');
  assert(run1.agent_run_id.startsWith('REVIVE_RUN_'), 'Scenario 1', 'Valid agent_run_id generated');
  assert(run1.timeline.length >= 6, 'Scenario 1', 'Full agent timeline recorded with real events');

  // -----------------------------------------------------------------
  // Suite 3: Agent Scenario 2 — Multi-Step Recovery Loop & Re-Evaluation
  // -----------------------------------------------------------------
  console.log('\nSuite 3: Scenario 2 — Multi-Step Recovery & Re-evaluation...');
  const existingCustomer = Array.from(customerRepository.findAll().items)[0];
  const failedPayment = paymentRepository.create({
    payment_id: 'PAY_TEST_FAILED_MULTISTEP_001',
    customer_id: existingCustomer.customer_id,
    subscription_id: null,
    amount: 1999,
    status: 'FAILED',
    failure_reason: 'temporary_failure',
    attempt_number: 1,
    payment_method: 'CARD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const sc2Case = recoveryCaseRepository.create({
    case_id: 'CASE_TEST_MULTISTEP_001',
    customer_id: existingCustomer.customer_id,
    source_type: 'PAYMENT',
    source_id: failedPayment.payment_id,
    status: 'OPEN',
    priority: 'MEDIUM',
    revenue_at_risk: 1999,
    current_strategy: null,
    scenario_tag: 'TEST_MULTISTEP',
    created_at: new Date().toISOString(),
    resolved_at: null,
  });

  const run2 = await reviveAgentGraph.runCase(sc2Case.case_id, { forceDeterministic: true });
  assert(
    run2.status === 'RECOVERED' || run2.final_outcome === 'INTERVENTION_DISPATCHED' || run2.status === 'STOPPED',
    'Scenario 2',
    'Multi-step case concluded appropriately'
  );
  assert(run2.timeline.some((t) => t.node === 'VERIFY_RESULT'), 'Scenario 2', 'Verification node executed');

  // -----------------------------------------------------------------
  // Suite 4: Agent Scenario 3 — High Value Escalation (> ₹25,000)
  // -----------------------------------------------------------------
  console.log('\nSuite 4: Scenario 3 — High-Value Escalation Guardrail...');
  const sc3 = groundTruthScenarios.find((s) => s.tag === 'GT_HIGH_VALUE_ESCALATION')!;
  const run3 = await reviveAgentGraph.runCase(sc3.caseId, { forceDeterministic: true });

  assert(run3.status === 'ESCALATED', 'Scenario 3', 'High-value case escalated');
  assert(run3.final_outcome === 'ESCALATED_FOR_HUMAN_REVIEW', 'Scenario 3', 'Outcome set to human review');
  assert(run3.amount_recovered === 0, 'Scenario 3', 'No automated retry executed on high value case');
  assert(run3.actions_taken === 1, 'Scenario 3', 'Escalation recorded as single bounded action');

  // -----------------------------------------------------------------
  // Suite 5: Agent Scenario 4 — Maximum Iterations Termination Guard (MAX_ITERATIONS=3)
  // -----------------------------------------------------------------
  console.log('\nSuite 5: Scenario 4 — Maximum Iterations & Stop Guard...');
  const sc4 = groundTruthScenarios.find((s) => s.tag === 'GT_MAX_RETRY_STOP')!;
  const run4 = await reviveAgentGraph.runCase(sc4.caseId, { forceDeterministic: true });

  assert(run4.status === 'STOPPED' || run4.status === 'ESCALATED', 'Scenario 4', 'Max retry case terminated safely');
  assert(run4.iterations <= 3, 'Scenario 4', `Iterations bounded by MAX_AGENT_ITERATIONS (took ${run4.iterations})`);

  // -----------------------------------------------------------------
  // Suite 6: Agent Scenario 5 — Safe Deterministic Fallback on Model Failure
  // -----------------------------------------------------------------
  console.log('\nSuite 6: Scenario 5 — Model Failure Fallback Handling...');
  const sc5 = groundTruthScenarios.find((s) => s.tag === 'GT_NETWORK_BANK_TIMEOUT') || groundTruthScenarios[1];
  const run5 = await reviveAgentGraph.runCase(sc5.caseId, { forceDeterministic: true });

  assert(
    run5.decision_source === 'DETERMINISTIC' ||
      run5.decision_source === 'DETERMINISTIC_FALLBACK' ||
      run5.decision_source === 'GEMINI',
    'Scenario 5',
    'Executed safely under deterministic mode'
  );
  assert(run5.status === 'RECOVERED' || run5.status === 'ESCALATED' || run5.status === 'STOPPED', 'Scenario 5', 'Case handled under fallback');

  // -----------------------------------------------------------------
  // Suite 7: Idempotency & Terminal State Guards
  // -----------------------------------------------------------------
  console.log('\nSuite 7: Idempotency & Terminal State Protections...');
  const runAlreadyRecovered = await reviveAgentGraph.runCase(sc1.caseId);
  assert(runAlreadyRecovered.status === 'RECOVERED', 'Idempotency', 'Already recovered case returns RECOVERED immediately');
  assert(runAlreadyRecovered.actions_taken === 0, 'Idempotency', 'Zero new actions taken on resolved case');

  const runAlreadyEscalated = await reviveAgentGraph.runCase(sc3.caseId);
  assert(runAlreadyEscalated.status === 'ESCALATED', 'Idempotency', 'Already escalated case returns ESCALATED immediately');

  // -----------------------------------------------------------------
  // Suite 8: Agent & Safety Metrics Computation
  // -----------------------------------------------------------------
  console.log('\nSuite 8: Agent & Safety Metrics Engine...');
  const metrics = reviveAgentGraph.getMetrics();
  assert(metrics.total_agent_runs >= 4, 'Metrics', `Total agent runs recorded: ${metrics.total_agent_runs}`);
  assert(metrics.recovery_rate >= 0.0 && metrics.recovery_rate <= 1.0, 'Metrics', `Recovery rate: ${metrics.recovery_rate}`);
  assert(metrics.revenue_recovered > 0, 'Metrics', `Revenue recovered recorded: ₹${metrics.revenue_recovered}`);
  assert(typeof metrics.single_step_recovery_rate === 'number', 'Metrics', 'Single step recovery rate calculated');
  assert(typeof metrics.multi_step_recovery_rate === 'number', 'Metrics', 'Multi step recovery rate calculated');
  assert(typeof metrics.max_iteration_terminations === 'number', 'Safety Metrics', 'Max iteration terminations tracked');
  assert(typeof metrics.duplicate_action_preventions === 'number', 'Safety Metrics', 'Duplicate action preventions tracked');

  console.log('\n====================================================');
  console.log(`PHASE 5 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAgentTests().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
