/**
 * @license
 * REVIVE — Phase 7 Evaluation & Revenue Intelligence Verification Suite
 *
 * Tests the complete evaluation engine, business metrics, baseline comparison,
 * policy interventions, safety metrics, and CSV export.
 */

import { dataService } from '../database/services/dataService';
import { evaluationEngine, evaluationRepository } from '../database/engine/evaluation';
import { getPolicyConfig } from '../database/engine/policy/config';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 REVIVE PHASE 7: EVALUATION & REVENUE INTELLIGENCE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    }
  }

  // 1. Reset database to standard seed
  dataService.resetAndSeed(42, 1.0);
  const scenarios = dataService.getGroundTruthCases();
  assert(scenarios.length >= 12, `Ground Truth scenarios loaded: ${scenarios.length} (Expected: >= 12)`);

  // 2. Check scenario IDs
  const scenarioTags = scenarios.map((s) => s.tag);
  console.log('\nLoaded Ground Truth Scenarios:', scenarioTags.join(', '));
  assert(scenarioTags.includes('GT_SUCCESSFUL_RETRY'), 'Scenario 1 (GT_SUCCESSFUL_RETRY) present');
  assert(scenarioTags.includes('GT_PAYMENT_METHOD_UPDATE'), 'Scenario 2 (GT_PAYMENT_METHOD_UPDATE) present');
  assert(scenarioTags.includes('GT_HIGH_VALUE_ESCALATION'), 'Scenario 3 (GT_HIGH_VALUE_ESCALATION) present');
  assert(scenarioTags.includes('GT_CHECKOUT_ABANDONMENT'), 'Scenario 4 (GT_CHECKOUT_ABANDONMENT) present');
  assert(scenarioTags.includes('GT_OVERDUE_RELIABLE'), 'Scenario 5 (GT_OVERDUE_RELIABLE) present');
  assert(scenarioTags.includes('GT_MAX_RETRY_STOP'), 'Scenario 6 (GT_MAX_RETRY_STOP) present');
  assert(scenarioTags.includes('GT_FAILED_RETRY_THEN_RECOVERY'), 'Scenario 7 (GT_FAILED_RETRY_THEN_RECOVERY) present');
  assert(scenarioTags.includes('GT_LOW_CONFIDENCE'), 'Scenario 8 (GT_LOW_CONFIDENCE) present');
  assert(scenarioTags.includes('GT_UNRECOVERABLE'), 'Scenario 9 (GT_UNRECOVERABLE) present');
  assert(scenarioTags.includes('GT_DUPLICATE_ACTION'), 'Scenario 10 (GT_DUPLICATE_ACTION) present');
  assert(scenarioTags.includes('GT_ALREADY_RECOVERED'), 'Scenario 11 (GT_ALREADY_RECOVERED) present');
  assert(scenarioTags.includes('GT_GEMINI_FAILURE'), 'Scenario 12 (GT_GEMINI_FAILURE) present');

  // 3. Execute Evaluation Run
  console.log('\nRunning Evaluation Engine benchmark across all 12 scenarios...');
  const run = await evaluationEngine.runEvaluation({
    runName: 'Phase 7 Verification Benchmark Run',
    forceDeterministic: true,
  });

  assert(Boolean(run), 'Evaluation run returned a valid run object');
  assert(run.total_cases === scenarios.length, `Total cases evaluated: ${run.total_cases} matches scenarios count`);
  assert(run.completed_cases === run.total_cases, `Completed cases: ${run.completed_cases}`);
  assert(run.successful_recoveries > 0, `Successful recoveries: ${run.successful_recoveries}`);
  assert(run.revenue_at_risk > 0, `Total Revenue at Risk: ₹${run.revenue_at_risk.toLocaleString()}`);
  assert(run.revenue_recovered > 0, `Total Revenue Recovered: ₹${run.revenue_recovered.toLocaleString()}`);
  assert(run.recovery_rate >= 0 && run.recovery_rate <= 100, `Recovery rate is valid percentage: ${run.recovery_rate}%`);
  assert(run.revenue_recovery_rate >= 0 && run.revenue_recovery_rate <= 100, `Revenue recovery rate is valid: ${run.revenue_recovery_rate}%`);

  // 4. Validate Agentic Metrics
  assert(typeof run.multi_step_recovery_rate === 'number', `Multi-step recovery rate: ${run.multi_step_recovery_rate}%`);
  assert(typeof run.first_action_recovery_rate === 'number', `First action recovery rate: ${run.first_action_recovery_rate}%`);
  assert(typeof run.re_evaluation_recovery_rate === 'number', `Re-evaluation recovery rate: ${run.re_evaluation_recovery_rate}%`);
  assert(run.avg_actions_to_recovery > 0, `Avg actions to recovery: ${run.avg_actions_to_recovery}`);
  assert(run.avg_iterations > 0, `Avg iterations: ${run.avg_iterations}`);

  // 5. Validate AI Decision Metrics
  assert(run.ai_decisions_count > 0, `AI decisions count: ${run.ai_decisions_count}`);
  assert(run.avg_ai_confidence >= 0 && run.avg_ai_confidence <= 1, `Avg AI confidence: ${run.avg_ai_confidence}`);

  // 6. Validate Policy & Safety Metrics
  assert(run.policy_evaluations > 0, `Policy evaluations count: ${run.policy_evaluations}`);
  assert(run.guardrail_intervention_rate >= 0, `Guardrail intervention rate: ${run.guardrail_intervention_rate}%`);
  assert(run.safety_metrics.high_value_escalations > 0, `High value escalations intercepted: ${run.safety_metrics.high_value_escalations}`);
  assert(run.safety_metrics.duplicate_action_blocks >= 0, `Duplicate action blocks: ${run.safety_metrics.duplicate_action_blocks}`);

  // 7. Validate Baseline Comparison
  assert(typeof run.baseline_comparison.deterministic_recovery_rate === 'number', `Deterministic recovery rate: ${run.baseline_comparison.deterministic_recovery_rate}%`);
  assert(typeof run.baseline_comparison.revive_recovery_rate === 'number', `REVIVE recovery rate: ${run.baseline_comparison.revive_recovery_rate}%`);
  assert(typeof run.baseline_comparison.recovery_rate_lift === 'number', `Recovery rate lift: ${run.baseline_comparison.recovery_rate_lift}%`);
  assert(typeof run.baseline_comparison.revenue_recovery_lift === 'number', `Revenue recovery lift: ${run.baseline_comparison.revenue_recovery_lift}%`);

  // 8. Validate Repository Persistence
  const storedRun = evaluationRepository.findById(run.evaluation_run_id);
  assert(Boolean(storedRun), 'Evaluation run persisted and retrievable in repository');
  const summaries = evaluationRepository.findSummaries();
  assert(summaries.length >= 1, `Evaluation summaries count: ${summaries.length}`);

  // 9. Validate CSV Export
  const csv = evaluationEngine.exportRunCSV(run.evaluation_run_id);
  assert(Boolean(csv) && csv.startsWith('case_id,scenario_id'), 'CSV export generated with proper headers');
  const csvLines = csv.trim().split('\n');
  assert(csvLines.length === run.total_cases + 1, `CSV contains header + ${run.total_cases} data rows (Total: ${csvLines.length})`);

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHASE 7 EVALUATION SUITE TESTS PASSED PERFECTLY!\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
