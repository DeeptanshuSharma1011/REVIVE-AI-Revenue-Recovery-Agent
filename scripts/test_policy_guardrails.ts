/**
 * @license
 * REVIVE — Phase 6 Policy Engine & Guardrails Verification Suite
 * Tests deterministic safety rules, threshold interventions, and LangGraph integration.
 */

import { policyEngine } from '../database/engine/policy/PolicyEngine';
import { getPolicyConfig } from '../database/engine/policy/config';
import { dataService } from '../database/services/dataService';
import { reviveAgentGraph } from '../database/engine/agent/graph';
import { recoveryEngine } from '../database/engine/RecoveryEngine';
import { recoveryCaseRepository } from '../database/repositories/RecoveryCaseRepository';
import { InvestigationContext, DiagnosisResult } from '../database/engine/types';
import { Payment } from '../database/schema';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${testName}`);
    if (details) console.error(`    \x1b[33m${details}\x1b[0m`);
    failed++;
  }
}

async function runPolicyTests() {
  console.log('\n======================================================');
  console.log('🛡️  REVIVE PHASE 6: POLICY ENGINE & GUARDRAILS TEST SUITE');
  console.log('======================================================\n');

  // Reset & seed test database
  dataService.resetAndSeed(42, 1.0);
  policyEngine.resetHistory();
  const config = getPolicyConfig();

  // Test 1: Configuration values
  console.log('1. Policy Configuration & Constants');
  assert(config.MAX_PAYMENT_RETRIES === 2, 'Default MAX_PAYMENT_RETRIES is 2');
  assert(config.MAX_ACTIONS_PER_CASE === 3, 'Default MAX_ACTIONS_PER_CASE is 3');
  assert(config.HIGH_VALUE_THRESHOLD === 25000, 'Default HIGH_VALUE_THRESHOLD is 25000');
  assert(config.AI_CONFIDENCE_THRESHOLD === 0.70, 'Default AI_CONFIDENCE_THRESHOLD is 0.70');
  assert(config.MAX_CUSTOMER_CONTACTS === 2, 'Default MAX_CUSTOMER_CONTACTS is 2');
  assert(config.POLICY_VERSION === 'REVIVE_POLICY_V1', 'Default POLICY_VERSION is REVIVE_POLICY_V1');

  // Retrieve an open test case and its investigation context
  const cases = recoveryCaseRepository.findAll().items;
  const initialCase = cases.find((c) => c.status === 'OPEN' && c.source_type === 'PAYMENT') || cases[0];
  const baseContext = recoveryEngine.getCaseContext(initialCase.case_id)!;

  // Test 2: Standard Safe Transaction -> ALLOW
  console.log('\n2. Rule: Default Safe Action (ALLOW)');
  const safeContext: InvestigationContext = {
    ...baseContext,
    revenue_at_risk: 4500,
    case: {
      ...baseContext.case,
      revenue_at_risk: 4500,
      status: 'OPEN',
    },
    source: {
      ...(baseContext.source as Payment),
      amount: 4500,
      status: 'FAILED',
      failure_reason: 'temporary_failure',
      attempt_number: 1,
    },
  };

  const safeDiagnosis: DiagnosisResult = {
    diagnosis: 'TEMPORARY_PAYMENT_FAILURE',
    confidence: 0.95,
    summary: 'Temporary outage resolved',
    details: { root_cause: 'Network bank timeout' },
  };

  const safeResult = policyEngine.evaluate(
    safeContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.95, reason: 'Safe payment retry' },
    safeDiagnosis
  );

  assert(safeResult.decision === 'ALLOW', 'Safe transaction approved with ALLOW decision');
  assert(safeResult.approved_strategy === 'RETRY_PAYMENT', 'Approved strategy matches proposed strategy');
  assert(safeResult.rules_triggered.includes('DEFAULT_ALLOW'), 'Rule triggered is DEFAULT_ALLOW');
  assert(!safeResult.requires_human_review, 'No human review required for safe action');

  // Test 3: High-Value Transaction (> ₹25,000) -> ESCALATE
  console.log('\n3. Rule: High-Value Financial Safety (> ₹25,000)');
  const highValueContext: InvestigationContext = {
    ...safeContext,
    revenue_at_risk: 45000,
    case: { ...safeContext.case, revenue_at_risk: 45000 },
  };

  const highValResult = policyEngine.evaluate(
    highValueContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.95, reason: 'High value attempt' },
    safeDiagnosis
  );

  assert(highValResult.decision === 'ESCALATE', 'Transactions > ₹25,000 trigger ESCALATE decision');
  assert(highValResult.approved_strategy === 'ESCALATE', 'Approved strategy redirected to ESCALATE');
  assert(highValResult.rules_triggered.includes('HIGH_VALUE_TRANSACTION'), 'Rule triggered is HIGH_VALUE_TRANSACTION');
  assert(highValResult.requires_human_review === true, 'High-value transaction sets requires_human_review = true');

  // Test 4: Low AI Confidence (< 0.70) -> ESCALATE
  console.log('\n4. Rule: Low AI Confidence Gate (< 0.70)');
  const lowConfResult = policyEngine.evaluate(
    safeContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.52, reason: 'Uncertain Gemini recommendation' },
    safeDiagnosis
  );

  assert(lowConfResult.decision === 'ESCALATE', 'Low confidence (< 70%) triggers ESCALATE decision');
  assert(lowConfResult.rules_triggered.includes('LOW_AI_CONFIDENCE'), 'Rule triggered is LOW_AI_CONFIDENCE');
  assert(lowConfResult.requires_human_review === true, 'Low confidence requires human supervisor review');

  // Test 5: Max Payment Retries Reached -> MODIFY to SCHEDULE_RETRY
  console.log('\n5. Rule: Max Immediate Retries (2 Retries Reached)');
  const maxRetryContext: InvestigationContext = {
    ...safeContext,
    source: { ...(safeContext.source as Payment), attempt_number: 2 },
  };

  const maxRetryResult = policyEngine.evaluate(
    maxRetryContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.95, reason: 'Third retry attempt' },
    safeDiagnosis
  );

  assert(maxRetryResult.decision === 'MODIFY', 'Max retries triggers MODIFY decision');
  assert(maxRetryResult.approved_strategy === 'SCHEDULE_RETRY', 'Strategy modified from RETRY_PAYMENT to SCHEDULE_RETRY');
  assert(maxRetryResult.rules_triggered.includes('MAX_RETRIES_EXCEEDED'), 'Rule triggered is MAX_RETRIES_EXCEEDED');

  // Test 6: Duplicate Action Loop Prevention -> MODIFY or BLOCK
  console.log('\n6. Rule: Duplicate Action Loop Prevention');
  const duplicateResult = policyEngine.evaluate(
    safeContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.90, reason: 'Repeating retry' },
    safeDiagnosis,
    [
      {
        iteration: 1,
        action: 'RETRY_PAYMENT',
        tool_name: 'retry_payment',
        input: {},
        output: { status: 'FAILED' },
        status: 'FAILED',
        executed_at: new Date().toISOString(),
      },
    ]
  );

  assert(
    duplicateResult.decision === 'MODIFY' && duplicateResult.approved_strategy === 'SCHEDULE_RETRY',
    'Consecutive failed immediate retry modified to SCHEDULE_RETRY'
  );
  assert(duplicateResult.rules_triggered.includes('DUPLICATE_ACTION'), 'Rule triggered is DUPLICATE_ACTION');

  // Test 7: Terminal State Checks
  console.log('\n7. Rule: Terminal Case & Payment States');
  const recoveredContext: InvestigationContext = {
    ...safeContext,
    case: { ...safeContext.case, status: 'RECOVERED' },
  };
  const termResult = policyEngine.evaluate(
    recoveredContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.9 },
    safeDiagnosis
  );
  assert(termResult.decision === 'STOP', 'Already recovered case triggers STOP');
  assert(termResult.rules_triggered.includes('CASE_ALREADY_RECOVERED'), 'Triggered CASE_ALREADY_RECOVERED');

  const successPaymentContext: InvestigationContext = {
    ...safeContext,
    source: { ...(safeContext.source as Payment), status: 'SUCCESS' },
  };
  const paySuccessResult = policyEngine.evaluate(
    successPaymentContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.9 },
    safeDiagnosis
  );
  assert(paySuccessResult.decision === 'STOP', 'Already successful payment triggers STOP');
  assert(paySuccessResult.rules_triggered.includes('PAYMENT_ALREADY_SUCCESSFUL'), 'Triggered PAYMENT_ALREADY_SUCCESSFUL');

  // Test 8: Invalid Strategy Rejection -> BLOCK
  console.log('\n8. Rule: Invalid Strategy Rejection');
  const invalidResult = policyEngine.evaluate(
    safeContext,
    { strategy: 'ARBITRARY_UNSUPPORTED_ACTION', confidence: 0.95 },
    safeDiagnosis
  );
  assert(invalidResult.decision === 'BLOCK', 'Unsupported strategy triggers BLOCK');
  assert(invalidResult.rules_triggered.includes('INVALID_STRATEGY'), 'Triggered INVALID_STRATEGY');

  // Test 9: Diagnosis-Strategy Incompatibility -> BLOCK
  console.log('\n9. Rule: Incompatible Diagnosis & Action Matrix');
  const expiredDiagnosis: DiagnosisResult = {
    diagnosis: 'EXPIRED_PAYMENT_METHOD',
    confidence: 0.95,
    summary: 'Card expiration date reached',
    details: { root_cause: 'Card expired' },
  };
  const incompatibleResult = policyEngine.evaluate(
    safeContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.95 },
    expiredDiagnosis
  );
  assert(incompatibleResult.decision === 'BLOCK', 'Retrying expired card triggers BLOCK');
  assert(incompatibleResult.rules_triggered.includes('INCOMPATIBLE_ACTION'), 'Triggered INCOMPATIBLE_ACTION');

  // Test 10: Missing Required Data -> BLOCK
  console.log('\n10. Rule: Missing Required Data Guard');
  const emptyContext: InvestigationContext = {
    ...safeContext,
    case: { ...safeContext.case, revenue_at_risk: 0 },
    revenue_at_risk: 0,
  };
  const missingDataResult = policyEngine.evaluate(
    emptyContext,
    { strategy: 'RETRY_PAYMENT', confidence: 0.9 },
    safeDiagnosis
  );
  assert(missingDataResult.decision === 'BLOCK', 'Missing revenue amount triggers BLOCK');
  assert(missingDataResult.rules_triggered.includes('MISSING_REQUIRED_DATA'), 'Triggered MISSING_REQUIRED_DATA');

  // Test 11: Policy Explanation Card Generation
  console.log('\n11. Explanation Card Formatting (WHY REVIVE DID THIS)');
  const card = policyEngine.generateExplanationCard(
    { strategy: 'RETRY_PAYMENT' },
    maxRetryResult
  );
  assert(card.title === 'WHY REVIVE DID THIS', 'Explanation card title matches specification');
  assert(card.ai_recommended.includes('Retry Payment'), 'AI recommended shows formatted strategy name');
  assert(card.revive_policy.includes('Schedule Retry'), 'Revive policy highlights modified action');
  assert(card.result.includes('Modified'), 'Result details modification reason');

  // Test 12: Real LangGraph Multi-Step Integration with Policy Engine
  console.log('\n12. LangGraph Agent + Policy Engine End-to-End Integration');
  const testCase = cases.find((c) => c.status === 'OPEN') || cases[0];

  const runResult = await reviveAgentGraph.runCase(testCase.case_id, { forceDeterministic: true });
  assert(Boolean(runResult.agent_run_id), 'Agent run produced valid agent_run_id');
  assert(Boolean(runResult.policy_result), 'Agent run contains policy_result');
  assert(Boolean(runResult.policy_explanation_card), 'Agent run contains policy_explanation_card');
  assert(Boolean(runResult.timeline.find((t) => t.node === 'POLICY_ENGINE')), 'Timeline contains POLICY_ENGINE node event');

  // Test 13: Policy Metrics Calculation
  console.log('\n13. Real-time Policy & Safety Metrics');
  const metrics = policyEngine.getMetrics();
  assert(metrics.policy_evaluations > 0, 'policy_evaluations count is greater than zero');
  assert(typeof metrics.autonomous_action_rate === 'number', 'autonomous_action_rate is calculated');
  assert(typeof metrics.guardrail_intervention_rate === 'number', 'guardrail_intervention_rate is calculated');
  assert(metrics.policy_modified > 0 || metrics.policy_escalated > 0 || metrics.policy_allowed > 0, 'Records policy decisions correctly');

  // Summary
  console.log('\n======================================================');
  console.log(`RESULTS: \x1b[32m${passed} Passed\x1b[0m, \x1b[31m${failed} Failed\x1b[0m`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPolicyTests().catch((err) => {
  console.error('Fatal error during policy test run:', err);
  process.exit(1);
});
