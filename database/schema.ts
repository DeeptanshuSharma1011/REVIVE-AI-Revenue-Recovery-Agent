/**
 * @license
 * REVIVE — Revenue Intelligence & Value Intervention for Viable Earnings
 * Phase 1 — Data Foundation Models & Types
 */

export type CustomerSegment = 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
export type CommunicationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  segment: CustomerSegment;
  lifetime_value: number;
  preferred_channel: CommunicationChannel;
  created_at: string;
}

export type SubscriptionCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PAST_DUE';

export interface Subscription {
  subscription_id: string;
  customer_id: string;
  plan_name: string;
  amount: number;
  billing_cycle: SubscriptionCycle;
  status: SubscriptionStatus;
  next_billing_date: string;
  created_at: string;
}

export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
export type PaymentFailureReason =
  | 'insufficient_funds'
  | 'expired_card'
  | 'bank_timeout'
  | 'payment_method_error'
  | 'temporary_failure'
  | 'unknown'
  | null;
export type PaymentMethod = 'CARD' | 'UPI' | 'NETBANKING' | 'WALLET';

export interface Payment {
  payment_id: string;
  customer_id: string;
  subscription_id: string | null;
  amount: number;
  status: PaymentStatus;
  failure_reason: PaymentFailureReason;
  attempt_number: number;
  payment_method: PaymentMethod;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  invoice_id: string;
  customer_id: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  days_overdue: number;
  last_reminder_at: string | null;
  created_at: string;
}

export type CheckoutEventType =
  | 'CHECKOUT_STARTED'
  | 'PAYMENT_PAGE_REACHED'
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_SUCCESS'
  | 'CHECKOUT_ABANDONED';

export interface CheckoutEvent {
  event_id: string;
  customer_id: string;
  session_id: string;
  cart_value: number;
  event_type: CheckoutEventType;
  timestamp: string;
}

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

export interface RecoveryCase {
  case_id: string;
  customer_id: string;
  source_type: CaseSourceType;
  source_id: string;
  revenue_at_risk: number;
  priority: CasePriority;
  status: CaseStatus;
  current_strategy: CaseStrategy;
  scenario_tag?: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type ActionType =
  | 'RETRY_PAYMENT'
  | 'SCHEDULE_RETRY'
  | 'GENERATE_PAYMENT_LINK'
  | 'SEND_NOTIFICATION'
  | 'REQUEST_PAYMENT_METHOD_UPDATE'
  | 'ESCALATE'
  | 'STOP';

export type ActionStatus = 'PENDING' | 'EXECUTED' | 'SUCCESS' | 'FAILED' | 'BLOCKED';

export interface RecoveryAction {
  action_id: string;
  case_id: string;
  action_type: ActionType;
  reason: string;
  status: ActionStatus;
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
