/**
 * @license
 * REVIVE — Stage 2: Investigation Service
 * Phase 3 — Deterministic Recovery Engine
 *
 * Gathers complete context on customer, payment history, subscriptions, invoices,
 * checkout sessions, and previous recovery actions without using an LLM.
 */

import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { customerRepository } from '../repositories/CustomerRepository';
import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { paymentRepository } from '../repositories/PaymentRepository';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { checkoutRepository } from '../repositories/CheckoutRepository';
import { recoveryActionRepository } from '../repositories/RecoveryActionRepository';
import { Payment, Invoice, CheckoutEvent } from '../schema';
import { InvestigationContext } from './types';

export class InvestigationService {
  /**
   * Performs exhaustive deterministic investigation of a recovery case.
   */
  public investigateCase(caseId: string): InvestigationContext {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Investigation failed: Recovery case '${caseId}' not found.`);
    }

    const customer = customerRepository.findById(rCase.customer_id);
    if (!customer) {
      throw new Error(`Investigation failed: Customer '${rCase.customer_id}' not found for case '${caseId}'.`);
    }

    // Source identification
    let source: Payment | Invoice | CheckoutEvent | null = null;
    let daysOverdue: number | undefined;
    let attemptNumber: number | undefined;
    let cartValue: number | undefined;

    if (rCase.source_type === 'PAYMENT') {
      source = paymentRepository.findById(rCase.source_id);
      if (source) {
        attemptNumber = source.attempt_number;
      }
    } else if (rCase.source_type === 'INVOICE') {
      source = invoiceRepository.findById(rCase.source_id);
      if (source) {
        daysOverdue = source.days_overdue;
      }
    } else if (rCase.source_type === 'CHECKOUT') {
      source = checkoutRepository.findById(rCase.source_id);
      if (source) {
        cartValue = source.cart_value;
      }
    }

    // Historical records
    const allCustomerPayments = paymentRepository.findByCustomerId(customer.customer_id);
    const paymentHistory = allCustomerPayments.filter(
      (p) => !source || (source as Payment).payment_id !== p.payment_id
    );

    const subscriptions = subscriptionRepository.findByCustomerId(customer.customer_id);
    const activeSub = subscriptions.find((s) => s.status === 'ACTIVE' || s.status === 'PAST_DUE') || subscriptions[0] || null;

    const historicalInvoices = invoiceRepository.findByCustomerId(customer.customer_id);
    const checkoutHistory = checkoutRepository.findByCustomerId(customer.customer_id);
    const previousActions = recoveryActionRepository.findByCaseId(caseId);

    const successfulPastPaymentsCount = allCustomerPayments.filter((p) => p.status === 'SUCCESS').length;
    const failedPastPaymentsCount = allCustomerPayments.filter((p) => p.status === 'FAILED').length;
    const successfulPastInvoicesCount = historicalInvoices.filter((i) => i.status === 'PAID').length;

    return {
      case_id: rCase.case_id,
      case: rCase,
      customer,
      source_type: rCase.source_type,
      source,
      subscription: activeSub,
      payment_history: paymentHistory,
      historical_invoices: historicalInvoices,
      checkout_history: checkoutHistory,
      previous_actions: previousActions,
      revenue_at_risk: rCase.revenue_at_risk,
      days_overdue: daysOverdue,
      attempt_number: attemptNumber,
      cart_value: cartValue,
      customer_segment: customer.segment,
      lifetime_value: customer.lifetime_value,
      preferred_channel: customer.preferred_channel,
      successful_past_payments_count: successfulPastPaymentsCount,
      failed_past_payments_count: failedPastPaymentsCount,
      successful_past_invoices_count: successfulPastInvoicesCount,
    };
  }
}

export const investigationService = new InvestigationService();
