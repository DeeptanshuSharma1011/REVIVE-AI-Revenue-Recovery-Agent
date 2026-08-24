/**
 * @license
 * REVIVE — Agent Tool Registry & Bounded Execution Wrappers
 * Phase 5 — Agentic Orchestration
 *
 * Converts Phase 2 simulator functions and backend services into formal, typed,
 * bounded agent tools. The agent has NO unrestricted access to databases, SQL,
 * filesystem, shell, or arbitrary HTTP APIs.
 */

import { randomUUID } from 'crypto';
import { investigationService } from '../investigation';
import { diagnosisService } from '../diagnosis';
import { recoverySimulator } from '../../simulator/recoverySimulator';
import { recoveryCaseRepository } from '../../repositories/RecoveryCaseRepository';
import { auditRepository } from '../../repositories/AuditRepository';
import { CommunicationChannel } from '../../schema';
import { InvestigationContext, DiagnosisResult } from '../types';

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  isReadOnly: boolean;
  execute: (input: TInput, runId: string, caseId: string) => Promise<TOutput> | TOutput;
}

export interface GetCaseContextInput {
  case_id: string;
}

export interface DiagnoseCaseInput {
  case_id: string;
}

export interface RetryPaymentInput {
  payment_id: string;
  case_id: string;
}

export interface ScheduleRetryInput {
  payment_id: string;
  scheduled_for?: string;
  case_id: string;
}

export interface GeneratePaymentLinkInput {
  customer_id: string;
  amount: number;
  case_id: string;
}

export interface SendCustomerNotificationInput {
  customer_id: string;
  message: string;
  channel?: CommunicationChannel;
  case_id: string;
}

export interface RequestPaymentMethodUpdateInput {
  customer_id: string;
  case_id: string;
}

export interface EscalateToHumanInput {
  case_id: string;
  reason?: string;
}

export interface StopRecoveryInput {
  case_id: string;
  reason?: string;
}

export interface CheckPaymentStatusInput {
  payment_id: string;
}

export interface CheckRecoveryStatusInput {
  case_id: string;
}

