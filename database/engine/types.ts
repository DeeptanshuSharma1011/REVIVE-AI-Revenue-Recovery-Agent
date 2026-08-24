/**
 * @license
 * REVIVE — Deterministic Recovery Engine Types
 * Phase 3 — Deterministic Recovery Engine
 */

import {
  Customer,
  Subscription,
  Payment,
  Invoice,
  CheckoutEvent,
  RecoveryCase,
  RecoveryAction,
  CaseSourceType,
  CaseStrategy,
  CaseStatus,
  ActionType,
  CustomerSegment,
  CommunicationChannel,
} from '../schema';

export type {
  Customer,
  Subscription,
  Payment,
  Invoice,
  CheckoutEvent,
  RecoveryCase,
  RecoveryAction,
  CaseSourceType,
  CaseStrategy,
  CaseStatus,
  ActionType,
  CustomerSegment,
  CommunicationChannel,
};

export interface InvestigationContext {
  case_id: string;
  case: RecoveryCase;
  customer: Customer;
  source_type: CaseSourceType;
  source: Payment | Invoice | CheckoutEvent | null;
  subscription: Subscription | null;
  payment_history: Payment[];
  historical_invoices: Invoice[];
  checkout_history: CheckoutEvent[];
  previous_actions: RecoveryAction[];
  revenue_at_risk: number;
  days_overdue?: number;
  attempt_number?: number;
  cart_value?: number;
  customer_segment: CustomerSegment;
  lifetime_value: number;
  preferred_channel: CommunicationChannel;
  successful_past_payments_count: number;
  failed_past_payments_count: number;
  successful_past_invoices_count: number;
}

export type DiagnosisCode =
  | 'TEMPORARY_PAYMENT_FAILURE'
  | 'EXPIRED_PAYMENT_METHOD'
  | 'INSUFFICIENT_FUNDS'
  | 'CHECKOUT_ABANDONMENT'
  | 'OVERDUE_INVOICE'
  | 'HIGH_VALUE_DELINQUENCY'
  | 'MAX_RETRIES_EXCEEDED'
  | 'ALREADY_RECOVERED'
  | 'NO_RECOVERY_REQUIRED';

export interface DiagnosisResult {
  diagnosis: DiagnosisCode;
  summary: string;
  details: Record<string, unknown>;
  confidence: number;
}

export type DecisionSource = 'GEMINI' | 'DETERMINISTIC' | 'DETERMINISTIC_FALLBACK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AIDecisionOutput {
  strategy: CaseStrategy;
  confidence: number;
  risk_level: RiskLevel;
  reason: string;
  explanation: string;
  suggested_parameters?: {
    scheduled_delay_hours?: number;
    message_channel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
    custom_message?: string;
    discount_offered?: boolean;
    suggested_discount_percent?: number;
  };
  requires_human_review: boolean;
  missing_information: string[];
}

export interface StrategyDecision {
  strategy: CaseStrategy;
  reason: string;
  explanation: string;
  parameters?: Record<string, unknown>;
  decision_source?: DecisionSource;
  confidence?: number;
  risk_level?: RiskLevel;
  requires_human_review?: boolean;
  model?: string;
  prompt_version?: string;
  raw_model_response?: string;
  validation_passed?: boolean;
  fallback_reason?: string;
}

export interface StrategyProvider {
  readonly name: string;
  selectStrategy(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): Promise<StrategyDecision> | StrategyDecision;
}

export interface AIEvaluationScenarioResult {
  scenario_tag: string;
  case_id: string;
  customer_name: string;
  source_type: CaseSourceType;
  revenue_at_risk: number;
  ground_truth_strategy: CaseStrategy | string;
  deterministic_strategy: CaseStrategy;
  ai_strategy: CaseStrategy;
  ai_confidence: number;
  ai_risk_level: RiskLevel;
  ai_reason: string;
  decision_source: DecisionSource;
  agreement: boolean;
  requires_human_review: boolean;
  execution_time_ms: number;
}

export interface AIEvaluationReport {
  timestamp: string;
  model: string;
  prompt_version: string;
  confidence_threshold: number;
  total_scenarios: number;
  agreements_count: number;
  agreement_rate_percent: number;
  average_confidence: number;
  low_confidence_count: number;
  fallback_count: number;
  scenarios: AIEvaluationScenarioResult[];
}

export interface ExecutionResult {
  action_type: ActionType;
  status: string;
  action_id?: string;
  details: Record<string, unknown>;
  simulated: boolean;
}

export type VerificationState = 'SUCCESS' | 'FAILED' | 'PENDING' | 'ESCALATED' | 'STOPPED';

export interface VerificationResult {
  state: VerificationState;
  verified_payment_status?: string;
  verified_recovery_status: CaseStatus;
  amount_recovered: number;
  simulated: boolean;
  verification_notes: string;
}

export type StepName =
  | 'DETECTION'
  | 'INVESTIGATION'
  | 'DIAGNOSIS'
  | 'STRATEGY_SELECTION'
  | 'ACTION_EXECUTION'
  | 'VERIFICATION'
  | 'OUTCOME';

