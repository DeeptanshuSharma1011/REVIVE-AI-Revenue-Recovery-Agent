/**
 * @license
 * REVIVE — Evaluation Engine & Revenue Intelligence Layer
 * Phase 7 — Evaluation & Revenue Intelligence
 *
 * Runs repeatable ground-truth and batch evaluations across both the
 * Deterministic Recovery Baseline and the LangGraph Multi-Step REVIVE Agent.
 * Computes business metrics, agentic behavior, policy interventions, and safety metrics.
 */

import { randomUUID } from 'crypto';
import { dataService } from '../../services/dataService';
import { recoveryEngine } from '../RecoveryEngine';
import { reviveAgentGraph } from '../agent/graph';
import { policyEngine } from '../policy/PolicyEngine';
import { getPolicyConfig } from '../policy/config';
import {
  EvaluationRun,
  EvaluationCaseResult,
  EvaluationScenarioSummary,
  BaselineComparison,
} from '../types';
import { evaluationRepository } from './EvaluationRepository';

export interface EvaluationOptions {
  runName?: string;
  forceDeterministic?: boolean;
  scenarioTags?: string[];
}

export class EvaluationEngine {
  private static readonly AGENT_VERSION = 'REVIVE_AGENT_V2_LANGGRAPH';
  private static readonly PROMPT_VERSION = 'REVIVE_PROMPT_V3';

