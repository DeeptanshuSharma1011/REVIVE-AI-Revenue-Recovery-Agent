/**
 * @license
 * REVIVE — LangGraph Multi-Step Recovery Agent Orchestrator
 * Phase 5 — Agentic Orchestration
 *
 * Implements bounded, observable, multi-step agentic graph:
 * Observe -> Investigate -> Diagnose -> Reason -> Validate -> Execute -> Verify -> Re-evaluate -> Loop/Terminal
 */

import { randomUUID } from 'crypto';
import { ReviveAgentState, AgentRunResult, AgentMetrics } from './state';
import { agentNodes, MAX_AGENT_ITERATIONS, MAX_ACTIONS_PER_CASE } from './nodes';
import { recoveryCaseRepository } from '../../repositories/RecoveryCaseRepository';
import { auditRepository } from '../../repositories/AuditRepository';
import { recoveryActionRepository } from '../../repositories/RecoveryActionRepository';

export class ReviveAgentGraph {
  private runsHistory: Map<string, AgentRunResult> = new Map();

  /**
   * Initializes initial LangGraph state for a case.
   */
  public createInitialState(caseId: string): ReviveAgentState {
    const runId = `REVIVE_RUN_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${randomUUID().slice(0, 8)}`;

    return {
      agent_run_id: runId,
      case_id: caseId,
      status: 'OBSERVING',
      current_node: 'LOAD_CASE',
      case_context: null,
      diagnosis: null,
      current_strategy: null,
      strategy_decision: null,
      decision_source: 'GEMINI',
      confidence: 0.0,
      human_review_required: false,
      last_action: null,
      last_action_result: null,
      verification_result: null,
      actions_taken: [],
      actions_remaining: MAX_ACTIONS_PER_CASE,
      iteration_count: 0,
      max_iterations: MAX_AGENT_ITERATIONS,
      final_outcome: null,
      amount_recovered: 0,
      summary: '',
      timeline: [],
    };
  }

  /**
   * Executes the full LangGraph loop for a recovery case.
   */
  public async runCase(caseId: string, options?: { forceDeterministic?: boolean }): Promise<AgentRunResult> {
    let state = this.createInitialState(caseId);

    // 1. NODE: LOAD_CASE
    state = await agentNodes.loadCase(state);
    if (state.status === 'RECOVERED' || state.status === 'ESCALATED' || state.status === 'STOPPED' || state.status === 'FAILED') {
      return this.finalizeRunResult(state);
    }

    // 2. NODE: INVESTIGATE
    state = await agentNodes.investigate(state);

    // 3. NODE: DIAGNOSE
    state = await agentNodes.diagnose(state);

    // MULTI-STEP AGENTIC LOOP: (Reason -> Validate -> Policy -> Execute -> Verify -> Re-evaluate)
    while (state.iteration_count < MAX_AGENT_ITERATIONS) {
      // 4. NODE: REASON
      state = await agentNodes.reason(state, options);

      // 5. NODE: VALIDATE_DECISION
      state = await agentNodes.validateDecision(state);

      // 5B. NODE: POLICY_ENGINE (Deterministic safety firewall)
      state = await agentNodes.policyEngineNode(state);

      // If policy blocked the action
      if (state.policy_result?.decision === 'BLOCK') {
        if (state.case_context && state.case_context.revenue_at_risk > 10000) {
          state = await agentNodes.escalate(state);
        } else {
          state = await agentNodes.stop(state);
        }
        break;
      }

      // 6. NODE: EXECUTE_ACTION
      state = await agentNodes.executeAction(state);

      // 7. NODE: VERIFY_RESULT
      state = await agentNodes.verifyResult(state);

      // 8. NODE: RE_EVALUATE
      state = await agentNodes.reEvaluate(state);

      // If reEvaluate reached a terminal node (COMPLETE / ESCALATE / STOP) or resolved PENDING
      if (
        state.status === 'RECOVERED' ||
        state.status === 'ESCALATED' ||
        state.status === 'STOPPED' ||
        state.status === 'FAILED'
      ) {
        break;
      }
    }

    // Fallback if iteration cap hit without terminal status
    if (state.status !== 'RECOVERED' && state.status !== 'ESCALATED' && state.status !== 'STOPPED') {
      state = await agentNodes.stop(state);
    }

    return this.finalizeRunResult(state);
  }

  /**
   * Packages graph state into public AgentRunResult and stores in memory history.
   */
  private finalizeRunResult(state: ReviveAgentState): AgentRunResult {
    const result: AgentRunResult = {
      agent_run_id: state.agent_run_id,
      case_id: state.case_id,
      status: state.status as any,
      final_outcome: state.final_outcome || state.status,
      amount_recovered: state.amount_recovered,
      actions_taken: state.actions_taken.length,
      iterations: state.iteration_count,
      decision_source: state.decision_source,
      confidence: state.confidence,
      diagnosis: state.diagnosis?.diagnosis || 'TEMPORARY_PAYMENT_FAILURE',
      original_strategy: state.original_strategy || state.strategy_decision?.strategy || undefined,
      approved_strategy: state.policy_result?.approved_strategy || state.current_strategy || undefined,
      policy_result: state.policy_result || undefined,
      policy_explanation_card: state.policy_explanation_card || undefined,
      summary: state.summary || `Agent workflow completed with status ${state.status}`,
      explanation: state.strategy_decision?.explanation || state.strategy_decision?.reason || '',
      termination_reason: state.termination_reason,
      timeline: state.timeline,
      simulated: true,
    };

    this.runsHistory.set(result.agent_run_id, result);
    return result;
  }