export interface TimelineStep {
  step: StepName;
  status: 'completed' | 'failed' | 'in_progress' | 'skipped';
  title: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface RecoveryProcessResult {
  case_id: string;
  status: CaseStatus | 'already_resolved' | 'error';
  strategy: CaseStrategy;
  amount_recovered: number;
  actions_taken: number;
  diagnosis: string;
  summary: string;
  decision_explanation: string;
  timeline: TimelineStep[];
  details?: Record<string, unknown>;
  message?: string;
  simulated: true;
}

export interface EngineMetrics {
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  cases_processed: number;
  cases_recovered: number;
  cases_escalated: number;
  cases_stopped: number;
  cases_open: number;
  average_actions_per_case: number;
  simulated: true;
}

// -------------------------------------------------------------
// Phase 7: Evaluation & Revenue Intelligence Types
// -------------------------------------------------------------

export interface EvaluationScenarioSummary {
  scenario_id: string;
  scenario_name: string;
  category: string;
  description: string;
  total_cases: number;
  recovered_cases: number;
  recovery_rate: number;
  revenue_at_risk: number;
  revenue_recovered: number;
  revenue_recovery_rate: number;
  avg_actions: number;
  escalation_rate: number;
  deterministic_recovery_rate: number;
  lift: number;
}

export interface BaselineComparison {
  deterministic_recovery_rate: number;
  revive_recovery_rate: number;
  deterministic_revenue_recovery_rate: number;
  revive_revenue_recovery_rate: number;
  deterministic_revenue_recovered: number;
  revive_revenue_recovered: number;
  recovery_rate_lift: number;
  revenue_recovery_lift: number;
  relative_recovery_improvement: number;
  avg_actions_deterministic: number;
  avg_actions_revive: number;
  escalation_rate_deterministic: number;
  escalation_rate_revive: number;
}

export interface EvaluationCaseResult {
  case_id: string;
  agent_run_id: string;
  scenario_id: string;
  customer_name: string;
  source_type: string;
  revenue_at_risk: number;
  revenue_recovered: number;
  final_status: string;
  recovery_success: boolean;
  actions_taken: number;
  iterations: number;
  time_to_resolution_ms: number;
  human_intervention: boolean;
  policy_interventions: number;
  ai_decisions: number;
  ai_confidence_average: number;
  deterministic_outcome: {
    status: string;
    strategy: string;
    revenue_recovered: number;
    actions_count: number;
    recovery_success: boolean;
  };
  agent_outcome: {
    status: string;
    strategy: string;
    revenue_recovered: number;
    actions_count: number;
    recovery_success: boolean;
    re_evaluation_recovery: boolean;
    policy_decision?: string;
  };
  evaluation_timestamp: string;
}

export interface EvaluationRun {
  evaluation_run_id: string;
  run_name: string;
  started_at: string;
  completed_at: string;
  agent_version: string;
  policy_version: string;
  prompt_version: string;
  total_cases: number;
  completed_cases: number;
  successful_recoveries: number;
  escalated_cases: number;
  stopped_cases: number;
  failed_cases: number;
  
  // Primary Business Metrics
  revenue_at_risk: number;
  revenue_recovered: number;
  revenue_remaining_at_risk: number;
  recovery_rate: number;
  revenue_recovery_rate: number;
  
  // Agentic Metrics
  multi_step_recovery_rate: number;
  first_action_recovery_rate: number;
  re_evaluation_recovery_rate: number;
  avg_actions_to_recovery: number;
  avg_iterations: number;
  recovery_after_reevaluation_count: number;
  
  // AI Decision Metrics
  ai_decisions_count: number;
  avg_ai_confidence: number;
  low_confidence_rate: number;
  ai_fallback_rate: number;
  
  // Policy Metrics
  policy_evaluations: number;
  policy_allowed: number;
  policy_modified: number;
  policy_blocked: number;
  policy_escalated: number;
  policy_stopped: number;
  guardrail_intervention_rate: number;
  policy_modification_rate: number;
  policy_block_rate: number;
  high_value_escalation_rate: number;
  
  // Safety Metrics Breakdown
  safety_metrics: {
    duplicate_action_blocks: number;
    max_retry_blocks: number;
    max_action_terminations: number;
    low_confidence_escalations: number;
    high_value_escalations: number;
    invalid_strategy_blocks: number;
    incompatible_action_blocks: number;
    missing_data_blocks: number;
    customer_contact_limit_interventions: number;
    recovery_window_interventions: number;
  };
  
  // Baseline Comparison
  baseline_comparison: BaselineComparison;
  
  // Operational Efficiency Metrics
  operational_efficiency: {
    gemini_calls_per_recovered_case: number;
    actions_per_recovered_case: number;
    policy_evaluations_per_recovered_case: number;
    verification_calls_per_recovered_case: number;
  };
  
  // Scenario Performance & Case Details
  scenario_performance: EvaluationScenarioSummary[];
  cases: EvaluationCaseResult[];
  simulated: true;
}

export interface EvaluationRunSummary {
  evaluation_run_id: string;
  run_name: string;
  started_at: string;
  completed_at: string;
  total_cases: number;
  successful_recoveries: number;
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  revenue_recovery_rate: number;
  guardrail_intervention_rate: number;
  recovery_rate_lift: number;
}

