/**
 * @license
 * REVIVE — Recovery Metrics Engine
 * Phase 3 — Deterministic Recovery Engine
 *
 * Dynamically computes revenue recovery metrics from live database entities.
 * No hardcoded values; all stats trace to relational database records.
 */

import { db } from '../db';
import { EngineMetrics } from './types';

export class RecoveryMetricsEngine {
  /**
   * Computes live recovery performance metrics directly from the DB.
   */
  public getMetrics(): EngineMetrics {
    const cases = Array.from(db.recoveryCases.values());
    const actions = Array.from(db.recoveryActions.values());

    let revenueAtRisk = 0;
    let casesRecovered = 0;
    let casesEscalated = 0;
    let casesStopped = 0;
    let casesOpen = 0;

    for (const c of cases) {
      revenueAtRisk += c.revenue_at_risk || 0;
      if (c.status === 'RECOVERED') {
        casesRecovered++;
      } else if (c.status === 'ESCALATED') {
        casesEscalated++;
      } else if (c.status === 'CLOSED') {
        casesStopped++;
      } else if (c.status === 'OPEN' || c.status === 'INVESTIGATING' || c.status === 'ACTION_PENDING') {
        casesOpen++;
      }
    }

    const recoveredByCase = new Map<string, number>();
    for (const a of actions) {
      if (a.status === 'SUCCESS') {
        const cur = recoveredByCase.get(a.case_id) || 0;
        recoveredByCase.set(a.case_id, cur + (a.amount_recovered || 0));
      }
    }

    let revenueRecovered = 0;
    for (const [cId, amt] of recoveredByCase.entries()) {
      const c = db.recoveryCases.get(cId);
      revenueRecovered += c ? Math.min(c.revenue_at_risk, amt) : amt;
    }

    const casesProcessed = cases.filter(
      (c) => c.status === 'RECOVERED' || c.status === 'ESCALATED' || c.status === 'CLOSED' || c.status === 'ACTION_PENDING'
    ).length;

    const recoveryRate = revenueAtRisk > 0 ? (revenueRecovered / revenueAtRisk) * 100 : 0;
    const averageActionsPerCase = cases.length > 0 ? actions.length / cases.length : 0;

    return {
      revenue_at_risk: Math.round(revenueAtRisk * 100) / 100,
      revenue_recovered: Math.round(revenueRecovered * 100) / 100,
      recovery_rate: Math.round(recoveryRate * 10) / 10,
      cases_processed: casesProcessed,
      cases_recovered: casesRecovered,
      cases_escalated: casesEscalated,
      cases_stopped: casesStopped,
      cases_open: casesOpen,
      average_actions_per_case: Math.round(averageActionsPerCase * 10) / 10,
      simulated: true,
    };
  }
}

export const recoveryMetricsEngine = new RecoveryMetricsEngine();
