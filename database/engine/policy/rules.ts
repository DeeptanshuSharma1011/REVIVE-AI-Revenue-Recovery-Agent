/**
 * @license
 * REVIVE — Policy & Guardrail Rules Implementations
 * Phase 6 — Policy Engine & Guardrails
 *
 * Implements 14 deterministic safety and business compliance rules
 * with deterministic precedence. No ML or external API dependencies.
 */

import { InvestigationContext, DiagnosisResult, CaseStrategy } from '../types';
import { ActionRecord } from '../agent/state';
import { PolicyRuleId, PolicyResult, ProposedDecision } from './types';
import { getPolicyConfig } from './config';

export const VALID_STRATEGIES: CaseStrategy[] = [
  'RETRY_PAYMENT',
  'SCHEDULE_RETRY',
  'PAYMENT_LINK',
  'PAYMENT_METHOD_UPDATE',
  'CUSTOMER_NOTIFICATION',
  'ESCALATE',
  'STOP',
];

// Diagnosis-Action compatibility matrix
export const DIAGNOSIS_COMPATIBILITY_MAP: Record<string, CaseStrategy[]> = {
  TEMPORARY_PAYMENT_FAILURE: ['RETRY_PAYMENT', 'SCHEDULE_RETRY', 'ESCALATE', 'STOP'],
  NETWORK_BANK_TIMEOUT: ['RETRY_PAYMENT', 'SCHEDULE_RETRY', 'ESCALATE', 'STOP'],
  INSUFFICIENT_FUNDS: ['SCHEDULE_RETRY', 'CUSTOMER_NOTIFICATION', 'PAYMENT_LINK', 'ESCALATE', 'STOP'],
  EXPIRED_PAYMENT_METHOD: ['PAYMENT_METHOD_UPDATE', 'CUSTOMER_NOTIFICATION', 'ESCALATE', 'STOP'],
  CARD_AUTHENTICATION_REQUIRED: ['PAYMENT_LINK', 'CUSTOMER_NOTIFICATION', 'ESCALATE', 'STOP'],
  CHECKOUT_ABANDONMENT: ['PAYMENT_LINK', 'CUSTOMER_NOTIFICATION', 'ESCALATE', 'STOP'],
  OVERDUE_INVOICE: ['CUSTOMER_NOTIFICATION', 'PAYMENT_LINK', 'ESCALATE', 'STOP'],
  SUSPECTED_FRAUD: ['ESCALATE', 'STOP'],
  SECURITY_BLOCK: ['ESCALATE', 'STOP'],
  ALREADY_RECOVERED: ['STOP'],
  RECURRING_BILLING_FAILURE: ['SCHEDULE_RETRY', 'PAYMENT_METHOD_UPDATE', 'CUSTOMER_NOTIFICATION', 'ESCALATE', 'STOP'],
};

export interface EvaluationContext {
  case_context: InvestigationContext | null;
  diagnosis?: DiagnosisResult | null;
  history?: ActionRecord[];
  case_status?: string;
  payment_status?: string;
}

/**
 * Rule 1: Case Terminal State Check
 * If case is already RECOVERED, ESCALATED, or STOPPED/CLOSED.
 */
export function checkTerminalStateRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const caseStatus = context.case_context?.case?.status || context.case_status;

  if (caseStatus === 'RECOVERED') {
    return {
      decision: 'STOP',
      original_strategy: proposed.strategy,
      approved_strategy: 'STOP',
      reason: 'Blocked: case has already been recovered.',
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['CASE_ALREADY_RECOVERED'],
      requires_human_review: false,
      explanation: 'REVIVE verified that this recovery case has already been resolved.',
    };
  }

  if (caseStatus === 'ESCALATED') {
    return {
      decision: 'STOP',
      original_strategy: proposed.strategy,
      approved_strategy: 'STOP',
      reason: 'Blocked: case has already been escalated for human review.',
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['CASE_ALREADY_ESCALATED'],
      requires_human_review: true,
      explanation: 'This case is already assigned to a human reviewer.',
    };
  }

  if (caseStatus === 'CLOSED' || caseStatus === 'STOPPED') {
    return {
      decision: 'STOP',
      original_strategy: proposed.strategy,
      approved_strategy: 'STOP',
      reason: 'Blocked: recovery has already been stopped for this case.',
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['CASE_ALREADY_STOPPED'],
      requires_human_review: false,
      explanation: 'No further automated actions permitted on closed cases.',
    };
  }

  return null;
}

