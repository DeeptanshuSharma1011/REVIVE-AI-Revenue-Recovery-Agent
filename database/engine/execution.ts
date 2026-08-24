/**
 * @license
 * REVIVE — Stage 5: Execution Service
 * Phase 3 — Deterministic Recovery Engine
 *
 * Connects the selected recovery strategy to the Phase 2 Recovery Simulator.
 * Does not implement simulator internals; acts purely as the invocation bridge.
 */

import { recoverySimulator } from '../simulator/recoverySimulator';
import { Payment } from '../schema';
import { InvestigationContext, StrategyDecision, ExecutionResult } from './types';

export class ExecutionService {
  /**
   * Dispatches the strategy to the corresponding Phase 2 Simulator action.
   */
  public executeStrategy(
    strategy: StrategyDecision,
    context: InvestigationContext,
    caseId: string
  ): ExecutionResult {
    const { customer, revenue_at_risk, source, source_type } = context;

    switch (strategy.strategy) {
      case 'RETRY_PAYMENT': {
        const paymentId =
          source_type === 'PAYMENT' && source
            ? (source as Payment).payment_id
            : `pay_sim_${caseId.slice(0, 8)}`;

        const simResult = recoverySimulator.retryPayment(paymentId, caseId);
        return {
          action_type: 'RETRY_PAYMENT',
          status: simResult.status === 'success' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'SCHEDULE_RETRY': {
        const paymentId =
          source_type === 'PAYMENT' && source
            ? (source as Payment).payment_id
            : `pay_sim_${caseId.slice(0, 8)}`;

        // Schedule retry for next optimal window (e.g. +24 hours)
        const scheduledTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        const simResult = recoverySimulator.schedulePaymentRetry(paymentId, scheduledTime, caseId);
        return {
          action_type: 'SCHEDULE_RETRY',
          status: simResult.status === 'scheduled' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'PAYMENT_LINK': {
        const amount = (strategy.parameters?.amount as number) || revenue_at_risk;
        const simResult = recoverySimulator.generatePaymentLink(customer.customer_id, amount, caseId);
        return {
          action_type: 'GENERATE_PAYMENT_LINK',
          status: simResult.status === 'success' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'CUSTOMER_NOTIFICATION': {
        const message = `Dear ${customer.name}, please review your outstanding balance of ₹${revenue_at_risk.toLocaleString()} with REVIVE.`;
        const simResult = recoverySimulator.sendCustomerNotification(
          customer.customer_id,
          message,
          customer.preferred_channel,
          caseId
        );
        return {
          action_type: 'SEND_NOTIFICATION',
          status: simResult.status === 'sent' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'PAYMENT_METHOD_UPDATE': {
        const simResult = recoverySimulator.requestPaymentMethodUpdate(customer.customer_id, caseId);
        return {
          action_type: 'REQUEST_PAYMENT_METHOD_UPDATE',
          status: simResult.status === 'requested' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'ESCALATE': {
        const simResult = recoverySimulator.escalateToHuman(caseId, strategy.reason);
        return {
          action_type: 'ESCALATE',
          status: simResult.status === 'escalated' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      case 'STOP': {
        const simResult = recoverySimulator.stopRecovery(caseId, strategy.reason);
        return {
          action_type: 'STOP',
          status: simResult.status === 'stopped' ? 'SUCCESS' : 'FAILED',
          details: simResult as unknown as Record<string, unknown>,
          simulated: true,
        };
      }

      default:
        throw new Error(`Execution failed: Unsupported strategy '${strategy.strategy}'.`);
    }
  }
}

export const executionService = new ExecutionService();
