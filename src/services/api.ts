import {
  HealthResponse,
  ApiInfoResponse,
  RecoveryMetrics,
  AgentStatusResponse,
  RecoveryCase,
  RecoveryCaseDetails,
  Customer,
  CustomerFullProfile,
  GroundTruthScenario,
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
  SimulatedScheduledRetry,
  SimulatedPaymentMethodUpdateRequest,
  RecoveryProcessResult,
  InvestigationContext,
  DiagnosisResult,
  StrategyDecision,
  EngineTimelineStep,
  EngineMetrics,
  AIStatusResponse,
  AIEvaluationReport,
  AgentRunResult,
  AgentMetrics,
  PolicyConfig,
  PolicyMetrics,
  PolicyResult,
  PolicyExplanationCard,
  PolicyEvaluationAuditRecord,
} from '../types';

const BASE_URL = '';

export const apiService = {
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status: ${res.status}`);
    }
    return res.json();
  },

  async getDatabaseHealth(): Promise<Record<string, unknown>> {
    const res = await fetch(`${BASE_URL}/api/database/health`);
    if (!res.ok) throw new Error('Failed to fetch DB health');
    return res.json();
  },

  async getApiInfo(): Promise<ApiInfoResponse> {
    const res = await fetch(`${BASE_URL}/api`);
    if (!res.ok) {
      throw new Error(`Failed to fetch API info with status: ${res.status}`);
    }
    return res.json();
  },

  async getAgentStatus(): Promise<AgentStatusResponse> {
    const res = await fetch(`${BASE_URL}/api/agent/status`);
    if (!res.ok) {
      return {
        status: 'READY',
        currentCaseId: null,
        currentStep: null,
        lastUpdated: new Date().toISOString(),
        phase: 'Phase 1 — Data Foundation Active',
      };
    }
    return res.json();
  },

  async getMetrics(): Promise<RecoveryMetrics> {
    const res = await fetch(`${BASE_URL}/api/recovery/metrics`);
    if (!res.ok) {
      return {
        totalRevenueAtRisk: 0,
        totalRecoveredRevenue: 0,
        recoveryRatePercent: 0,
        openCasesCount: 0,
        recoveredCasesCount: 0,
        escalatedCasesCount: 0,
        breakdownBySource: {},
        breakdownByPriority: {},
      };
    }
    return res.json();
  },

  async getCases(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    priority?: string;
    sourceType?: string;
  }): Promise<{ items: RecoveryCase[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.sourceType) query.set('sourceType', params.sourceType);

    const res = await fetch(`${BASE_URL}/api/recovery/cases?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch recovery cases');
    return res.json();
  },

  async getCaseDetails(caseId: string): Promise<RecoveryCaseDetails> {
    const res = await fetch(`${BASE_URL}/api/recovery/cases/${caseId}`);
    if (!res.ok) throw new Error(`Failed to fetch case details for ${caseId}`);
    return res.json();
  },

  async getCustomerProfile(customerId: string): Promise<CustomerFullProfile> {
    const res = await fetch(`${BASE_URL}/api/customers/${customerId}`);
    if (!res.ok) throw new Error(`Failed to fetch customer ${customerId}`);
    return res.json();
  },

  async getGroundTruthScenarios(): Promise<{ scenarios: GroundTruthScenario[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/ground-truth`);
    if (!res.ok) throw new Error('Failed to fetch ground truth scenarios');
    return res.json();
  },

  async seedDatabase(seed = 42, multiplier = 1.0): Promise<{ message: string; counts: Record<string, number> }> {
    const res = await fetch(`${BASE_URL}/api/database/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed, multiplier }),
    });
    if (!res.ok) throw new Error('Failed to seed database');
    return res.json();
  },

  async resetDatabase(): Promise<{ message: string; counts: Record<string, number> }> {
    const res = await fetch(`${BASE_URL}/api/database/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  },

  // ==========================================
  // PHASE 2: SIMULATOR ACTIONS & VERIFICATION
  // ==========================================

  async retryPayment(paymentId: string, caseId?: string): Promise<RetryPaymentResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/payments/${paymentId}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Retry payment failed' }));
      throw new Error(err.error || `Retry payment failed with status ${res.status}`);
    }
    return res.json();
  },

  async schedulePaymentRetry(
    paymentId: string,
    scheduledFor?: string,
    caseId?: string
  ): Promise<ScheduleRetryResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/payments/${paymentId}/schedule-retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_for: scheduledFor, case_id: caseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Schedule retry failed' }));
      throw new Error(err.error || `Schedule retry failed with status ${res.status}`);
    }
    return res.json();
  },

  async generatePaymentLink(
    customerId: string,
    amount: number,
    caseId?: string
  ): Promise<GeneratePaymentLinkResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/payment-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, amount, case_id: caseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Generate payment link failed' }));
      throw new Error(err.error || `Generate payment link failed with status ${res.status}`);
    }
    return res.json();
  },

  async sendCustomerNotification(
    customerId: string,
    message: string,
    channel = 'EMAIL',
    caseId?: string
  ): Promise<SendNotificationResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, message, channel, case_id: caseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Send notification failed' }));
      throw new Error(err.error || `Send notification failed with status ${res.status}`);
    }
    return res.json();
  },

  async requestPaymentMethodUpdate(
    customerId: string,
    caseId?: string
  ): Promise<PaymentMethodUpdateResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/payment-method-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, case_id: caseId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request payment method update failed' }));
      throw new Error(err.error || `Request payment method update failed with status ${res.status}`);
    }
    return res.json();
  },

  async escalateToHuman(caseId: string, reason?: string): Promise<EscalateResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/cases/${caseId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Escalate to human failed' }));
      throw new Error(err.error || `Escalate to human failed with status ${res.status}`);
    }
    return res.json();
  },

  async stopRecovery(caseId: string, reason?: string): Promise<StopRecoveryResponse> {
    const res = await fetch(`${BASE_URL}/api/simulator/cases/${caseId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Stop recovery failed' }));
      throw new Error(err.error || `Stop recovery failed with status ${res.status}`);
    }
    return res.json();
  },

  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusVerification> {
    const res = await fetch(`${BASE_URL}/api/simulator/payments/${paymentId}/status`);
    if (!res.ok) throw new Error(`Check payment status failed for ${paymentId}`);
    return res.json();
  },

  async checkRecoveryStatus(caseId: string): Promise<RecoveryStatusVerification> {
    const res = await fetch(`${BASE_URL}/api/simulator/cases/${caseId}/status`);
    if (!res.ok) throw new Error(`Check recovery status failed for ${caseId}`);
    return res.json();
  },

  async getSimulatedLinks(): Promise<{ links: SimulatedPaymentLink[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/simulator/payment-links`);
    if (!res.ok) throw new Error('Failed to fetch simulated payment links');
    return res.json();
  },

  async getSimulatedNotifications(): Promise<{ notifications: SimulatedNotification[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/simulator/notifications`);
    if (!res.ok) throw new Error('Failed to fetch simulated notifications');
    return res.json();
  },

  async getSimulatedSchedules(): Promise<{ schedules: SimulatedScheduledRetry[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/simulator/scheduled-retries`);
    if (!res.ok) throw new Error('Failed to fetch simulated schedules');
    return res.json();
  },

  async getSimulatedMethodRequests(): Promise<{ requests: SimulatedPaymentMethodUpdateRequest[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/simulator/payment-method-requests`);
    if (!res.ok) throw new Error('Failed to fetch simulated method requests');
    return res.json();
  },

  // ==========================================
  // PHASE 3 & 4: RECOVERY ENGINE & AI METHODS
  // ==========================================

  async getStrategyMode(): Promise<{ mode: 'deterministic' | 'ai'; aiStatus: AIStatusResponse }> {
    const res = await fetch(`${BASE_URL}/api/recovery/strategy-mode`);
    if (!res.ok) throw new Error('Failed to fetch strategy mode');
    return res.json();
  },

  async setStrategyMode(mode: 'deterministic' | 'ai'): Promise<{ mode: 'deterministic' | 'ai'; message: string; aiStatus: AIStatusResponse }> {
    const res = await fetch(`${BASE_URL}/api/recovery/strategy-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Failed to update strategy mode');
    return res.json();
  },

  async getAIStatus(): Promise<AIStatusResponse> {
    const res = await fetch(`${BASE_URL}/api/recovery/ai/status`);
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return res.json();
  },

  async getAIEvaluation(): Promise<AIEvaluationReport> {
    const res = await fetch(`${BASE_URL}/api/recovery/ai/evaluation`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI evaluation failed' }));
      throw new Error(err.error || `Evaluation failed with status ${res.status}`);
    }
    return res.json();
  },

  async processRecoveryCase(caseId: string, strategyMode?: 'deterministic' | 'ai'): Promise<RecoveryProcessResult> {
    const res = await fetch(`${BASE_URL}/api/recovery/process/${caseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy_mode: strategyMode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Recovery processing failed' }));
      throw new Error(err.error || `Process case failed with status ${res.status}`);
    }
    return res.json();
  },

  async getRecoveryContext(caseId: string): Promise<InvestigationContext> {
    const res = await fetch(`${BASE_URL}/api/recovery/cases/${caseId}/context`);
    if (!res.ok) throw new Error(`Failed to fetch investigation context for case ${caseId}`);
    return res.json();
  },

  async getRecoveryDiagnosis(caseId: string): Promise<DiagnosisResult> {
    const res = await fetch(`${BASE_URL}/api/recovery/cases/${caseId}/diagnosis`);
    if (!res.ok) throw new Error(`Failed to fetch diagnosis for case ${caseId}`);
    return res.json();
  },

  async getRecoveryDecision(caseId: string, mode?: 'deterministic' | 'ai'): Promise<StrategyDecision> {
    const query = mode ? `?mode=${mode}` : '';
    const res = await fetch(`${BASE_URL}/api/recovery/cases/${caseId}/decision${query}`);
    if (!res.ok) throw new Error(`Failed to fetch decision for case ${caseId}`);
    return res.json();
  },

  async getRecoveryTimeline(caseId: string): Promise<{ case_id: string; timeline: EngineTimelineStep[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/recovery/cases/${caseId}/timeline`);
    if (!res.ok) throw new Error(`Failed to fetch timeline for case ${caseId}`);
    return res.json();
  },

  async getEngineMetrics(): Promise<EngineMetrics> {
    const res = await fetch(`${BASE_URL}/api/recovery/metrics`);
    if (!res.ok) throw new Error('Failed to fetch recovery metrics');
    return res.json();
  },

  // ==========================================
  // PHASE 5: LANGGRAPH AGENT ORCHESTRATION
  // ==========================================

  async runAgentRecovery(caseId: string, forceDeterministic = false): Promise<AgentRunResult> {
    const res = await fetch(`${BASE_URL}/api/agent/recover/${caseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_deterministic: forceDeterministic }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Agent recovery run failed' }));
      throw new Error(err.error || `Agent run failed with status ${res.status}`);
    }
    return res.json();
  },

  async getAgentRun(runId: string): Promise<AgentRunResult> {
    const res = await fetch(`${BASE_URL}/api/agent/runs/${runId}`);
    if (!res.ok) throw new Error(`Failed to fetch agent run ${runId}`);
    return res.json();
  },

  async getAllAgentRuns(): Promise<{ runs: AgentRunResult[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/agent/runs`);
    if (!res.ok) throw new Error('Failed to fetch agent runs');
    return res.json();
  },

  async getAgentMetrics(): Promise<AgentMetrics> {
    const res = await fetch(`${BASE_URL}/api/agent/metrics`);
    if (!res.ok) throw new Error('Failed to fetch agent metrics');
    return res.json();
  },

  async getAgentTools(): Promise<{ tools: Array<{ name: string; description: string; isReadOnly: boolean }> }> {
    const res = await fetch(`${BASE_URL}/api/agent/tools`);
    if (!res.ok) throw new Error('Failed to fetch agent tools');
    return res.json();
  },

  // ==========================================
  // PHASE 6: GUARDRAILS & POLICY ENGINE
  // ==========================================

  async getPolicyConfig(): Promise<{ config: PolicyConfig; version: string; description: string }> {
    const res = await fetch(`${BASE_URL}/api/policy/config`);
    if (!res.ok) throw new Error('Failed to fetch policy configuration');
    return res.json();
  },

  async getPolicyMetrics(): Promise<PolicyMetrics> {
    const res = await fetch(`${BASE_URL}/api/policy/metrics`);
    if (!res.ok) throw new Error('Failed to fetch policy metrics');
    return res.json();
  },

  async getPolicyHistory(): Promise<{ history: PolicyEvaluationAuditRecord[]; count: number }> {
    const res = await fetch(`${BASE_URL}/api/policy/history`);
    if (!res.ok) throw new Error('Failed to fetch policy history');
    return res.json();
  },

  async evaluatePolicy(payload: {
    case_id?: string;
    strategy?: string;
    confidence?: number;
    reason?: string;
  }): Promise<{
    proposed: { strategy: string; confidence: number; reason: string };
    result: PolicyResult;
    explanation_card: PolicyExplanationCard;
  }> {
    const res = await fetch(`${BASE_URL}/api/policy/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Policy evaluation failed' }));
      throw new Error(err.error || `Policy evaluation failed with status ${res.status}`);
    }
    return res.json();
  },
};

