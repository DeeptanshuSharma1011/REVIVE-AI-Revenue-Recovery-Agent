/**
 * @license
 * REVIVE — Deterministic Policy & Guardrail Engine
 * Phase 6 — Policy Engine & Guardrails
 *
 * Evaluates all AI recommendations against deterministic business, financial,
 * and safety rules before tool execution. Gemini can NEVER override this engine.
 */

import {
  PolicyDecision,
  PolicyResult,
  ProposedDecision,
  PolicyMetrics,
  PolicyExplanationCard,
  PolicyEvaluationAuditRecord,
} from './types';
import {
  EvaluationContext,
  checkTerminalStateRule,
  checkPaymentSuccessRule,
  checkMaxActionsRule,
  checkMaxRetriesRule,
  checkHighValueRule,
  checkLowConfidenceRule,
  checkInvalidStrategyRule,
  checkDuplicateActionRule,
  checkDiagnosisCompatibilityRule,
  checkRequiredDataRule,
  checkCustomerContactLimitRule,
  checkRecoveryWindowRule,
} from './rules';
import { getPolicyConfig } from './config';
import { InvestigationContext, DiagnosisResult } from '../types';
import { ActionRecord } from '../agent/state';

export class PolicyEngine {
  private evaluationRecords: PolicyEvaluationAuditRecord[] = [];

  /**
   * Main deterministic evaluation interface: evaluate(context, proposedDecision, history).
   * Evaluates rules in strict deterministic priority order.
   */
  public evaluate(
    caseContext: InvestigationContext | null,
    proposed: ProposedDecision,
    diagnosis?: DiagnosisResult | null,
    history?: ActionRecord[],
    agentRunId?: string
  ): PolicyResult {
    const config = getPolicyConfig();
    const evalContext: EvaluationContext = {
      case_context: caseContext,
      diagnosis: diagnosis || null,
      history: history || [],
    };

    // 1. Terminal State Rule
    const terminalResult = checkTerminalStateRule(evalContext, proposed);
    if (terminalResult) return this.recordEvaluation(terminalResult, caseContext, agentRunId);

    // 2. Payment Already Successful Rule
    const paymentSuccessResult = checkPaymentSuccessRule(evalContext, proposed);
    if (paymentSuccessResult) return this.recordEvaluation(paymentSuccessResult, caseContext, agentRunId);

    // 3. Max Actions Per Case Rule
    const maxActionsResult = checkMaxActionsRule(evalContext, proposed);
    if (maxActionsResult) return this.recordEvaluation(maxActionsResult, caseContext, agentRunId);

    // 4. Max Retries Rule
    const maxRetriesResult = checkMaxRetriesRule(evalContext, proposed);
    if (maxRetriesResult) return this.recordEvaluation(maxRetriesResult, caseContext, agentRunId);

    // 5. High Value Transaction Rule
    const highValueResult = checkHighValueRule(evalContext, proposed);
    if (highValueResult) return this.recordEvaluation(highValueResult, caseContext, agentRunId);

    // 6. Low AI Confidence Rule
    const lowConfidenceResult = checkLowConfidenceRule(evalContext, proposed);
    if (lowConfidenceResult) return this.recordEvaluation(lowConfidenceResult, caseContext, agentRunId);

    // 7. Invalid Strategy Rule
    const invalidStrategyResult = checkInvalidStrategyRule(evalContext, proposed);
    if (invalidStrategyResult) return this.recordEvaluation(invalidStrategyResult, caseContext, agentRunId);

    // 8. Duplicate Action Rule
    const duplicateActionResult = checkDuplicateActionRule(evalContext, proposed);
    if (duplicateActionResult) return this.recordEvaluation(duplicateActionResult, caseContext, agentRunId);

    // 9. Diagnosis / Action Compatibility Rule
    const compatibilityResult = checkDiagnosisCompatibilityRule(evalContext, proposed);
    if (compatibilityResult) return this.recordEvaluation(compatibilityResult, caseContext, agentRunId);

    // 10. Required Data Rule
    const requiredDataResult = checkRequiredDataRule(evalContext, proposed);
    if (requiredDataResult) return this.recordEvaluation(requiredDataResult, caseContext, agentRunId);

    // 11. Customer Contact Limit Rule
    const contactLimitResult = checkCustomerContactLimitRule(evalContext, proposed);
    if (contactLimitResult) return this.recordEvaluation(contactLimitResult, caseContext, agentRunId);

    // 12. Recovery Window Rule
    const recoveryWindowResult = checkRecoveryWindowRule(evalContext, proposed);
    if (recoveryWindowResult) return this.recordEvaluation(recoveryWindowResult, caseContext, agentRunId);

    // 13. Default ALLOW
    const allowResult: PolicyResult = {
      decision: 'ALLOW',
      original_strategy: proposed.strategy,
      approved_strategy: proposed.strategy,
      reason: 'Allowed: action complies with all deterministic safety, financial, and frequency policies.',
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['DEFAULT_ALLOW'],
      requires_human_review: false,
      explanation: 'Allowed: retry is within the automated recovery limits.',
    };

    return this.recordEvaluation(allowResult, caseContext, agentRunId);
  }

