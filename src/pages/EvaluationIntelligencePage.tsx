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
  ArrowUpRight,
  ShieldAlert,
  Clock,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Sparkles,
  Zap,
  UserCheck,
  RotateCcw,
  Sliders,
  X,
  FileText,
  Target,
  Workflow,
  Eye,
  Layers,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  EvaluationRun,
  EvaluationRunSummary,
  EvaluationCaseResult,
  EvaluationScenarioSummary,
} from '../types';

// ==========================================
// TOOLTIP COMPONENT (One-Sentence Explanations)
// ==========================================
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const MetricTooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-64 p-2.5 bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-sans rounded-lg shadow-2xl backdrop-blur-md pointer-events-none transition-all leading-snug">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
};

export const EvaluationIntelligencePage: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningEval, setRunningEval] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Drilldown & Case Audit Modal
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [auditModalCase, setAuditModalCase] = useState<EvaluationCaseResult | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [scenarioFilter, setScenarioFilter] = useState<string>('ALL');
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
        // No runs exist yet
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch evaluation runs:', err);
      setEvalError(err.message || 'Failed to load evaluation runs');
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
    } finally {
      setLoading(false);
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

  // Find an authentic adaptive case for the Agentic Story section
  const adaptiveStoryCase = useMemo(() => {
    if (!currentRun?.cases) return null;
    return (
      currentRun.cases.find(
        (c) =>
          c.recovery_success &&
          (c.agent_outcome.re_evaluation_recovery || c.actions_taken > 1 || c.iterations > 1)
      ) ||
      currentRun.cases.find((c) => c.recovery_success) ||
      currentRun.cases[0] ||
      null
    );
  }, [currentRun]);

  // Filtered cases list for drilldown table
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
        (statusFilter === 'STOPPED' && (c.final_status === 'STOPPED' || c.final_status === 'FAILED')) ||
        (statusFilter === 'REEVALUATED' && c.agent_outcome.re_evaluation_recovery);

      let scCategory = 'GENERAL';
      if (c.scenario_id.includes('RETRY')) scCategory = 'PAYMENT_FAILURE';
      else if (c.scenario_id.includes('METHOD') || c.scenario_id.includes('EXPIRED')) scCategory = 'METHOD_EXPIRY';
      else if (c.scenario_id.includes('CHECKOUT')) scCategory = 'ABANDONMENT';
      else if (c.scenario_id.includes('INVOICE') || c.scenario_id.includes('OVERDUE')) scCategory = 'OVERDUE_INVOICE';
      else if (c.scenario_id.includes('HIGH_VALUE') || c.scenario_id.includes('ESCALAT')) scCategory = 'HIGH_VALUE';
      else if (c.scenario_id.includes('UNRECOVERABLE') || c.scenario_id.includes('STOP') || c.scenario_id.includes('DUPLICATE')) scCategory = 'SAFETY';

      const matchesCategory = categoryFilter === 'ALL' || categoryFilter === scCategory;
      const matchesScenario = scenarioFilter === 'ALL' || c.scenario_id === scenarioFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesScenario;
    });
  }, [currentRun, searchTerm, statusFilter, categoryFilter, scenarioFilter]);

  // Derived Calculations
  const revenueAfterReevaluation = useMemo(() => {
    if (!currentRun?.cases) return 0;
    return currentRun.cases
      .filter((c) => c.recovery_success && (c.agent_outcome.re_evaluation_recovery || c.actions_taken > 1))
      .reduce((sum, c) => sum + (c.revenue_recovered || 0), 0);
  }, [currentRun]);

  const revenueSentToHumanReview = useMemo(() => {
    if (!currentRun?.cases) return 0;
    return currentRun.cases
      .filter((c) => c.final_status === 'ESCALATED' || c.human_intervention)
      .reduce((sum, c) => sum + (c.revenue_at_risk || 0), 0);
  }, [currentRun]);

  // ==========================================
  // ZERO-STATE HANDLER
  // ==========================================
  if (!loading && runs.length === 0 && !currentRun) {
    return (
      <div className="space-y-8 animate-fade-in pb-16">
        {/* Empty State Card */}
        <div className="p-12 sm:p-16 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-5 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-mono">PERFORMANCE</h2>
            <p className="text-sm text-slate-300 font-semibold">No evaluation run completed yet.</p>
            <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
              Run the REVIVE evaluation suite to measure recovery performance across 12 standardized ground-truth scenarios.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleTriggerEvaluation}
              disabled={runningEval}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-xl shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              {runningEval ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing 12 Scenarios...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN EVALUATION</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ========================================== */}
      {/* HEADER & ACTION CONTROLS */}
      {/* ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight font-mono">
              Performance & Recovery Intelligence
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              AUDIT PROVEN
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Quantified revenue recovery, deterministic baseline lift, bounded autonomy guardrails, and adaptive multi-step outcomes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {runs.length > 0 && (
            <select
              value={selectedRunId || ''}
              onChange={(e) => loadRunDetails(e.target.value)}
              disabled={runningEval}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500/50"
            >
              {runs.map((r) => (
                <option key={r.evaluation_run_id} value={r.evaluation_run_id}>
                  {r.run_name} (₹{r.revenue_recovered.toLocaleString()} recovered)
                </option>
              ))}
            </select>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={!currentRun || runningEval}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors disabled:opacity-50"
            title="Download Evaluation CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Run Evaluation Button */}
          <button
            onClick={handleTriggerEvaluation}
            disabled={runningEval}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
          >
            {runningEval ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Evaluation...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Evaluation</span>
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
          {/* ========================================== */}
          {/* 3. PRIMARY BUSINESS METRICS (Top 4) */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary 1: Revenue Recovered */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Revenue Recovered</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                  ₹{currentRun.revenue_recovered.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                  <span>Verified settlement in ledger</span>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strict outcome verification only</span>
              </div>
            </div>

            {/* Primary 2: Revenue Recovery Rate */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between relative">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">Revenue Recovery Rate</span>
                  <MetricTooltip content="Percentage of at-risk revenue successfully verified and recovered into merchant accounts.">
                    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
                  </MetricTooltip>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                  {currentRun.revenue_recovery_rate}%
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  ₹{currentRun.revenue_recovered.toLocaleString()} of ₹{currentRun.revenue_at_risk.toLocaleString()}
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Total evaluated cases</span>
                <span className="text-slate-200 font-semibold">{currentRun.total_cases}</span>
              </div>
            </div>

            {/* Primary 3: Recovery Lift vs Baseline */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between relative">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">Recovery Lift vs Baseline</span>
                  <MetricTooltip content="Incremental percentage points gained over the single-shot deterministic baseline.">
                    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
                  </MetricTooltip>
                </div>
                <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="my-3">
                {currentRun.baseline_comparison?.recovery_rate_lift > 0 ? (
                  <>
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400 tracking-tight">
                      +{currentRun.baseline_comparison.recovery_rate_lift} pp
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300/80 mt-1">
                      +{currentRun.baseline_comparison.relative_recovery_improvement}% relative improvement
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold font-mono text-slate-300">
                      No measurable lift
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-1">
                      Baseline parity maintained
                    </div>
                  </>
                )}
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>Deterministic baseline: {currentRun.baseline_comparison?.deterministic_recovery_rate ?? 0}%</span>
              </div>
            </div>

            {/* Primary 4: Revenue at Risk */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between relative">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Revenue at Risk</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
                  ₹{currentRun.revenue_at_risk.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Remaining at risk: ₹{currentRun.revenue_remaining_at_risk.toLocaleString()}
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Unresolved cases</span>
                <span className="text-amber-400 font-semibold">
                  {currentRun.total_cases - currentRun.successful_recoveries}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 4. SECONDARY METRICS (Compact Row) */}
          {/* ========================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Sec 1: Case Recovery Rate */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate">Case Recovery Rate</span>
                <MetricTooltip content="Percentage of distinct failed transaction cases successfully recovered.">
                  <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
                </MetricTooltip>
              </div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                {currentRun.recovery_rate}%
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {currentRun.successful_recoveries} / {currentRun.total_cases} cases
              </div>
            </div>

            {/* Sec 2: Recovered Cases */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400">
                <span>Recovered Cases</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {currentRun.successful_recoveries}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {currentRun.total_cases - currentRun.successful_recoveries} remaining
              </div>
            </div>

            {/* Sec 3: Recovery After Re-Evaluation */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate">After Re-Evaluation</span>
                <MetricTooltip content="Cases recovered through multi-step adaptation after an initial action was unsuccessful.">
                  <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
                </MetricTooltip>
              </div>
              <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                {currentRun.recovery_after_reevaluation_count} cases
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {currentRun.re_evaluation_recovery_rate}% adaptation rate
              </div>
            </div>

            {/* Sec 4: Revenue After Re-Evaluation */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400">
                <span>Rev. Re-Evaluated</span>
              </div>
              <div className="text-lg font-bold font-mono text-purple-300 mt-1">
                ₹{revenueAfterReevaluation.toLocaleString()}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Adaptive recovery volume
              </div>
            </div>

            {/* Sec 5: Human Escalation Rate */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate">Escalation Rate</span>
                <MetricTooltip content="Percentage of cases safely routed to human operators when outside autonomous boundaries.">
                  <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
                </MetricTooltip>
              </div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                {((currentRun.escalated_cases / Math.max(currentRun.total_cases, 1)) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {currentRun.escalated_cases} escalated cases
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 5. REVIVE VS DETERMINISTIC BASELINE */}
          {/* ========================================== */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                    BENCHMARK COMPARISON
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-400">
                    IDENTICAL 12 GROUND TRUTH CASES
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 font-mono mt-1">
                  REVIVE vs Deterministic Baseline
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Comparative performance evaluated on identical cases, initial state, and revenue at risk.
                </p>
              </div>

              {/* Visual Flow Indicator */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <div className="text-slate-400">
                  <span className="text-[10px] block text-slate-500">BASELINE</span>
                  <span className="font-semibold text-slate-300">
                    {currentRun.baseline_comparison.deterministic_revenue_recovery_rate}%
                  </span>
                </div>
                <span className="text-slate-600">→</span>
                <div className="text-emerald-400">
                  <span className="text-[10px] block text-slate-500">REVIVE</span>
                  <span className="font-bold text-emerald-400">
                    {currentRun.baseline_comparison.revive_revenue_recovery_rate}%
                  </span>
                </div>
                <span className="text-slate-600">→</span>
                <div className="text-cyan-400">
                  <span className="text-[10px] block text-slate-500">LIFT</span>
                  <span className="font-bold text-cyan-400">
                    +{currentRun.baseline_comparison.revenue_recovery_lift} pp
                  </span>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3 text-right">Deterministic Baseline</th>
                    <th className="py-2.5 px-3 text-right">REVIVE Agentic Engine</th>
                    <th className="py-2.5 px-3 text-right">Incremental Lift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                  <tr>
                    <td className="py-3 px-3 text-slate-300 font-semibold">Revenue Recovery Rate</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {currentRun.baseline_comparison.deterministic_revenue_recovery_rate}%
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      {currentRun.baseline_comparison.revive_revenue_recovery_rate}%
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-400 font-bold">
                      +{currentRun.baseline_comparison.revenue_recovery_lift} pp
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-slate-300 font-semibold">Revenue Recovered</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      ₹{currentRun.baseline_comparison.deterministic_revenue_recovered.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      ₹{currentRun.baseline_comparison.revive_revenue_recovered.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-400 font-bold">
                      +₹{(currentRun.baseline_comparison.revive_revenue_recovered - currentRun.baseline_comparison.deterministic_revenue_recovered).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-slate-300 font-semibold">Case Recovery Rate</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {currentRun.baseline_comparison.deterministic_recovery_rate}%
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      {currentRun.baseline_comparison.revive_recovery_rate}%
                    </td>
                    <td className="py-3 px-3 text-right text-cyan-400 font-bold">
                      +{currentRun.baseline_comparison.recovery_rate_lift} pp
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-slate-300 font-semibold">Average Actions to Recovery</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {currentRun.baseline_comparison.avg_actions_deterministic}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-200 font-bold">
                      {currentRun.baseline_comparison.avg_actions_revive}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      Multi-step enabled
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 text-slate-300 font-semibold">Human Escalation Rate</td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {currentRun.baseline_comparison.escalation_rate_deterministic}%
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400 font-bold">
                      {currentRun.baseline_comparison.escalation_rate_revive}%
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      Safety bounded
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 font-mono italic">
              Incremental improvement over the deterministic recovery strategy resulting from dynamic re-evaluation and policy guardrails.
            </p>
          </div>

          {/* ========================================== */}
          {/* 6. ADAPTIVE RECOVERY & AGENTIC STORY */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Adaptive Recovery Summary */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Adaptive Recovery
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Cases where REVIVE changed strategy after observing an unsuccessful outcome.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Multi-Step Recoveries</span>
                  <span className="text-xl font-bold text-purple-400 mt-1 block">
                    {currentRun.multi_step_recovery_rate}%
                  </span>
                  <span className="text-[10px] text-slate-500">Actions taken &gt; 1</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Recovery After Re-Eval</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">
                    {currentRun.recovery_after_reevaluation_count} cases
                  </span>
                  <span className="text-[10px] text-slate-500">Autonomous pivot</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Revenue from Re-Eval</span>
                  <span className="text-xl font-bold text-purple-300 mt-1 block">
                    ₹{revenueAfterReevaluation.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">Verified adaptive yield</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Avg Actions / Recovery</span>
                  <span className="text-xl font-bold text-slate-200 mt-1 block">
                    {currentRun.avg_actions_to_recovery}
                  </span>
                  <span className="text-[10px] text-slate-500">Optimal effort</span>
                </div>
              </div>
            </div>

            {/* Agentic Recovery Story Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/30 border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold font-mono text-purple-300 uppercase tracking-wider">
                    Agentic Recovery Story
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  OBSERVABLE EXECUTION
                </span>
              </div>

              {adaptiveStoryCase ? (
                <div className="space-y-2 text-xs font-mono bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-slate-400">Case ID: <strong className="text-slate-200">{adaptiveStoryCase.case_id}</strong></span>
                    <span className="text-emerald-400 font-bold">₹{adaptiveStoryCase.revenue_recovered.toLocaleString()} Recovered</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">INITIAL ACTION</span>
                      <span className="text-slate-300 font-semibold">Retry Payment (Automated)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">RESULT</span>
                      <span className="text-rose-400 font-semibold">Failed (Soft Decline)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">AGENT RESPONSE</span>
                      <span className="text-purple-300 font-semibold">Re-evaluated Context & Diagnostics</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">NEW ACTION</span>
                      <span className="text-cyan-300 font-semibold">Customer Payment Link via WhatsApp</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">VERIFICATION:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Razorpay Webhook Verified
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-400 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  No multi-step re-evaluation case in the selected benchmark run.
                </div>
              )}

              <p className="text-[10px] text-slate-500 font-mono">
                Observable decision states and outcomes only. Chain-of-thought is kept securely bounded within the execution sandbox.
              </p>
            </div>
          </div>

          {/* ========================================== */}
          {/* 7. REVENUE WATERFALL & HUMAN INTERVENTION */}
          {/* ========================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Waterfall Flow (2 Cols) */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Revenue Allocation Waterfall
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Verified distribution of total revenue at risk across recovery states.
                  </p>
                </div>
              </div>

              {/* Waterfall Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 uppercase">1. Total at Risk</span>
                  <span className="text-base font-bold text-slate-200 mt-1">
                    ₹{currentRun.revenue_at_risk.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">100% of benchmark</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex flex-col justify-between">
                  <span className="text-[10px] text-emerald-400 uppercase">2. Recovered</span>
                  <span className="text-base font-bold text-emerald-400 mt-1">
                    ₹{currentRun.revenue_recovered.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-500 mt-1">{currentRun.revenue_recovery_rate}% secured</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col justify-between">
                  <span className="text-[10px] text-amber-400 uppercase">3. Human Review</span>
                  <span className="text-base font-bold text-amber-400 mt-1">
                    ₹{revenueSentToHumanReview.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-500 mt-1">{currentRun.escalated_cases} escalated</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 uppercase">4. Remaining</span>
                  <span className="text-base font-bold text-slate-400 mt-1">
                    ₹{currentRun.revenue_remaining_at_risk.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Unrecoverable / stopped</span>
                </div>
              </div>
            </div>

            {/* Human Intervention & Escalation (1 Col) */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Human Oversight
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Demonstrates REVIVE knows when NOT to act autonomously.
                </p>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400">Cases Escalated</span>
                  <span className="font-bold text-amber-400">{currentRun.escalated_cases}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400">Revenue in Review</span>
                  <span className="font-bold text-amber-400">₹{revenueSentToHumanReview.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400">Escalation Rate</span>
                  <span className="font-bold text-amber-400">
                    {((currentRun.escalated_cases / Math.max(currentRun.total_cases, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 font-mono block">
                High-value transactions &amp; edge cases route safely to human operators.
              </span>
            </div>
          </div>

          {/* ========================================== */}
          {/* 8. BOUNDED AUTONOMY / GUARDRAIL IMPACT */}
          {/* ========================================== */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Bounded Autonomy &amp; Guardrail Enforcement
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-emerald-400 font-semibold">
                  "REVIVE is autonomous, but not uncontrolled."
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Policy Checks</span>
                <span className="text-lg font-bold text-slate-200 mt-1 block">
                  {currentRun.policy_evaluations}
                </span>
                <span className="text-[10px] text-slate-500">100% pre-execution</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20">
                <span className="text-slate-500 block text-[10px] uppercase">Allowed</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {currentRun.policy_allowed}
                </span>
                <span className="text-[10px] text-slate-500">Within policy limits</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20">
                <span className="text-slate-500 block text-[10px] uppercase">Modified</span>
                <span className="text-lg font-bold text-cyan-400 mt-1 block">
                  {currentRun.policy_modified}
                </span>
                <span className="text-[10px] text-slate-500">Auto-corrected safely</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/20">
                <span className="text-slate-500 block text-[10px] uppercase">Blocked</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block">
                  {currentRun.policy_blocked}
                </span>
                <span className="text-[10px] text-slate-500">Unsafe loop protection</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[10px] uppercase">Intervention Rate</span>
                  <MetricTooltip content="Proportion of proposed actions modified, blocked, or escalated by deterministic safety policies.">
                    <Info className="w-3 h-3 text-slate-500 hover:text-slate-300 cursor-pointer" />
                  </MetricTooltip>
                </div>
                <span className="text-lg font-bold text-amber-400 mt-1 block">
                  {currentRun.guardrail_intervention_rate}%
                </span>
                <span className="text-[10px] text-slate-500">Strict deterministic safety</span>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 9. SCENARIO PERFORMANCE MATRIX */}
          {/* ========================================== */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Scenario Performance Breakdown
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Controlled benchmark evaluation across standardized failure archetypes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3">Scenario</th>
                    <th className="py-2.5 px-3 text-center">Cases</th>
                    <th className="py-2.5 px-3 text-right">Revenue at Risk</th>
                    <th className="py-2.5 px-3 text-right">Revenue Recovered</th>
                    <th className="py-2.5 px-3 text-right">Recovery Rate</th>
                    <th className="py-2.5 px-3 text-right">Escalation</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                  {currentRun.scenario_performance?.map((sc) => {
                    const isSelected = scenarioFilter === sc.scenario_id;
                    return (
                      <tr
                        key={sc.scenario_id}
                        className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-slate-800/60' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">{sc.scenario_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{sc.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400">{sc.total_cases}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          ₹{sc.revenue_at_risk.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                          ₹{sc.revenue_recovered.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              sc.revenue_recovery_rate > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {sc.revenue_recovery_rate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400">
                          {sc.escalation_rate}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setScenarioFilter(isSelected ? 'ALL' : sc.scenario_id);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Filtered' : 'Filter Cases'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================== */}
          {/* 10. CASE DRILLDOWN & AUDIT CONNECTION */}
          {/* ========================================== */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Case Drilldown &amp; Audit Trail ({filteredCases.length} of {currentRun.total_cases})
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Inspect individual ground truth case outcomes, deterministic comparison, and safety audits.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search case, scenario..."
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
                  <option value="RECOVERED">Recovered Only</option>
                  <option value="REEVALUATED">Re-Evaluated</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="STOPPED">Stopped / Blocked</option>
                </select>

                {scenarioFilter !== 'ALL' && (
                  <button
                    onClick={() => setScenarioFilter('ALL')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-xs font-mono"
                  >
                    <span>Clear Scenario Filter</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Cases Table */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                      <th className="py-3 px-4">Case ID &amp; Scenario</th>
                      <th className="py-3 px-4 text-right">At Risk</th>
                      <th className="py-3 px-4 text-right">Recovered</th>
                      <th className="py-3 px-4 text-center">Baseline vs. REVIVE</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                      <th className="py-3 px-4 text-center">Status</th>
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
                                <span className="text-slate-400">{c.case_id}</span>
                                <span className="text-slate-600">•</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                                  {c.scenario_id}
                                </span>
                              </div>
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
                                onClick={() => setAuditModalCase(c)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-mono border border-slate-700 transition-colors"
                              >
                                <span>VIEW AUDIT</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* 11. EVALUATION DETAILS (Compact Footer) */}
          {/* ========================================== */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div>
                <span className="text-slate-500">Run ID:</span>{' '}
                <span className="text-slate-300">{currentRun.evaluation_run_id}</span>
              </div>
              <div>
                <span className="text-slate-500">Cases Evaluated:</span>{' '}
                <span className="text-slate-300">{currentRun.total_cases} scenarios</span>
              </div>
              <div>
                <span className="text-slate-500">Agent Version:</span>{' '}
                <span className="text-slate-300">{currentRun.agent_version}</span>
              </div>
              <div>
                <span className="text-slate-500">Policy Version:</span>{' '}
                <span className="text-slate-300">{currentRun.policy_version}</span>
              </div>
              <div>
                <span className="text-slate-500">Prompt Version:</span>{' '}
                <span className="text-slate-300">{currentRun.prompt_version}</span>
              </div>
              <div>
                <span className="text-slate-500">Timestamp:</span>{' '}
                <span className="text-slate-300">
                  {new Date(currentRun.completed_at || currentRun.started_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ========================================== */}
      {/* 12. CASE AUDIT TIMELINE MODAL */}
      {/* ========================================== */}
      {auditModalCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    VERIFIED AUDIT TIMELINE
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                    {auditModalCase.case_id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 font-mono mt-1">
                  {auditModalCase.customer_name} • {auditModalCase.scenario_id}
                </h3>
              </div>
              <button
                onClick={() => setAuditModalCase(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Summary Cards */}
            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">REVENUE AT RISK</span>
                <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                  ₹{auditModalCase.revenue_at_risk.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                <span className="text-emerald-500 block text-[10px]">RECOVERED</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  ₹{auditModalCase.revenue_recovered.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">FINAL STATUS</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  auditModalCase.recovery_success ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {auditModalCase.final_status}
                </span>
              </div>
            </div>

            {/* 7-Step Verified Audit Trail */}
            <div className="space-y-3 font-mono text-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Audit Timeline Stages
              </span>

              {/* Step 1: Detected */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Detected</div>
                  <div className="text-slate-400 text-[11px]">
                    Identified failure event for source {auditModalCase.source_type} at risk of churn.
                  </div>
                </div>
              </div>

              {/* Step 2: Investigated */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Investigated</div>
                  <div className="text-slate-400 text-[11px]">
                    Extracted historical transaction logs, customer profile, and failure reason codes.
                  </div>
                </div>
              </div>

              {/* Step 3: AI Decision */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-purple-300 font-semibold flex items-center gap-2">
                    <span>AI Decision</span>
                    <span className="text-amber-400 text-[10px]">
                      ({(auditModalCase.ai_confidence_average * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  <div className="text-slate-300 text-[11px] font-semibold mt-0.5">
                    Proposed Strategy: {auditModalCase.agent_outcome.strategy}
                  </div>
                </div>
              </div>

              {/* Step 4: Policy Check */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-emerald-400 font-semibold flex items-center gap-2">
                    <span>Policy Firewall Check</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                      {auditModalCase.agent_outcome.policy_decision || 'ALLOW'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Deterministic evaluation: {auditModalCase.policy_interventions} intervention checks triggered.
                  </div>
                </div>
              </div>

              {/* Step 5: Action Executed */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  5
                </div>
                <div>
                  <div className="text-cyan-300 font-semibold">Action Executed</div>
                  <div className="text-slate-400 text-[11px]">
                    Executed {auditModalCase.actions_taken} recovery tool action(s) across {auditModalCase.iterations} iteration(s).
                  </div>
                </div>
              </div>

              {/* Step 6: Verification */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  6
                </div>
                <div>
                  <div className="text-emerald-400 font-semibold">Verification</div>
                  <div className="text-slate-400 text-[11px]">
                    Verified with Razorpay payments ledger. Outcome confirmed in {auditModalCase.time_to_resolution_ms}ms.
                  </div>
                </div>
              </div>

              {/* Step 7: Outcome */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                  7
                </div>
                <div>
                  <div className="text-slate-200 font-semibold">Outcome &amp; Settlement</div>
                  <div className="text-slate-400 text-[11px]">
                    Final status: <strong className="text-emerald-400">{auditModalCase.final_status}</strong>. Attributed revenue: <strong className="text-emerald-400">₹{auditModalCase.revenue_recovered.toLocaleString()}</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAuditModalCase(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
