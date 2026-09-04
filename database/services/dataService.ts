/**
 * @license
 * REVIVE — Data Service Layer
 * Business query engine providing structured domain views & answers
 */

import { db } from '../db';
import { customerRepository } from '../repositories/CustomerRepository';
import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { paymentRepository } from '../repositories/PaymentRepository';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { checkoutRepository } from '../repositories/CheckoutRepository';
import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { recoveryActionRepository } from '../repositories/RecoveryActionRepository';
import { auditRepository } from '../repositories/AuditRepository';
import { Customer, Subscription, Payment, Invoice, CheckoutEvent, RecoveryCase, RecoveryAction, AuditLog } from '../schema';

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

export interface RecoveryCaseDetails {
  case: RecoveryCase;
  customer: Customer | null;
  sourceDetails: Payment | Invoice | CheckoutEvent | null;
  actions: RecoveryAction[];
  auditLogs: AuditLog[];
  relatedPayments: Payment[];
}

export class DataService {
  getCustomerProfile(customerId: string): CustomerFullProfile | null {
    const customer = customerRepository.findById(customerId);
    if (!customer) return null;

    const subscriptions = subscriptionRepository.findByCustomerId(customerId);
    const payments = paymentRepository.findByCustomerId(customerId);
    const invoices = invoiceRepository.findByCustomerId(customerId);
    const checkoutEvents = checkoutRepository.findByCustomerId(customerId);
    const recoveryCases = recoveryCaseRepository.findByCustomerId(customerId);

    const totalRevenuePaid = payments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);

    const failedPaymentCount = payments.filter((p) => p.status === 'FAILED').length;

    const overdueInvoiceAmount = invoices
      .filter((i) => i.status === 'OVERDUE')
      .reduce((sum, i) => sum + i.amount, 0);

    const activeSubscriptionCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;

    // Deterministic risk score calculation (0 - 100)
    let riskScore = 15;
    if (failedPaymentCount > 0) riskScore += Math.min(failedPaymentCount * 20, 50);
    if (overdueInvoiceAmount > 0) riskScore += 25;
    if (customer.segment === 'ENTERPRISE') riskScore -= 10;
    riskScore = Math.max(5, Math.min(95, riskScore));

    return {
      customer,
      subscriptions,
      payments,
      invoices,
      checkoutEvents,
      recoveryCases,
      metrics: {
        totalRevenuePaid,
        failedPaymentCount,
        overdueInvoiceAmount,
        activeSubscriptionCount,
        riskScore,
      },
    };
  }

  getRecoveryCaseDetails(caseId: string): RecoveryCaseDetails | null {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) return null;

    const customer = customerRepository.findById(rCase.customer_id);
    const actions = recoveryActionRepository.findByCaseId(caseId);
    const auditLogs = auditRepository.findByCaseId(caseId);
    const relatedPayments = customer ? paymentRepository.findByCustomerId(customer.customer_id) : [];

    let sourceDetails: Payment | Invoice | CheckoutEvent | null = null;
    if (rCase.source_type === 'PAYMENT') {
      sourceDetails = paymentRepository.findById(rCase.source_id);
    } else if (rCase.source_type === 'INVOICE') {
      sourceDetails = invoiceRepository.findById(rCase.source_id);
    } else if (rCase.source_type === 'CHECKOUT') {
      sourceDetails = checkoutRepository.findById(rCase.source_id);
    }

    return {
      case: rCase,
      customer,
      sourceDetails,
      actions,
      auditLogs,
      relatedPayments,
    };
  }

  getGroundTruthCases(): Array<{
    tag: string;
    caseId: string;
    description: string;
    expectedStrategy: string;
    caseDetails: RecoveryCaseDetails | null;
  }> {
    const results = [];
    for (const [tag, meta] of Object.entries(db.groundTruthMetadata)) {
      results.push({
        tag,
        caseId: meta.caseId,
        description: meta.description,
        expectedStrategy: meta.expectedStrategy,
        caseDetails: this.getRecoveryCaseDetails(meta.caseId),
      });
    }
    return results;
  }

  getRecoveryMetrics(): {
    totalRevenueAtRisk: number;
    totalRecoveredRevenue: number;
    recoveryRatePercent: number;
    openCasesCount: number;
    recoveredCasesCount: number;
    escalatedCasesCount: number;
    breakdownBySource: Record<string, { count: number; atRisk: number; recovered: number }>;
    breakdownByPriority: Record<string, number>;
  } {
    const cases = Array.from(db.recoveryCases.values());
    const actions = Array.from(db.recoveryActions.values());

    let totalRevenueAtRisk = 0;
    let openCasesCount = 0;
    let recoveredCasesCount = 0;
    let escalatedCasesCount = 0;

    const breakdownBySource: Record<string, { count: number; atRisk: number; recovered: number }> = {
      PAYMENT: { count: 0, atRisk: 0, recovered: 0 },
      CHECKOUT: { count: 0, atRisk: 0, recovered: 0 },
      INVOICE: { count: 0, atRisk: 0, recovered: 0 },
    };

    const breakdownByPriority: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const c of cases) {
      totalRevenueAtRisk += c.revenue_at_risk;
      if (c.status === 'OPEN' || c.status === 'INVESTIGATING' || c.status === 'ACTION_PENDING') {
        openCasesCount++;
      } else if (c.status === 'RECOVERED') {
        recoveredCasesCount++;
      } else if (c.status === 'ESCALATED') {
        escalatedCasesCount++;
      }

      if (breakdownBySource[c.source_type]) {
        breakdownBySource[c.source_type].count++;
        breakdownBySource[c.source_type].atRisk += c.revenue_at_risk;
      }

      if (breakdownByPriority[c.priority] !== undefined) {
        breakdownByPriority[c.priority]++;
      }
    }

    const recoveredByCase = new Map<string, number>();
    for (const a of actions) {
      if (a.status === 'SUCCESS') {
        const cur = recoveredByCase.get(a.case_id) || 0;
        recoveredByCase.set(a.case_id, cur + (a.amount_recovered || 0));
      }
    }

    let totalRecoveredRevenue = 0;
    for (const [cId, amt] of recoveredByCase.entries()) {
      const c = db.recoveryCases.get(cId);
      const capped = c ? Math.min(c.revenue_at_risk, amt) : amt;
      totalRecoveredRevenue += capped;
      if (c && breakdownBySource[c.source_type]) {
        breakdownBySource[c.source_type].recovered += capped;
      }
    }

    const recoveryRatePercent = totalRevenueAtRisk > 0 ? (totalRecoveredRevenue / totalRevenueAtRisk) * 100 : 0;

    return {
      totalRevenueAtRisk: Math.round(totalRevenueAtRisk * 100) / 100,
      totalRecoveredRevenue: Math.round(totalRecoveredRevenue * 100) / 100,
      recoveryRatePercent: Math.round(recoveryRatePercent * 10) / 10,
      openCasesCount,
      recoveredCasesCount,
      escalatedCasesCount,
      breakdownBySource,
      breakdownByPriority,
    };
  }

  resetAndSeed(seedNumber = 42, multiplier = 1.0): { success: boolean; counts: Record<string, number> } {
    return db.seed(seedNumber, multiplier);
  }
}

export const dataService = new DataService();
