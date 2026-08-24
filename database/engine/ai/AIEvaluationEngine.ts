/**
 * @license
 * REVIVE — AI Evaluation Engine
 * Phase 4 — AI Decision Engine (Bounded Autonomy Architecture)
 *
 * Compares Ground Truth, Deterministic Strategy, and AI Strategy decisions across
 * standardized revenue recovery benchmark scenarios.
 */

import { dataService } from '../../services/dataService';
import { investigationService } from '../investigation';
import { diagnosisService } from '../diagnosis';
import { deterministicStrategyProvider } from './DeterministicStrategyProvider';
import { aiRecoveryDecisionService, DEFAULT_GEMINI_MODEL, PROMPT_VERSION, DEFAULT_CONFIDENCE_THRESHOLD } from './AIRecoveryDecisionService';
import {
  AIEvaluationReport,
  AIEvaluationScenarioResult,
  CaseStrategy,
} from '../types';

export class AIEvaluationEngine {
  /**
   * Runs the evaluation comparison on all Ground Truth scenarios.
   */
  public async evaluateGroundTruth(customProvider?: {
    selectStrategy: (context: any, diagnosis: any) => Promise<any>;
  }): Promise<AIEvaluationReport> {
    const scenarios = dataService.getGroundTruthCases();
    const results: AIEvaluationScenarioResult[] = [];
    let agreementsCount = 0;
    let totalConfidence = 0;
    let lowConfidenceCount = 0;
    let fallbackCount = 0;

    for (const sc of scenarios) {
      const startTime = Date.now();
      const context = investigationService.investigateCase(sc.caseId);
      const diagnosis = diagnosisService.diagnoseCase(context);

      // Deterministic Decision
      const deterministic = deterministicStrategyProvider.selectStrategy(context, diagnosis);

      // AI Decision
      let aiDecision;
      if (customProvider) {
        aiDecision = await customProvider.selectStrategy(context, diagnosis);
      } else {
        aiDecision = await aiRecoveryDecisionService.evaluateCase(context, diagnosis);
      }

      const duration = Date.now() - startTime;
      const expectedStrategyStr = sc.expectedStrategy;
      const isAgreement =
        expectedStrategyStr.includes(aiDecision.strategy) ||
        aiDecision.strategy === expectedStrategyStr ||
        aiDecision.strategy === deterministic.strategy;

      if (isAgreement) agreementsCount++;
      totalConfidence += aiDecision.confidence ?? 0;
      if ((aiDecision.confidence ?? 1.0) < DEFAULT_CONFIDENCE_THRESHOLD) {
        lowConfidenceCount++;
      }
      if (aiDecision.decision_source === 'DETERMINISTIC_FALLBACK') {
        fallbackCount++;
      }

      results.push({
        scenario_tag: sc.tag,
        case_id: sc.caseId,
        customer_name: context.customer.name,
        source_type: context.source_type,
        revenue_at_risk: context.revenue_at_risk,
        ground_truth_strategy: expectedStrategyStr,
        deterministic_strategy: deterministic.strategy,
        ai_strategy: aiDecision.strategy,
        ai_confidence: aiDecision.confidence ?? 0,
        ai_risk_level: aiDecision.risk_level ?? 'LOW',
        ai_reason: aiDecision.reason,
        decision_source: aiDecision.decision_source ?? 'GEMINI',
        agreement: isAgreement,
        requires_human_review: aiDecision.requires_human_review ?? false,
        execution_time_ms: duration,
      });
    }

    const totalScenarios = scenarios.length;
    const agreementRate = totalScenarios > 0 ? (agreementsCount / totalScenarios) * 100 : 0;
    const avgConfidence = totalScenarios > 0 ? totalConfidence / totalScenarios : 0;

    return {
      timestamp: new Date().toISOString(),
      model: DEFAULT_GEMINI_MODEL,
      prompt_version: PROMPT_VERSION,
      confidence_threshold: DEFAULT_CONFIDENCE_THRESHOLD,
      total_scenarios: totalScenarios,
      agreements_count: agreementsCount,
      agreement_rate_percent: Number(agreementRate.toFixed(1)),
      average_confidence: Number(avgConfidence.toFixed(2)),
      low_confidence_count: lowConfidenceCount,
      fallback_count: fallbackCount,
      scenarios: results,
    };
  }
}

export const aiEvaluationEngine = new AIEvaluationEngine();
