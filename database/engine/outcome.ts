/**
 * @license
 * REVIVE — Stage 7: Outcome Service
 * Phase 3 — Deterministic Recovery Engine
 *
 * Finalizes case state mutations, timestamps, and business summary generation.
 */

import { recoveryCaseRepository } from '../repositories/RecoveryCaseRepository';
import { CaseStatus } from '../schema';
import { InvestigationContext, VerificationResult, StrategyDecision, ExecutionResult } from './types';

export interface OutcomeResult {
  final_status: CaseStatus;
  amount_recovered: number;
  summary: string;
  is_resolved: boolean;
}

export class OutcomeService {
  /**
   * Finalizes the outcome of the recovery run.
   */
  public finalizeOutcome(
    verification: VerificationResult,
    strategy: StrategyDecision,
    actionResult: ExecutionResult,
    context: InvestigationContext,
    caseId: string
  ): OutcomeResult {
    const rCase = recoveryCaseRepository.findById(caseId);
    if (!rCase) {
      throw new Error(`Outcome finalization failed: Case '${caseId}' not found.`);
    }

    let finalStatus: CaseStatus = rCase.status;
    let isResolved = false;
    let summary = '';

    if (verification.state === 'SUCCESS') {
      finalStatus = 'RECOVERED';
      isResolved = true;
      summary = `Payment successfully recovered after retry. ₹${verification.amount_recovered.toLocaleString()} reclaimed.`;
      recoveryCaseRepository.update(caseId, {
        status: 'RECOVERED',
        current_strategy: strategy.strategy,
        resolved_at: new Date().toISOString(),
      });
    } else if (verification.state === 'ESCALATED') {
      finalStatus = 'ESCALATED';
      isResolved = false;
      summary = `Case escalated to human review: ${strategy.reason}`;
      recoveryCaseRepository.update(caseId, {
        status: 'ESCALATED',
        current_strategy: 'ESCALATE',
      });
    } else if (verification.state === 'STOPPED') {
      finalStatus = 'CLOSED';
      isResolved = true;
      summary = `Recovery halted: ${strategy.reason}`;
      recoveryCaseRepository.update(caseId, {
        status: 'CLOSED',
        current_strategy: 'STOP',
        resolved_at: new Date().toISOString(),
      });
    } else if (verification.state === 'PENDING') {
      finalStatus = 'ACTION_PENDING';
      isResolved = false;
      if (strategy.strategy === 'PAYMENT_LINK') {
        summary = `Direct payment link issued to customer. Case remains pending customer payment.`;
      } else if (strategy.strategy === 'CUSTOMER_NOTIFICATION') {
        summary = `Customer reminder notification sent. Case remains active awaiting response.`;
      } else if (strategy.strategy === 'PAYMENT_METHOD_UPDATE') {
        summary = `Payment method update link dispatched. Awaiting new customer credentials.`;
      } else if (strategy.strategy === 'SCHEDULE_RETRY') {
        summary = `Payment retry scheduled for optimal processing window.`;
      } else {
        summary = `Action dispatched. Case pending resolution.`;
      }
      recoveryCaseRepository.update(caseId, {
        status: 'ACTION_PENDING',
        current_strategy: strategy.strategy,
      });
    } else {
      // FAILED
      finalStatus = 'OPEN';
      isResolved = false;
      summary = `Automated action execution did not resolve the risk event.`;
      recoveryCaseRepository.update(caseId, {
        status: 'OPEN',
        current_strategy: strategy.strategy,
      });
    }

    return {
      final_status: finalStatus,
      amount_recovered: verification.amount_recovered,
      summary,
      is_resolved: isResolved,
    };
  }
}

export const outcomeService = new OutcomeService();
