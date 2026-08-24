/**
 * @license
 * REVIVE — Master Recovery Simulator Engine
 * Phase 2 — Recovery Simulator
 *
 * Orchestrates deterministic recovery workflows, state changes, action logging,
 * and verification tools. Works completely without AI or LLMs.
 */

import { randomUUID } from 'crypto';
import { db } from '../db';
import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { recoveryActionRepository } from '../repositories/RecoveryActionRepository';
import { auditRepository } from '../repositories/AuditRepository';
import { paymentRepository } from '../repositories/PaymentRepository';
import { CommunicationChannel } from '../schema';
import {
  paymentSimulator,
  simulatedLinks,
  simulatedNotifications,
  simulatedMethodRequests,
  simulatedSchedules,
} from './paymentSimulator';
import {
  RetryPaymentResponse,
  ScheduleRetryResponse,
  GeneratePaymentLinkResponse,
  SendNotificationResponse,
  PaymentMethodUpdateResponse,
  EscalateResponse,
  StopRecoveryResponse,
  PaymentStatusVerification,
  RecoveryStatusVerification,
  SimulatedPaymentLink,
  SimulatedNotification,
  SimulatedPaymentMethodUpdateRequest,
  SimulatedScheduledRetry,
} from './models';

export class RecoverySimulatorService {
  /**
   * ACTION 1 — RETRY PAYMENT
   */
  public retryPayment(paymentId: string, caseId?: string): RetryPaymentResponse {
    return paymentSimulator.retryPayment(paymentId, caseId);
  }

  /**
   * ACTION 2 — SCHEDULE PAYMENT RETRY
   */
  public schedulePaymentRetry(
    paymentId: string,
    scheduledFor?: string,
    caseId?: string
  ): ScheduleRetryResponse {
    return paymentSimulator.schedulePaymentRetry(paymentId, scheduledFor, caseId);
  }

  /**
   * ACTION 3 — GENERATE PAYMENT LINK
   */
  public generatePaymentLink(
    customerId: string,
    amount: number,
    caseId?: string
  ): GeneratePaymentLinkResponse {
    return paymentSimulator.generatePaymentLink(customerId, amount, caseId);
  }

  /**
   * ACTION 4 — SEND CUSTOMER NOTIFICATION
   */
  public sendCustomerNotification(
    customerId: string,
    message: string,
    channel: CommunicationChannel,
    caseId?: string
  ): SendNotificationResponse {
    return paymentSimulator.sendCustomerNotification(customerId, message, channel, caseId);
  }

  /**
   * ACTION 5 — REQUEST PAYMENT METHOD UPDATE
   */
  public requestPaymentMethodUpdate(
    customerId: string,
    caseId?: string
  ): PaymentMethodUpdateResponse {
    return paymentSimulator.requestPaymentMethodUpdate(customerId, caseId);
  }

