/**
 * @license
 * REVIVE — LangGraph Agent Nodes Implementation
 * Phase 5 — Agentic Orchestration
 *
 * Implements 11 functional, small, focused graph nodes:
 * 1. LOAD_CASE
 * 2. INVESTIGATE
 * 3. DIAGNOSE
 * 4. REASON (AIRecoveryDecisionService)
 * 5. VALIDATE_DECISION
 * 6. EXECUTE_ACTION
 * 7. VERIFY_RESULT
 * 8. RE_EVALUATE
 * 9. COMPLETE
 * 10. ESCALATE
 * 11. STOP
 */

import { randomUUID } from 'crypto';
import { ReviveAgentState, ActionRecord, VerificationResultState } from './state';
import { agentToolRegistry } from './tools';
import { recoveryCaseRepository } from '../../repositories/RecoveryCaseRepository';
import { auditRepository } from '../../repositories/AuditRepository';
import { aiRecoveryDecisionService } from '../ai/AIRecoveryDecisionService';
import { deterministicStrategyProvider } from '../ai/DeterministicStrategyProvider';
import { CaseStrategy, InvestigationContext, DiagnosisResult } from '../types';
import { policyEngine } from '../policy/PolicyEngine';
import { getPolicyConfig } from '../policy/config';

export const MAX_AGENT_ITERATIONS = 3;
export const MAX_ACTIONS_PER_CASE = 3;

export class ReviveAgentNodes {
  /**
   * Helper to append a real timeline event to graph state.
   */
  private addTimelineEvent(
    state: ReviveAgentState,
    node: ReviveAgentState['current_node'],
    title: string,
    description: string,
    status: 'completed' | 'failed' | 'in_progress' = 'completed',
    data?: Record<string, unknown>
  ) {
    state.timeline.push({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      node,
      title,
      description,
      status,
      data,
    });
  }

  /**
   * NODE 1: LOAD_CASE
   */
  public async loadCase(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'LOAD_CASE';
    state.status = 'OBSERVING';

    const rCase = recoveryCaseRepository.findById(state.case_id);
    if (!rCase) {
      state.status = 'FAILED';
      state.termination_reason = `Case '${state.case_id}' does not exist.`;
      state.summary = `Execution failed: Recovery case '${state.case_id}' was not found.`;
      this.addTimelineEvent(
        state,
        'LOAD_CASE',
        'Case Not Found',
        `Case '${state.case_id}' could not be located.`,
        'failed'
      );
      return state;
    }

    this.addTimelineEvent(
      state,
      'LOAD_CASE',
      'Case Loaded',
      `Target case ${rCase.case_id} (${rCase.source_type}) loaded. Revenue at risk: ₹${rCase.revenue_at_risk.toLocaleString()}.`
    );

    // Idempotency check: If already terminal, short-circuit
    if (rCase.status === 'RECOVERED') {
      state.status = 'RECOVERED';
      state.final_outcome = 'ALREADY_RECOVERED';
      state.amount_recovered = rCase.revenue_at_risk;
      state.summary = 'Case is already recovered. No further action needed.';
      this.addTimelineEvent(state, 'LOAD_CASE', 'Already Resolved', 'Case is already marked as RECOVERED.');
      return state;
    }

    if (rCase.status === 'ESCALATED') {
      state.status = 'ESCALATED';
      state.final_outcome = 'ALREADY_ESCALATED';
      state.summary = 'Case is already escalated for human review.';
      this.addTimelineEvent(state, 'LOAD_CASE', 'Already Escalated', 'Case was previously escalated.');
      return state;
    }

    if (rCase.status === 'CLOSED') {
      state.status = 'STOPPED';
      state.final_outcome = 'ALREADY_STOPPED';
      state.summary = 'Case is already closed/stopped.';
      this.addTimelineEvent(state, 'LOAD_CASE', 'Already Closed', 'Case is in closed/stopped status.');
      return state;
    }

    if (rCase.status === 'OPEN') {
      recoveryCaseRepository.update(rCase.case_id, { status: 'INVESTIGATING' });
    }

    return state;
  }

  /**
   * NODE 2: INVESTIGATE
   */
  public async investigate(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'INVESTIGATE';
    state.status = 'INVESTIGATING';

    const context: InvestigationContext = await agentToolRegistry.executeTool(
      'get_case_context',
      { case_id: state.case_id },
      state.agent_run_id,
      state.case_id
    );

    state.case_context = context;

    this.addTimelineEvent(
      state,
      'INVESTIGATE',
      'Context Investigated',
      `Loaded profile for ${context.customer.name} (${context.customer_segment}). History: ${context.successful_past_payments_count} successful payments, ${context.previous_actions.length} prior actions.`,
      'completed',
      {
        customer_name: context.customer.name,
        customer_segment: context.customer_segment,
        revenue_at_risk: context.revenue_at_risk,
      }
    );

    return state;
  }

