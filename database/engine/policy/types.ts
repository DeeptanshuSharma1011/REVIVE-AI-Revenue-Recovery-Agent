/**
 * @license
 * REVIVE — Policy Engine & Guardrails Type Definitions
 * Phase 6 — Policy Engine & Guardrails
 */

import { CaseStrategy, CaseStatus } from '../types';

export type PolicyDecision = 'ALLOW' | 'BLOCK' | 'MODIFY' | 'ESCALATE' | 'STOP';

export type PolicyRuleId =
  | 'MAX_RETRIES_EXCEEDED'
  | 'MAX_ACTIONS_EXCEEDED'
  | 'HIGH_VALUE_TRANSACTION'
  | 'LOW_AI_CONFIDENCE'
  | 'DUPLICATE_ACTION'
  | 'CASE_ALREADY_RECOVERED'
  | 'CASE_ALREADY_ESCALATED'
  | 'CASE_ALREADY_STOPPED'
  | 'PAYMENT_ALREADY_SUCCESSFUL'
  | 'INVALID_STRATEGY'
  | 'INCOMPATIBLE_ACTION'
  | 'MISSING_REQUIRED_DATA'
  | 'CONTACT_LIMIT_EXCEEDED'
  | 'RECOVERY_WINDOW_EXCEEDED'
  | 'DEFAULT_ALLOW';

export interface ProposedDecision {
  strategy: string;
  confidence?: number;
  reason?: string;
  decision_source?: 'GEMINI' | 'DETERMINISTIC' | 'DETERMINISTIC_FALLBACK';
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  requires_human_review?: boolean;
}

export interface PolicyResult {
  decision: PolicyDecision;
  original_strategy: string;
  approved_strategy: string | null;
  reason: string;
  policy_id: string;
  rules_triggered: PolicyRuleId[];
  requires_human_review: boolean;
  explanation: string;
}

export interface PolicyExplanationCard {
  title: string;
  ai_recommended: string;
  revive_policy: string;
  because: string;
  result: string;
}

export interface PolicyEvaluationAuditRecord {
  agent_run_id: string;
  case_id: string;
  policy_version: string;
  original_strategy: string;
  approved_strategy: string | null;
  decision: PolicyDecision;
  rules_triggered: PolicyRuleId[];
  reason: string;
  timestamp: string;
}

export interface PolicyMetrics {
  policy_evaluations: number;
  policy_allowed: number;
  policy_modified: number;
  policy_blocked: number;
  policy_escalated: number;
  policy_stopped: number;
  policy_override_rate: number;
  policy_block_rate: number;
  policy_modification_rate: number;
  low_confidence_escalations: number;
  high_value_escalations: number;
  duplicate_action_blocks: number;
  max_retry_blocks: number;
  // Autonomy Metrics
  automated_actions: number;
  policy_blocked_actions: number;
  policy_modified_actions: number;
  policy_escalations: number;
  autonomous_action_rate: number;
  guardrail_intervention_rate: number;
  // Revenue Safety Metrics (Simulated)
  revenue_at_risk_blocked: number;
  revenue_at_risk_escalated: number;
  revenue_recovered: number;
  revenue_prevented_from_unsafe_action: number;
}
