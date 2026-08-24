export type AgentStatusType =
  | 'READY'
  | 'INVESTIGATING'
  | 'REASONING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERED'
  | 'ESCALATED'
  | 'ERROR';

export type NavTab = 'overview' | 'cases' | 'simulator' | 'ground_truth' | 'live_agent' | 'policy_guardrails' | 'analytics' | 'human_review';

export interface SimulatedPaymentLink {
  link_id: string;
  customer_id: string;
  amount: number;
  payment_url: string;
  case_id?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  created_at: string;
  simulated: true;
}

export interface SimulatedNotification {
  notification_id: string;
  customer_id: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  message: string;
  case_id?: string;
  delivery_status: 'DELIVERED' | 'FAILED';
  sent_at: string;
  simulated: true;
}

export interface SimulatedPaymentMethodUpdateRequest {
  request_id: string;
  customer_id: string;
  case_id?: string;
  update_url: string;
  status: 'REQUESTED' | 'COMPLETED' | 'EXPIRED';
  created_at: string;
  completed_at?: string;
  simulated: true;
}

export interface SimulatedScheduledRetry {
  schedule_id: string;
  payment_id: string;
  case_id?: string;
  scheduled_for: string;
  status: 'SCHEDULED' | 'EXECUTED' | 'CANCELLED';
  created_at: string;
  simulated: true;
}

export interface RetryPaymentResponse {
  action: 'retry_payment';
  status: 'success' | 'failed';
  payment_id: string;
  amount: number;
  amount_recovered: number;
  attempt_number: number;
  failure_reason: string | null;
  case_id?: string;
  case_status?: string;
  simulated: true;
  message: string;
}

export interface ScheduleRetryResponse {
  action: 'schedule_payment_retry';
  status: 'scheduled';
  payment_id: string;
  scheduled_for: string;
  case_id?: string;
  schedule_id: string;
  simulated: true;
  message: string;
}

export interface GeneratePaymentLinkResponse {
  action: 'generate_payment_link';
  status: 'success';
  customer_id: string;
  amount: number;
  payment_link_id: string;
  payment_url: string;
  case_id?: string;
  simulated: true;
  message: string;
}

export interface SendNotificationResponse {
  action: 'send_customer_notification';
  status: 'sent';
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  customer_id: string;
  case_id?: string;
  notification_id: string;
  simulated: true;
  message: string;
}

export interface PaymentMethodUpdateResponse {
  action: 'request_payment_method_update';
  status: 'requested';
  customer_id: string;
  request_id: string;
  update_url: string;
  case_id?: string;
  simulated: true;
  message: string;
}

export interface EscalateResponse {
  action: 'escalate_to_human';
  status: 'escalated';
  case_id: string;
  reason: string;
  revenue_at_risk: number;
  simulated: true;
  message: string;
}

export interface StopRecoveryResponse {
  action: 'stop_recovery';
  status: 'stopped';
  case_id: string;
  reason: string;
  simulated: true;
  message: string;
}

export interface PaymentStatusVerification {
  payment_id: string;
  customer_id: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  amount: number;
  attempt_number: number;
  failure_reason: string | null;
  payment_method: string;
  updated_at: string;
  simulated: true;
}

export interface RecoveryStatusVerification {
  case_id: string;
  customer_id: string;
  source_type: string;
  status: string;
  revenue_at_risk: number;
  amount_recovered: number;
  current_strategy: string | null;
  scenario_tag?: string | null;
  action_count: number;
  audit_count: number;
  resolved_at: string | null;
  simulated: true;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  phase: string;
  timestamp: string;
  strategyMode?: 'deterministic' | 'ai';
  environment?: string;
  database?: {
    status: string;
    database: string;
    connected: boolean;
    counts: Record<string, number>;
    seed: number;
    lastSeededAt: string | null;
  };
}

export interface ApiInfoResponse {
  service: string;
  name: string;
  category: string;
  phase: string;
  status: string;
  version: string;
  endpoints: Record<string, string>;
}

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  segment: 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  lifetime_value: number;
  preferred_channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  created_at: string;
}

export interface Subscription {
  subscription_id: string;
  customer_id: string;
  plan_name: string;
  amount: number;
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE';
  next_billing_date: string;
  created_at: string;
}

export interface Payment {
  payment_id: string;
  customer_id: string;
  subscription_id: string | null;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
  failure_reason:
    | 'insufficient_funds'
    | 'expired_card'
    | 'bank_timeout'
    | 'payment_method_error'
    | 'temporary_failure'
    | 'unknown'
    | null;
  attempt_number: number;
  payment_method: 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  invoice_id: string;
  customer_id: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  days_overdue: number;
  last_reminder_at: string | null;
  created_at: string;
}

export interface CheckoutEvent {
  event_id: string;
  customer_id: string;
  session_id: string;
  cart_value: number;
  event_type:
    | 'CHECKOUT_STARTED'
    | 'PAYMENT_PAGE_REACHED'
    | 'PAYMENT_INITIATED'
    | 'PAYMENT_SUCCESS'
    | 'CHECKOUT_ABANDONED';
  timestamp: string;
}