  /**
   * NODE 3: DIAGNOSE
   */
  public async diagnose(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'DIAGNOSE';
    state.status = 'INVESTIGATING';

    const diagnosis: DiagnosisResult = await agentToolRegistry.executeTool(
      'diagnose_case',
      { case_id: state.case_id },
      state.agent_run_id,
      state.case_id
    );

    state.diagnosis = diagnosis;

    this.addTimelineEvent(
      state,
      'DIAGNOSE',
      'Root Cause Diagnosed',
      `${diagnosis.diagnosis}: ${diagnosis.summary} (Confidence: ${Math.round(diagnosis.confidence * 100)}%)`,
      'completed',
      {
        diagnosis: diagnosis.diagnosis,
        confidence: diagnosis.confidence,
      }
    );

    return state;
  }

  /**
   * NODE 4: REASON (Gemini Decision Intelligence)
   */
  public async reason(state: ReviveAgentState, options?: { forceDeterministic?: boolean }): Promise<ReviveAgentState> {
    state.current_node = 'REASON';
    state.status = 'REASONING';
    state.iteration_count += 1;

    if (!state.case_context || !state.diagnosis) {
      state.status = 'FAILED';
      state.termination_reason = 'Missing investigation context or diagnosis prior to reasoning.';
      return state;
    }

    let decision;
    if (options?.forceDeterministic) {
      decision = deterministicStrategyProvider.selectStrategy(state.case_context, state.diagnosis);
      decision.decision_source = 'DETERMINISTIC';
    } else {
      decision = await aiRecoveryDecisionService.evaluateCase(state.case_context, state.diagnosis);
    }

    state.strategy_decision = decision;
    state.current_strategy = decision.strategy;
    state.decision_source = decision.decision_source as any;
    state.confidence = decision.confidence ?? 0.9;
    state.human_review_required = Boolean(decision.requires_human_review);

    const sourceLabel =
      decision.decision_source === 'GEMINI'
        ? 'Gemini Reasoning'
        : decision.decision_source === 'DETERMINISTIC_FALLBACK'
        ? 'Deterministic Fallback'
        : 'Deterministic Rule';

    this.addTimelineEvent(
      state,
      'REASON',
      `${sourceLabel}: ${decision.strategy}`,
      `Proposed ${decision.strategy} (Confidence: ${Math.round(
        state.confidence * 100
      )}%). Reason: ${decision.reason}`,
      'completed',
      {
        strategy: decision.strategy,
        decision_source: decision.decision_source,
        confidence: state.confidence,
        risk_level: decision.risk_level,
        reason: decision.reason,
      }
    );

    return state;
  }

  /**
   * NODE 5: VALIDATE_DECISION
   * Structural sanity validation of proposed decision object.
   */
  public async validateDecision(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'VALIDATE_DECISION';

    const decision = state.strategy_decision;
    if (!decision || !decision.strategy) {
      state.current_strategy = 'ESCALATE';
      this.addTimelineEvent(
        state,
        'VALIDATE_DECISION',
        'Decision Validation Blocked',
        'No valid strategy decision structure found in state. Routing to ESCALATE.',
        'failed'
      );
      return state;
    }

    this.addTimelineEvent(
      state,
      'VALIDATE_DECISION',
      'Decision Syntax Validated',
      `Strategy ${decision.strategy} passed structural validation with ${Math.round(state.confidence * 100)}% confidence.`
    );

    return state;
  }

