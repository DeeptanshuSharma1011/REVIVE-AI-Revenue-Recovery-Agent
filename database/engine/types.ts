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
