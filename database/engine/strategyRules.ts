/**
 * @license
 * REVIVE — Stage 4: Strategy Rules Definition
 * Phase 3 — Deterministic Recovery Engine
 *
 * Explicit deterministic rules for strategy selection without deep nesting.
 * Easily readable and ready for seamless replacement by Gemini in Phase 4.
 */

import { Payment, Invoice, CheckoutEvent } from '../schema';
import { InvestigationContext, DiagnosisResult, StrategyDecision } from './types';

export function evaluatePaymentStrategy(
  context: InvestigationContext,
  diagnosis: DiagnosisResult
): StrategyDecision {
  const payment = context.source as Payment | null;
  const failureReason = payment?.failure_reason || null;
  const attemptNumber = payment?.attempt_number ?? 1;
  const retryActionsCount = context.previous_actions.filter((a) => a.action_type === 'RETRY_PAYMENT').length;

  // Rule 1: Payment already successful
  if (payment?.status === 'SUCCESS' || diagnosis.diagnosis === 'ALREADY_RECOVERED') {
    return {
      strategy: 'STOP',
      reason: 'Payment already recovered.',
      explanation: `REVIVE verified that payment #${payment?.payment_id.slice(0, 8) || ''} is already marked SUCCESS. No further action needed.`,
    };
  }

  // Rule 2: Expired card
  if (failureReason === 'expired_card' || diagnosis.diagnosis === 'EXPIRED_PAYMENT_METHOD') {
    return {
      strategy: 'PAYMENT_METHOD_UPDATE',
      reason: 'Retrying an expired payment method is unlikely to succeed.',
      explanation: `REVIVE identified an expired payment card. Retrying the same card would fail, so an update request link was generated for ${context.customer.name}.`,
    };
  }

  // Rule 3: Max retry threshold reached
  if (attemptNumber >= 3 || retryActionsCount >= 3 || diagnosis.diagnosis === 'MAX_RETRIES_EXCEEDED') {
    return {
      strategy: 'STOP',
      reason: 'Maximum retry threshold reached.',
      explanation: `REVIVE reached the maximum retry limit (${Math.max(attemptNumber, retryActionsCount)} attempts). Ceasing autonomous retries to prevent card blocking.`,
    };
  }

  // Rule 4: Insufficient funds with low attempts
  if (failureReason === 'insufficient_funds' || diagnosis.diagnosis === 'INSUFFICIENT_FUNDS') {
    if (attemptNumber < 2 && retryActionsCount < 2) {
      return {
        strategy: 'SCHEDULE_RETRY',
        reason: 'A delayed retry is preferable to immediate repeated attempts.',
        explanation: `REVIVE identified temporary insufficient funds. Scheduling a retry for a later time window to optimize clearing probability.`,
      };
    }
  }

  // Rule 5: Temporary failure or bank timeout on initial attempt
  if (
    (failureReason === 'temporary_failure' || failureReason === 'bank_timeout' || failureReason === 'payment_method_error' || failureReason === null) &&
    attemptNumber === 1 &&
    retryActionsCount === 0
  ) {
    return {
      strategy: 'RETRY_PAYMENT',
      reason: 'Temporary failure with no previous retry attempt.',
      explanation: `REVIVE identified a temporary payment failure. The payment has not been retried yet and the customer has a strong payment history, so the system selected an immediate payment retry.`,
    };
  }

  // Rule 6: Subsequent temporary failure with < 3 retries
  if (retryActionsCount < 2 && attemptNumber < 3) {
    return {
      strategy: 'SCHEDULE_RETRY',
      reason: 'Subsequent attempt scheduled to avoid rapid gateway rejection.',
      explanation: `REVIVE identified an ongoing transient failure; scheduling next retry window.`,
    };
  }

  // Default fallback for payment
  return {
    strategy: 'STOP',
    reason: 'Payment failure conditions do not meet automated retry criteria.',
    explanation: `REVIVE evaluated payment parameters and concluded automated execution should halt.`,
  };
}