  /**
   * Executes the full evaluation suite comparing Deterministic Baseline vs. REVIVE Multi-Step Agent.
   */
  public async runEvaluation(options: EvaluationOptions = {}): Promise<EvaluationRun> {
    const startedAt = new Date().toISOString();
    const policyConfig = getPolicyConfig();
    const runId = `EVAL_RUN_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${randomUUID().slice(0, 8)}`;
    const runName = options.runName || `REVIVE Comprehensive Benchmark — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

    // 1. Fetch ground truth scenarios
    const allScenarios = dataService.getGroundTruthCases();
    const scenariosToRun = options.scenarioTags && options.scenarioTags.length > 0
      ? allScenarios.filter((sc) => options.scenarioTags!.includes(sc.tag))
      : allScenarios;

    const caseResults: EvaluationCaseResult[] = [];
    let deterministicTotalRecoveredRev = 0;
    let deterministicTotalRecoveredCases = 0;
    let deterministicTotalActions = 0;
    let deterministicTotalEscalations = 0;

    let reviveTotalRecoveredRev = 0;
    let reviveTotalRecoveredCases = 0;
    let reviveTotalActions = 0;
    let reviveTotalEscalations = 0;
    let reviveTotalStopped = 0;
    let reviveTotalFailed = 0;
    let totalIterations = 0;
    let multiStepRecoveriesCount = 0;
    let firstActionRecoveriesCount = 0;
    let reevaluationRecoveriesCount = 0;
    let totalAiConfidence = 0;
    let totalAiDecisions = 0;
    let lowConfidenceAiCount = 0;
    let aiFallbackCount = 0;

    let totalPolicyEvaluations = 0;
    let policyAllowedCount = 0;
    let policyModifiedCount = 0;
    let policyBlockedCount = 0;
    let policyEscalatedCount = 0;
    let policyStoppedCount = 0;

    const safetyMetrics = {
      duplicate_action_blocks: 0,
      max_retry_blocks: 0,
      max_action_terminations: 0,
      low_confidence_escalations: 0,
      high_value_escalations: 0,
      invalid_strategy_blocks: 0,
      incompatible_action_blocks: 0,
      missing_data_blocks: 0,
      customer_contact_limit_interventions: 0,
      recovery_window_interventions: 0,
    };

    let totalRevenueAtRisk = 0;

    // 2. Iterate through each evaluation scenario
    for (const sc of scenariosToRun) {
      const caseId = sc.caseId;
      const caseDetails = sc.caseDetails;
      if (!caseDetails || !caseDetails.case) continue;

      const revenueAtRisk = caseDetails.case.revenue_at_risk || 0;
      totalRevenueAtRisk += revenueAtRisk;
      const customerName = caseDetails.customer?.name || 'Unknown Customer';
      const sourceType = caseDetails.case.source_type;

      // -------------------------------------------------------------
      // RUN 1: DETERMINISTIC BASELINE (Isolated Execution)
      // -------------------------------------------------------------
      let detOutcome = {
        status: 'OPEN',
        strategy: 'NONE',
        revenue_recovered: 0,
        actions_count: 0,
        recovery_success: false,
      };

      try {
        const detResult = recoveryEngine.processCase(caseId, { strategyMode: 'deterministic' });
        const isDetSuccess = detResult.status === 'RECOVERED' || detResult.status === 'already_resolved';
        // Strict revenue attribution: only verified successful recovery gets the revenue
        const detRevRecovered = isDetSuccess ? (detResult.amount_recovered || revenueAtRisk) : 0;

        detOutcome = {
          status: detResult.status,
          strategy: detResult.strategy,
          revenue_recovered: detRevRecovered,
          actions_count: detResult.actions_taken || (detResult.status === 'already_resolved' ? 0 : 1),
          recovery_success: isDetSuccess,
        };

        if (isDetSuccess) {
          deterministicTotalRecoveredCases++;
          deterministicTotalRecoveredRev += detRevRecovered;
        }
        if (detResult.status === 'ESCALATED') {
          deterministicTotalEscalations++;
        }
        deterministicTotalActions += detOutcome.actions_count;
      } catch (err) {
        console.warn(`Deterministic baseline error for case ${caseId}:`, err);
      }

      // -------------------------------------------------------------
      // RUN 2: REVIVE MULTI-STEP AGENT (With Policy Engine & Graph)
      // -------------------------------------------------------------
      const caseStartTime = Date.now();
      let agentOutcome = {
        status: 'OPEN',
        strategy: 'NONE',
        revenue_recovered: 0,
        actions_count: 0,
        recovery_success: false,
        re_evaluation_recovery: false,
        policy_decision: 'ALLOW',
      };

      let agentRunId = `REVIVE_EVAL_${Date.now()}`;
      let iterations = 1;
      let policyInterventions = 0;
      let humanIntervention = false;
      let aiConfidence = 0.95;

      try {
        const agentResult = await reviveAgentGraph.runCase(caseId, {
          forceDeterministic: options.forceDeterministic ?? false,
        });

        agentRunId = agentResult.agent_run_id;
        iterations = agentResult.iterations || 1;
        totalIterations += iterations;
        const isAgentSuccess = agentResult.status === 'RECOVERED';
        
        // Strict revenue attribution
        const agentRevRecovered = isAgentSuccess ? (agentResult.amount_recovered || revenueAtRisk) : 0;
        const actionsTakenCount = agentResult.actions_taken || 0;
        reviveTotalActions += actionsTakenCount;

        if (isAgentSuccess) {
          reviveTotalRecoveredCases++;
          reviveTotalRecoveredRev += agentRevRecovered;

          if (actionsTakenCount > 1) {
            multiStepRecoveriesCount++;
          } else {
            firstActionRecoveriesCount++;
          }
        } else if (agentResult.status === 'ESCALATED') {
          reviveTotalEscalations++;
        } else if (agentResult.status === 'STOPPED') {
          reviveTotalStopped++;
        } else {
          reviveTotalFailed++;
        }

        // Re-evaluation recovery check: multi-iteration or multi-action recovery after initial non-terminal state
        const hadReevaluation = Boolean(
          isAgentSuccess &&
          (iterations > 1 || actionsTakenCount > 1 || agentResult.timeline.some((t) => t.node === 'RE_EVALUATE'))
        );
        if (hadReevaluation) {
          reevaluationRecoveriesCount++;
        }

        // AI decision tracking
        totalAiDecisions++;
        aiConfidence = agentResult.confidence || 0.9;
        totalAiConfidence += aiConfidence;
        if (aiConfidence < policyConfig.AI_CONFIDENCE_THRESHOLD) {
          lowConfidenceAiCount++;
        }
        if (agentResult.decision_source === 'DETERMINISTIC_FALLBACK') {
          aiFallbackCount++;
        }

        // Policy engine analysis from run
        if (agentResult.policy_result) {
          totalPolicyEvaluations++;
          const polDec = agentResult.policy_result.decision;
          if (polDec === 'ALLOW') policyAllowedCount++;
          else if (polDec === 'MODIFY') policyModifiedCount++;
          else if (polDec === 'BLOCK') policyBlockedCount++;
          else if (polDec === 'ESCALATE') policyEscalatedCount++;
          else if (polDec === 'STOP') policyStoppedCount++;

          if (polDec !== 'ALLOW') {
            policyInterventions++;
          }

          for (const rule of agentResult.policy_result.rules_triggered || []) {
            if (rule === 'DUPLICATE_ACTION') safetyMetrics.duplicate_action_blocks++;
            if (rule === 'MAX_RETRIES_EXCEEDED') safetyMetrics.max_retry_blocks++;
            if (rule === 'MAX_ACTIONS_EXCEEDED') safetyMetrics.max_action_terminations++;
            if (rule === 'LOW_AI_CONFIDENCE') safetyMetrics.low_confidence_escalations++;
            if (rule === 'HIGH_VALUE_TRANSACTION') safetyMetrics.high_value_escalations++;
            if (rule === 'INVALID_STRATEGY') safetyMetrics.invalid_strategy_blocks++;
            if (rule === 'INCOMPATIBLE_ACTION') safetyMetrics.incompatible_action_blocks++;
            if (rule === 'MISSING_REQUIRED_DATA') safetyMetrics.missing_data_blocks++;
            if (rule === 'CONTACT_LIMIT_EXCEEDED') safetyMetrics.customer_contact_limit_interventions++;
            if (rule === 'RECOVERY_WINDOW_EXCEEDED') safetyMetrics.recovery_window_interventions++;
          }
        }

        humanIntervention = agentResult.status === 'ESCALATED' || agentResult.policy_result?.requires_human_review === true;

        agentOutcome = {
          status: agentResult.status,
          strategy: agentResult.approved_strategy || agentResult.original_strategy || 'NONE',
          revenue_recovered: agentRevRecovered,
          actions_count: actionsTakenCount,
          recovery_success: isAgentSuccess,
          re_evaluation_recovery: hadReevaluation,
          policy_decision: agentResult.policy_result?.decision || 'ALLOW',
        };
      } catch (err) {
        console.warn(`REVIVE agent run error for case ${caseId}:`, err);
        reviveTotalFailed++;
      }

      const caseDuration = Date.now() - caseStartTime;

      caseResults.push({
        case_id: caseId,
        agent_run_id: agentRunId,
        scenario_id: sc.tag,
        customer_name: customerName,
        source_type: sourceType,
        revenue_at_risk: revenueAtRisk,
        revenue_recovered: agentOutcome.revenue_recovered,
        final_status: agentOutcome.status,
        recovery_success: agentOutcome.recovery_success,
        actions_taken: agentOutcome.actions_count,
        iterations,
        time_to_resolution_ms: caseDuration,
        human_intervention: humanIntervention,
        policy_interventions: policyInterventions,
        ai_decisions: 1,
        ai_confidence_average: aiConfidence,
        deterministic_outcome: detOutcome,
        agent_outcome: agentOutcome,
        evaluation_timestamp: new Date().toISOString(),
      });
    }

    const totalCases = caseResults.length;
    const completedCases = totalCases;
    const successfulRecoveries = reviveTotalRecoveredCases;
    const completedAt = new Date().toISOString();

    // -------------------------------------------------------------
    // 3. PRIMARY BUSINESS METRICS CALCULATION
    // -------------------------------------------------------------
    const revenueAtRisk = totalRevenueAtRisk;
    const revenueRecovered = reviveTotalRecoveredRev;
    const revenueRemainingAtRisk = Math.max(0, revenueAtRisk - revenueRecovered);

    const recoveryRate = totalCases > 0
      ? Number(((successfulRecoveries / totalCases) * 100).toFixed(1))
      : 0;

    const revenueRecoveryRate = revenueAtRisk > 0
      ? Number(((revenueRecovered / revenueAtRisk) * 100).toFixed(1))
      : 0;

    // -------------------------------------------------------------
    // 4. AGENTIC METRICS CALCULATION
    // -------------------------------------------------------------
    const multiStepRecoveryRate = successfulRecoveries > 0
      ? Number(((multiStepRecoveriesCount / successfulRecoveries) * 100).toFixed(1))
      : 0;

    const firstActionRecoveryRate = successfulRecoveries > 0
      ? Number(((firstActionRecoveriesCount / successfulRecoveries) * 100).toFixed(1))
      : 0;

    const reEvaluationRecoveryRate = successfulRecoveries > 0
      ? Number(((reevaluationRecoveriesCount / successfulRecoveries) * 100).toFixed(1))
      : 0;

    const avgActionsToRecovery = successfulRecoveries > 0
      ? Number((reviveTotalActions / successfulRecoveries).toFixed(2))
      : 0;

    const avgIterations = totalCases > 0
      ? Number((totalIterations / totalCases).toFixed(2))
      : 0;

    // -------------------------------------------------------------
    // 5. AI DECISION METRICS CALCULATION
    // -------------------------------------------------------------
    const avgAiConfidence = totalAiDecisions > 0
      ? Number((totalAiConfidence / totalAiDecisions).toFixed(2))
      : 0.90;

    const lowConfidenceRate = totalAiDecisions > 0
      ? Number(((lowConfidenceAiCount / totalAiDecisions) * 100).toFixed(1))
      : 0;

    const aiFallbackRate = totalAiDecisions > 0
      ? Number(((aiFallbackCount / totalAiDecisions) * 100).toFixed(1))
      : 0;

    // -------------------------------------------------------------
    // 6. POLICY & SAFETY METRICS CALCULATION
    // -------------------------------------------------------------
    const effectivePolicyEvals = Math.max(totalPolicyEvaluations, 1);
    const nonAllowedDecisions = policyModifiedCount + policyBlockedCount + policyEscalatedCount + policyStoppedCount;
    
    const guardrailInterventionRate = totalPolicyEvaluations > 0
      ? Number(((nonAllowedDecisions / totalPolicyEvaluations) * 100).toFixed(1))
      : 0;

    const policyModificationRate = totalPolicyEvaluations > 0
      ? Number(((policyModifiedCount / totalPolicyEvaluations) * 100).toFixed(1))
      : 0;

    const policyBlockRate = totalPolicyEvaluations > 0
      ? Number(((policyBlockedCount / totalPolicyEvaluations) * 100).toFixed(1))
      : 0;

    const highValueEscalationRate = totalPolicyEvaluations > 0
      ? Number(((safetyMetrics.high_value_escalations / totalPolicyEvaluations) * 100).toFixed(1))
      : 0;

    // -------------------------------------------------------------
    // 7. DETERMINISTIC BASELINE COMPARISON
    // -------------------------------------------------------------
    const detRecoveryRate = totalCases > 0
      ? Number(((deterministicTotalRecoveredCases / totalCases) * 100).toFixed(1))
      : 0;

    const detRevRecoveryRate = revenueAtRisk > 0
      ? Number(((deterministicTotalRecoveredRev / revenueAtRisk) * 100).toFixed(1))
      : 0;

    const recoveryRateLift = Number((recoveryRate - detRecoveryRate).toFixed(1));
    const revenueRecoveryLift = Number((revenueRecoveryRate - detRevRecoveryRate).toFixed(1));
    
    const relativeImprovement = detRecoveryRate > 0
      ? Number((((recoveryRate - detRecoveryRate) / detRecoveryRate) * 100).toFixed(1))
      : 0;

    const avgActionsDeterministic = deterministicTotalRecoveredCases > 0
      ? Number((deterministicTotalActions / deterministicTotalRecoveredCases).toFixed(2))
      : Number((deterministicTotalActions / Math.max(totalCases, 1)).toFixed(2));

    const avgActionsRevive = successfulRecoveries > 0
      ? Number((reviveTotalActions / successfulRecoveries).toFixed(2))
      : Number((reviveTotalActions / Math.max(totalCases, 1)).toFixed(2));

    const baselineComparison: BaselineComparison = {
      deterministic_recovery_rate: detRecoveryRate,
      revive_recovery_rate: recoveryRate,
      deterministic_revenue_recovery_rate: detRevRecoveryRate,
      revive_revenue_recovery_rate: revenueRecoveryRate,
      deterministic_revenue_recovered: deterministicTotalRecoveredRev,
      revive_revenue_recovered: revenueRecovered,
      recovery_rate_lift: recoveryRateLift,
      revenue_recovery_lift: revenueRecoveryLift,
      relative_recovery_improvement: relativeImprovement,
      avg_actions_deterministic: avgActionsDeterministic,
      avg_actions_revive: avgActionsRevive,
      escalation_rate_deterministic: totalCases > 0 ? Number(((deterministicTotalEscalations / totalCases) * 100).toFixed(1)) : 0,
      escalation_rate_revive: totalCases > 0 ? Number(((reviveTotalEscalations / totalCases) * 100).toFixed(1)) : 0,
    };

    // -------------------------------------------------------------
    // 8. OPERATIONAL EFFICIENCY METRICS
    // -------------------------------------------------------------
    const recoveredCasesCount = Math.max(successfulRecoveries, 1);
    const operationalEfficiency = {
      gemini_calls_per_recovered_case: Number((totalAiDecisions / recoveredCasesCount).toFixed(2)),
      actions_per_recovered_case: Number((reviveTotalActions / recoveredCasesCount).toFixed(2)),
      policy_evaluations_per_recovered_case: Number((totalPolicyEvaluations / recoveredCasesCount).toFixed(2)),
      verification_calls_per_recovered_case: Number((reviveTotalActions / recoveredCasesCount).toFixed(2)),
    };

    // -------------------------------------------------------------
    // 9. SCENARIO PERFORMANCE BREAKDOWN
    // -------------------------------------------------------------
    const scenarioPerformance: EvaluationScenarioSummary[] = scenariosToRun.map((sc) => {
      const caseItem = caseResults.find((c) => c.scenario_id === sc.tag);
      const isRecovered = caseItem?.recovery_success ?? false;
      const isDetRecovered = caseItem?.deterministic_outcome.recovery_success ?? false;
      const scAtRisk = caseItem?.revenue_at_risk ?? 0;
      const scRecovered = caseItem?.revenue_recovered ?? 0;

      let category = 'GENERAL';
      if (sc.tag.includes('RETRY')) category = 'PAYMENT_FAILURE';
      else if (sc.tag.includes('PAYMENT_METHOD') || sc.tag.includes('EXPIRED')) category = 'METHOD_EXPIRY';
      else if (sc.tag.includes('CHECKOUT')) category = 'ABANDONMENT';
      else if (sc.tag.includes('INVOICE') || sc.tag.includes('OVERDUE')) category = 'OVERDUE_INVOICE';
      else if (sc.tag.includes('HIGH_VALUE') || sc.tag.includes('ESCALAT')) category = 'HIGH_VALUE';
      else if (sc.tag.includes('UNRECOVERABLE') || sc.tag.includes('STOP')) category = 'UNRECOVERABLE';
      else if (sc.tag.includes('CONFIDENCE')) category = 'UNCERTAINTY';
      else if (sc.tag.includes('DUPLICATE')) category = 'LOOP_PROTECTION';

      const scRecRate = isRecovered ? 100 : 0;
      const scDetRecRate = isDetRecovered ? 100 : 0;

      return {
        scenario_id: sc.tag,
        scenario_name: sc.tag.replace(/_/g, ' ').replace('GT ', ''),
        category,
        description: sc.description,
        total_cases: 1,
        recovered_cases: isRecovered ? 1 : 0,
        recovery_rate: scRecRate,
        revenue_at_risk: scAtRisk,
        revenue_recovered: scRecovered,
        revenue_recovery_rate: scAtRisk > 0 ? Number(((scRecovered / scAtRisk) * 100).toFixed(1)) : 0,
        avg_actions: caseItem?.actions_taken ?? 0,
        escalation_rate: caseItem?.final_status === 'ESCALATED' ? 100 : 0,
        deterministic_recovery_rate: scDetRecRate,
        lift: Number((scRecRate - scDetRecRate).toFixed(1)),
      };
    });

    // -------------------------------------------------------------
    // 10. CONSTRUCT FULL EVALUATION RUN RESULT
    // -------------------------------------------------------------
    const evaluationRun: EvaluationRun = {
      evaluation_run_id: runId,
      run_name: runName,
      started_at: startedAt,
      completed_at: completedAt,
      agent_version: EvaluationEngine.AGENT_VERSION,
      policy_version: policyConfig.POLICY_VERSION,
      prompt_version: EvaluationEngine.PROMPT_VERSION,
      total_cases: totalCases,
      completed_cases: completedCases,
      successful_recoveries: successfulRecoveries,
      escalated_cases: reviveTotalEscalations,
      stopped_cases: reviveTotalStopped,
      failed_cases: reviveTotalFailed,

      // Primary Business Metrics
      revenue_at_risk: revenueAtRisk,
      revenue_recovered: revenueRecovered,
      revenue_remaining_at_risk: revenueRemainingAtRisk,
      recovery_rate: recoveryRate,
      revenue_recovery_rate: revenueRecoveryRate,

      // Agentic Metrics
      multi_step_recovery_rate: multiStepRecoveryRate,
      first_action_recovery_rate: firstActionRecoveryRate,
      re_evaluation_recovery_rate: reEvaluationRecoveryRate,
      avg_actions_to_recovery: avgActionsToRecovery,
      avg_iterations: avgIterations,
      recovery_after_reevaluation_count: reevaluationRecoveriesCount,

      // AI Decision Metrics
      ai_decisions_count: totalAiDecisions,
      avg_ai_confidence: avgAiConfidence,
      low_confidence_rate: lowConfidenceRate,
      ai_fallback_rate: aiFallbackRate,

      // Policy Metrics
      policy_evaluations: totalPolicyEvaluations,
      policy_allowed: policyAllowedCount,
      policy_modified: policyModifiedCount,
      policy_blocked: policyBlockedCount,
      policy_escalated: policyEscalatedCount,
      policy_stopped: policyStoppedCount,
      guardrail_intervention_rate: guardrailInterventionRate,
      policy_modification_rate: policyModificationRate,
      policy_block_rate: policyBlockRate,
      high_value_escalation_rate: highValueEscalationRate,

      // Safety Metrics Breakdown
      safety_metrics: safetyMetrics,

      // Baseline Comparison
      baseline_comparison: baselineComparison,

      // Operational Efficiency
      operational_efficiency: operationalEfficiency,

      // Details
      scenario_performance: scenarioPerformance,
      cases: caseResults,
      simulated: true,
    };

    evaluationRepository.save(evaluationRun);
    return evaluationRun;
  }

  /**
   * Generates a clean CSV export for an evaluation run.
   */
  public exportRunCSV(evaluationRunId: string): string {
    const run = evaluationRepository.findById(evaluationRunId);
    if (!run) {
      throw new Error(`Evaluation run '${evaluationRunId}' not found.`);
    }

    const headers = [
      'case_id',
      'scenario_id',
      'customer_name',
      'source_type',
      'revenue_at_risk_inr',
      'revenue_recovered_inr',
      'final_status',
      'recovery_success',
      'actions_taken',
      'iterations',
      'human_intervention',
      'policy_interventions',
      'ai_confidence_average',
      'deterministic_outcome',
      'agent_outcome',
      'time_to_resolution_ms',
      'evaluation_timestamp',
    ];

    const rows = run.cases.map((c) => [
      `"${c.case_id}"`,
      `"${c.scenario_id}"`,
      `"${c.customer_name.replace(/"/g, '""')}"`,
      `"${c.source_type}"`,
      c.revenue_at_risk,
      c.revenue_recovered,
      `"${c.final_status}"`,
      c.recovery_success,
      c.actions_taken,
      c.iterations,
      c.human_intervention,
      c.policy_interventions,
      c.ai_confidence_average,
      `"${c.deterministic_outcome.status} (${c.deterministic_outcome.strategy})"`,
      `"${c.agent_outcome.status} (${c.agent_outcome.strategy})"`,
      c.time_to_resolution_ms,
      `"${c.evaluation_timestamp}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const evaluationEngine = new EvaluationEngine();