/**
 * Rule 2: Payment Already Successful Check
 * If underlying payment is in SUCCESS state.
 */
export function checkPaymentSuccessRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const sourcePayment = context.case_context?.source as any;
  const paymentStatus = sourcePayment?.status || context.payment_status;

  if (paymentStatus === 'SUCCESS') {
    return {
      decision: 'STOP',
      original_strategy: proposed.strategy,
      approved_strategy: 'STOP',
      reason: 'Blocked: payment transaction is already in SUCCESS state.',
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['PAYMENT_ALREADY_SUCCESSFUL'],
      requires_human_review: false,
      explanation: 'Underlying transaction succeeded; further recovery action is stopped.',
    };
  }

  return null;
}

/**
 * Rule 3: Maximum Actions Per Case Rule
 */
export function checkMaxActionsRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const actionsCount = (context.history?.length ?? 0) + (context.case_context?.previous_actions?.length ?? 0);

  if (actionsCount >= config.MAX_ACTIONS_PER_CASE) {
    const revenue = context.case_context?.revenue_at_risk ?? 0;
    const shouldEscalate = revenue > 10000;
    return {
      decision: shouldEscalate ? 'ESCALATE' : 'STOP',
      original_strategy: proposed.strategy,
      approved_strategy: shouldEscalate ? 'ESCALATE' : 'STOP',
      reason: `Maximum automated action limit (${config.MAX_ACTIONS_PER_CASE}) reached for this case.`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['MAX_ACTIONS_EXCEEDED'],
      requires_human_review: shouldEscalate,
      explanation: `Bounded autonomy cap: Case reached max ${config.MAX_ACTIONS_PER_CASE} attempts.`,
    };
  }

  return null;
}

/**
 * Rule 4: Maximum Retries Rule
 * When payment retries reach MAX_PAYMENT_RETRIES (2), modify to SCHEDULE_RETRY or STOP.
 */
export function checkMaxRetriesRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  if (proposed.strategy !== 'RETRY_PAYMENT') return null;

  const payment = context.case_context?.source as any;
  const paymentAttempts = payment?.attempt_number ?? 1;
  const historyRetries =
    context.history?.filter((h) => h.action === 'RETRY_PAYMENT').length ?? 0;
  const totalRetries = Math.max(paymentAttempts, historyRetries);

  if (totalRetries >= config.MAX_PAYMENT_RETRIES) {
    const alreadyScheduled = context.history?.some((h) => h.action === 'SCHEDULE_RETRY');
    if (!alreadyScheduled) {
      return {
        decision: 'MODIFY',
        original_strategy: proposed.strategy,
        approved_strategy: 'SCHEDULE_RETRY',
        reason: `Maximum immediate payment retry count reached (${config.MAX_PAYMENT_RETRIES}). Modified to SCHEDULE_RETRY.`,
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MAX_RETRIES_EXCEEDED'],
        requires_human_review: false,
        explanation: 'Modified: immediate retry limit reached, so REVIVE scheduled a safer retry.',
      };
    } else {
      return {
        decision: 'STOP',
        original_strategy: proposed.strategy,
        approved_strategy: 'STOP',
        reason: `Maximum retries (${config.MAX_PAYMENT_RETRIES}) and scheduled retry already reached.`,
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MAX_RETRIES_EXCEEDED'],
        requires_human_review: false,
        explanation: 'All automated retry options exhausted for this transaction.',
      };
    }
  }

  return null;
}

/**
 * Rule 5: High-Value Transaction Rule
 * Sensitive state-changing financial actions for cases > ₹25,000 must escalate to human review.
 */
export function checkHighValueRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const revenue = context.case_context?.revenue_at_risk ?? 0;

  if (revenue > config.HIGH_VALUE_THRESHOLD) {
    // If proposed action is anything other than human review or stop
    if (proposed.strategy !== 'ESCALATE' && proposed.strategy !== 'STOP') {
      return {
        decision: 'ESCALATE',
        original_strategy: proposed.strategy,
        approved_strategy: 'ESCALATE',
        reason: `High-value recovery (₹${revenue.toLocaleString()}) exceeds autonomous threshold (₹${config.HIGH_VALUE_THRESHOLD.toLocaleString()}). Requires human review.`,
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['HIGH_VALUE_TRANSACTION'],
        requires_human_review: true,
        explanation: 'Escalated: transaction exceeds the automated recovery value threshold.',
      };
    }
  }

  return null;
}