export interface RecoveryCase {
  case_id: string;
  customer_id: string;
  source_type: 'PAYMENT' | 'CHECKOUT' | 'INVOICE';
  source_id: string;
  revenue_at_risk: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'ACTION_PENDING' | 'RECOVERED' | 'ESCALATED' | 'CLOSED';
  current_strategy: string | null;
  scenario_tag?: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface RecoveryAction {
  action_id: string;
  case_id: string;
  action_type: string;
  reason: string;
  status: 'PENDING' | 'EXECUTED' | 'SUCCESS' | 'FAILED' | 'BLOCKED';
  executed_at: string;
  result: Record<string, unknown>;
  amount_recovered: number;
}

export interface AuditLog {
  log_id: string;
  case_id: string;
  agent_step: string;
  tool_name: string;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  policy_result: Record<string, unknown>;
  timestamp: string;
}

export interface RecoveryCaseDetails {
  case: RecoveryCase;
  customer: Customer | null;
  sourceDetails: Payment | Invoice | CheckoutEvent | null;
  actions: RecoveryAction[];
  auditLogs: AuditLog[];
  relatedPayments: Payment[];
}

export interface CustomerFullProfile {
  customer: Customer;
  subscriptions: Subscription[];
  payments: Payment[];
  invoices: Invoice[];
  checkoutEvents: CheckoutEvent[];
  recoveryCases: RecoveryCase[];
  metrics: {
    totalRevenuePaid: number;
    failedPaymentCount: number;
    overdueInvoiceAmount: number;
    activeSubscriptionCount: number;
    riskScore: number;
  };
}

export interface RecoveryMetrics {
  totalRevenueAtRisk: number;
  totalRecoveredRevenue: number;
  recoveryRatePercent: number;
  openCasesCount: number;
  recoveredCasesCount: number;
  escalatedCasesCount: number;
  breakdownBySource: Record<string, { count: number; atRisk: number; recovered: number }>;
  breakdownByPriority: Record<string, number>;
}

export interface GroundTruthScenario {
  tag: string;
  caseId: string;
  description: string;
  expectedStrategy: string;
  caseDetails: RecoveryCaseDetails | null;
}

export interface AgentStatusResponse {
  status: AgentStatusType;
  currentCaseId: string | null;
  currentStep: string | null;
  lastUpdated: string;
  phase: string;
}

export type CustomerSegment = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
export type CommunicationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type CaseSourceType = 'PAYMENT' | 'CHECKOUT' | 'INVOICE';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'ACTION_PENDING'
  | 'RECOVERED'
  | 'ESCALATED'
  | 'CLOSED';
export type CaseStrategy =
  | 'RETRY_PAYMENT'
  | 'SCHEDULE_RETRY'
  | 'PAYMENT_LINK'
  | 'PAYMENT_METHOD_UPDATE'
  | 'CUSTOMER_NOTIFICATION'
  | 'ESCALATE'
  | 'STOP'
  | null;

export interface TimelineStepConfig {
  key: string;
  label: string;
  description: string;
  status: 'idle' | 'in_progress' | 'active' | 'completed' | 'failed' | 'blocked' | 'skipped';
}

export type TimelineStep =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'DIAGNOSING'
  | 'STRATEGY'
  | 'POLICY'
  | 'ACTION'
  | 'VERIFY'
  | 'OUTCOME';

export interface EngineTimelineStep {
  step: 'DETECTION' | 'INVESTIGATION' | 'DIAGNOSIS' | 'STRATEGY_SELECTION' | 'ACTION_EXECUTION' | 'VERIFICATION' | 'OUTCOME';
  status: 'completed' | 'failed' | 'in_progress' | 'skipped';
  title: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

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

export interface DiagnosisResult {
  case_id?: string;
  diagnosis: string;
  summary: string;
  details: Record<string, unknown>;
  confidence: number;
}

export type DecisionSource = 'GEMINI' | 'DETERMINISTIC' | 'DETERMINISTIC_FALLBACK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StrategyDecision {
  case_id?: string;
  diagnosis?: string;
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

export interface AIStatusResponse {
  available: boolean;
  model: string;
  confidence_threshold: number;
  prompt_version: string;
  has_api_key: boolean;
}

export interface AIEvaluationScenarioResult {
  scenario_tag: string;
  case_id: string;
  customer_name: string;
  source_type: CaseSourceType;
  revenue_at_risk: number;
  ground_truth_strategy: CaseStrategy;
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

export interface RecoveryProcessResult {
  case_id: string;
  status: CaseStatus | 'already_resolved' | 'error';
  strategy: CaseStrategy;
  amount_recovered: number;
  actions_taken: number;
  diagnosis: string;
  summary: string;
  decision_explanation: string;
  timeline: EngineTimelineStep[];
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
  automated_actions: number;
  policy_blocked_actions: number;
  policy_modified_actions: number;
  policy_escalations: number;
  autonomous_action_rate: number;
  guardrail_intervention_rate: number;
  revenue_at_risk_blocked: number;
  revenue_at_risk_escalated: number;
  revenue_recovered: number;
  revenue_prevented_from_unsafe_action: number;
}

export interface PolicyConfig {
  MAX_PAYMENT_RETRIES: number;
  MAX_ACTIONS_PER_CASE: number;
  HIGH_VALUE_THRESHOLD: number;
  AI_CONFIDENCE_THRESHOLD: number;
  MAX_CUSTOMER_CONTACTS: number;
  RECOVERY_WINDOW_DAYS: number;
  POLICY_VERSION: string;
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

export interface AgentRunTimelineEvent {
  id: string;
  timestamp: string;
  node: AgentNodeName;
  title: string;
  description: string;
  status: 'completed' | 'failed' | 'in_progress';
  data?: Record<string, unknown>;
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
  max_iteration_terminations: number;
  invalid_decision_blocks: number;
  low_confidence_escalations: number;
  duplicate_action_preventions: number;
  tool_failures: number;
}