  /**
   * Retrieves a previous agent run by ID.
   */
  public getRunById(runId: string): AgentRunResult | undefined {
    return this.runsHistory.get(runId);
  }

  /**
   * Retrieves all historical agent runs.
   */
  public getAllRuns(): AgentRunResult[] {
    return Array.from(this.runsHistory.values());
  }

  /**
   * Calculates comprehensive Agent and Safety Metrics across all agent runs and database state.
   */
  public getMetrics(): AgentMetrics {
    const allRuns = Array.from(this.runsHistory.values());
    const totalRuns = allRuns.length;

    let successes = 0;
    let failures = 0;
    let escalations = 0;
    let stops = 0;
    let singleStepRecoveries = 0;
    let multiStepRecoveries = 0;
    let totalIterations = 0;
    let totalActions = 0;
    let totalRecovered = 0;
    let agreementCount = 0;
    let fallbackCount = 0;
    let lowConfidenceCount = 0;

    // Safety metrics
    let maxIterationTerminations = 0;
    let invalidDecisionBlocks = 0;
    let lowConfidenceEscalations = 0;
    let duplicateActionPreventions = 0;
    let toolFailures = 0;

    for (const run of allRuns) {
      totalIterations += run.iterations;
      totalActions += run.actions_taken;
      totalRecovered += run.amount_recovered;

      if (run.status === 'RECOVERED') {
        successes++;
        if (run.actions_taken <= 1) singleStepRecoveries++;
        else multiStepRecoveries++;
      } else if (run.status === 'ESCALATED') {
        escalations++;
      } else if (run.status === 'STOPPED') {
        stops++;
      } else {
        failures++;
      }

      if (run.decision_source === 'DETERMINISTIC_FALLBACK') fallbackCount++;
      if (run.confidence < 0.70) {
        lowConfidenceCount++;
        lowConfidenceEscalations++;
      }

      if (run.termination_reason === 'MAX_ITERATIONS_REACHED' || run.termination_reason === 'MAX_ACTIONS_REACHED') {
        maxIterationTerminations++;
      }

      // Check timeline events for safety events
      for (const ev of run.timeline) {
        if (ev.title.includes('Duplicate Action Prevented')) duplicateActionPreventions++;
        if (ev.title.includes('Validation Blocked') || ev.title.includes('Guardrail Triggered')) invalidDecisionBlocks++;
        if (ev.title.includes('Tool Execution Error')) toolFailures++;
      }
    }

    const recoveryRate = totalRuns > 0 ? successes / totalRuns : 0;
    const avgIterations = totalRuns > 0 ? Number((totalIterations / totalRuns).toFixed(2)) : 1;
    const avgActions = totalRuns > 0 ? Number((totalActions / totalRuns).toFixed(2)) : 1;

    return {
      total_agent_runs: totalRuns,
      agent_successes: successes,
      agent_failures: failures,
      agent_escalations: escalations,
      agent_stops: stops,
      single_step_recovery_rate: successes > 0 ? Number((singleStepRecoveries / successes).toFixed(2)) : 0,
      multi_step_recovery_rate: successes > 0 ? Number((multiStepRecoveries / successes).toFixed(2)) : 0,
      average_steps_to_recovery: successes > 0 ? Number((totalActions / successes).toFixed(2)) : 1,
      recovery_after_re_evaluation: multiStepRecoveries,
      repeated_action_prevention: duplicateActionPreventions,
      recovery_rate: Number(recoveryRate.toFixed(2)),
      revenue_recovered: totalRecovered,
      average_iterations: avgIterations,
      average_actions: avgActions,
      decision_agreement: totalRuns > 0 ? Number(((totalRuns - fallbackCount) / totalRuns).toFixed(2)) : 1.0,
      fallback_rate: totalRuns > 0 ? Number((fallbackCount / totalRuns).toFixed(2)) : 0.0,
      low_confidence_rate: totalRuns > 0 ? Number((lowConfidenceCount / totalRuns).toFixed(2)) : 0.0,
      max_iteration_terminations: maxIterationTerminations,
      invalid_decision_blocks: invalidDecisionBlocks,
      low_confidence_escalations: lowConfidenceEscalations,
      duplicate_action_preventions: duplicateActionPreventions,
      tool_failures: toolFailures,
    };
  }
}

export const reviveAgentGraph = new ReviveAgentGraph();