/**
 * Rule 6: Low AI Confidence Rule
 * If AI model confidence is below configured threshold (< 0.70).
 */
export function checkLowConfidenceRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const confidence = proposed.confidence ?? 1.0;

  if (confidence < config.AI_CONFIDENCE_THRESHOLD && proposed.strategy !== 'ESCALATE' && proposed.strategy !== 'STOP') {
    return {
      decision: 'ESCALATE',
      original_strategy: proposed.strategy,
      approved_strategy: 'ESCALATE',
      reason: `AI confidence (${Math.round(confidence * 100)}%) is below automated threshold (${Math.round(config.AI_CONFIDENCE_THRESHOLD * 100)}%).`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['LOW_AI_CONFIDENCE'],
      requires_human_review: true,
      explanation: 'Escalated: AI confidence is below the required threshold.',
    };
  }

  return null;
}

/**
 * Rule 7: Invalid Strategy Rule
 * Rejects any strategy outside the supported enum.
 */
export function checkInvalidStrategyRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  if (!VALID_STRATEGIES.includes(proposed.strategy as CaseStrategy)) {
    return {
      decision: 'BLOCK',
      original_strategy: proposed.strategy,
      approved_strategy: null,
      reason: `Proposed strategy '${proposed.strategy}' is not recognized or supported.`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['INVALID_STRATEGY'],
      requires_human_review: true,
      explanation: 'Blocked: unrecognized recovery strategy proposed.',
    };
  }

  return null;
}

/**
 * Rule 8: Duplicate Action Rule
 * Prevents repeating the exact same failed action in succession.
 */
export function checkDuplicateActionRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const history = context.history || [];
  if (history.length === 0) return null;

  const lastAction = history[history.length - 1];
  if (lastAction && lastAction.action === proposed.strategy && lastAction.status === 'FAILED') {
    if (proposed.strategy === 'RETRY_PAYMENT') {
      return {
        decision: 'MODIFY',
        original_strategy: proposed.strategy,
        approved_strategy: 'SCHEDULE_RETRY',
        reason: 'Immediate retry previously failed. Modified to SCHEDULE_RETRY.',
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['DUPLICATE_ACTION'],
        requires_human_review: false,
        explanation: 'Modified: preventing duplicate immediate retry loop; scheduled for later.',
      };
    }

    return {
      decision: 'BLOCK',
      original_strategy: proposed.strategy,
      approved_strategy: null,
      reason: `Duplicate action '${proposed.strategy}' previously failed in iteration ${lastAction.iteration}.`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['DUPLICATE_ACTION'],
      requires_human_review: true,
      explanation: 'Blocked: duplicate failed action prevented without state progression.',
    };
  }

  return null;
}

/**
 * Rule 9: Diagnosis / Action Compatibility Rule
 */
export function checkDiagnosisCompatibilityRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const diagnosisKey = context.diagnosis?.diagnosis || 'TEMPORARY_PAYMENT_FAILURE';
  const allowedStrategies = DIAGNOSIS_COMPATIBILITY_MAP[diagnosisKey];

  if (allowedStrategies && !allowedStrategies.includes(proposed.strategy as CaseStrategy)) {
    return {
      decision: 'BLOCK',
      original_strategy: proposed.strategy,
      approved_strategy: null,
      reason: `Strategy '${proposed.strategy}' is incompatible with diagnosis '${diagnosisKey}'.`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['INCOMPATIBLE_ACTION'],
      requires_human_review: true,
      explanation: `Blocked: proposed action is incompatible with diagnosed root cause (${diagnosisKey}).`,
    };
  }

  return null;
}

/**
 * Rule 10: Required Data Rule
 * Verifies that all necessary identifiers and amounts exist before executing an action.
 */
