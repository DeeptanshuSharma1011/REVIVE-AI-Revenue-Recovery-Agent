/**
 * @license
 * REVIVE — Stage 4: Strategy Engine (Bounded Autonomy Architecture)
 * Phase 4 — AI Decision Engine
 *
 * Coordinates strategy selection via Deterministic or AI (Gemini) Strategy Providers.
 * Respects strict validation, confidence thresholds, and safe fallback.
 */

import { InvestigationContext, DiagnosisResult, StrategyDecision, StrategyProvider } from './types';
import { deterministicStrategyProvider } from './ai/DeterministicStrategyProvider';
import { aiStrategyProvider } from './ai/AIStrategyProvider';

export type RecoveryStrategyMode = 'deterministic' | 'ai';

export class StrategyEngine {
  private mode: RecoveryStrategyMode;
  private customProvider: StrategyProvider | null = null;

  constructor() {
    const envMode = (process.env.RECOVERY_STRATEGY_MODE || '').toLowerCase();
    this.mode = envMode === 'ai' ? 'ai' : 'deterministic';
  }

  /**
   * Sets the active strategy selection mode.
   */
  public setStrategyMode(mode: RecoveryStrategyMode): void {
    this.mode = mode;
  }

  /**
   * Returns current strategy mode.
   */
  public getStrategyMode(): RecoveryStrategyMode {
    return this.mode;
  }

  /**
   * Injects a custom strategy provider (e.g. MockAIStrategyProvider for testing).
   */
  public setCustomProvider(provider: StrategyProvider | null): void {
    this.customProvider = provider;
  }

  /**
   * Selects recovery strategy synchronously using deterministic provider.
   */
  public selectStrategy(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): StrategyDecision {
    return deterministicStrategyProvider.selectStrategy(context, diagnosis);
  }

  /**
   * Selects recovery strategy using the active provider (Gemini AI or Deterministic).
   */
  public async selectStrategyAsync(
    context: InvestigationContext,
    diagnosis: DiagnosisResult,
    overrideMode?: RecoveryStrategyMode
  ): Promise<StrategyDecision> {
    const effectiveMode = overrideMode || this.mode;

    if (this.customProvider) {
      return this.customProvider.selectStrategy(context, diagnosis);
    }

    if (effectiveMode === 'ai') {
      return aiStrategyProvider.selectStrategy(context, diagnosis);
    }

    return deterministicStrategyProvider.selectStrategy(context, diagnosis);
  }
}

export const strategyEngine = new StrategyEngine();