export class ReviveAgentToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerTools();
  }

  private logToolAudit(
    runId: string,
    caseId: string,
    toolName: string,
    input: any,
    output: any,
    status: 'SUCCESS' | 'FAILED'
  ) {
    auditRepository.create({
      log_id: randomUUID(),
      case_id: caseId,
      agent_step: `tool:${toolName}`,
      tool_name: toolName,
      input_summary: { run_id: runId, ...input },
      output_summary: { status, ...output },
      policy_result: {
        evaluated: false,
        status: 'NOT_EVALUATED',
        note: 'Phase 5: Agentic Orchestration Tool Execution (Policy Engine in Phase 6)',
        agent_run_id: runId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private registerTools() {
    // 1. get_case_context
    this.register({
      name: 'get_case_context',
      description:
        'Retrieves comprehensive investigation context including customer profile, payment history, subscriptions, and previous actions. Read-only.',
      isReadOnly: true,
      execute: (input: GetCaseContextInput, runId: string, caseId: string) => {
        const context = investigationService.investigateCase(input.case_id || caseId);
        this.logToolAudit(runId, caseId, 'get_case_context', input, { customer: context.customer.name }, 'SUCCESS');
        return context;
      },
    });

    // 2. diagnose_case
    this.register({
      name: 'diagnose_case',
      description:
        'Diagnoses the technical or business root cause for revenue risk based on context. Returns diagnosis code and confidence. Read-only.',
      isReadOnly: true,
      execute: (input: DiagnoseCaseInput, runId: string, caseId: string) => {
        const context = investigationService.investigateCase(input.case_id || caseId);
        const diagnosis = diagnosisService.diagnoseCase(context);
        this.logToolAudit(
          runId,
          caseId,
          'diagnose_case',
          input,
          { diagnosis: diagnosis.diagnosis, confidence: diagnosis.confidence },
          'SUCCESS'
        );
        return diagnosis;
      },
    });

    // 3. retry_payment
    this.register({
      name: 'retry_payment',
      description:
        'Retries a failed payment in the REVIVE simulation environment. Use only when the payment is currently failed and a retry is appropriate. This tool does not process real money.',
      isReadOnly: false,
      execute: (input: RetryPaymentInput, runId: string, caseId: string) => {
        const result = recoverySimulator.retryPayment(input.payment_id, input.case_id || caseId);
        this.logToolAudit(
          runId,
          caseId,
          'retry_payment',
          input,
          result as any,
          result.status === 'success' ? 'SUCCESS' : 'FAILED'
        );
        return result;
      },
    });

    // 4. schedule_payment_retry
    this.register({
      name: 'schedule_payment_retry',
      description:
        'Schedules an automated payment retry for an optimal future time window in the simulation environment.',
      isReadOnly: false,
      execute: (input: ScheduleRetryInput, runId: string, caseId: string) => {
        const result = recoverySimulator.schedulePaymentRetry(
          input.payment_id,
          input.scheduled_for,
          input.case_id || caseId
        );
        this.logToolAudit(runId, caseId, 'schedule_payment_retry', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 5. generate_payment_link
    this.register({
      name: 'generate_payment_link',
      description:
        'Generates a simulated direct checkout payment link for abandoned checkouts or direct invoice recovery.',
      isReadOnly: false,
      execute: (input: GeneratePaymentLinkInput, runId: string, caseId: string) => {
        const result = recoverySimulator.generatePaymentLink(
          input.customer_id,
          input.amount,
          input.case_id || caseId
        );
        this.logToolAudit(runId, caseId, 'generate_payment_link', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 6. send_customer_notification
    this.register({
      name: 'send_customer_notification',
      description:
        'Dispatches a friendly, compliant payment recovery notification via EMAIL, SMS, or WHATSAPP.',
      isReadOnly: false,
      execute: (input: SendCustomerNotificationInput, runId: string, caseId: string) => {
        const result = recoverySimulator.sendCustomerNotification(
          input.customer_id,
          input.message,
          input.channel || 'EMAIL',
          input.case_id || caseId
        );
        this.logToolAudit(runId, caseId, 'send_customer_notification', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 7. request_payment_method_update
    this.register({
      name: 'request_payment_method_update',
      description:
        'Dispatches a secure self-service portal link to the customer to update an expired or invalid payment method.',
      isReadOnly: false,
      execute: (input: RequestPaymentMethodUpdateInput, runId: string, caseId: string) => {
        const result = recoverySimulator.requestPaymentMethodUpdate(input.customer_id, input.case_id || caseId);
        this.logToolAudit(runId, caseId, 'request_payment_method_update', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 8. escalate_to_human
    this.register({
      name: 'escalate_to_human',
      description:
        'Escalates the case to human operations/account managers when revenue risk is high (> ₹25,000) or automation limits are reached.',
      isReadOnly: false,
      execute: (input: EscalateToHumanInput, runId: string, caseId: string) => {
        const result = recoverySimulator.escalateToHuman(input.case_id || caseId, input.reason);
        this.logToolAudit(runId, caseId, 'escalate_to_human', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 9. stop_recovery
    this.register({
      name: 'stop_recovery',
      description:
        'Terminates further automated recovery cycles when max retries are exhausted or customer has churned.',
      isReadOnly: false,
      execute: (input: StopRecoveryInput, runId: string, caseId: string) => {
        const result = recoverySimulator.stopRecovery(input.case_id || caseId, input.reason);
        this.logToolAudit(runId, caseId, 'stop_recovery', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 10. check_payment_status
    this.register({
      name: 'check_payment_status',
      description:
        'Verifies the verified ledger status and amount of a payment transaction. Read-only.',
      isReadOnly: true,
      execute: (input: CheckPaymentStatusInput, runId: string, caseId: string) => {
        const result = recoverySimulator.checkPaymentStatus(input.payment_id);
        this.logToolAudit(runId, caseId, 'check_payment_status', input, result as any, 'SUCCESS');
        return result;
      },
    });

    // 11. check_recovery_status
    this.register({
      name: 'check_recovery_status',
      description:
        'Verifies the updated lifecycle state, recovered revenue, and action count of a recovery case. Read-only.',
      isReadOnly: true,
      execute: (input: CheckRecoveryStatusInput, runId: string, caseId: string) => {
        const result = recoverySimulator.checkRecoveryStatus(input.case_id || caseId);
        this.logToolAudit(runId, caseId, 'check_recovery_status', input, result as any, 'SUCCESS');
        return result;
      },
    });
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public listTools(): Array<{ name: string; description: string; isReadOnly: boolean }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      isReadOnly: t.isReadOnly,
    }));
  }

  public async executeTool<TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    runId: string,
    caseId: string
  ): Promise<TOutput> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`[REVIVE:AGENT] Unauthorized tool call: '${name}'. Only explicitly registered tools are allowed.`);
    }
    return tool.execute(input, runId, caseId);
  }
}

export const agentToolRegistry = new ReviveAgentToolRegistry();