export function checkRequiredDataRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const ctx = context.case_context;

  if (proposed.strategy === 'RETRY_PAYMENT' || proposed.strategy === 'SCHEDULE_RETRY') {
    const paymentId = (ctx?.source as any)?.payment_id || ctx?.case?.source_id;
    const amount = ctx?.revenue_at_risk ?? 0;
    if (!paymentId || amount <= 0) {
      return {
        decision: 'BLOCK',
        original_strategy: proposed.strategy,
        approved_strategy: null,
        reason: 'Missing required payment_id or valid transaction amount for payment retry.',
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MISSING_REQUIRED_DATA'],
        requires_human_review: true,
        explanation: 'Blocked: payment retry requires verified payment identifier and amount.',
      };
    }
  }

  if (proposed.strategy === 'PAYMENT_LINK') {
    const customerId = ctx?.customer?.customer_id;
    const amount = ctx?.revenue_at_risk ?? 0;
    if (!customerId || amount <= 0) {
      return {
        decision: 'BLOCK',
        original_strategy: proposed.strategy,
        approved_strategy: null,
        reason: 'Missing required customer_id or valid amount for payment link generation.',
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MISSING_REQUIRED_DATA'],
        requires_human_review: true,
        explanation: 'Blocked: payment link creation requires verified customer ID and amount.',
      };
    }
  }

  if (proposed.strategy === 'PAYMENT_METHOD_UPDATE') {
    const customerId = ctx?.customer?.customer_id;
    if (!customerId) {
      return {
        decision: 'BLOCK',
        original_strategy: proposed.strategy,
        approved_strategy: null,
        reason: 'Missing required customer_id for payment method update request.',
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MISSING_REQUIRED_DATA'],
        requires_human_review: true,
        explanation: 'Blocked: method update request requires valid customer account.',
      };
    }
  }

  if (proposed.strategy === 'CUSTOMER_NOTIFICATION') {
    const customer = ctx?.customer;
    if (!customer?.customer_id || (!customer.email && !customer.phone)) {
      return {
        decision: 'BLOCK',
        original_strategy: proposed.strategy,
        approved_strategy: null,
        reason: 'Missing customer contact endpoint (email or phone) for notification dispatch.',
        policy_id: config.POLICY_VERSION,
        rules_triggered: ['MISSING_REQUIRED_DATA'],
        requires_human_review: true,
        explanation: 'Blocked: customer notification requires at least one verified contact channel.',
      };
    }
  }

  return null;
}

/**
 * Rule 11: Customer Contact Limit Rule
 * Caps automated customer notifications to MAX_CUSTOMER_CONTACTS (2).
 */
export function checkCustomerContactLimitRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  if (proposed.strategy !== 'CUSTOMER_NOTIFICATION' && proposed.strategy !== 'PAYMENT_METHOD_UPDATE') {
    return null;
  }

  const previousContacts =
    (context.case_context?.previous_actions?.filter(
      (a) => a.action_type === 'SEND_NOTIFICATION' || a.action_type === 'REQUEST_PAYMENT_METHOD_UPDATE'
    ).length ?? 0) +
    (context.history?.filter(
      (h) => h.action === 'CUSTOMER_NOTIFICATION' || h.action === 'PAYMENT_METHOD_UPDATE'
    ).length ?? 0);

  if (previousContacts >= config.MAX_CUSTOMER_CONTACTS) {
    return {
      decision: 'ESCALATE',
      original_strategy: proposed.strategy,
      approved_strategy: 'ESCALATE',
      reason: `Customer contact limit (${config.MAX_CUSTOMER_CONTACTS}) reached. Escalating to prevent spam.`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['CONTACT_LIMIT_EXCEEDED'],
      requires_human_review: true,
      explanation: 'Escalated: reached maximum allowed automated customer notifications.',
    };
  }

  return null;
}

/**
 * Rule 12: Recovery Window Rule
 * If case was opened longer ago than RECOVERY_WINDOW_DAYS (7).
 */
export function checkRecoveryWindowRule(
  context: EvaluationContext,
  proposed: ProposedDecision
): PolicyResult | null {
  const config = getPolicyConfig();
  const createdAt = context.case_context?.case?.created_at;
  if (!createdAt) return null;

  const caseDate = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - caseDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > config.RECOVERY_WINDOW_DAYS && proposed.strategy !== 'ESCALATE' && proposed.strategy !== 'STOP') {
    return {
      decision: 'ESCALATE',
      original_strategy: proposed.strategy,
      approved_strategy: 'ESCALATE',
      reason: `Case age (${Math.round(diffDays)} days) exceeds automated recovery window (${config.RECOVERY_WINDOW_DAYS} days).`,
      policy_id: config.POLICY_VERSION,
      rules_triggered: ['RECOVERY_WINDOW_EXCEEDED'],
      requires_human_review: true,
      explanation: 'Escalated: case is outside the automated recovery time window.',
    };
  }

  return null;
}