export function evaluateCheckoutStrategy(
  context: InvestigationContext,
  diagnosis: DiagnosisResult
): StrategyDecision {
  const checkout = context.source as CheckoutEvent | null;
  const cartValue = checkout?.cart_value ?? context.revenue_at_risk;
  const hasSuccessfulPurchases = context.successful_past_payments_count > 0 || context.customer.lifetime_value > 0;

  // Rule: High intent with prior purchases -> PAYMENT_LINK
  if (cartValue > 0 && hasSuccessfulPurchases) {
    return {
      strategy: 'PAYMENT_LINK',
      reason: 'Returning customer with active cart value generates direct payment link.',
      explanation: `REVIVE detected an abandoned cart of ₹${cartValue.toLocaleString()} from an established customer (${context.customer.name}). A customized, secure payment link was generated.`,
      parameters: { amount: cartValue },
    };
  }

  // Otherwise -> CUSTOMER_NOTIFICATION
  return {
    strategy: 'CUSTOMER_NOTIFICATION',
    reason: 'Cart abandonment notification sent to recover user intent.',
    explanation: `REVIVE sent a friendly recovery notification to ${context.customer.name} via ${context.customer.preferred_channel} to restore the checkout session.`,
  };
}

export function evaluateInvoiceStrategy(
  context: InvestigationContext,
  diagnosis: DiagnosisResult
): StrategyDecision {
  const invoice = context.source as Invoice | null;
  const daysOverdue = invoice?.days_overdue ?? context.days_overdue ?? 0;
  const revenueAtRisk = context.revenue_at_risk;
  const isEnterprise = context.customer_segment === 'ENTERPRISE';
  const hasGoodHistory = context.successful_past_invoices_count > 0 || context.successful_past_payments_count > 0;

  // Rule 1: High value escalation or severe delinquency
  if (
    context.case.scenario_tag === 'GT_HIGH_VALUE_ESCALATION' ||
    diagnosis.diagnosis === 'HIGH_VALUE_DELINQUENCY' ||
    revenueAtRisk > 25000 && isEnterprise && (daysOverdue > 10 && context.previous_actions.length > 0) ||
    revenueAtRisk >= 80000
  ) {
    return {
      strategy: 'ESCALATE',
      reason: 'High-value enterprise invoice or severe delinquency requires human escalation.',
      explanation: `REVIVE detected an enterprise invoice of ₹${revenueAtRisk.toLocaleString()} exceeding the autonomous policy threshold (₹25,000). Escalated to human account specialists.`,
    };
  }

  // Rule 2: Grace period (days overdue <= 15) with reliable history
  if (daysOverdue <= 15 && hasGoodHistory) {
    return {
      strategy: 'CUSTOMER_NOTIFICATION',
      reason: 'Grace-period reminder for historically reliable customer.',
      explanation: `REVIVE noted that ${context.customer.name} is within the 15-day grace period with an outstanding invoice of ₹${revenueAtRisk.toLocaleString()} and a solid payment track record. Sent a gentle reminder notification via ${context.customer.preferred_channel}.`,
    };
  }

  // Rule 3: Days overdue > 15 with delinquent history
  if (daysOverdue > 15) {
    return {
      strategy: 'PAYMENT_LINK',
      reason: 'Overdue invoice with delinquent history requires direct payment link.',
      explanation: `REVIVE detected invoice overdue by ${daysOverdue} days. Issued a direct one-click settlement payment link for ₹${revenueAtRisk.toLocaleString()}.`,
      parameters: { amount: revenueAtRisk },
    };
  }

  // Fallback
  return {
    strategy: 'CUSTOMER_NOTIFICATION',
    reason: 'Standard reminder dispatch for overdue receivable.',
    explanation: `REVIVE dispatched an automated invoice notification to ${context.customer.name}.`,
  };
}
