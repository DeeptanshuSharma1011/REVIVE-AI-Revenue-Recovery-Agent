/**
 * @license
 * REVIVE — Master Recovery Engine (Bounded Autonomy Architecture)
 * Phase 4 — AI Decision Engine
 *
 * Coordinates Detection, Investigation, Diagnosis, Strategy (Deterministic or Gemini AI),
 * Execution, Verification, and Outcome.
 */

import { randomUUID } from 'crypto';
import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { auditRepository } from '../repositories/AuditRepository';
import { recoveryActionRepository } from '../repositories/RecoveryActionRepository';
import { investigationService } from './investigation';
import { diagnosisService } from './diagnosis';
import { strategyEngine, RecoveryStrategyMode } from './strategy';
import { executionService } from './execution';
import { verificationService } from './verification';
import { outcomeService } from './outcome';
import { recoveryMetricsEngine } from './metrics';
import {
  InvestigationContext,
  DiagnosisResult,
  StrategyDecision,
  TimelineStep,
  StepName,
  RecoveryProcessResult,
  EngineMetrics,
} from './types';
import { CaseStatus } from '../schema';

const MAX_ACTIONS_PER_RUN = 3;

export class RecoveryEngine {
  /**
   * Helper to log audit steps during recovery execution.
   */
  private logAuditStep(
    caseId: string,
    step: string,
    toolName: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    auditRepository.create({
      log_id: randomUUID(),
      case_id: caseId,
      agent_step: step,
      tool_name: toolName,
      input_summary: input,
      output_summary: output,
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 4: Bounded Autonomy Decision Engine Active',
        ...metadata,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Processes a recovery case through the complete pipeline (synchronous fallback / deterministic).
   */
  public processCase(caseId: string, options?: { strategyMode?: RecoveryStrategyMode }): RecoveryProcessResult {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Recovery processing failed: Case '${caseId}' not found.`);
    }

    const nowIso = new Date().toISOString();

    // 1. IDEMPOTENCY CHECK
    if (rCase.status === 'RECOVERED') {
      const actions = recoveryActionRepository.findByCaseId(caseId);
      const recoveredAmt = actions
        .filter((a) => a.status === 'SUCCESS')
        .reduce((sum, a) => sum + (a.amount_recovered || 0), 0);

      return {
        case_id: rCase.case_id,
        status: 'already_resolved',
        strategy: rCase.current_strategy || 'STOP',
        amount_recovered: recoveredAmt || rCase.revenue_at_risk,
        actions_taken: 0,
        diagnosis: 'ALREADY_RECOVERED',
        summary: 'Recovery case is already resolved.',
        decision_explanation: 'Case was previously recovered. No further action taken.',
        timeline: this.getCaseTimeline(caseId),
        message: 'Recovery case is already resolved.',
        simulated: true,
      };
    }

    if (rCase.status === 'CLOSED') {
      return {
        case_id: rCase.case_id,
        status: 'already_resolved',
        strategy: 'STOP',
        amount_recovered: 0,
        actions_taken: 0,
        diagnosis: 'NO_RECOVERY_REQUIRED',
        summary: 'Recovery case is closed.',
        decision_explanation: 'Case was previously closed. No further action taken.',
        timeline: this.getCaseTimeline(caseId),
        message: 'Recovery case is already closed.',
        simulated: true,
      };
    }

    const timeline: TimelineStep[] = [];

    // STAGE 1: DETECTION
    this.logAuditStep(
      caseId,
      'detection',
      'deterministic_engine',
      { case_id: caseId, source_type: rCase.source_type, source_id: rCase.source_id },
      { priority: rCase.priority, revenue_at_risk: rCase.revenue_at_risk }
    );
    timeline.push({
      step: 'DETECTION',
      status: 'completed',
      title: 'Revenue Risk Detected',
      description: `Risk event identified from ${rCase.source_type} source (₹${rCase.revenue_at_risk.toLocaleString()}).`,
      timestamp: nowIso,
      data: { source_type: rCase.source_type, revenue_at_risk: rCase.revenue_at_risk },
    });

    if (rCase.status === 'OPEN') {
      recoveryCaseRepository.update(caseId, { status: 'INVESTIGATING' });
    }

    let actionsCount = 0;
    let finalDiagnosisResult: DiagnosisResult | null = null;
    let finalStrategyDecision: StrategyDecision | null = null;
    let finalSummary = '';
    let finalRecoveredAmount = 0;
    let finalStatus: CaseStatus = rCase.status;

    // Execution Loop with safety threshold (MAX_ACTIONS_PER_RUN)
    while (actionsCount < MAX_ACTIONS_PER_RUN) {
      actionsCount++;

      // STAGE 2: INVESTIGATION
      const context: InvestigationContext = investigationService.investigateCase(caseId);
      this.logAuditStep(
        caseId,
        'investigation',
        'deterministic_engine',
        { case_id: caseId, customer_id: context.customer.customer_id },
        {
          customer_name: context.customer.name,
          segment: context.customer_segment,
          past_successful_payments: context.successful_past_payments_count,
          previous_actions: context.previous_actions.length,
        }
      );
      timeline.push({
        step: 'INVESTIGATION',
        status: 'completed',
        title: 'Customer Context Investigated',
        description: `Profile loaded for ${context.customer.name} (${context.customer_segment}). ${context.successful_past_payments_count} prior payments verified.`,
        timestamp: new Date().toISOString(),
      });

      // STAGE 3: DIAGNOSIS
      const diagnosis: DiagnosisResult = diagnosisService.diagnoseCase(context);
      finalDiagnosisResult = diagnosis;
      this.logAuditStep(
        caseId,
        'diagnosis',
        'deterministic_engine',
        { case_id: caseId, source_type: context.source_type },
        { diagnosis: diagnosis.diagnosis, summary: diagnosis.summary, confidence: diagnosis.confidence }
      );
      timeline.push({
        step: 'DIAGNOSIS',
        status: 'completed',
        title: 'Situation Diagnosed',
        description: `${diagnosis.diagnosis}: ${diagnosis.summary}`,
        timestamp: new Date().toISOString(),
        data: { diagnosis: diagnosis.diagnosis, confidence: diagnosis.confidence },
      });

      // STAGE 4: STRATEGY SELECTION
      const strategy: StrategyDecision = strategyEngine.selectStrategy(context, diagnosis);
      finalStrategyDecision = strategy;
      this.logAuditStep(
        caseId,
        'strategy_selection',
        'deterministic_engine',
        { diagnosis: diagnosis.diagnosis },
        { strategy: strategy.strategy, reason: strategy.reason, explanation: strategy.explanation }
      );
      timeline.push({
        step: 'STRATEGY_SELECTION',
        status: 'completed',
        title: 'Deterministic Strategy Selected',
        description: `Selected ${strategy.strategy} — ${strategy.reason}`,
        timestamp: new Date().toISOString(),
        data: { strategy: strategy.strategy, reason: strategy.reason },
      });

      // STAGE 5: ACTION EXECUTION (Simulator Integration)
      const actionResult = executionService.executeStrategy(strategy, context, caseId);
      this.logAuditStep(
        caseId,
        'action_execution',
        actionResult.action_type.toLowerCase(),
        { strategy: strategy.strategy, case_id: caseId },
        { status: actionResult.status, simulated: true }
      );
      timeline.push({
        step: 'ACTION_EXECUTION',
        status: actionResult.status === 'SUCCESS' ? 'completed' : 'failed',
        title: 'Simulated Action Executed',
        description: `Executed ${actionResult.action_type} (Status: ${actionResult.status})`,
        timestamp: new Date().toISOString(),
        data: { action: actionResult.action_type, status: actionResult.status },
      });

      // STAGE 6: VERIFICATION
      const verification = verificationService.verifyOutcome(actionResult, context, caseId);
      this.logAuditStep(
        caseId,
        'verification',
        'deterministic_engine',
        { action_type: actionResult.action_type, case_id: caseId },
        {
          state: verification.state,
          verified_payment_status: verification.verified_payment_status,
          amount_recovered: verification.amount_recovered,
        }
      );
      timeline.push({
        step: 'VERIFICATION',
        status: 'completed',
        title: 'State Mutation Verified',
        description: `State: ${verification.state}. ${verification.verification_notes}`,
        timestamp: new Date().toISOString(),
        data: {
          verification_state: verification.state,
          amount_recovered: verification.amount_recovered,
        },
      });

      // STAGE 7: OUTCOME
      const outcome = outcomeService.finalizeOutcome(verification, strategy, actionResult, context, caseId);
      this.logAuditStep(
        caseId,
        'outcome',
        'deterministic_engine',
        { case_id: caseId, verification_state: verification.state },
        {
          final_status: outcome.final_status,
          amount_recovered: outcome.amount_recovered,
          summary: outcome.summary,
        }
      );
      timeline.push({
        step: 'OUTCOME',
        status: 'completed',
        title: 'Recovery Outcome Finalized',
        description: outcome.summary,
        timestamp: new Date().toISOString(),
        data: {
          final_status: outcome.final_status,
          amount_recovered: outcome.amount_recovered,
        },
      });

      finalSummary = outcome.summary;
      finalRecoveredAmount = outcome.amount_recovered;
      finalStatus = outcome.final_status;

      // Break loop if the case reached an outcome state
      if (
        verification.state === 'SUCCESS' ||
        verification.state === 'ESCALATED' ||
        verification.state === 'STOPPED' ||
        verification.state === 'PENDING'
      ) {
        break;
      }
    }

    return {
      case_id: rCase.case_id,
      status: finalStatus,
      strategy: finalStrategyDecision?.strategy || 'STOP',
      amount_recovered: finalRecoveredAmount,
      actions_taken: actionsCount,
      diagnosis: finalDiagnosisResult?.diagnosis || 'TEMPORARY_PAYMENT_FAILURE',
      summary: finalSummary,
      decision_explanation: finalStrategyDecision?.explanation || '',
      timeline,
      simulated: true,
    };
  }

  /**
   * Processes a recovery case asynchronously with full Gemini AI support.
   */
  public async processCaseAsync(
    caseId: string,
    options?: { strategyMode?: RecoveryStrategyMode }
  ): Promise<RecoveryProcessResult> {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Recovery processing failed: Case '${caseId}' not found.`);
    }

    const nowIso = new Date().toISOString();

    // 1. IDEMPOTENCY CHECK
    if (rCase.status === 'RECOVERED') {
      const actions = recoveryActionRepository.findByCaseId(caseId);
      const recoveredAmt = actions
        .filter((a) => a.status === 'SUCCESS')
        .reduce((sum, a) => sum + (a.amount_recovered || 0), 0);

      return {
        case_id: rCase.case_id,
        status: 'already_resolved',
        strategy: rCase.current_strategy || 'STOP',
        amount_recovered: recoveredAmt || rCase.revenue_at_risk,
        actions_taken: 0,
        diagnosis: 'ALREADY_RECOVERED',
        summary: 'Recovery case is already resolved.',
        decision_explanation: 'Case was previously recovered. No further action taken.',
        timeline: this.getCaseTimeline(caseId),
        message: 'Recovery case is already resolved.',
        simulated: true,
      };
    }

    if (rCase.status === 'CLOSED') {
      return {
        case_id: rCase.case_id,
        status: 'already_resolved',
        strategy: 'STOP',
        amount_recovered: 0,
        actions_taken: 0,
        diagnosis: 'NO_RECOVERY_REQUIRED',
        summary: 'Recovery case is closed.',
        decision_explanation: 'Case was previously closed. No further action taken.',
        timeline: this.getCaseTimeline(caseId),
        message: 'Recovery case is already closed.',
        simulated: true,
      };
    }

    const timeline: TimelineStep[] = [];

    // STAGE 1: DETECTION
    this.logAuditStep(
      caseId,
      'detection',
      'deterministic_engine',
      { case_id: caseId, source_type: rCase.source_type, source_id: rCase.source_id },
      { priority: rCase.priority, revenue_at_risk: rCase.revenue_at_risk }
    );
    timeline.push({
      step: 'DETECTION',
      status: 'completed',
      title: 'Revenue Risk Detected',
      description: `Risk event identified from ${rCase.source_type} source (₹${rCase.revenue_at_risk.toLocaleString()}).`,
      timestamp: nowIso,
      data: { source_type: rCase.source_type, revenue_at_risk: rCase.revenue_at_risk },
    });

    if (rCase.status === 'OPEN') {
      recoveryCaseRepository.update(caseId, { status: 'INVESTIGATING' });
    }

    let actionsCount = 0;
    let finalDiagnosisResult: DiagnosisResult | null = null;
    let finalStrategyDecision: StrategyDecision | null = null;
    let finalSummary = '';
    let finalRecoveredAmount = 0;
    let finalStatus: CaseStatus = rCase.status;

    while (actionsCount < MAX_ACTIONS_PER_RUN) {
      actionsCount++;

      // STAGE 2: INVESTIGATION
      const context: InvestigationContext = investigationService.investigateCase(caseId);
      this.logAuditStep(
        caseId,
        'investigation',
        'deterministic_engine',
        { case_id: caseId, customer_id: context.customer.customer_id },
        {
          customer_name: context.customer.name,
          segment: context.customer_segment,
          past_successful_payments: context.successful_past_payments_count,
          previous_actions: context.previous_actions.length,
        }
      );
      timeline.push({
        step: 'INVESTIGATION',
        status: 'completed',
        title: 'Customer Context Investigated',
        description: `Profile loaded for ${context.customer.name} (${context.customer_segment}). ${context.successful_past_payments_count} prior payments verified.`,
        timestamp: new Date().toISOString(),
      });

      // STAGE 3: DIAGNOSIS
      const diagnosis: DiagnosisResult = diagnosisService.diagnoseCase(context);
      finalDiagnosisResult = diagnosis;
      this.logAuditStep(
        caseId,
        'diagnosis',
        'deterministic_engine',
        { case_id: caseId, source_type: context.source_type },
        { diagnosis: diagnosis.diagnosis, summary: diagnosis.summary, confidence: diagnosis.confidence }
      );
      timeline.push({
        step: 'DIAGNOSIS',
        status: 'completed',
        title: 'Situation Diagnosed',
        description: `${diagnosis.diagnosis}: ${diagnosis.summary}`,
        timestamp: new Date().toISOString(),
        data: { diagnosis: diagnosis.diagnosis, confidence: diagnosis.confidence },
      });

      // STAGE 4: STRATEGY SELECTION (AI or Deterministic)
      const strategy: StrategyDecision = await strategyEngine.selectStrategyAsync(
        context,
        diagnosis,
        options?.strategyMode
      );
      finalStrategyDecision = strategy;

      const toolName =
        strategy.decision_source === 'GEMINI'
          ? 'gemini_decision_engine'
          : strategy.decision_source === 'DETERMINISTIC_FALLBACK'
          ? 'deterministic_fallback'
          : 'deterministic_engine';

      this.logAuditStep(
        caseId,
        'strategy_selection',
        toolName,
        { diagnosis: diagnosis.diagnosis, decision_source: strategy.decision_source },
        {
          strategy: strategy.strategy,
          reason: strategy.reason,
          explanation: strategy.explanation,
          confidence: strategy.confidence,
          risk_level: strategy.risk_level,
          requires_human_review: strategy.requires_human_review,
        },
        {
          decision_source: strategy.decision_source,
          confidence: strategy.confidence,
          risk_level: strategy.risk_level,
          model: strategy.model,
          prompt_version: strategy.prompt_version,
          fallback_reason: strategy.fallback_reason,
        }
      );

      const strategyTitle =
        strategy.decision_source === 'GEMINI'
          ? 'AI Strategy Recommended (Gemini)'
          : strategy.decision_source === 'DETERMINISTIC_FALLBACK'
          ? 'Deterministic Fallback Selected'
          : 'Deterministic Strategy Selected';

      timeline.push({
        step: 'STRATEGY_SELECTION',
        status: 'completed',
        title: strategyTitle,
        description: `Recommended ${strategy.strategy} (Confidence: ${Math.round(
          (strategy.confidence ?? 0.9) * 100
        )}%) — ${strategy.reason}`,
        timestamp: new Date().toISOString(),
        data: {
          strategy: strategy.strategy,
          reason: strategy.reason,
          confidence: strategy.confidence,
          risk_level: strategy.risk_level,
          decision_source: strategy.decision_source,
        },
      });

      // STAGE 5: ACTION EXECUTION (Simulator Integration)
      const actionResult = executionService.executeStrategy(strategy, context, caseId);
      this.logAuditStep(
        caseId,
        'action_execution',
        actionResult.action_type.toLowerCase(),
        { strategy: strategy.strategy, case_id: caseId },
        { status: actionResult.status, simulated: true }
      );
      timeline.push({
        step: 'ACTION_EXECUTION',
        status: actionResult.status === 'SUCCESS' ? 'completed' : 'failed',
        title: 'Simulated Action Executed',
        description: `Executed ${actionResult.action_type} (Status: ${actionResult.status})`,
        timestamp: new Date().toISOString(),
        data: { action: actionResult.action_type, status: actionResult.status },
      });

      // STAGE 6: VERIFICATION
      const verification = verificationService.verifyOutcome(actionResult, context, caseId);
      this.logAuditStep(
        caseId,
        'verification',
        'deterministic_engine',
        { action_type: actionResult.action_type, case_id: caseId },
        {
          state: verification.state,
          verified_payment_status: verification.verified_payment_status,
          amount_recovered: verification.amount_recovered,
        }
      );
      timeline.push({
        step: 'VERIFICATION',
        status: 'completed',
        title: 'State Mutation Verified',
        description: `State: ${verification.state}. ${verification.verification_notes}`,
        timestamp: new Date().toISOString(),
        data: {
          verification_state: verification.state,
          amount_recovered: verification.amount_recovered,
        },
      });

      // STAGE 7: OUTCOME
      const outcome = outcomeService.finalizeOutcome(verification, strategy, actionResult, context, caseId);
      this.logAuditStep(
        caseId,
        'outcome',
        'deterministic_engine',
        { case_id: caseId, verification_state: verification.state },
        {
          final_status: outcome.final_status,
          amount_recovered: outcome.amount_recovered,
          summary: outcome.summary,
        }
      );
      timeline.push({
        step: 'OUTCOME',
        status: 'completed',
        title: 'Recovery Outcome Finalized',
        description: outcome.summary,
        timestamp: new Date().toISOString(),
        data: {
          final_status: outcome.final_status,
          amount_recovered: outcome.amount_recovered,
        },
      });

      finalSummary = outcome.summary;
      finalRecoveredAmount = outcome.amount_recovered;
      finalStatus = outcome.final_status;

      if (
        verification.state === 'SUCCESS' ||
        verification.state === 'ESCALATED' ||
        verification.state === 'STOPPED' ||
        verification.state === 'PENDING'
      ) {
        break;
      }
    }

    return {
      case_id: rCase.case_id,
      status: finalStatus,
      strategy: finalStrategyDecision?.strategy || 'STOP',
      amount_recovered: finalRecoveredAmount,
      actions_taken: actionsCount,
      diagnosis: finalDiagnosisResult?.diagnosis || 'TEMPORARY_PAYMENT_FAILURE',
      summary: finalSummary,
      decision_explanation: finalStrategyDecision?.explanation || '',
      timeline,
      simulated: true,
    };
  }

  /**
   * Retrieves investigation context for a case.
   */
  public getCaseContext(caseId: string): InvestigationContext {
    return investigationService.investigateCase(caseId);
  }

  /**
   * Evaluates and returns the deterministic diagnosis for a case.
   */
  public getCaseDiagnosis(caseId: string): DiagnosisResult & { case_id: string } {
    const context = investigationService.investigateCase(caseId);
    const diagnosis = diagnosisService.diagnoseCase(context);
    return {
      case_id: caseId,
      ...diagnosis,
    };
  }

  /**
   * Evaluates and returns the deterministic strategy decision for a case.
   */
  public getCaseDecision(caseId: string): StrategyDecision & { case_id: string; diagnosis: string } {
    const context = investigationService.investigateCase(caseId);
    const diagnosis = diagnosisService.diagnoseCase(context);
    const decision = strategyEngine.selectStrategy(context, diagnosis);
    return {
      case_id: caseId,
      diagnosis: diagnosis.diagnosis,
      ...decision,
    };
  }

  /**
   * Evaluates and returns the AI/active strategy decision asynchronously for a case.
   */
  public async getCaseDecisionAsync(
    caseId: string,
    strategyMode?: RecoveryStrategyMode
  ): Promise<StrategyDecision & { case_id: string; diagnosis: string }> {
    const context = investigationService.investigateCase(caseId);
    const diagnosis = diagnosisService.diagnoseCase(context);
    const decision = await strategyEngine.selectStrategyAsync(context, diagnosis, strategyMode);
    return {
      case_id: caseId,
      diagnosis: diagnosis.diagnosis,
      ...decision,
    };
  }

  /**
   * Returns chronological recovery timeline from database audit logs.
   */
  public getCaseTimeline(caseId: string): TimelineStep[] {
    const auditLogs = auditRepository.findByCaseId(caseId);
    if (auditLogs.length === 0) {
      const rCase = recoveryCaseRepository.findById(caseId);
      if (!rCase) return [];
      return [
        {
          step: 'DETECTION',
          status: 'completed',
          title: 'Case Registered',
          description: `Case detected with status ${rCase.status} (₹${rCase.revenue_at_risk.toLocaleString()})`,
          timestamp: rCase.created_at,
        },
      ];
    }

    const stepMapping: Record<string, StepName> = {
      detection: 'DETECTION',
      investigation: 'INVESTIGATION',
      diagnosis: 'DIAGNOSIS',
      strategy_selection: 'STRATEGY_SELECTION',
      action_execution: 'ACTION_EXECUTION',
      verification: 'VERIFICATION',
      outcome: 'OUTCOME',
    };

    return auditLogs.map((log) => {
      const stepName = stepMapping[log.agent_step.toLowerCase()] || 'ACTION_EXECUTION';
      const output = log.output_summary as Record<string, unknown>;
      let desc = `Tool: ${log.tool_name}`;

      if (output.summary) desc = String(output.summary);
      else if (output.reason) desc = String(output.reason);
      else if (output.status) desc = `Status: ${String(output.status)}`;

      return {
        step: stepName,
        status: 'completed',
        title: `${stepName.replace(/_/g, ' ')}`,
        description: desc,
        timestamp: log.timestamp,
        data: output,
      };
    });
  }

  /**
   * Retrieves overall engine performance metrics.
   */
  public getMetrics(): EngineMetrics {
    return recoveryMetricsEngine.getMetrics();
  }
}

export const recoveryEngine = new RecoveryEngine();