  /**
   * Helper to format a compact "WHY REVIVE DID THIS" card for judges and users.
   */
  public generateExplanationCard(
    proposed: ProposedDecision,
    result: PolicyResult
  ): PolicyExplanationCard {
    const formatName = (str?: string | null) => {
      if (!str) return 'None';
      return str
        .toLowerCase()
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    };

    return {
      title: 'WHY REVIVE DID THIS',
      ai_recommended: formatName(proposed.strategy),
      revive_policy: `${result.decision}: ${formatName(result.approved_strategy)}`,
      because: result.reason,
      result:
        result.decision === 'ALLOW'
          ? 'Approved for automated execution.'
          : result.decision === 'MODIFY'
          ? `Modified from ${formatName(proposed.strategy)} to safer action: ${formatName(result.approved_strategy)}.`
          : result.decision === 'ESCALATE'
          ? 'Escalated to human supervisor review queue.'
          : result.decision === 'BLOCK'
          ? 'Execution blocked due to safety policy violation.'
          : 'Terminated recovery workflow.',
    };
  }

  /**
   * Records policy evaluation history for audit and metric computation.
   */
  private recordEvaluation(
    result: PolicyResult,
    caseContext: InvestigationContext | null,
    agentRunId?: string
  ): PolicyResult {
    const record: PolicyEvaluationAuditRecord = {
      agent_run_id: agentRunId || 'STANDALONE_EVALUATION',
      case_id: caseContext?.case?.case_id || 'UNKNOWN',
      policy_version: result.policy_id,
      original_strategy: result.original_strategy,
      approved_strategy: result.approved_strategy,
      decision: result.decision,
      rules_triggered: result.rules_triggered,
      reason: result.reason,
      timestamp: new Date().toISOString(),
    };

    this.evaluationRecords.push(record);
    return result;
  }

  /**
   * Computes comprehensive real-time Policy, Autonomy, and Safety Metrics.
   */
  public getMetrics(revenueRecoveredTotal = 0): PolicyMetrics {
    const total = this.evaluationRecords.length;
    let allowed = 0;
    let modified = 0;
    let blocked = 0;
    let escalated = 0;
    let stopped = 0;

    let lowConfidenceCount = 0;
    let highValueCount = 0;
    let duplicateBlockCount = 0;
    let maxRetryBlockCount = 0;

    let revenueBlocked = 0;
    let revenueEscalated = 0;
    let revenuePrevented = 0;

    for (const rec of this.evaluationRecords) {
      switch (rec.decision) {
        case 'ALLOW':
          allowed++;
          break;
        case 'MODIFY':
          modified++;
          break;
        case 'BLOCK':
          blocked++;
          break;
        case 'ESCALATE':
          escalated++;
          break;
        case 'STOP':
          stopped++;
          break;
      }

      if (rec.rules_triggered.includes('LOW_AI_CONFIDENCE')) lowConfidenceCount++;
      if (rec.rules_triggered.includes('HIGH_VALUE_TRANSACTION')) highValueCount++;
      if (rec.rules_triggered.includes('DUPLICATE_ACTION')) duplicateBlockCount++;
      if (rec.rules_triggered.includes('MAX_RETRIES_EXCEEDED')) maxRetryBlockCount++;
    }

    const nonAllowed = modified + blocked + escalated + stopped;
    const overrideRate = total > 0 ? Number((nonAllowed / total).toFixed(2)) : 0;
    const blockRate = total > 0 ? Number((blocked / total).toFixed(2)) : 0;
    const modRate = total > 0 ? Number((modified / total).toFixed(2)) : 0;

    const automatedActions = allowed + modified;
    const autonomousActionRate = total > 0 ? Number((automatedActions / total).toFixed(2)) : 1.0;
    const guardrailInterventionRate =
      total > 0 ? Number(((blocked + modified + escalated) / total).toFixed(2)) : 0.0;

    return {
      policy_evaluations: total,
      policy_allowed: allowed,
      policy_modified: modified,
      policy_blocked: blocked,
      policy_escalated: escalated,
      policy_stopped: stopped,
      policy_override_rate: overrideRate,
      policy_block_rate: blockRate,
      policy_modification_rate: modRate,
      low_confidence_escalations: lowConfidenceCount,
      high_value_escalations: highValueCount,
      duplicate_action_blocks: duplicateBlockCount,
      max_retry_blocks: maxRetryBlockCount,
      automated_actions: automatedActions,
      policy_blocked_actions: blocked,
      policy_modified_actions: modified,
      policy_escalations: escalated,
      autonomous_action_rate: autonomousActionRate,
      guardrail_intervention_rate: guardrailInterventionRate,
      revenue_at_risk_blocked: revenueBlocked,
      revenue_at_risk_escalated: revenueEscalated,
      revenue_recovered: revenueRecoveredTotal,
      revenue_prevented_from_unsafe_action: revenuePrevented,
    };
  }

  /**
   * Clears in-memory evaluation history on database reset.
   */
  public resetHistory(): void {
    this.evaluationRecords = [];
  }

  /**
   * Retrieves all logged evaluation records.
   */
  public getHistory(): PolicyEvaluationAuditRecord[] {
    return [...this.evaluationRecords];
  }
}

export const policyEngine = new PolicyEngine();
