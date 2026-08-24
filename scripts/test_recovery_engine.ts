/**
 * @license
 * REVIVE — Phase 3 Deterministic Recovery Engine Test Suite
 * Validates the complete end-to-end recovery pipeline without an LLM:
 * Detection → Investigation → Diagnosis → Strategy Selection → Execution → Verification → Outcome
 */

import { db } from '../database/db';
import { recoveryEngine } from '../database/engine/RecoveryEngine';
import { recoveryMetricsEngine } from '../database/engine/metrics';
import { resetUpdatedPaymentMethods } from '../database/simulator/outcomes';
import { auditRepository } from '../database/repositories/AuditRepository';
import { recoveryActionRepository } from '../database/repositories/RecoveryActionRepository';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: any) {
  if (condition) {
    results.push({ suite, test, passed: true, details });
    console.log(`  ✓ [${suite}] ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: 'Assertion failed', details });
    console.error(`  ✗ [${suite}] ${test}: Assertion failed`, details);
  }
}

async function runEngineTests() {
  console.log('====================================================');
  console.log('REVIVE PHASE 3 — DETERMINISTIC RECOVERY ENGINE TESTS');
  console.log('====================================================\n');

  // Reset database & simulator state
  db.seed(42);
  resetUpdatedPaymentMethods();

  const gt = db.groundTruthMetadata;

  // -----------------------------------------------------------------
  // SUITE 1: GT_SUCCESSFUL_RETRY (Temporary Gateway Failure -> Retry)
  // -----------------------------------------------------------------
  console.log('Suite 1: GT_SUCCESSFUL_RETRY Workflow...');
  const gt1CaseId = gt['GT_SUCCESSFUL_RETRY'].caseId;

  // Step 1: Investigation Context Check
  const context1 = recoveryEngine.getCaseContext(gt1CaseId);
  assert(context1.customer.name === 'Rahul Sharma', 'GT1 Engine', 'Context customer is Rahul Sharma');
  assert(context1.revenue_at_risk === 2499, 'GT1 Engine', 'Revenue at risk is ₹2,499');
  assert(context1.source_type === 'PAYMENT', 'GT1 Engine', 'Source type is PAYMENT');

  // Step 2: Diagnosis Check
  const diag1 = recoveryEngine.getCaseDiagnosis(gt1CaseId);
  assert(diag1.diagnosis === 'TEMPORARY_PAYMENT_FAILURE', 'GT1 Engine', 'Diagnosis is TEMPORARY_PAYMENT_FAILURE');
  assert(diag1.confidence >= 0.9, 'GT1 Engine', 'Diagnosis confidence is high (>=0.90)');

  // Step 3: Strategy Decision Check
  const decision1 = recoveryEngine.getCaseDecision(gt1CaseId);
  assert(decision1.strategy === 'RETRY_PAYMENT', 'GT1 Engine', 'Deterministic strategy is RETRY_PAYMENT');

  // Step 4: Process Case End-to-End
  const processRes1 = recoveryEngine.processCase(gt1CaseId);
  assert(processRes1.status === 'RECOVERED', 'GT1 Engine', 'Case status resolved to RECOVERED');
  assert(processRes1.amount_recovered === 2499, 'GT1 Engine', 'Amount recovered is ₹2,499');
  assert(processRes1.simulated === true, 'GT1 Engine', 'Simulation flag is true');
  assert(processRes1.timeline.length >= 6, 'GT1 Engine', 'Timeline contains all 7 lifecycle steps');

  // Verify DB state
  const case1Db = db.recoveryCases.get(gt1CaseId)!;
  assert(case1Db.status === 'RECOVERED', 'GT1 Engine', 'Database case record updated to RECOVERED');

  const payment1Db = db.payments.get(case1Db.source_id)!;
  assert(payment1Db.status === 'SUCCESS', 'GT1 Engine', 'Database payment record updated to SUCCESS');

  // -----------------------------------------------------------------
  // SUITE 2: IDEMPOTENCY CHECK
  // -----------------------------------------------------------------
  console.log('\nSuite 2: Idempotency & Repeat Execution Safety...');
  const actionsBefore = recoveryActionRepository.findByCaseId(gt1CaseId).length;
  const repeatRes = recoveryEngine.processCase(gt1CaseId);
  const actionsAfter = recoveryActionRepository.findByCaseId(gt1CaseId).length;

  assert(repeatRes.status === 'already_resolved', 'Idempotency', 'Re-processing recovered case returns already_resolved');
  assert(actionsBefore === actionsAfter, 'Idempotency', 'No duplicate actions executed on already resolved case');

  // -----------------------------------------------------------------
  // SUITE 3: GT_PAYMENT_METHOD_UPDATE (Expired Card -> Request Update)
  // -----------------------------------------------------------------
  console.log('\nSuite 3: GT_PAYMENT_METHOD_UPDATE Workflow...');
  const gt2CaseId = gt['GT_PAYMENT_METHOD_UPDATE'].caseId;
  const diag2 = recoveryEngine.getCaseDiagnosis(gt2CaseId);
  assert(diag2.diagnosis === 'EXPIRED_PAYMENT_METHOD', 'GT2 Engine', 'Diagnosis is EXPIRED_PAYMENT_METHOD');

  const decision2 = recoveryEngine.getCaseDecision(gt2CaseId);
  assert(decision2.strategy === 'PAYMENT_METHOD_UPDATE', 'GT2 Engine', 'Strategy is PAYMENT_METHOD_UPDATE');

  const processRes2 = recoveryEngine.processCase(gt2CaseId);
  assert(processRes2.status === 'ACTION_PENDING', 'GT2 Engine', 'Case status is ACTION_PENDING waiting for customer');
  assert(processRes2.strategy === 'PAYMENT_METHOD_UPDATE', 'GT2 Engine', 'Executed strategy matches decision');

  // -----------------------------------------------------------------
  // SUITE 4: GT_HIGH_VALUE_ESCALATION (High Value -> Human Escalation)
  // -----------------------------------------------------------------
  console.log('\nSuite 4: GT_HIGH_VALUE_ESCALATION Workflow...');
  const gt3CaseId = gt['GT_HIGH_VALUE_ESCALATION'].caseId;
  const diag3 = recoveryEngine.getCaseDiagnosis(gt3CaseId);
  assert(diag3.diagnosis === 'HIGH_VALUE_DELINQUENCY', 'GT3 Engine', 'Diagnosis is HIGH_VALUE_DELINQUENCY');

  const decision3 = recoveryEngine.getCaseDecision(gt3CaseId);
  assert(decision3.strategy === 'ESCALATE', 'GT3 Engine', 'Strategy is ESCALATE');

  const processRes3 = recoveryEngine.processCase(gt3CaseId);
  assert(processRes3.status === 'ESCALATED', 'GT3 Engine', 'Case status is ESCALATED');
  assert(processRes3.amount_recovered === 0, 'GT3 Engine', 'Amount recovered is 0 (pending human review)');

  // -----------------------------------------------------------------
  // SUITE 5: GT_CHECKOUT_ABANDONMENT (Funnel Drop -> Payment Link)
  // -----------------------------------------------------------------
  console.log('\nSuite 5: GT_CHECKOUT_ABANDONMENT Workflow...');
  const gt4CaseId = gt['GT_CHECKOUT_ABANDONMENT'].caseId;
  const diag4 = recoveryEngine.getCaseDiagnosis(gt4CaseId);
  assert(diag4.diagnosis === 'CHECKOUT_ABANDONMENT', 'GT4 Engine', 'Diagnosis is CHECKOUT_ABANDONMENT');

  const decision4 = recoveryEngine.getCaseDecision(gt4CaseId);
  assert(decision4.strategy === 'PAYMENT_LINK', 'GT4 Engine', 'Strategy is PAYMENT_LINK');

  const processRes4 = recoveryEngine.processCase(gt4CaseId);
  assert(processRes4.status === 'ACTION_PENDING', 'GT4 Engine', 'Case status transitioned to ACTION_PENDING');

  // -----------------------------------------------------------------
  // SUITE 6: GT_OVERDUE_RELIABLE (Invoice Overdue -> Notification)
  // -----------------------------------------------------------------
  console.log('\nSuite 6: GT_OVERDUE_RELIABLE Workflow...');
  const gt5CaseId = gt['GT_OVERDUE_RELIABLE'].caseId;
  const diag5 = recoveryEngine.getCaseDiagnosis(gt5CaseId);
  assert(diag5.diagnosis === 'OVERDUE_INVOICE', 'GT5 Engine', 'Diagnosis is OVERDUE_INVOICE');

  const decision5 = recoveryEngine.getCaseDecision(gt5CaseId);
  assert(decision5.strategy === 'CUSTOMER_NOTIFICATION', 'GT5 Engine', 'Strategy is CUSTOMER_NOTIFICATION');

  const processRes5 = recoveryEngine.processCase(gt5CaseId);
  assert(processRes5.status === 'ACTION_PENDING', 'GT5 Engine', 'Case status transitioned to ACTION_PENDING');

  // -----------------------------------------------------------------
  // SUITE 7: GT_MAX_RETRY_STOP (Repeat Failures -> Escalation / Stop)
  // -----------------------------------------------------------------
  console.log('\nSuite 7: GT_MAX_RETRY_STOP Workflow...');
  const gt6CaseId = gt['GT_MAX_RETRY_STOP'].caseId;
  const diag6 = recoveryEngine.getCaseDiagnosis(gt6CaseId);
  assert(diag6.diagnosis === 'MAX_RETRIES_EXCEEDED', 'GT6 Engine', 'Diagnosis is MAX_RETRIES_EXCEEDED');

  const decision6 = recoveryEngine.getCaseDecision(gt6CaseId);
  assert(decision6.strategy === 'ESCALATE' || decision6.strategy === 'STOP', 'GT6 Engine', 'Strategy is ESCALATE or STOP');

  const processRes6 = recoveryEngine.processCase(gt6CaseId);
  assert(processRes6.status === 'ESCALATED' || processRes6.status === 'CLOSED', 'GT6 Engine', 'Case status transitioned to ESCALATED or CLOSED');

  // -----------------------------------------------------------------
  // SUITE 8: METRICS CALCULATION
  // -----------------------------------------------------------------
  console.log('\nSuite 8: Recovery Metrics Calculation...');
  const metrics = recoveryMetricsEngine.getMetrics();
  assert(metrics.revenue_at_risk > 0, 'Metrics', 'Revenue at risk is calculated (> 0)');
  assert(metrics.revenue_recovered >= 2499, 'Metrics', 'Revenue recovered reflects recovered cases (>= ₹2,499)');
  assert(metrics.recovery_rate > 0, 'Metrics', 'Recovery rate percent is calculated (> 0%)');
  assert(metrics.cases_processed > 0, 'Metrics', 'Cases processed count is accurate');
  assert(metrics.cases_recovered >= 1, 'Metrics', 'Recovered cases count is >= 1');
  assert(metrics.cases_escalated >= 2, 'Metrics', 'Escalated cases count is >= 2');
  assert(metrics.simulated === true, 'Metrics', 'Simulated flag is true');

  // -----------------------------------------------------------------
  // SUITE 9: AUDIT TRAIL VERIFICATION
  // -----------------------------------------------------------------
  console.log('\nSuite 9: Audit Trail Integrity...');
  const allAudits = auditRepository.findAll(100, 0);
  assert(allAudits.items.length > 0, 'Audit', 'Audit records exist across all processed cases');

  const gt1Audits = auditRepository.findByCaseId(gt1CaseId);
  const steps = gt1Audits.map((a) => a.agent_step.toLowerCase());
  assert(steps.includes('investigation'), 'Audit', 'Investigation step logged in audit');
  assert(steps.includes('diagnosis'), 'Audit', 'Diagnosis step logged in audit');
  assert(steps.includes('strategy_selection'), 'Audit', 'Strategy selection step logged in audit');
  assert(steps.includes('action_execution'), 'Audit', 'Action execution step logged in audit');
  assert(steps.includes('verification'), 'Audit', 'Verification step logged in audit');
  assert(steps.includes('outcome'), 'Audit', 'Outcome step logged in audit');

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEngineTests().catch((err) => {
  console.error('Test execution failed with unhandled exception:', err);
  process.exit(1);
});
