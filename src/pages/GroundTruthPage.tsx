import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { GroundTruthScenario, AIEvaluationReport } from '../types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ShoppingCart,
  FileSpreadsheet,
  User,
  Clock,
  Terminal,
  Bot,
  Cpu,
  BarChart,
  Play,
} from 'lucide-react';

interface GroundTruthPageProps {
  onSelectCase?: (caseId: string) => void;
}

export const GroundTruthPage: React.FC<GroundTruthPageProps> = ({ onSelectCase }) => {
  const [activeView, setActiveView] = useState<'scenarios' | 'ai_benchmark'>('scenarios');
  const [scenarios, setScenarios] = useState<GroundTruthScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('GT_SUCCESSFUL_RETRY');
  const [seeding, setSeeding] = useState(false);
  const [seedNumber, setSeedNumber] = useState<number>(42);
  const [dbCounts, setDbCounts] = useState<Record<string, number> | null>(null);

  // AI Evaluation Matrix State
  const [evaluationReport, setEvaluationReport] = useState<AIEvaluationReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const fetchGroundTruth = () => {
    setLoading(true);
    apiService
      .getGroundTruthScenarios()
      .then((res) => {
        setScenarios(res.scenarios || []);
        if (res.scenarios?.length > 0 && !selectedTag) {
          setSelectedTag(res.scenarios[0].tag);
        }
      })
      .catch((err) => console.error('Failed to load ground truth:', err))
      .finally(() => setLoading(false));

    apiService.health().then((h) => {
      if (h.database?.counts) setDbCounts(h.database.counts);
    });
  };

  useEffect(() => {
    fetchGroundTruth();
  }, []);

  const handleReset = async () => {
    setSeeding(true);
    try {
      const res = await apiService.resetDatabase();
      setDbCounts(res.counts);
      setSeedNumber(42);
      fetchGroundTruth();
    } catch (err) {
      console.error('Failed to reset DB:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCustomSeed = async () => {
    setSeeding(true);
    try {
      const res = await apiService.seedDatabase(seedNumber, 1.0);
      setDbCounts(res.counts);
      fetchGroundTruth();
    } catch (err) {
      console.error('Failed to custom seed DB:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleRunAIEvaluation = async () => {
    setEvaluating(true);
    setEvalError(null);
    try {
      const report = await apiService.getAIEvaluation();
      setEvaluationReport(report);
    } catch (err: any) {
      setEvalError(err.message || 'Failed to run AI evaluation');
    } finally {
      setEvaluating(false);
    }
  };

  const activeScenario = scenarios.find((s) => s.tag === selectedTag) || scenarios[0];
  const caseDetails = activeScenario?.caseDetails;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100 font-mono">
              Ground Truth & AI Decision Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Standardized revenue recovery benchmarks comparing Ground Truth specifications, Deterministic Rules, and Gemini AI Bounded Reasoning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveView('scenarios')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeView === 'scenarios'
                  ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scenarios ({scenarios.length})
            </button>
            <button
              onClick={() => {
                setActiveView('ai_benchmark');
                if (!evaluationReport && !evaluating) {
                  handleRunAIEvaluation();
                }
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeView === 'ai_benchmark'
                  ? 'bg-purple-950/80 text-purple-200 font-semibold border border-purple-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Evaluation Matrix</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono">
            <span className="text-slate-400">Seed:</span>
            <input
              type="number"
              value={seedNumber}
              onChange={(e) => setSeedNumber(parseInt(e.target.value, 10) || 42)}
              className="w-14 bg-slate-950 px-1 py-0.5 rounded border border-slate-700 text-slate-200 text-center text-xs"
            />
            <button
              onClick={handleCustomSeed}
              disabled={seeding}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Apply
            </button>
          </div>

          <button
            onClick={handleReset}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/50 text-xs font-mono transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
            <span>Reset (Seed 42)</span>
          </button>
        </div>
      </div>

      {/* Database Quick Health Strip */}
      {dbCounts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(dbCounts).map(([key, count]) => (
            <div
              key={key}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center font-mono"
            >
              <div className="text-[10px] uppercase text-slate-400 truncate">{key.replace('_', ' ')}</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 1: GROUND TRUTH SCENARIO DEEP INSPECTOR */}
      {activeView === 'scenarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 6 Scenario Cards */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-xs font-mono uppercase text-slate-400 tracking-wider px-1">
              Standard Evaluation Scenarios ({scenarios.length})
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">Loading ground-truth cases...</div>
            ) : (
              scenarios.map((sc) => {
                const isSelected = sc.tag === selectedTag;
                return (
                  <div
                    key={sc.tag}
                    onClick={() => setSelectedTag(sc.tag)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-emerald-400">{sc.tag}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {sc.caseDetails?.case?.source_type || 'CASE'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Target: {sc.expectedStrategy}</span>
                      <span className="text-emerald-400/80">
                        ₹{sc.caseDetails?.case?.revenue_at_risk?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Deep Inspector */}
          <div className="lg:col-span-7 space-y-4">
            {activeScenario && caseDetails ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
                {/* Scenario Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                        {activeScenario.tag}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Case ID: {activeScenario.caseId.slice(0, 13)}...
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 mt-2 font-mono">
                      {activeScenario.description}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Revenue at Risk</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      ₹{caseDetails.case.revenue_at_risk.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Expected Strategy */}
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EXPECTED RECOVERY STRATEGY</span>
                  </div>
                  <div className="text-slate-200 font-semibold">{activeScenario.expectedStrategy}</div>
                </div>

                {/* Customer Profile & Related Data */}
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase text-slate-400">Customer Profile</div>
                  {caseDetails.customer ? (
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-semibold">{caseDetails.customer.name}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                          {caseDetails.customer.segment}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                        <div>Email: {caseDetails.customer.email}</div>
                        <div>Phone: {caseDetails.customer.phone}</div>
                        <div>Channel: {caseDetails.customer.preferred_channel}</div>
                        <div>LTV: ₹{caseDetails.customer.lifetime_value.toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Customer details unavailable</div>
                  )}
                </div>

                {/* Root Cause Details */}
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase text-slate-400">Root Cause Signal</div>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1.5">
                    {caseDetails.sourceDetails && 'failure_reason' in caseDetails.sourceDetails && (
                      <div>
                        Failure Reason:{' '}
                        <span className="text-rose-400 font-semibold">
                          {caseDetails.sourceDetails.failure_reason}
                        </span>{' '}
                        (Attempt #{caseDetails.sourceDetails.attempt_number})
                      </div>
                    )}
                    {caseDetails.sourceDetails && 'event_type' in caseDetails.sourceDetails && (
                      <div>
                        Event Type:{' '}
                        <span className="text-purple-400 font-semibold">
                          {caseDetails.sourceDetails.event_type}
                        </span>
                      </div>
                    )}
                    {caseDetails.sourceDetails && 'days_overdue' in caseDetails.sourceDetails && (
                      <div>
                        Overdue Status:{' '}
                        <span className="text-amber-400 font-semibold">
                          {caseDetails.sourceDetails.days_overdue} days overdue
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-slate-500 bg-slate-900/40 border border-slate-800 rounded-xl">
                Select a scenario to inspect its ground-truth context.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: AI DECISION EVALUATION MATRIX */}
      {activeView === 'ai_benchmark' && (
        <div className="space-y-5 font-mono text-xs">
          {/* Controls Bar */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>AI Decision Engine Benchmark Evaluation</span>
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Evaluates Gemini reasoning alignment against Ground Truth rules across all 6 standardized scenarios.
              </p>
            </div>

            <button
              onClick={handleRunAIEvaluation}
              disabled={evaluating}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-60"
            >
              {evaluating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating AI Engine...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Benchmark Evaluation</span>
                </>
              )}
            </button>
          </div>

          {evalError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-xs">
              {evalError}
            </div>
          )}

          {evaluationReport && (
            <div className="space-y-5">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">Agreement Rate</div>
                  <div
                    className={`text-2xl font-bold ${
                      evaluationReport.agreement_rate_percent >= 80 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {evaluationReport.agreement_rate_percent}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {evaluationReport.agreements_count} / {evaluationReport.total_scenarios} scenarios aligned
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">Average Confidence</div>
                  <div className="text-2xl font-bold text-purple-300">
                    {(evaluationReport.average_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Model: {evaluationReport.model}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">Low Confidence Escalations</div>
                  <div
                    className={`text-2xl font-bold ${
                      evaluationReport.low_confidence_count === 0 ? 'text-slate-200' : 'text-amber-400'
                    }`}
                  >
                    {evaluationReport.low_confidence_count}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Threshold &lt; {((evaluationReport.confidence_threshold || 0.7) * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">Deterministic Fallbacks</div>
                  <div
                    className={`text-2xl font-bold ${
                      evaluationReport.fallback_count === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {evaluationReport.fallback_count}
                  </div>
                  <div className="text-[10px] text-slate-500">Safe fallback triggers</div>
                </div>
              </div>

              {/* Comparative Matrix Table */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Scenario Tag</th>
                        <th className="px-4 py-3">Customer / Risk</th>
                        <th className="px-4 py-3">Ground Truth</th>
                        <th className="px-4 py-3">Deterministic</th>
                        <th className="px-4 py-3">Gemini Decision</th>
                        <th className="px-4 py-3 text-center">Confidence</th>
                        <th className="px-4 py-3 text-right">Alignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {evaluationReport.scenarios.map((row) => (
                        <tr key={row.scenario_tag} className="hover:bg-slate-900/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-200">
                            <span className="text-emerald-400">{row.scenario_tag}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-300 font-semibold">{row.customer_name}</div>
                            <div className="text-slate-500 text-[10px]">
                              {row.source_type} • ₹{row.revenue_at_risk.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 font-semibold">
                              {row.ground_truth_strategy}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-blue-800/80 text-blue-300 font-semibold">
                              {row.deterministic_strategy}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded font-semibold ${
                                  row.agreement
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {row.ai_strategy}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[10px] mt-1 line-clamp-1 max-w-xs" title={row.ai_reason}>
                              {row.ai_reason}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-slate-200">
                              {(row.ai_confidence * 100).toFixed(0)}%
                            </span>
                            <div className="text-[10px] text-slate-500">{row.execution_time_ms}ms</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.agreement ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>MATCH</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>DEVIATION</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
