/**
 * @license
 * REVIVE — AI Strategy Provider
 * Phase 4 — AI Decision Engine (Bounded Autonomy Architecture)
 *
 * Implements the StrategyProvider interface delegating decision reasoning to Gemini
 * with bounded validation and deterministic fallback.
 */

import { StrategyProvider, InvestigationContext, DiagnosisResult, StrategyDecision } from '../types';
import { aiRecoveryDecisionService, AIRecoveryDecisionService } from './AIRecoveryDecisionService';

export class AIStrategyProvider implements StrategyProvider {
  public readonly name = 'AIStrategyProvider';
  private service: AIRecoveryDecisionService;

  constructor(service: AIRecoveryDecisionService = aiRecoveryDecisionService) {
    this.service = service;
  }

  public async selectStrategy(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): Promise<StrategyDecision> {
    return this.service.evaluateCase(context, diagnosis);
  }
}

export const aiStrategyProvider = new AIStrategyProvider();
