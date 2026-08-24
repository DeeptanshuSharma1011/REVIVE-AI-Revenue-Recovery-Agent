/**
 * @license
 * REVIVE — Mock AI Strategy Provider
 * Phase 4 — AI Decision Engine (Bounded Autonomy Architecture)
 *
 * Mock provider for unit tests, offline benchmarking, and resilience testing.
 * Supports configurable simulated responses, errors, malformed outputs, and low confidence.
 */

import { StrategyProvider, InvestigationContext, DiagnosisResult, StrategyDecision, CaseStrategy, RiskLevel } from '../types';
import { deterministicStrategyProvider } from './DeterministicStrategyProvider';
import { PROMPT_VERSION, DEFAULT_GEMINI_MODEL, DEFAULT_CONFIDENCE_THRESHOLD } from './AIRecoveryDecisionService';

export interface MockAIBehavior {
  mode: 'PERFECT_AGREEMENT' | 'LOW_CONFIDENCE' | 'INVALID_JSON' | 'INVALID_STRATEGY' | 'API_ERROR' | 'MISSING_KEY' | 'CUSTOM';
  customStrategy?: CaseStrategy;
  customConfidence?: number;
  customRiskLevel?: RiskLevel;
  customReason?: string;
  customExplanation?: string;
  errorMessage?: string;
}

export class MockAIStrategyProvider implements StrategyProvider {
  public readonly name = 'MockAIStrategyProvider';
  private behavior: MockAIBehavior = { mode: 'PERFECT_AGREEMENT' };
  private confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD;

  constructor(behavior: MockAIBehavior = { mode: 'PERFECT_AGREEMENT' }, confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD) {
    this.behavior = behavior;
    this.confidenceThreshold = confidenceThreshold;
  }

  public setBehavior(behavior: MockAIBehavior) {
    this.behavior = behavior;
  }

  public async selectStrategy(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): Promise<StrategyDecision> {
    const { mode } = this.behavior;

    if (mode === 'MISSING_KEY') {
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: 'GEMINI_API_KEY_NOT_CONFIGURED',
        validation_passed: true,
      };
    }

    if (mode === 'API_ERROR') {
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: `GEMINI_API_FAILURE: ${this.behavior.errorMessage || 'Simulated Gemini API 500 error'}`,
        validation_passed: true,
      };
    }

    if (mode === 'INVALID_JSON') {
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: 'AI_RESPONSE_JSON_MALFORMED',
        raw_model_response: 'Internal server string without JSON',
        validation_passed: false,
      };
    }

    if (mode === 'INVALID_STRATEGY') {
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: 'AI_DECISION_INVALID: Invalid or missing strategy: UNKNOWN_ACTION',
        raw_model_response: '{"strategy": "UNKNOWN_ACTION"}',
        validation_passed: false,
      };
    }

    if (mode === 'LOW_CONFIDENCE') {
      const lowConf = this.behavior.customConfidence ?? 0.54;
      return {
        strategy: 'ESCALATE',
        reason: `Confidence (${(lowConf * 100).toFixed(0)}%) below autonomous threshold (${(this.confidenceThreshold * 100).toFixed(0)}%). Proposed: RETRY_PAYMENT.`,
        explanation: `REVIVE AI evaluated this case with low confidence (${(lowConf * 100).toFixed(0)}%). Escalated for human oversight.`,
        decision_source: 'GEMINI',
        confidence: lowConf,
        risk_level: 'HIGH',
        requires_human_review: true,
        model: DEFAULT_GEMINI_MODEL,
        prompt_version: PROMPT_VERSION,
        validation_passed: true,
      };
    }

    if (mode === 'CUSTOM' && this.behavior.customStrategy) {
      const conf = this.behavior.customConfidence ?? 0.91;
      return {
        strategy: this.behavior.customStrategy,
        reason: this.behavior.customReason || 'Custom simulated AI reason.',
        explanation: this.behavior.customExplanation || 'Custom simulated AI explanation.',
        decision_source: 'GEMINI',
        confidence: conf,
        risk_level: this.behavior.customRiskLevel || 'LOW',
        requires_human_review: conf < this.confidenceThreshold,
        model: DEFAULT_GEMINI_MODEL,
        prompt_version: PROMPT_VERSION,
        validation_passed: true,
      };
    }

    // PERFECT_AGREEMENT: Simulate high-accuracy Gemini response agreeing with Ground Truth
    const deterministic = deterministicStrategyProvider.selectStrategy(context, diagnosis);
    return {
      strategy: deterministic.strategy,
      reason: `AI bounded reasoning: ${deterministic.reason}`,
      explanation: `REVIVE AI reasoned over customer ${context.customer.name}'s history (${context.customer_segment}) and confirmed ${deterministic.strategy} is optimal. ${deterministic.explanation}`,
      decision_source: 'GEMINI',
      confidence: 0.94,
      risk_level: deterministic.strategy === 'ESCALATE' ? 'HIGH' : 'LOW',
      requires_human_review: deterministic.strategy === 'ESCALATE',
      model: DEFAULT_GEMINI_MODEL,
      prompt_version: PROMPT_VERSION,
      validation_passed: true,
    };
  }
}
