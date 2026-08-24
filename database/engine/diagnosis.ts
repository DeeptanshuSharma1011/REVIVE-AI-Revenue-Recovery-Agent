/**
 * @license
 * REVIVE — Stage 3: Diagnosis Service
 * Phase 3 — Deterministic Recovery Engine
 *
 * Deterministically analyzes the investigation context to diagnose WHY revenue
 * is at risk with zero LLM dependence.
 */

import { Payment, Invoice, CheckoutEvent } from '../schema';
import { InvestigationContext, DiagnosisResult, DiagnosisCode } from './types';

export class DiagnosisService {
  /**
   * Deterministically diagnoses the root situation from the investigation context.
   */
  public diagnoseCase(context: InvestigationContext): DiagnosisResult {
    const { case: rCase, source, source_type, previous_actions, revenue_at_risk, days_overdue, attempt_number } = context;

    // Check if case is already resolved
    if (rCase.status === 'RECOVERED') {
      return {
        diagnosis: 'ALREADY_RECOVERED',
        summary: 'Payment or invoice has already been recovered successfully.',
        details: { case_status: rCase.status, resolved_at: rCase.resolved_at },
        confidence: 1.0,
      };
    }

    if (rCase.status === 'CLOSED') {
      return {
        diagnosis: 'NO_RECOVERY_REQUIRED',
        summary: 'Recovery case is closed and requires no further action.',
        details: { case_status: rCase.status },
        confidence: 1.0,
      };
    }

    // 1. PAYMENT cases
    if (source_type === 'PAYMENT' && source) {
      const payment = source as Payment;

      if (payment.status === 'SUCCESS') {
        return {
          diagnosis: 'ALREADY_RECOVERED',
          summary: 'Associated payment transaction is currently in SUCCESS state.',
          details: { payment_id: payment.payment_id, status: payment.status },
          confidence: 1.0,
        };
      }

      // Check max retries reached
      const retryActions = previous_actions.filter((a) => a.action_type === 'RETRY_PAYMENT');
      if (retryActions.length >= 3 || (attempt_number !== undefined && attempt_number >= 3 && retryActions.length >= 1)) {
        return {
          diagnosis: 'MAX_RETRIES_EXCEEDED',
          summary: `Maximum retry threshold reached (${retryActions.length} previous retry actions logged, attempt #${attempt_number || retryActions.length}).`,
          details: { retry_count: retryActions.length, attempt_number },
          confidence: 1.0,
        };
      }

      // Expired card
      if (payment.failure_reason === 'expired_card') {
        return {
          diagnosis: 'EXPIRED_PAYMENT_METHOD',
          summary: 'Customer payment instrument has expired and requires updated credentials.',
          details: { payment_id: payment.payment_id, failure_reason: payment.failure_reason, attempt_number: payment.attempt_number },
          confidence: 1.0,
        };
      }

      // Insufficient funds
      if (payment.failure_reason === 'insufficient_funds') {
        return {
          diagnosis: 'INSUFFICIENT_FUNDS',
          summary: 'Transaction declined due to temporary insufficient balance on customer account.',
          details: { payment_id: payment.payment_id, failure_reason: payment.failure_reason, attempt_number: payment.attempt_number },
          confidence: 1.0,
        };
      }

      // Temporary gateway or bank failure
      if (
        payment.failure_reason === 'temporary_failure' ||
        payment.failure_reason === 'bank_timeout' ||
        payment.failure_reason === 'payment_method_error' ||
        payment.failure_reason === null
      ) {
        return {
          diagnosis: 'TEMPORARY_PAYMENT_FAILURE',
          summary: `Transient payment gateway or banking network disruption (${payment.failure_reason || 'temporary_failure'}).`,
          details: { payment_id: payment.payment_id, failure_reason: payment.failure_reason, attempt_number: payment.attempt_number },
          confidence: 1.0,
        };
      }
    }

    // 2. CHECKOUT cases
    if (source_type === 'CHECKOUT') {
      const checkout = source as CheckoutEvent | null;
      return {
        diagnosis: 'CHECKOUT_ABANDONMENT',
        summary: `Cart checkout session dropped off prior to order completion (cart value: ₹${(checkout?.cart_value || revenue_at_risk).toLocaleString()}).`,
        details: {
          cart_value: checkout?.cart_value || revenue_at_risk,
          event_type: checkout?.event_type || 'CHECKOUT_ABANDONED',
        },
        confidence: 1.0,
      };
    }

    // 3. INVOICE cases
    if (source_type === 'INVOICE' && source) {
      const invoice = source as Invoice;

      // High-value enterprise delinquency or critical amount threshold
      if (
        rCase.scenario_tag === 'GT_HIGH_VALUE_ESCALATION' ||
        (revenue_at_risk > 25000 && (context.customer_segment === 'ENTERPRISE' && (days_overdue || 0) > 10 && previous_actions.length > 0)) ||
        (revenue_at_risk > 75000 && rCase.priority === 'CRITICAL')
      ) {
        return {
          diagnosis: 'HIGH_VALUE_DELINQUENCY',
          summary: `High-value enterprise delinquency (₹${revenue_at_risk.toLocaleString()}) exceeding autonomous resolution policy.`,
          details: { invoice_id: invoice.invoice_id, amount: invoice.amount, days_overdue: invoice.days_overdue },
          confidence: 1.0,
        };
      }

      return {
        diagnosis: 'OVERDUE_INVOICE',
        summary: `Corporate B2B invoice #${invoice.invoice_id.slice(0, 8)} is ${invoice.days_overdue} days past the due date.`,
        details: { invoice_id: invoice.invoice_id, days_overdue: invoice.days_overdue, amount: invoice.amount },
        confidence: 1.0,
      };
    }

    // Fallback diagnosis
    return {
      diagnosis: 'TEMPORARY_PAYMENT_FAILURE',
      summary: 'Revenue is at risk from an unresolved operational trigger.',
      details: { source_type },
      confidence: 0.9,
    };
  }
}

export const diagnosisService = new DiagnosisService();
