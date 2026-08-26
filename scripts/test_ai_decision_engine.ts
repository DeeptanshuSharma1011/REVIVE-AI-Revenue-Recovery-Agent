/**
 * @license
 * REVIVE — Phase 4 AI Decision Engine Test Suite
 * Validates Bounded AI Autonomy Architecture:
 * - Mock AI Provider with perfect ground truth agreement
 * - Output validation and schema enforcement
 * - Confidence thresholding and human review escalation
 * - Safe deterministic fallback on errors, malformed JSON, and missing API keys
 * - End-to-end RecoveryEngine integration with AI Strategy selection
 * - Audit logging and metadata recording
 */

import { db } from '../database/db';
import { recoveryEngine } from '../database/engine/RecoveryEngine';
import { strategyEngine } from '../database/engine/strategy';
import { aiRecoveryDecisionService, AIRecoveryDecisionService } from '../database/engine/ai/AIRecoveryDecisionService';
import { MockAIStrategyProvider } from '../database/engine/ai/MockAIStrategyProvider';
import { aiEvaluationEngine } from '../database/engine/ai/AIEvaluationEngine';
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

async function runAIEngineTests() {
  console.log('====================================================');
  console.log('REVIVE PHASE 4 — AI DECISION ENGINE TEST SUITE');
  console.log('====================================================\n');

  // Reset database & simulator state
  db.seed(42);
  resetUpdatedPaymentMethods();

  const gt = db.groundTruthMetadata;

  // -----------------------------------------------------------------
  // SUITE 1: PROMPT BUILDER & SANITIZATION
  // -----------------------------------------------------------------
  console.log('Suite 1: Prompt Context Builder & Sanitization...');
  const gt1CaseId = gt['GT_SUCCESSFUL_RETRY'].caseId;
  const context1 = recoveryEngine.getCaseContext(gt1CaseId);
  const diag1 = recoveryEngine.getCaseDiagnosis(gt1CaseId);

  const promptObj = aiRecoveryDecisionService.buildPromptContext(context1, diag1);
  assert(promptObj.case !== undefined, 'Prompt Builder', 'Case block is present');
  assert((promptObj.case as any).revenue_at_risk_inr === 2499, 'Prompt Builder', 'Revenue at risk included in INR');
  assert((promptObj.customer as any).segment === 'STANDARD', 'Prompt Builder', 'Customer segment included');
  assert((promptObj.diagnosis as any).diagnosis_code === 'TEMPORARY_PAYMENT_FAILURE', 'Prompt Builder', 'Diagnosis code mapped correctly');

  // -----------------------------------------------------------------
  // SUITE 2: OUTPUT SCHEMA VALIDATION & INTEGRITY CHECKS
  // -----------------------------------------------------------------
  console.log('\nSuite 2: Output Validation & Schema Integrity Rules...');

  // 2.1 Valid Output
  const validOutput = {
    strategy: 'RETRY_PAYMENT',
    confidence: 0.95,
    risk_level: 'LOW',
    reason: 'Temporary network glitch on high-reputation customer.',
    explanation: 'Rahul Sharma has 100% past successful payments. Dispatched payment retry.',
    suggested_parameters: { scheduled_delay_hours: 0 },
    requires_human_review: false,
    missing_information: [],
  };
  const valRes1 = aiRecoveryDecisionService.validateDecisionOutput(validOutput);
  assert(valRes1.valid === true, 'Validation', 'Valid AI decision payload accepted');
  assert(valRes1.data?.strategy === 'RETRY_PAYMENT', 'Validation', 'Strategy parsed correctly');
  assert(valRes1.data?.confidence === 0.95, 'Validation', 'Confidence score preserved');

  // 2.2 Invalid Strategy Enum
  const invalidStrategyOutput = {
    ...validOutput,
    strategy: 'ARBITRARY_UNAUTHORIZED_ACTION',
  };
  const valRes2 = aiRecoveryDecisionService.validateDecisionOutput(invalidStrategyOutput);
  assert(valRes2.valid === false, 'Validation', 'Unauthorized strategy enum rejected');
  assert(valRes2.error?.includes('Invalid or missing strategy'), 'Validation', 'Clear error message returned');

  // 2.3 Out of range confidence
  const invalidConfOutput = {
    ...validOutput,
    confidence: 1.5,
  };
  const valRes3 = aiRecoveryDecisionService.validateDecisionOutput(invalidConfOutput);
  assert(valRes3.valid === false, 'Validation', 'Confidence > 1.0 rejected');

  // 2.4 Missing reason
  const missingReasonOutput = {
    ...validOutput,
    reason: '',
  };
  const valRes4 = aiRecoveryDecisionService.validateDecisionOutput(missingReasonOutput);
  assert(valRes4.valid === false, 'Validation', 'Empty reason string rejected');

  // -----------------------------------------------------------------
  // SUITE 3: CONFIDENCE THRESHOLDING & HUMAN REVIEW ESCALATION
  // -----------------------------------------------------------------
  console.log('\nSuite 3: Confidence Thresholding & Human Review Guardrails...');
  const mockLowConfProvider = new MockAIStrategyProvider({
    mode: 'LOW_CONFIDENCE',
    customConfidence: 0.52,
  });

  const lowConfDecision = await mockLowConfProvider.selectStrategy(context1, diag1);
  assert(lowConfDecision.strategy === 'ESCALATE', 'Confidence Guardrail', 'Low confidence (<0.70) automatically converts strategy to ESCALATE');
  assert(lowConfDecision.requires_human_review === true, 'Confidence Guardrail', 'requires_human_review is set to true');
  assert(lowConfDecision.risk_level === 'HIGH', 'Confidence Guardrail', 'risk_level is escalated to HIGH');

  // -----------------------------------------------------------------
  // SUITE 4: RESILIENT DETERMINISTIC FALLBACK
  // -----------------------------------------------------------------
  console.log('\nSuite 4: Safe Deterministic Fallback on Model Failures...');

  // 4.1 Missing API Key Fallback
  const mockMissingKeyProvider = new MockAIStrategyProvider({ mode: 'MISSING_KEY' });
  const fallbackRes1 = await mockMissingKeyProvider.selectStrategy(context1, diag1);
  assert(fallbackRes1.strategy === 'RETRY_PAYMENT', 'Fallback', 'Strategy matches deterministic rule on missing key');
  assert(fallbackRes1.decision_source === 'DETERMINISTIC_FALLBACK', 'Fallback', 'decision_source is DETERMINISTIC_FALLBACK');
  assert(fallbackRes1.fallback_reason === 'GEMINI_API_KEY_NOT_CONFIGURED', 'Fallback', 'fallback_reason correctly recorded');

  // 4.2 Malformed JSON Fallback
  const mockInvalidJsonProvider = new MockAIStrategyProvider({ mode: 'INVALID_JSON' });
  const fallbackRes2 = await mockInvalidJsonProvider.selectStrategy(context1, diag1);
  assert(fallbackRes2.strategy === 'RETRY_PAYMENT', 'Fallback', 'Deterministic rule triggered on malformed JSON');
  assert(fallbackRes2.decision_source === 'DETERMINISTIC_FALLBACK', 'Fallback', 'decision_source is DETERMINISTIC_FALLBACK');
  assert(fallbackRes2.fallback_reason === 'AI_RESPONSE_JSON_MALFORMED', 'Fallback', 'fallback_reason explains JSON failure');

  // 4.3 Invalid Strategy Schema Fallback
  const mockInvalidStrategyProvider = new MockAIStrategyProvider({ mode: 'INVALID_STRATEGY' });
  const fallbackRes3 = await mockInvalidStrategyProvider.selectStrategy(context1, diag1);
  assert(fallbackRes3.strategy === 'RETRY_PAYMENT', 'Fallback', 'Deterministic rule triggered on invalid strategy');
  assert(fallbackRes3.decision_source === 'DETERMINISTIC_FALLBACK', 'Fallback', 'decision_source is DETERMINISTIC_FALLBACK');

  // 4.4 API 500 Error Fallback
  const mockApiErrorProvider = new MockAIStrategyProvider({
    mode: 'API_ERROR',
    errorMessage: 'Quota exceeded',
  });
  const fallbackRes4 = await mockApiErrorProvider.selectStrategy(context1, diag1);
  assert(fallbackRes4.strategy === 'RETRY_PAYMENT', 'Fallback', 'Deterministic rule triggered on API error');
  assert(fallbackRes4.decision_source === 'DETERMINISTIC_FALLBACK', 'Fallback', 'decision_source is DETERMINISTIC_FALLBACK');

  // -----------------------------------------------------------------
  // SUITE 5: BENCHMARK EVALUATION ACROSS ALL 6 GROUND TRUTH SCENARIOS
  // -----------------------------------------------------------------
  console.log('\nSuite 5: Benchmark Evaluation Matrix (Ground Truth vs Deterministic vs AI)...');
  const mockPerfectAI = new MockAIStrategyProvider({ mode: 'PERFECT_AGREEMENT' });

  const evalReport = await aiEvaluationEngine.evaluateGroundTruth(mockPerfectAI);
  assert(evalReport.total_scenarios >= 6, 'Benchmark Evaluation', `Evaluated ${evalReport.total_scenarios} ground-truth scenarios`);
  assert(evalReport.agreements_count === evalReport.total_scenarios, 'Benchmark Evaluation', '100% agreement on benchmark suite');
  assert(evalReport.agreement_rate_percent === 100, 'Benchmark Evaluation', 'Agreement rate is 100%');
  assert(evalReport.average_confidence >= 0.9, 'Benchmark Evaluation', 'Average confidence >= 0.90');

  // -----------------------------------------------------------------
  // SUITE 6: END-TO-END RECOVERY ENGINE INTEGRATION WITH AI PROVIDER
  // -----------------------------------------------------------------
  console.log('\nSuite 6: End-to-End Recovery Engine Integration...');

  // Reset database & simulator state
  db.seed(42);
  resetUpdatedPaymentMethods();

  // Inject Mock AI Provider into StrategyEngine and configure mode = 'ai'
  strategyEngine.setCustomProvider(mockPerfectAI);
  strategyEngine.setStrategyMode('ai');

  // Process GT_SUCCESSFUL_RETRY through Recovery Engine
  const processRes = await recoveryEngine.processCaseAsync(gt1CaseId);
  assert(processRes.status === 'RECOVERED', 'Recovery Engine E2E', 'Case successfully recovered via AI decision workflow');
  assert(processRes.amount_recovered === 2499, 'Recovery Engine E2E', 'Recovered ₹2,499');

  // Verify Audit Log metadata for AI decision
  const caseAuditLogs = auditRepository.findByCaseId(gt1CaseId);
  const strategyAuditLog = caseAuditLogs.find((l) => l.agent_step === 'strategy_selection');
  assert(strategyAuditLog !== undefined, 'Audit Trail', 'Strategy selection step recorded in audit log');
  assert(strategyAuditLog?.tool_name === 'gemini_decision_engine', 'Audit Trail', 'tool_name is gemini_decision_engine');
  assert((strategyAuditLog?.policy_result as any)?.decision_source === 'GEMINI', 'Audit Trail', 'Audit policy metadata records decision_source = GEMINI');
  assert((strategyAuditLog?.policy_result as any)?.confidence === 0.94, 'Audit Trail', 'Audit policy metadata records confidence');

  // Restore StrategyEngine
  strategyEngine.setCustomProvider(null);

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAIEngineTests().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
