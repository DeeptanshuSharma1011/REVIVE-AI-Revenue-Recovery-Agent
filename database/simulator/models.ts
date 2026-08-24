/**
 * @license
 * REVIVE — Recovery Simulator Models
 * Phase 2 — Recovery Simulator
 */

import {
  Payment,
  RecoveryCase,
  RecoveryAction,
  AuditLog,
  Customer,
  CommunicationChannel,
  PaymentStatus,
  PaymentFailureReason,
} from '../schema';

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
  channel: CommunicationChannel;
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

// Action Responses
export interface RetryPaymentResponse {
  action: 'retry_payment';
  status: 'success' | 'failed';
  payment_id: string;
  amount: number;
  amount_recovered: number;
  attempt_number: number;
  failure_reason: PaymentFailureReason;
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
  channel: CommunicationChannel;
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

// Verification Responses
export interface PaymentStatusVerification {
  payment_id: string;
  customer_id: string;
  status: PaymentStatus;
  amount: number;
  attempt_number: number;
  failure_reason: PaymentFailureReason;
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
