/**
 * @license
 * REVIVE — Live Agent Console Page
 * Phase 5 — Agentic Orchestration Workspace
 *
 * Provides real-time LangGraph multi-step execution visualizer, real-time node timeline,
 * bounded tool inspection, iterative re-evaluation loop monitor, and safety guard metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  Layers,
  Terminal,
  Cpu,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  GroundTruthScenario,
  AgentRunResult,
  AgentMetrics,
  AgentRunTimelineEvent,
} from '../types';

export const LiveAgentPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<GroundTruthScenario[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('GT_SUCCESSFUL_RETRY');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [forceDeterministic, setForceDeterministic] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRun, setCurrentRun] = useState<AgentRunResult | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [toolsList, setToolsList] = useState<Array<{ name: string; description: string; isReadOnly: boolean }>>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'tools' | 'safety'>('timeline');

  const loadData = useCallback(async () => {
    try {
      const [scRes, metRes, toolRes] = await Promise.all([
        apiService.getGroundTruthScenarios(),
        apiService.getAgentMetrics(),
        apiService.getAgentTools(),
      ]);
      setScenarios(scRes.scenarios);
      setMetrics(metRes);
      setToolsList(toolRes.tools);

      if (scRes.scenarios.length > 0 && !selectedCaseId) {
        const sc = scRes.scenarios.find((s) => s.tag === selectedTag) || scRes.scenarios[0];
        setSelectedTag(sc.tag);
        setSelectedCaseId(sc.caseId);
      }
    } catch (err) {
      console.error('Failed to load agent orchestration initial data', err);
    }
  }, [selectedTag, selectedCaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScenarioSelect = (tag: string) => {
    setSelectedTag(tag);
    const sc = scenarios.find((s) => s.tag === tag);
    if (sc) {
      setSelectedCaseId(sc.caseId);
      setCurrentRun(null);
    }
  };

  const handleExecuteAgent = async () => {
    if (!selectedCaseId) return;
    setIsRunning(true);
    try {
      const result = await apiService.runAgentRecovery(selectedCaseId, forceDeterministic);
      setCurrentRun(result);
      const metRes = await apiService.getAgentMetrics();
      setMetrics(metRes);
    } catch (err: any) {
      console.error('Agent execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = async () => {
    try {
      await apiService.resetDatabase();
      await loadData();
      setCurrentRun(null);
    } catch (err) {
      console.error('Failed to reset database', err);
    }
  };

  const getNodeBadgeColor = (node: string) => {
    switch (node) {
      case 'LOAD_CASE':
      case 'INVESTIGATE':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'DIAGNOSE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'REASON':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'VALIDATE_DECISION':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'EXECUTE_ACTION':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'VERIFY_RESULT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'RE_EVALUATE':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case 'COMPLETE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'ESCALATE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'STOP':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'RECOVERED':
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> RECOVERED</span>;
      case 'ESCALATED':
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> ESCALATED</span>;
      case 'STOPPED':
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> STOPPED</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">READY</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Bot className="w-6 h-6 text-indigo-400" />
              LangGraph Agentic Orchestrator
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Phase 5
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Bounded autonomous loop: Observe → Investigate → Diagnose → Reason → Validate → Execute → Verify → Re-evaluate.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State
          </button>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setForceDeterministic(false)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                !forceDeterministic ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gemini + Agent
            </button>
            <button
              onClick={() => setForceDeterministic(true)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                forceDeterministic ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deterministic Rule
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Total Runs</div>
          <div className="text-xl font-bold text-slate-100 mt-1 font-mono">{metrics?.total_agent_runs || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{metrics?.agent_successes || 0} Recovered</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Recovery Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {Math.round((metrics?.recovery_rate || 0) * 100)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">₹{(metrics?.revenue_recovered || 0).toLocaleString()} Saved</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">1-Step Recovery</div>
          <div className="text-xl font-bold text-indigo-400 mt-1 font-mono">
            {Math.round((metrics?.single_step_recovery_rate || 0) * 100)}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Direct resolution</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Multi-Step Loops</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {metrics?.recovery_after_re_evaluation || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Re-evaluated</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Avg Iterations</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
            {metrics?.average_iterations || 1}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cap: 3 max</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Loop Preventions</div>
          <div className="text-xl font-bold text-purple-400 mt-1 font-mono">
            {metrics?.duplicate_action_preventions || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Safety guard</div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Selector & Action Trigger */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Select Recovery Case
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{scenarios.length} Scenarios</span>
            </div>

            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {scenarios.map((sc) => (
                <button
                  key={sc.tag}
                  onClick={() => handleScenarioSelect(sc.tag)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition flex flex-col gap-1 ${
                    selectedTag === sc.tag
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 font-mono text-[11px]">{sc.tag}</span>
                    <span className="text-[10px] font-mono text-indigo-400">
                      ₹{sc.caseDetails?.case.revenue_at_risk.toLocaleString() || '0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{sc.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-800/50">
                    <span>Case: {sc.caseId}</span>
                    <span className="font-mono text-amber-400/90">{sc.expectedStrategy}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleExecuteAgent}
              disabled={isRunning || !selectedCaseId}
              className="w-full mt-3 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Executing Agent Loop...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Run LangGraph Agent
                </>
              )}
            </button>
          </div>

          {/* Safety & Bounded Execution Policy Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Bounded Autonomy Policies
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Max Iterations Loop Cap</span>
                <span className="font-mono text-slate-200 font-semibold">3 Iterations</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Max Actions Per Case</span>
                <span className="font-mono text-slate-200 font-semibold">3 Actions</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>Confidence Guardrail</span>
                <span className="font-mono text-amber-400 font-semibold">&lt; 70% Escalate</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span>High-Value Threshold</span>
                <span className="font-mono text-rose-400 font-semibold">&gt; ₹25,000 Escalate</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Looping Protection</span>
                <span className="font-mono text-emerald-400 font-semibold">Non-Repeating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Visualizer & Timeline */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'timeline'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Graph Execution Timeline
                </button>
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'tools'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tool Registry ({toolsList.length})
                </button>
                <button
                  onClick={() => setActiveTab('safety')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'safety'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Safety Metrics
                </button>
              </div>

              {currentRun && getStatusBadge(currentRun.status)}
            </div>

            {/* TAB 1: Real-time Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {currentRun ? (
                  <div className="space-y-4">
                    {/* Run Summary Banner */}
                    <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-mono text-[11px] text-slate-500">Run ID: {currentRun.agent_run_id}</div>
                        <div className="text-slate-200 font-medium mt-0.5">{currentRun.summary}</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                          {currentRun.iterations} Iteration{currentRun.iterations > 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                          {currentRun.actions_taken} Action{currentRun.actions_taken > 1 ? 's' : ''}
                        </span>
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          ₹{currentRun.amount_recovered.toLocaleString()} Recovered
                        </span>
                      </div>
                    </div>

                    {/* Timeline Node Chain */}
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {currentRun.timeline.map((ev, idx) => (
                        <div key={ev.id || idx} className="relative group">
                          <div
                            className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 bg-slate-950 ${
                              ev.status === 'completed'
                                ? 'border-emerald-500 bg-emerald-500'
                                : ev.status === 'failed'
                                ? 'border-rose-500 bg-rose-500'
                                : 'border-indigo-500'
                            }`}
                          />
                          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getNodeBadgeColor(
                                    ev.node
                                  )}`}
                                >
                                  {ev.node}
                                </span>
                                <span className="text-xs font-semibold text-slate-200">{ev.title}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(ev.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{ev.description}</p>
                            {ev.data && (
                              <pre className="p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/60 mt-1">
                                {JSON.stringify(ev.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-3">
                    <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-xs font-mono">No active agent run displayed.</div>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Select a ground truth scenario on the left and click "Run LangGraph Agent" to observe multi-step reasoning, tool dispatch, and ledger verification.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Tool Registry */}
            {activeTab === 'tools' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 mb-2">
                  All tools accessible by the agent are formally typed and strictly bounded. No arbitrary SQL or filesystem execution allowed.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {toolsList.map((t) => (
                    <div key={t.name} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-indigo-300">{t.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            t.isReadOnly
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {t.isReadOnly ? 'READ ONLY' : 'ACTION TOOL'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Safety Guard Metrics */}
            {activeTab === 'safety' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="font-mono font-semibold text-slate-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Termination & Loop Guards
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Max Iteration Terminations:</span>
                      <span className="font-mono text-slate-200 font-semibold">{metrics?.max_iteration_terminations || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Duplicate Action Preventions:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{metrics?.duplicate_action_preventions || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Invalid Decision Blocks:</span>
                      <span className="font-mono text-slate-200 font-semibold">{metrics?.invalid_decision_blocks || 0}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="font-mono font-semibold text-slate-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Confidence & Fallback Stats
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Fallback Rate:</span>
                      <span className="font-mono text-slate-200 font-semibold">{Math.round((metrics?.fallback_rate || 0) * 100)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Low Confidence Escalations:</span>
                      <span className="font-mono text-amber-400 font-semibold">{metrics?.low_confidence_escalations || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Tool Execution Errors:</span>
                      <span className="font-mono text-rose-400 font-semibold">{metrics?.tool_failures || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
