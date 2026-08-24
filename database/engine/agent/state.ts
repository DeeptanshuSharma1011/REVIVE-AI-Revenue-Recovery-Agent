/**
 * @license
 * REVIVE — LangGraph & Agent State Definitions
 * Phase 5 — Agentic Orchestration
 */

import {
  InvestigationContext,
  DiagnosisResult,
  StrategyDecision,
  CaseStrategy,
  CaseStatus,
  ActionType,
  TimelineStep,
} from '../types';
import { PolicyResult, PolicyExplanationCard } from '../policy/types';

export type AgentNodeName =
  | 'LOAD_CASE'
  | 'INVESTIGATE'
  | 'DIAGNOSE'
  | 'REASON'
  | 'VALIDATE_DECISION'
  | 'POLICY_ENGINE'
  | 'EXECUTE_ACTION'
  | 'VERIFY_RESULT'
  | 'RE_EVALUATE'
  | 'COMPLETE'
  | 'ESCALATE'
  | 'STOP';

export type AgentStatusType =
  | 'OBSERVING'
  | 'INVESTIGATING'
  | 'REASONING'
  | 'ACTING'
  | 'VERIFYING'
  | 'RE_EVALUATING'
  | 'RECOVERED'
  | 'ESCALATED'
  | 'STOPPED'
  | 'FAILED';

export interface ActionRecord {
  iteration: number;
  action: CaseStrategy | ActionType;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  executed_at: string;
}

export interface VerificationResultState {
  state: 'SUCCESS' | 'FAILED' | 'ESCALATED' | 'STOPPED' | 'PENDING';
  verified_payment_status?: string;
  amount_recovered: number;
  verification_notes?: string;
  timestamp: string;
}

export interface AgentRunTimelineEvent {
  id: string;
  timestamp: string;
  node: AgentNodeName;
  title: string;
  description: string;
  status: 'completed' | 'failed' | 'in_progress';
  data?: Record<string, unknown>;
}

export interface ReviveAgentState {
  agent_run_id: string;
  case_id: string;
  status: AgentStatusType;
  current_node: AgentNodeName;

  // Context & Diagnostic state
  case_context: InvestigationContext | null;
  diagnosis: DiagnosisResult | null;

  // Reasoning & Strategy state
  current_strategy: CaseStrategy | null;
  original_strategy?: string | null;
  strategy_decision: StrategyDecision | null;
  decision_source: 'GEMINI' | 'DETERMINISTIC_FALLBACK' | 'DETERMINISTIC';
  confidence: number;
  human_review_required: boolean;

  // Policy Engine Evaluation (Phase 6)
  policy_result?: PolicyResult | null;
  policy_explanation_card?: PolicyExplanationCard | null;

  // Execution & Verification
  last_action: CaseStrategy | ActionType | null;
  last_action_result: Record<string, unknown> | null;
  verification_result: VerificationResultState | null;

  // Iteration & Action guards
  actions_taken: ActionRecord[];
  actions_remaining: number;
  iteration_count: number;
  max_iterations: number;

  // Safety & Terminal outcomes
  termination_reason?: string;
  final_outcome: string | null;
  amount_recovered: number;
  summary: string;

  // Real timeline
  timeline: AgentRunTimelineEvent[];
}

export interface AgentRunResult {
  agent_run_id: string;
  case_id: string;
  status: 'RECOVERED' | 'ESCALATED' | 'STOPPED' | 'FAILED';
  final_outcome: string;
  amount_recovered: number;
  actions_taken: number;
  iterations: number;
  decision_source: 'GEMINI' | 'DETERMINISTIC_FALLBACK' | 'DETERMINISTIC';
  confidence: number;
  diagnosis: string;
  original_strategy?: string;
  approved_strategy?: string;
  policy_result?: PolicyResult;
  policy_explanation_card?: PolicyExplanationCard;
  summary: string;
  explanation: string;
  termination_reason?: string;
  timeline: AgentRunTimelineEvent[];
  simulated: boolean;
}

export interface AgentMetrics {
  total_agent_runs: number;
  agent_successes: number;
  agent_failures: number;
  agent_escalations: number;
  agent_stops: number;
  single_step_recovery_rate: number;
  multi_step_recovery_rate: number;
  average_steps_to_recovery: number;
  recovery_after_re_evaluation: number;
  repeated_action_prevention: number;
  recovery_rate: number;
  revenue_recovered: number;
  average_iterations: number;
  average_actions: number;
  decision_agreement: number;
  fallback_rate: number;
  low_confidence_rate: number;
  // Safety Metrics
  max_iteration_terminations: number;
  invalid_decision_blocks: number;
  low_confidence_escalations: number;
  duplicate_action_preventions: number;
  tool_failures: number;
}