  /**
   * NODE 5B: POLICY_ENGINE (Phase 6 Policy Firewall)
   * Evaluates proposed strategy against 12 deterministic safety & business rules.
   * Can ALLOW, MODIFY, BLOCK, ESCALATE, or STOP.
   */
  public async policyEngineNode(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'POLICY_ENGINE';

    const proposed = {
      strategy: state.strategy_decision?.strategy || 'ESCALATE',
      confidence: state.confidence,
      reason: state.strategy_decision?.reason,
      decision_source: state.decision_source,
    };

    const policyResult = policyEngine.evaluate(
      state.case_context,
      proposed,
      state.diagnosis,
      state.actions_taken,
      state.agent_run_id
    );

    state.policy_result = policyResult;
    state.original_strategy = policyResult.original_strategy;
    state.policy_explanation_card = policyEngine.generateExplanationCard(proposed, policyResult);

    // Record immutable audit log
    auditRepository.create({
      log_id: `log_pol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      case_id: state.case_id,
      agent_step: 'POLICY_ENGINE',
      tool_name: 'policy_evaluator',
      input_summary: {
        agent_run_id: state.agent_run_id,
        original_strategy: policyResult.original_strategy,
        confidence: state.strategy_decision?.confidence,
      },
      output_summary: {
        decision: policyResult.decision,
        approved_strategy: policyResult.approved_strategy,
        rules_triggered: policyResult.rules_triggered,
        reason: policyResult.reason,
      },
      policy_result: {
        decision: policyResult.decision,
        policy_id: policyResult.policy_id,
        rules: policyResult.rules_triggered,
      },
      timestamp: new Date().toISOString(),
    });

    switch (policyResult.decision) {
      case 'ALLOW': {
        state.current_strategy = policyResult.approved_strategy as CaseStrategy;
        this.addTimelineEvent(
          state,
          'POLICY_ENGINE',
          'Policy Authorization: ALLOWED',
          `Authorized strategy ${policyResult.approved_strategy}. Rule: ${policyResult.rules_triggered.join(', ')}.`,
          'completed',
          { policyResult, card: state.policy_explanation_card }
        );
        break;
      }
      case 'MODIFY': {
        state.current_strategy = policyResult.approved_strategy as CaseStrategy;
        this.addTimelineEvent(
          state,
          'POLICY_ENGINE',
          'Policy Intervention: MODIFIED',
          `Modified from ${policyResult.original_strategy} to ${policyResult.approved_strategy}. Reason: ${policyResult.reason}`,
          'completed',
          { policyResult, card: state.policy_explanation_card }
        );
        break;
      }
      case 'ESCALATE': {
        state.current_strategy = 'ESCALATE';
        state.human_review_required = true;
        this.addTimelineEvent(
          state,
          'POLICY_ENGINE',
          'Policy Escalation: ESCALATE',
          `Escalated to human review. Reason: ${policyResult.reason}`,
          'completed',
          { policyResult, card: state.policy_explanation_card }
        );
        break;
      }
      case 'STOP': {
        state.current_strategy = 'STOP';
        state.termination_reason = policyResult.reason;
        this.addTimelineEvent(
          state,
          'POLICY_ENGINE',
          'Policy Termination: STOP',
          `Recovery stopped by policy. Reason: ${policyResult.reason}`,
          'completed',
          { policyResult, card: state.policy_explanation_card }
        );
        break;
      }
      case 'BLOCK': {
        state.current_strategy = null;
        state.termination_reason = policyResult.reason;
        this.addTimelineEvent(
          state,
          'POLICY_ENGINE',
          'Policy Violation: BLOCKED',
          `Action ${policyResult.original_strategy} blocked. Reason: ${policyResult.reason}`,
          'failed',
          { policyResult, card: state.policy_explanation_card }
        );
        break;
      }
    }

    return state;
  }

  /**
   * NODE 6: EXECUTE_ACTION
   * Maps strategy -> tool name strictly.
   */
  public async executeAction(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'EXECUTE_ACTION';
    state.status = 'ACTING';

    const strategy = state.current_strategy;
    if (!strategy) {
      state.status = 'FAILED';
      state.termination_reason = 'No valid strategy available to execute.';
      return state;
    }

    const context = state.case_context!;
    let toolResult: any;
    let toolName = '';

    try {
      switch (strategy) {
        case 'RETRY_PAYMENT': {
          toolName = 'retry_payment';
          const paymentId = (context.source as any)?.payment_id || context.case.source_id;
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            { payment_id: paymentId, case_id: state.case_id },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'SCHEDULE_RETRY': {
          toolName = 'schedule_payment_retry';
          const paymentId = (context.source as any)?.payment_id || context.case.source_id;
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            { payment_id: paymentId, case_id: state.case_id },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'PAYMENT_LINK': {
          toolName = 'generate_payment_link';
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            {
              customer_id: context.customer.customer_id,
              amount: context.revenue_at_risk,
              case_id: state.case_id,
            },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'PAYMENT_METHOD_UPDATE': {
          toolName = 'request_payment_method_update';
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            { customer_id: context.customer.customer_id, case_id: state.case_id },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'CUSTOMER_NOTIFICATION': {
          toolName = 'send_customer_notification';
          const message = `Hi ${context.customer.name}, your invoice of ₹${context.revenue_at_risk.toLocaleString()} is currently pending. Please click here to settle your account.`;
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            {
              customer_id: context.customer.customer_id,
              message,
              channel: context.preferred_channel || 'EMAIL',
              case_id: state.case_id,
            },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'ESCALATE': {
          toolName = 'escalate_to_human';
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            { case_id: state.case_id, reason: state.strategy_decision?.reason },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        case 'STOP': {
          toolName = 'stop_recovery';
          toolResult = await agentToolRegistry.executeTool(
            toolName,
            { case_id: state.case_id, reason: state.strategy_decision?.reason },
            state.agent_run_id,
            state.case_id
          );
          break;
        }
        default:
          throw new Error(`Unsupported strategy: ${strategy}`);
      }

      state.last_action = strategy;
      state.last_action_result = toolResult;

      const actionStatus =
        toolResult?.status === 'SUCCESS' || toolResult?.status === 'escalated' || toolResult?.status === 'stopped'
          ? 'SUCCESS'
          : 'FAILED';

      const actionRecord: ActionRecord = {
        iteration: state.iteration_count,
        action: strategy,
        tool_name: toolName,
        input: { case_id: state.case_id },
        output: toolResult,
        status: actionStatus,
        executed_at: new Date().toISOString(),
      };

      state.actions_taken.push(actionRecord);
      state.actions_remaining = Math.max(0, MAX_ACTIONS_PER_CASE - state.actions_taken.length);

      this.addTimelineEvent(
        state,
        'EXECUTE_ACTION',
        `Tool Executed: ${toolName}`,
        `Executed ${toolName} with status: ${toolResult.status || 'SUCCESS'}.`,
        actionStatus === 'SUCCESS' ? 'completed' : 'failed',
        toolResult
      );
    } catch (err: any) {
      state.last_action_result = { error: err.message };
      this.addTimelineEvent(
        state,
        'EXECUTE_ACTION',
        `Tool Execution Error: ${toolName}`,
        `Error executing tool: ${err.message}`,
        'failed'
      );
    }

    return state;
  }

  /**
   * NODE 7: VERIFY_RESULT
   * Verifies actual ledger state after tool execution.
   */
  public async verifyResult(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'VERIFY_RESULT';
    state.status = 'VERIFYING';

    const lastAction = state.last_action;
    const actionResult = state.last_action_result;
    const context = state.case_context!;

    let verificationState: VerificationResultState;

    if (lastAction === 'RETRY_PAYMENT') {
      const paymentId = (context.source as any)?.payment_id || context.case.source_id;
      const paymentStatus = await agentToolRegistry.executeTool(
        'check_payment_status',
        { payment_id: paymentId },
        state.agent_run_id,
        state.case_id
      );

      if (paymentStatus.status === 'SUCCESS') {
        verificationState = {
          state: 'SUCCESS',
          verified_payment_status: 'SUCCESS',
          amount_recovered: paymentStatus.amount || context.revenue_at_risk,
          verification_notes: 'Payment ledger confirmed SUCCESS. Revenue recovered.',
          timestamp: new Date().toISOString(),
        };
      } else {
        verificationState = {
          state: 'FAILED',
          verified_payment_status: 'FAILED',
          amount_recovered: 0,
          verification_notes: 'Payment retry failed on gateway. Revenue remains at risk.',
          timestamp: new Date().toISOString(),
        };
      }
    } else if (lastAction === 'ESCALATE') {
      verificationState = {
        state: 'ESCALATED',
        amount_recovered: 0,
        verification_notes: 'Case escalated for human review.',
        timestamp: new Date().toISOString(),
      };
    } else if (lastAction === 'STOP') {
      verificationState = {
        state: 'STOPPED',
        amount_recovered: 0,
        verification_notes: 'Recovery terminated.',
        timestamp: new Date().toISOString(),
      };
    } else {
      // Pending actions (Payment links, Schedules, Notifications, Method updates)
      verificationState = {
        state: 'PENDING',
        amount_recovered: 0,
        verification_notes: `Intervention dispatched (${lastAction}). Awaiting customer response.`,
        timestamp: new Date().toISOString(),
      };
    }

    state.verification_result = verificationState;
    state.amount_recovered = verificationState.amount_recovered;

    this.addTimelineEvent(
      state,
      'VERIFY_RESULT',
      `Verification: ${verificationState.state}`,
      verificationState.verification_notes || '',
      verificationState.state === 'FAILED' ? 'failed' : 'completed',
      verificationState as any
    );

    return state;
  }

  /**
   * NODE 8: RE_EVALUATE
   * Authoritative backend assessment: Decide whether to complete, continue loop, escalate, or stop.
   */
  public async reEvaluate(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'RE_EVALUATE';
    state.status = 'RE_EVALUATING';

    const verification = state.verification_result;

    if (!verification) {
      state.status = 'FAILED';
      state.termination_reason = 'Verification result missing during re-evaluation.';
      return state;
    }

    // 1. Success -> Route to Complete
    if (verification.state === 'SUCCESS') {
      return this.complete(state);
    }

    // 2. Escalated -> Route to Escalate
    if (verification.state === 'ESCALATED') {
      return this.escalate(state);
    }

    // 3. Stopped -> Route to Stop
    if (verification.state === 'STOPPED') {
      return this.stop(state);
    }

    // 4. Check iteration limits
    if (state.iteration_count >= MAX_AGENT_ITERATIONS) {
      state.termination_reason = 'MAX_ITERATIONS_REACHED';
      this.addTimelineEvent(
        state,
        'RE_EVALUATE',
        'Iteration Cap Reached',
        `Reached maximum allowed iterations (${MAX_AGENT_ITERATIONS}). Routing to terminal STOP/ESCALATE.`
      );
      if (state.case_context && state.case_context.revenue_at_risk > 10000) {
        return this.escalate(state);
      }
      return this.stop(state);
    }

    // 5. If action was PENDING (e.g. Schedule, Payment link, Method update, Notification dispatched),
    // we complete the active agent run safely with status OPEN/PENDING
    if (verification.state === 'PENDING') {
      state.status = 'RECOVERED';
      state.final_outcome = 'INTERVENTION_DISPATCHED';
      state.summary = `Recovery intervention (${state.last_action}) successfully initiated. Customer action or scheduled trigger pending.`;
      this.addTimelineEvent(
        state,
        'RE_EVALUATE',
        'Intervention Active',
        state.summary
      );
      return state;
    }

    // 6. Action FAILED -> Re-investigate and continue loop (REASON again)
    if (verification.state === 'FAILED') {
      this.addTimelineEvent(
        state,
        'RE_EVALUATE',
        'Re-Evaluating Failed Attempt',
        'Previous action was unsuccessful. Refreshing investigation context and returning to Reasoning node.'
      );
      // Refresh case context
      state.case_context = await agentToolRegistry.executeTool(
        'get_case_context',
        { case_id: state.case_id },
        state.agent_run_id,
        state.case_id
      );
    }

    return state;
  }

  /**
   * NODE 9: COMPLETE
   */
  public async complete(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'COMPLETE';
    state.status = 'RECOVERED';
    state.final_outcome = 'PAYMENT_RECOVERED';
    state.summary = `Revenue of ₹${state.amount_recovered.toLocaleString()} successfully recovered via ${
      state.last_action
    }.`;

    recoveryCaseRepository.update(state.case_id, {
      status: 'RECOVERED',
      current_strategy: state.current_strategy || 'RETRY_PAYMENT',
      resolved_at: new Date().toISOString(),
    });

    this.addTimelineEvent(
      state,
      'COMPLETE',
      'Recovery Complete',
      state.summary,
      'completed',
      { amount_recovered: state.amount_recovered }
    );

    return state;
  }

  /**
   * NODE 10: ESCALATE
   */
  public async escalate(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'ESCALATE';
    state.status = 'ESCALATED';
    state.final_outcome = 'ESCALATED_FOR_HUMAN_REVIEW';
    state.summary = `Case escalated to human review queue. Reason: ${
      state.strategy_decision?.reason || state.termination_reason || 'Automated policy threshold reached.'
    }`;

    recoveryCaseRepository.update(state.case_id, {
      status: 'ESCALATED',
      current_strategy: 'ESCALATE',
    });

    this.addTimelineEvent(
      state,
      'ESCALATE',
      'Case Escalated',
      state.summary,
      'completed'
    );

    return state;
  }

  /**
   * NODE 11: STOP
   */
  public async stop(state: ReviveAgentState): Promise<ReviveAgentState> {
    state.current_node = 'STOP';
    state.status = 'STOPPED';
    state.final_outcome = 'RECOVERY_STOPPED';
    state.summary = `Recovery workflow stopped. Reason: ${
      state.termination_reason || state.strategy_decision?.reason || 'Terminated by agent.'
    }`;

    recoveryCaseRepository.update(state.case_id, {
      status: 'CLOSED',
      current_strategy: 'STOP',
      resolved_at: new Date().toISOString(),
    });

    this.addTimelineEvent(
      state,
      'STOP',
      'Recovery Stopped',
      state.summary,
      'completed'
    );

    return state;
  }
}

export const agentNodes = new ReviveAgentNodes();