  /**
   * ACTION 6 — ESCALATE TO HUMAN
   */
  public escalateToHuman(caseId: string, reason?: string): EscalateResponse {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Recovery case '${caseId}' not found.`);
    }

    const escalationReason =
      reason ||
      (rCase.revenue_at_risk > 25000
        ? `High value transaction (₹${rCase.revenue_at_risk.toLocaleString()}) requires manual review.`
        : 'Case marked for specialist human intervention.');

    const nowIso = new Date().toISOString();

    // Update case state
    recoveryCaseRepository.update(rCase.case_id, {
      status: 'ESCALATED',
      current_strategy: 'ESCALATE',
    });

    // Record action
    const actionId = randomUUID();
    recoveryActionRepository.create({
      action_id: actionId,
      case_id: rCase.case_id,
      action_type: 'ESCALATE',
      reason: escalationReason,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        case_id: rCase.case_id,
        revenue_at_risk: rCase.revenue_at_risk,
        escalation_reason: escalationReason,
        simulated: true,
      },
      amount_recovered: 0,
    });

    // Record audit log
    auditRepository.create({
      log_id: randomUUID(),
      case_id: rCase.case_id,
      agent_step: 'action_execution',
      tool_name: 'escalate_to_human',
      input_summary: { case_id: rCase.case_id, revenue_at_risk: rCase.revenue_at_risk },
      output_summary: { status: 'escalated', reason: escalationReason },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'escalate_to_human',
      status: 'escalated',
      case_id: rCase.case_id,
      reason: escalationReason,
      revenue_at_risk: rCase.revenue_at_risk,
      simulated: true,
      message: 'Case escalated for human review successfully',
    };
  }

  /**
   * ACTION 7 — STOP RECOVERY
   */
  public stopRecovery(caseId: string, reason?: string): StopRecoveryResponse {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Recovery case '${caseId}' not found.`);
    }

    const stopReason = reason || 'Maximum automated recovery attempts reached.';
    const nowIso = new Date().toISOString();

    // Update case state
    recoveryCaseRepository.update(rCase.case_id, {
      status: 'CLOSED',
      current_strategy: 'STOP',
      resolved_at: nowIso,
    });

    // Record action
    recoveryActionRepository.create({
      action_id: randomUUID(),
      case_id: rCase.case_id,
      action_type: 'STOP',
      reason: stopReason,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        case_id: rCase.case_id,
        stop_reason: stopReason,
        simulated: true,
      },
      amount_recovered: 0,
    });

    // Record audit log
    auditRepository.create({
      log_id: randomUUID(),
      case_id: rCase.case_id,
      agent_step: 'action_execution',
      tool_name: 'stop_recovery',
      input_summary: { case_id: rCase.case_id },
      output_summary: { status: 'stopped', reason: stopReason },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'stop_recovery',
      status: 'stopped',
      case_id: rCase.case_id,
      reason: stopReason,
      simulated: true,
      message: 'Recovery workflow terminated by operator',
    };
  }

  /**
   * VERIFICATION FUNCTION 1: check_payment_status
   */
  public checkPaymentStatus(paymentId: string): PaymentStatusVerification {
    return paymentSimulator.checkPaymentStatus(paymentId);
  }

  /**
   * VERIFICATION FUNCTION 2: check_recovery_status
   */
  public checkRecoveryStatus(caseId: string): RecoveryStatusVerification {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Recovery case '${caseId}' not found.`);
    }

    const actions = recoveryActionRepository.findByCaseId(caseId);
    const auditLogs = auditRepository.findByCaseId(caseId);

    const amountRecovered = actions
      .filter((a) => a.status === 'SUCCESS')
      .reduce((sum, a) => sum + (a.amount_recovered || 0), 0);

    return {
      case_id: rCase.case_id,
      customer_id: rCase.customer_id,
      source_type: rCase.source_type,
      status: rCase.status,
      revenue_at_risk: rCase.revenue_at_risk,
      amount_recovered: amountRecovered,
      current_strategy: rCase.current_strategy,
      scenario_tag: rCase.scenario_tag,
      action_count: actions.length,
      audit_count: auditLogs.length,
      resolved_at: rCase.resolved_at,
      simulated: true,
    };
  }

  /**
   * Inspect all simulated active payment links
   */
  public getSimulatedLinks(): SimulatedPaymentLink[] {
    return Array.from(simulatedLinks.values());
  }

  /**
   * Inspect all simulated notifications
   */
  public getSimulatedNotifications(): SimulatedNotification[] {
    return Array.from(simulatedNotifications.values());
  }

  /**
   * Inspect all simulated payment method requests
   */
  public getSimulatedMethodRequests(): SimulatedPaymentMethodUpdateRequest[] {
    return Array.from(simulatedMethodRequests.values());
  }

  /**
   * Inspect all simulated scheduled retries
   */
  public getSimulatedSchedules(): SimulatedScheduledRetry[] {
    return Array.from(simulatedSchedules.values());
  }
}

export const recoverySimulator = new RecoverySimulatorService();
