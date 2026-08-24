/**
 * @license
 * REVIVE — Payment Simulator Service
 * Phase 2 — Recovery Simulator
 *
 * Simulates bounded, deterministic payment actions without external gateways.
 */

import { randomUUID } from 'crypto';
import { db } from '../db';
import { paymentRepository } from '../repositories/PaymentRepository';
import { customerRepository } from '../repositories/CustomerRepository';
import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { recoveryActionRepository } from '../repositories/RecoveryActionRepository';
import { auditRepository } from '../repositories/AuditRepository';
import { CommunicationChannel, RecoveryAction, AuditLog } from '../schema';
import {
  RetryPaymentResponse,
  ScheduleRetryResponse,
  GeneratePaymentLinkResponse,
  SendNotificationResponse,
  PaymentMethodUpdateResponse,
  PaymentStatusVerification,
  SimulatedPaymentLink,
  SimulatedNotification,
  SimulatedPaymentMethodUpdateRequest,
  SimulatedScheduledRetry,
} from './models';
import {
  determinePaymentRetryOutcome,
  markPaymentMethodAsUpdated,
  isPaymentMethodUpdated,
} from './outcomes';

// In-memory simulation registry for non-table entities
export const simulatedLinks = new Map<string, SimulatedPaymentLink>();
export const simulatedNotifications = new Map<string, SimulatedNotification>();
export const simulatedMethodRequests = new Map<string, SimulatedPaymentMethodUpdateRequest>();
export const simulatedSchedules = new Map<string, SimulatedScheduledRetry>();

export class PaymentSimulatorService {
  /**
   * ACTION 1 — RETRY PAYMENT
   */
  public retryPayment(paymentId: string, caseId?: string): RetryPaymentResponse {
    const payment = paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment with ID '${paymentId}' does not exist in the simulation database.`);
    }

    // Check if already successful (idempotent / safeguard)
    if (payment.status === 'SUCCESS') {
      return {
        action: 'retry_payment',
        status: 'success',
        payment_id: payment.payment_id,
        amount: payment.amount,
        amount_recovered: payment.amount,
        attempt_number: payment.attempt_number,
        failure_reason: null,
        case_id: caseId,
        simulated: true,
        message: 'Payment is already settled successfully (idempotent check).',
      };
    }

    const customer = customerRepository.findById(payment.customer_id);
    let rCase = caseId ? recoveryCaseRepository.findById(caseId) : null;
    if (!rCase) {
      // Lookup recovery case by source_id
      for (const c of db.recoveryCases.values()) {
        if (c.source_id === payment.payment_id) {
          rCase = c;
          break;
        }
      }
    }

    // Determine deterministic outcome
    const outcome = determinePaymentRetryOutcome(payment, customer, rCase);
    const newAttemptNumber = payment.attempt_number + 1;
    const nowIso = new Date().toISOString();

    // Update payment state
    if (outcome.success) {
      paymentRepository.update(payment.payment_id, {
        status: 'SUCCESS',
        failure_reason: null,
        attempt_number: newAttemptNumber,
      });
    } else {
      paymentRepository.update(payment.payment_id, {
        status: 'FAILED',
        failure_reason: outcome.failure_reason,
        attempt_number: newAttemptNumber,
      });
    }

    // Update Recovery Case if associated
    let resolvedCaseStatus: string | undefined;
    if (rCase) {
      if (outcome.success) {
        resolvedCaseStatus = 'RECOVERED';
        recoveryCaseRepository.update(rCase.case_id, {
          status: 'RECOVERED',
          resolved_at: nowIso,
          current_strategy: 'RETRY_PAYMENT',
        });
      } else {
        resolvedCaseStatus = 'OPEN';
        recoveryCaseRepository.update(rCase.case_id, {
          status: 'OPEN',
          current_strategy: 'RETRY_PAYMENT',
        });
      }
    }

    // Record Recovery Action
    const targetCaseId = rCase ? rCase.case_id : `case_synth_${payment.payment_id.slice(0, 8)}`;
    const actionId = randomUUID();
    const recoveryAction: RecoveryAction = {
      action_id: actionId,
      case_id: targetCaseId,
      action_type: 'RETRY_PAYMENT',
      reason: outcome.success
        ? `Simulated retry attempt #${newAttemptNumber} recovered successfully.`
        : `Simulated retry attempt #${newAttemptNumber} failed due to: ${outcome.failure_reason}`,
      status: outcome.success ? 'SUCCESS' : 'FAILED',
      executed_at: nowIso,
      result: {
        payment_id: payment.payment_id,
        attempt_number: newAttemptNumber,
        failure_reason: outcome.failure_reason,
        simulated: true,
        success: outcome.success,
      },
      amount_recovered: outcome.amount_recovered,
    };
    recoveryActionRepository.create(recoveryAction);

