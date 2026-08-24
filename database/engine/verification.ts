/**
 * @license
 * REVIVE — Stage 6: Verification Service
 * Phase 3 — Deterministic Recovery Engine
 *
 * Observes actual database state post-execution via simulator verification tools.
 * Confirms true state transitions instead of assuming API success.
 */

import { recoverySimulator } from '../simulator/recoverySimulator';
import { Payment, CaseStatus } from '../schema';
import { InvestigationContext, ExecutionResult, VerificationResult, VerificationState } from './types';

export class VerificationService {
  /**
   * Verifies the actual outcome by polling the underlying state.
   */
  public verifyOutcome(
    actionResult: ExecutionResult,
    context: InvestigationContext,
    caseId: string
  ): VerificationResult {
    const recoveryStatus = recoverySimulator.checkRecoveryStatus(caseId);

    let paymentVerificationStatus: string | undefined;
    if (context.source_type === 'PAYMENT' && context.source) {
      const payment = context.source as Payment;
      const paymentVerif = recoverySimulator.checkPaymentStatus(payment.payment_id);
      paymentVerificationStatus = paymentVerif.status;
    }

    let verificationState: VerificationState = 'PENDING';
    let notes = '';

    if (actionResult.action_type === 'RETRY_PAYMENT') {
      if (paymentVerificationStatus === 'SUCCESS' && recoveryStatus.status === 'RECOVERED') {
        verificationState = 'SUCCESS';
        notes = `Payment state confirmed SUCCESS. ₹${recoveryStatus.amount_recovered.toLocaleString()} successfully recovered.`;
      } else {
        verificationState = 'FAILED';
        notes = 'Payment retry execution failed to achieve SUCCESS status.';
      }
    } else if (actionResult.action_type === 'ESCALATE') {
      verificationState = 'ESCALATED';
      notes = `Case successfully marked as ESCALATED for human intervention.`;
    } else if (actionResult.action_type === 'STOP') {
      verificationState = 'STOPPED';
      notes = `Case successfully terminated with CLOSED status.`;
    } else if (
      actionResult.action_type === 'GENERATE_PAYMENT_LINK' ||
      actionResult.action_type === 'SEND_NOTIFICATION' ||
      actionResult.action_type === 'REQUEST_PAYMENT_METHOD_UPDATE' ||
      actionResult.action_type === 'SCHEDULE_RETRY'
    ) {
      if (actionResult.status === 'SUCCESS') {
        verificationState = 'PENDING';
        notes = `Action executed successfully. Awaiting customer or asynchronous completion.`;
      } else {
        verificationState = 'FAILED';
        notes = `Action dispatch reported failure.`;
      }
    }

    return {
      state: verificationState,
      verified_payment_status: paymentVerificationStatus,
      verified_recovery_status: recoveryStatus.status as CaseStatus,
      amount_recovered: recoveryStatus.amount_recovered,
      simulated: true,
      verification_notes: notes,
    };
  }
}

export const verificationService = new VerificationService();
