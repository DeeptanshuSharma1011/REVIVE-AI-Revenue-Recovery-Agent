import React, { useEffect, useState, useMemo } from 'react';
import {
  Play,
  Download,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationCaseResult,
  EvaluationScenarioSummary,
} from '../types';

export const EvaluationIntelligencePage: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningEval, setRunningEval] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [forceDeterministicRun, setForceDeterministicRun] = useState<boolean>(false);

  // Initial Load
  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    setEvalError(null);
    try {
      const res = await apiService.getEvaluationRuns();
      setRuns(res.runs);
      if (res.runs.length > 0) {
        const runToLoad = selectedRunId || res.runs[0].evaluation_run_id;
        setSelectedRunId(runToLoad);
        await loadRunDetails(runToLoad);
      } else {
        // Automatically run initial benchmark if none exists
        await handleTriggerEvaluation();
      }
    } catch (err: any) {
      console.error('Failed to fetch evaluation runs:', err);
      setEvalError(err.message || 'Failed to load evaluation runs');
    } finally {
      setLoading(false);
    }
  };

  const loadRunDetails = async (runId: string) => {
    try {
      const run = await apiService.getEvaluationRun(runId);
      setCurrentRun(run);
      setSelectedRunId(runId);
    } catch (err: any) {
      console.error('Failed to load run details:', err);
      setEvalError(err.message || 'Failed to load run details');
    }
  };

  const handleTriggerEvaluation = async () => {
    setRunningEval(true);
    setEvalError(null);
    try {
      const newRun = await apiService.runEvaluation({
        runName: `REVIVE Benchmark — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
        forceDeterministic: forceDeterministicRun,
      });
      setCurrentRun(newRun);
      setSelectedRunId(newRun.evaluation_run_id);
      const runsRes = await apiService.getEvaluationRuns();
      setRuns(runsRes.runs);
    } catch (err: any) {
      console.error('Evaluation run failed:', err);
      setEvalError(err.message || 'Evaluation execution failed');
    } finally {
      setRunningEval(false);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentRun) return;
    const url = apiService.getEvaluationExportUrl(currentRun.evaluation_run_id);
    window.open(url, '_blank');
  };

  // Filtered cases list
  const filteredCases = useMemo(() => {
    if (!currentRun?.cases) return [];
    return currentRun.cases.filter((c) => {
      const matchesSearch =
        c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.scenario_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'RECOVERED' && c.recovery_success) ||
        (statusFilter === 'ESCALATED' && c.final_status === 'ESCALATED') ||
        (statusFilter === 'STOPPED' && (c.final_status === 'STOPPED' || c.final_status === 'FAILED'));

      let scCategory = 'GENERAL';
      if (c.scenario_id.includes('RETRY')) scCategory = 'PAYMENT_FAILURE';
      else if (c.scenario_id.includes('METHOD') || c.scenario_id.includes('EXPIRED')) scCategory = 'METHOD_EXPIRY';
      else if (c.scenario_id.includes('CHECKOUT')) scCategory = 'ABANDONMENT';
      else if (c.scenario_id.includes('INVOICE') || c.scenario_id.includes('OVERDUE')) scCategory = 'OVERDUE_INVOICE';
      else if (c.scenario_id.includes('HIGH_VALUE')) scCategory = 'HIGH_VALUE';
      else if (c.scenario_id.includes('UNRECOVERABLE') || c.scenario_id.includes('DUPLICATE')) scCategory = 'SAFETY';

      const matchesCategory = categoryFilter === 'ALL' || categoryFilter === scCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [currentRun, searchTerm, statusFilter, categoryFilter]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  Performance & Recovery Benchmark
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  12-SCENARIO BENCHMARK
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
                Repeatable ground truth benchmark • Baseline lift analysis • Policy guardrail attribution
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run History Selector */}
          {runs.length > 0 && (
            <select
              value={selectedRunId || ''}
              onChange={(e) => loadRunDetails(e.target.value)}
              disabled={runningEval}
              className="bg-slate-950/80 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500/50"
            >
              {runs.map((r) => (
                <option key={r.evaluation_run_id} value={r.evaluation_run_id}>
                  {r.run_name} ({r.recovery_rate}%)
                </option>
              ))}
            </select>
          )}

          {/* Force Deterministic Toggle */}
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={forceDeterministicRun}
              onChange={(e) => setForceDeterministicRun(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Fast Deterministic Mode</span>
          </label>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={!currentRun || runningEval}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Run Full Benchmark Suite Button */}
          <button
            onClick={handleTriggerEvaluation}
            disabled={runningEval}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
          >
            {runningEval ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Benchmark...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Full Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {evalError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>Evaluation Error: {evalError}</span>
        </div>
      )}

      {loading && !currentRun ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading ground truth evaluation benchmarks...</p>
        </div>
      ) : currentRun ? (
        <>
          {/* Executive KPI Scorecard */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* KPI 1: Revenue Recovery Rate */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Revenue Recovery</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {currentRun.revenue_recovery_rate}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                  <span>₹{currentRun.revenue_recovered.toLocaleString()}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-500">₹{currentRun.revenue_at_risk.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{currentRun.baseline_comparison?.revenue_recovery_lift ?? 0}% vs Baseline</span>
              </div>
            </div>

            {/* KPI 2: Case Recovery Rate */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Case Recovery Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-slate-100">
                  {currentRun.recovery_rate}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  {currentRun.successful_recoveries} of {currentRun.total_cases} scenarios resolved
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{currentRun.baseline_comparison?.recovery_rate_lift ?? 0}% lift</span>
              </div>
            </div>

            {/* KPI 3: Guardrail Interventions */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Guardrail Interventions</span>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-cyan-400">
                  {currentRun.guardrail_intervention_rate}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  {currentRun.policy_evaluations} policy firewall checks
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>100% unsafe loop prevention</span>
              </div>
            </div>

            {/* KPI 4: Multi-Step & Re-evaluations */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Re-evaluation Rate</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-purple-400">
                  {currentRun.re_evaluation_recovery_rate}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  {currentRun.recovery_after_reevaluation_count} cases recovered after re-eval
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>Avg {currentRun.avg_actions_to_recovery} actions/recovery</span>
              </div>
            </div>

            {/* KPI 5: AI Decision Confidence */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col justify-between col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>Avg AI Confidence</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {(currentRun.avg_ai_confidence * 100).toFixed(0)}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  {currentRun.ai_decisions_count} bounded inferences
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>{currentRun.low_confidence_rate}% low-confidence escalations</span>
              </div>
            </div>
          </div>

          {/* Section 2: Deterministic Baseline vs. REVIVE Multi-Step Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Deterministic Card */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Baseline System</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                    SINGLE-STEP DETERMINISTIC
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-200">Deterministic Recovery Engine</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Legacy rule-based engine executing rigid 1-shot actions without agentic re-evaluation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Recovery Rate</span>
                  <span className="text-sm font-bold text-slate-300">
                    {currentRun.baseline_comparison.deterministic_recovery_rate}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Revenue Recovered</span>
                  <span className="text-sm font-bold text-slate-300">
                    ₹{currentRun.baseline_comparison.deterministic_revenue_recovered.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Avg Actions</span>
                  <span className="text-sm font-bold text-slate-300">
                    {currentRun.baseline_comparison.avg_actions_deterministic}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Escalation Rate</span>
                  <span className="text-sm font-bold text-slate-300">
                    {currentRun.baseline_comparison.escalation_rate_deterministic}%
                  </span>
                </div>
              </div>
            </div>

            {/* REVIVE LangGraph Agent Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-slate-900/90 border border-emerald-500/30 flex flex-col justify-between space-y-4 shadow-lg shadow-emerald-950/20">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Autonomous Agent</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    LANGGRAPH + POLICY FIREWALL
                  </span>
                </div>
                <h3 className="text-base font-semibold text-emerald-300">REVIVE Agentic Orchestration</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  Multi-step graph loop with observation, re-evaluation, safety guardrails, and verified settlement.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-900/40 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Recovery Rate</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {currentRun.baseline_comparison.revive_recovery_rate}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Revenue Recovered</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ₹{currentRun.baseline_comparison.revive_revenue_recovered.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Avg Actions</span>
                  <span className="text-sm font-bold text-slate-200">
                    {currentRun.baseline_comparison.avg_actions_revive}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-slate-400 block text-[10px]">Escalation Rate</span>
                  <span className="text-sm font-bold text-slate-200">
                    {currentRun.baseline_comparison.escalation_rate_revive}%
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Lift Scorecard */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Comparative Lift</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    INCREMENTAL VALUE
                  </span>
                </div>
                <h3 className="text-base font-semibold text-cyan-300">Revenue & Rate Lift</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Quantified business advantage delivered by REVIVE's adaptive bounded orchestration over static rules.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Net Recovery Lift</span>
                  <span className="text-emerald-400 font-bold">
                    +{currentRun.baseline_comparison.recovery_rate_lift}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Revenue Recovery Lift</span>
                  <span className="text-emerald-400 font-bold">
                    +{currentRun.baseline_comparison.revenue_recovery_lift}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Relative Improvement</span>
                  <span className="text-cyan-400 font-bold">
                    +{currentRun.baseline_comparison.relative_recovery_improvement}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Safety & Guardrail Telemetry Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Policy Guardrail & Safety Enforcement Telemetry
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Policy Version: {currentRun.policy_version}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">High Value Escalated</span>
                <span className="text-lg font-bold text-amber-400 mt-1 block">
                  {currentRun.safety_metrics.high_value_escalations}
                </span>
                <span className="text-[10px] text-slate-500">Threshold &gt; ₹10,000</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Duplicate Action Blocked</span>
                <span className="text-lg font-bold text-cyan-400 mt-1 block">
                  {currentRun.safety_metrics.duplicate_action_blocks}
                </span>
                <span className="text-[10px] text-slate-500">Loop protection active</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Max Retries Enforced</span>
                <span className="text-lg font-bold text-purple-400 mt-1 block">
                  {currentRun.safety_metrics.max_retry_blocks}
                </span>
                <span className="text-[10px] text-slate-500">Limit: 3 attempts</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Low Confidence Escalated</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block">
                  {currentRun.safety_metrics.low_confidence_escalations}
                </span>
                <span className="text-[10px] text-slate-500">Threshold &lt; 0.70</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Invalid Action Blocked</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {currentRun.safety_metrics.invalid_strategy_blocks + currentRun.safety_metrics.incompatible_action_blocks}
                </span>
                <span className="text-[10px] text-slate-500">Type safety verified</span>
              </div>
            </div>
          </div>

          {/* Section 4: Ground Truth Scenario Benchmark Matrix */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold font-mono text-slate-200">
                  Scenario Performance & Case-Level Verification ({filteredCases.length} of {currentRun.total_cases})
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Detailed breakdown across all 12 standardized ground-truth benchmark scenarios
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search scenario, customer, case..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="RECOVERED">Recovered</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="STOPPED">Stopped / Blocked</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ALL">All Categories</option>
                  <option value="PAYMENT_FAILURE">Payment Failure</option>
                  <option value="METHOD_EXPIRY">Method Expiry</option>
                  <option value="ABANDONMENT">Abandonment</option>
                  <option value="OVERDUE_INVOICE">Overdue Invoice</option>
                  <option value="HIGH_VALUE">High Value</option>
                  <option value="SAFETY">Safety Guardrail</option>
                </select>
              </div>
            </div>

            {/* Cases Table */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-3 px-4">Scenario & Customer</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4 text-right">At Risk</th>
                      <th className="py-3 px-4 text-right">Recovered</th>
                      <th className="py-3 px-4 text-center">Baseline vs. REVIVE</th>
                      <th className="py-3 px-4 text-center">Actions / Iters</th>
                      <th className="py-3 px-4 text-center">Final Outcome</th>
                      <th className="py-3 px-4 text-center">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                    {filteredCases.map((c) => {
                      const isExpanded = expandedCaseId === c.case_id;
                      const isRecovered = c.recovery_success;
                      const isEscalated = c.final_status === 'ESCALATED';

                      return (
                        <React.Fragment key={c.case_id}>
                          <tr className={`hover:bg-slate-800/40 transition-colors ${isExpanded ? 'bg-slate-800/30' : ''}`}>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-200">{c.customer_name}</div>
                              <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                                  {c.scenario_id}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                                {c.source_type}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right text-slate-300 font-semibold">
                              ₹{c.revenue_at_risk.toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {c.revenue_recovered > 0 ? (
                                <span className="text-emerald-400 font-bold">
                                  ₹{c.revenue_recovered.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono">₹0</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-center gap-2 text-[11px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    c.deterministic_outcome.recovery_success
                                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                      : 'bg-slate-950 text-slate-500 border border-slate-800'
                                  }`}
                                  title={`Deterministic: ${c.deterministic_outcome.status}`}
                                >
                                  Det: {c.deterministic_outcome.recovery_success ? '✓' : '✗'}
                                </span>
                                <span className="text-slate-600">→</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    c.agent_outcome.recovery_success
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : c.agent_outcome.status === 'ESCALATED'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                  title={`REVIVE: ${c.agent_outcome.status}`}
                                >
                                  REVIVE: {c.agent_outcome.status}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center text-slate-300">
                              <span>{c.actions_taken} act</span>
                              <span className="text-slate-600 mx-1">•</span>
                              <span className="text-slate-400">{c.iterations} iter</span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                                  isRecovered
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : isEscalated
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {isRecovered ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>RECOVERED</span>
                                  </>
                                ) : isEscalated ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>ESCALATED</span>
                                  </>
                                ) : (
                                  <span>{c.final_status}</span>
                                )}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => setExpandedCaseId(isExpanded ? null : c.case_id)}
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                                title="Toggle Execution Details"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Case Detail Drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-950/90 border-b border-slate-800/80">
                              <td colSpan={8} className="p-4 sm:p-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                                  {/* Column 1: Agent Outcome & Decision */}
                                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                                    <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>Agentic Decision & Strategy</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Selected Strategy:</span>{' '}
                                      <span className="font-semibold text-slate-100">{c.agent_outcome.strategy}</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">AI Confidence:</span>{' '}
                                      <span className="font-semibold text-amber-400">
                                        {(c.ai_confidence_average * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Resolution Time:</span>{' '}
                                      <span>{c.time_to_resolution_ms}ms</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Re-evaluation Recovery:</span>{' '}
                                      <span className={c.agent_outcome.re_evaluation_recovery ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                        {c.agent_outcome.re_evaluation_recovery ? 'YES (Adaptive)' : 'NO (1-Shot)'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Column 2: Policy Firewall Audit */}
                                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Policy Engine Verdict</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Policy Decision:</span>{' '}
                                      <span className="font-semibold text-slate-100">{c.agent_outcome.policy_decision || 'ALLOW'}</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Interventions:</span>{' '}
                                      <span className={c.policy_interventions > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                        {c.policy_interventions} check(s)
                                      </span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Human Review:</span>{' '}
                                      <span className={c.human_intervention ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                        {c.human_intervention ? 'Escalated to Review Queue' : 'Autonomous Resolution'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Column 3: Attribution & Deterministic Comparison */}
                                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <TrendingUp className="w-3.5 h-3.5" />
                                      <span>Revenue Attribution</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Deterministic Result:</span>{' '}
                                      <span>{c.deterministic_outcome.status} ({c.deterministic_outcome.strategy})</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Deterministic Recovery:</span>{' '}
                                      <span>₹{c.deterministic_outcome.revenue_recovered.toLocaleString()}</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">REVIVE Attributed Recovery:</span>{' '}
                                      <span className="text-emerald-400 font-bold">₹{c.revenue_recovered.toLocaleString()}</span>
                                    </div>
                                    <div className="text-slate-300">
                                      <span className="text-slate-500">Timestamp:</span>{' '}
                                      <span className="text-[11px] text-slate-400">{new Date(c.evaluation_timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