    // Record Audit Log (Phase 2 has no policy engine -> NOT_EVALUATED)
    const auditLog: AuditLog = {
      log_id: randomUUID(),
      case_id: targetCaseId,
      agent_step: 'action_execution',
      tool_name: 'retry_payment',
      input_summary: {
        payment_id: payment.payment_id,
        amount: payment.amount,
        prior_attempt: payment.attempt_number,
        simulated: true,
      },
      output_summary: {
        status: outcome.success ? 'success' : 'failed',
        new_attempt_number: newAttemptNumber,
        failure_reason: outcome.failure_reason,
        amount_recovered: outcome.amount_recovered,
        message: outcome.message,
      },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    };
    auditRepository.create(auditLog);

    return {
      action: 'retry_payment',
      status: outcome.success ? 'success' : 'failed',
      payment_id: payment.payment_id,
      amount: payment.amount,
      amount_recovered: outcome.amount_recovered,
      attempt_number: newAttemptNumber,
      failure_reason: outcome.failure_reason,
      case_id: rCase?.case_id,
      case_status: resolvedCaseStatus,
      simulated: true,
      message: outcome.message,
    };
  }

  /**
   * ACTION 2 — SCHEDULE PAYMENT RETRY
   */
  public schedulePaymentRetry(
    paymentId: string,
    scheduledFor?: string,
    caseId?: string
  ): ScheduleRetryResponse {
    const payment = paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment with ID '${paymentId}' not found for scheduling retry.`);
    }

    const nowIso = new Date().toISOString();
    // Default to +24 hours if not provided
    const targetScheduledTime = scheduledFor || new Date(Date.now() + 86400000).toISOString();
    const scheduleId = `sched_${randomUUID().slice(0, 8)}`;

    const scheduleRecord: SimulatedScheduledRetry = {
      schedule_id: scheduleId,
      payment_id: payment.payment_id,
      case_id: caseId,
      scheduled_for: targetScheduledTime,
      status: 'SCHEDULED',
      created_at: nowIso,
      simulated: true,
    };
    simulatedSchedules.set(scheduleId, scheduleRecord);

    // Update case if exists
    let rCase = caseId ? recoveryCaseRepository.findById(caseId) : null;
    if (!rCase) {
      for (const c of db.recoveryCases.values()) {
        if (c.source_id === payment.payment_id) {
          rCase = c;
          break;
        }
      }
    }

    if (rCase && rCase.status !== 'RECOVERED') {
      recoveryCaseRepository.update(rCase.case_id, {
        status: 'ACTION_PENDING',
        current_strategy: 'SCHEDULE_RETRY',
      });
    } else if (rCase) {
      recoveryCaseRepository.update(rCase.case_id, {
        current_strategy: 'SCHEDULE_RETRY',
      });
    }

    const targetCaseId = rCase ? rCase.case_id : `case_synth_${payment.payment_id.slice(0, 8)}`;

    // Record Action
    recoveryActionRepository.create({
      action_id: randomUUID(),
      case_id: targetCaseId,
      action_type: 'SCHEDULE_RETRY',
      reason: `Automated retry scheduled for ${targetScheduledTime}`,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        schedule_id: scheduleId,
        payment_id: payment.payment_id,
        scheduled_for: targetScheduledTime,
        simulated: true,
      },
      amount_recovered: 0,
    });

    // Record Audit Log
    auditRepository.create({
      log_id: randomUUID(),
      case_id: targetCaseId,
      agent_step: 'action_execution',
      tool_name: 'schedule_payment_retry',
      input_summary: {
        payment_id: payment.payment_id,
        scheduled_for: targetScheduledTime,
      },
      output_summary: {
        schedule_id: scheduleId,
        status: 'scheduled',
      },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'schedule_payment_retry',
      status: 'scheduled',
      payment_id: payment.payment_id,
      scheduled_for: targetScheduledTime,
      case_id: rCase?.case_id,
      schedule_id: scheduleId,
      simulated: true,
      message: `Retry scheduled successfully for ${new Date(targetScheduledTime).toUTCString()}`,
    };
  }

  /**
   * ACTION 3 — GENERATE PAYMENT LINK
   */
  public generatePaymentLink(
    customerId: string,
    amount: number,
    caseId?: string
  ): GeneratePaymentLinkResponse {
    const customer = customerRepository.findById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID '${customerId}' not found.`);
    }

    if (amount <= 0) {
      throw new Error('Payment link amount must be greater than zero.');
    }

    const linkId = `plink_sim_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const paymentUrl = `https://demo.revive.local/pay/${linkId}`;
    const nowIso = new Date().toISOString();

    const linkRecord: SimulatedPaymentLink = {
      link_id: linkId,
      customer_id: customerId,
      amount,
      payment_url: paymentUrl,
      case_id: caseId,
      status: 'ACTIVE',
      created_at: nowIso,
      simulated: true,
    };
    simulatedLinks.set(linkId, linkRecord);

    const rCase = caseId ? recoveryCaseRepository.findById(caseId) : null;
    if (rCase) {
      recoveryCaseRepository.update(rCase.case_id, {
        current_strategy: 'PAYMENT_LINK',
      });
    }

    const targetCaseId = rCase ? rCase.case_id : `case_synth_cust_${customerId.slice(0, 8)}`;

    recoveryActionRepository.create({
      action_id: randomUUID(),
      case_id: targetCaseId,
      action_type: 'GENERATE_PAYMENT_LINK',
      reason: `Generated simulated recovery payment link for ₹${amount.toLocaleString()}`,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        payment_link_id: linkId,
        payment_url: paymentUrl,
        amount,
        simulated: true,
      },
      amount_recovered: 0,
    });

    auditRepository.create({
      log_id: randomUUID(),
      case_id: targetCaseId,
      agent_step: 'action_execution',
      tool_name: 'generate_payment_link',
      input_summary: { customer_id: customerId, amount },
      output_summary: { payment_link_id: linkId, payment_url: paymentUrl },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'generate_payment_link',
      status: 'success',
      customer_id: customerId,
      amount,
      payment_link_id: linkId,
      payment_url: paymentUrl,
      case_id: caseId,
      simulated: true,
      message: 'Simulation payment link generated successfully',
    };
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
    const customer = customerRepository.findById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID '${customerId}' not found.`);
    }

    if (!['EMAIL', 'SMS', 'WHATSAPP'].includes(channel)) {
      throw new Error(`Unsupported communication channel: '${channel}'. Allowed: EMAIL, SMS, WHATSAPP.`);
    }

    const notificationId = `notif_sim_${randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const notifRecord: SimulatedNotification = {
      notification_id: notificationId,
      customer_id: customerId,
      channel,
      message,
      case_id: caseId,
      delivery_status: 'DELIVERED',
      sent_at: nowIso,
      simulated: true,
    };
    simulatedNotifications.set(notificationId, notifRecord);

    const rCase = caseId ? recoveryCaseRepository.findById(caseId) : null;
    if (rCase) {
      // NOTE: Case remains OPEN (notification sent does not automatically recover revenue)
      recoveryCaseRepository.update(rCase.case_id, {
        current_strategy: 'CUSTOMER_NOTIFICATION',
      });
    }

    const targetCaseId = rCase ? rCase.case_id : `case_synth_cust_${customerId.slice(0, 8)}`;

    recoveryActionRepository.create({
      action_id: randomUUID(),
      case_id: targetCaseId,
      action_type: 'SEND_NOTIFICATION',
      reason: `Sent simulated ${channel} reminder to ${customer.name}`,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        notification_id: notificationId,
        channel,
        delivery_status: 'DELIVERED',
        simulated: true,
      },
      amount_recovered: 0,
    });

    auditRepository.create({
      log_id: randomUUID(),
      case_id: targetCaseId,
      agent_step: 'action_execution',
      tool_name: 'send_customer_notification',
      input_summary: { customer_id: customerId, channel, preview: message.slice(0, 40) },
      output_summary: { notification_id: notificationId, status: 'DELIVERED' },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'send_customer_notification',
      status: 'sent',
      channel,
      customer_id: customerId,
      case_id: caseId,
      notification_id: notificationId,
      simulated: true,
      message: `Simulated notification sent via ${channel} successfully`,
    };
  }

  /**
   * ACTION 5 — REQUEST PAYMENT METHOD UPDATE
   */
  public requestPaymentMethodUpdate(
    customerId: string,
    caseId?: string
  ): PaymentMethodUpdateResponse {
    const customer = customerRepository.findById(customerId);
    if (!customer) {
      throw new Error(`Customer with ID '${customerId}' not found.`);
    }

    const requestId = `pmu_req_${randomUUID().slice(0, 8)}`;
    const updateUrl = `https://demo.revive.local/account/payment-methods/update?req=${requestId}`;
    const nowIso = new Date().toISOString();

    const requestRecord: SimulatedPaymentMethodUpdateRequest = {
      request_id: requestId,
      customer_id: customerId,
      case_id: caseId,
      update_url: updateUrl,
      status: 'REQUESTED',
      created_at: nowIso,
      simulated: true,
    };
    simulatedMethodRequests.set(requestId, requestRecord);

    // Deterministic state transition trigger:
    // Mark customer's payment method update in progress
    markPaymentMethodAsUpdated(customerId);

    const rCase = caseId ? recoveryCaseRepository.findById(caseId) : null;
    if (rCase) {
      recoveryCaseRepository.update(rCase.case_id, {
        current_strategy: 'PAYMENT_METHOD_UPDATE',
      });
    }

    const targetCaseId = rCase ? rCase.case_id : `case_synth_cust_${customerId.slice(0, 8)}`;

    recoveryActionRepository.create({
      action_id: randomUUID(),
      case_id: targetCaseId,
      action_type: 'REQUEST_PAYMENT_METHOD_UPDATE',
      reason: `Dispatched payment method update link for customer ${customer.name}`,
      status: 'SUCCESS',
      executed_at: nowIso,
      result: {
        request_id: requestId,
        update_url: updateUrl,
        simulated: true,
      },
      amount_recovered: 0,
    });

    auditRepository.create({
      log_id: randomUUID(),
      case_id: targetCaseId,
      agent_step: 'action_execution',
      tool_name: 'request_payment_method_update',
      input_summary: { customer_id: customerId },
      output_summary: { request_id: requestId, status: 'requested' },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 2: Policy engine not yet implemented',
      },
      timestamp: nowIso,
    });

    return {
      action: 'request_payment_method_update',
      status: 'requested',
      customer_id: customerId,
      request_id: requestId,
      update_url: updateUrl,
      case_id: caseId,
      simulated: true,
      message: 'Payment method update request simulated successfully',
    };
  }

  /**
   * VERIFICATION FUNCTION 1: check_payment_status
   */
  public checkPaymentStatus(paymentId: string): PaymentStatusVerification {
    const payment = paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error(`Payment '${paymentId}' not found.`);
    }

    return {
      payment_id: payment.payment_id,
      customer_id: payment.customer_id,
      status: payment.status,
      amount: payment.amount,
      attempt_number: payment.attempt_number,
      failure_reason: payment.failure_reason,
      payment_method: payment.payment_method,
      updated_at: payment.updated_at,
      simulated: true,
    };
  }
}

export const paymentSimulator = new PaymentSimulatorService();
