/**
 * @license
 * REVIVE — Evaluation Run Repository
 * Phase 7 — Evaluation & Revenue Intelligence
 *
 * Persists and retrieves structured evaluation benchmark runs and comparisons.
 */

import { EvaluationRun, EvaluationRunSummary } from '../types';

export class EvaluationRepository {
  private runs: Map<string, EvaluationRun> = new Map();

  public save(run: EvaluationRun): EvaluationRun {
    this.runs.set(run.evaluation_run_id, run);
    return run;
  }

  public findById(id: string): EvaluationRun | null {
    return this.runs.get(id) || null;
  }

  public findAll(): EvaluationRun[] {
    return Array.from(this.runs.values()).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  public findSummaries(): EvaluationRunSummary[] {
    return this.findAll().map((r) => ({
      evaluation_run_id: r.evaluation_run_id,
      run_name: r.run_name,
      started_at: r.started_at,
      completed_at: r.completed_at,
      total_cases: r.total_cases,
      successful_recoveries: r.successful_recoveries,
      revenue_at_risk: r.revenue_at_risk,
      revenue_recovered: r.revenue_recovered,
      recovery_rate: r.recovery_rate,
      revenue_recovery_rate: r.revenue_recovery_rate,
      guardrail_intervention_rate: r.guardrail_intervention_rate,
      recovery_rate_lift: r.baseline_comparison?.recovery_rate_lift ?? 0,
    }));
  }

  public getLatest(): EvaluationRun | null {
    const all = this.findAll();
    return all.length > 0 ? all[0] : null;
  }

  public delete(id: string): boolean {
    return this.runs.delete(id);
  }

  public clear(): void {
    this.runs.clear();
  }
}

export const evaluationRepository = new EvaluationRepository();
