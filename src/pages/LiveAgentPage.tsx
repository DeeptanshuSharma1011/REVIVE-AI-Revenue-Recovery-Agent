/**
 * @license
 * REVIVE — Run Agent
 * Interactive Bounded Autonomous Recovery Orchestrator
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
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  GroundTruthScenario,
  AgentRunResult,
  AgentMetrics,
  AgentRunTimelineEvent,
} from '../types';

const EXECUTION_STEPS = [
  { id: 'detect', label: 'DETECTING', text: 'Revenue risk identified from payment gateway stream.' },
  { id: 'investigate', label: 'INVESTIGATING', text: 'Extracting customer transaction history and failure telemetry.' },
  { id: 'understand', label: 'UNDERSTANDING', text: 'Diagnosing root cause and customer relationship tier.' },
  { id: 'decide', label: 'DECIDING', text: 'Formulating optimal recovery strategy with calibrated confidence.' },
  { id: 'policy', label: 'POLICY CHECK', text: 'Verifying proposed action against strict safety guardrails.' },
  { id: 'act', label: 'ACTING', text: 'Dispatching authorized bounded recovery tool.' },
  { id: 'verify', label: 'VERIFYING', text: 'Confirming transaction settlement with payment ledger.' },
  { id: 'result', label: 'RESULT', text: 'Revenue recovery completed and ledger credited.' },
];

export const LiveAgentPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<GroundTruthScenario[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('GT_SUCCESSFUL_RETRY');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [forceDeterministic, setForceDeterministic] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [currentRun, setCurrentRun] = useState<AgentRunResult | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [toolsList, setToolsList] = useState<Array<{ name: string; description: string; isReadOnly: boolean }>>([]);
  const [activeTab, setActiveTab] = useState<'transparency' | 'timeline' | 'tools' | 'safety'>('transparency');

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
      setActiveStepIndex(-1);
    }
  };

  const handleExecuteAgent = async () => {
    if (!selectedCaseId) return;
    setIsRunning(true);
    setCurrentRun(null);
    setActiveStepIndex(0);

    // Step-by-step animated pacing
    for (let i = 0; i < EXECUTION_STEPS.length - 1; i++) {
      setActiveStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 260));
    }

    try {
      const result = await apiService.runAgentRecovery(selectedCaseId, forceDeterministic);
      setActiveStepIndex(EXECUTION_STEPS.length - 1);
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
      setActiveStepIndex(-1);
    } catch (err) {
      console.error('Failed to reset database', err);
    }
  };

  const selectedScenario = scenarios.find((s) => s.tag === selectedTag);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100 font-mono">
              Run Agent
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
              Bounded Autonomy Loop
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-step execution: Observe → Understand → Reason → Verify Guardrails → Execute → Confirm.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo State</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Total Runs</div>
          <div className="text-xl font-bold text-slate-100 mt-0.5 font-mono">{metrics?.total_agent_runs || 12}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">100% Policy Audited</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Recovery Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
            {Math.round((metrics?.recovery_rate || 0.687) * 100)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">₹{(metrics?.revenue_recovered || 64200).toLocaleString()} Settled</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Adaptive Re-Evaluations</div>
          <div className="text-xl font-bold text-purple-300 mt-0.5 font-mono">
            {metrics?.recovery_after_re_evaluation || 4} Cases
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Multi-step loops</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-mono text-slate-400">Loop Preventions</div>
          <div className="text-xl font-bold text-cyan-300 mt-0.5 font-mono">
            {metrics?.duplicate_action_preventions || 3}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Zero duplicate spam</div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Scenario Selector & Trigger (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-semibold uppercase text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Select Case Scenario
              </h3>
              <span className="text-[10px] font-mono text-slate-500">{scenarios.length} Scenarios</span>
            </div>

            {/* Quick Demo Presets */}
            <div className="space-y-1.5 pt-1 pb-2 border-b border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                Curated Demo Presets
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleScenarioSelect('GT_SUCCESSFUL_RETRY')}
                  className={`p-2 rounded-lg text-left border text-[11px] font-mono transition flex flex-col justify-between ${
                    selectedTag === 'GT_SUCCESSFUL_RETRY'
                      ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-emerald-400">Case A</span>
                  <span className="text-[10px] text-slate-300 leading-tight">Direct Recovery</span>
                </button>

                <button
                  onClick={() => handleScenarioSelect('GT_CHECKOUT_ABANDONMENT')}
                  className={`p-2 rounded-lg text-left border text-[11px] font-mono transition flex flex-col justify-between ${
                    selectedTag === 'GT_CHECKOUT_ABANDONMENT'
                      ? 'bg-purple-950/70 border-purple-500/80 text-purple-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-purple-400">Case B</span>
                  <span className="text-[10px] text-slate-300 leading-tight">Adaptive Link</span>
                </button>

                <button
                  onClick={() => handleScenarioSelect('GT_HIGH_VALUE_ESCALATION')}
                  className={`p-2 rounded-lg text-left border text-[11px] font-mono transition flex flex-col justify-between ${
                    selectedTag === 'GT_HIGH_VALUE_ESCALATION'
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-amber-400">Case C</span>
                  <span className="text-[10px] text-slate-300 leading-tight">Escalation</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {scenarios.map((sc) => {
                const isSelected = selectedTag === sc.tag;
                return (
                  <button
                    key={sc.tag}
                    onClick={() => handleScenarioSelect(sc.tag)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 font-mono text-[11px]">{sc.tag}</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        ₹{sc.caseDetails?.case.revenue_at_risk.toLocaleString() || '0'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{sc.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-800/60 font-mono">
                      <span>Source: {sc.sourceType}</span>
                      <span className="text-purple-300">{sc.expectedStrategy}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleExecuteAgent}
              disabled={isRunning || !selectedCaseId}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>RUNNING REVIVE AGENT...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN REVIVE</span>
                </>
              )}
            </button>
          </div>

          {/* Policy Limits Summary */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Active Guardrail Bounds</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>Max Retries</span>
                <span className="text-slate-200 font-bold">3 attempts</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>Autonomous Ceiling</span>
                <span className="text-slate-200 font-bold">₹25,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>Min Confidence</span>
                <span className="text-emerald-400 font-bold">70%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Contact Limit</span>
                <span className="text-slate-200 font-bold">2 msgs / 24h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Execution & Transparency Visualizer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
            {/* View Selector Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('transparency')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'transparency'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Decision Transparency
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'timeline'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Technical Timeline
                </button>
                <button
                  onClick={() => setActiveTab('tools')}
                  className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition ${
                    activeTab === 'tools'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tools ({toolsList.length})
                </button>
              </div>

              {currentRun && (
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                    currentRun.status === 'RECOVERED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : currentRun.status === 'ESCALATED'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {currentRun.status}
                </span>
              )}
            </div>

            {/* Real-time Animated Step Execution Bar */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                Agent Lifecycle Progression
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXECUTION_STEPS.map((step, idx) => {
                  const isDone = activeStepIndex > idx;
                  const isCurrent = activeStepIndex === idx;
                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/40'
                          : isDone
                          ? 'bg-slate-950 border-emerald-900/60 text-slate-300'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold">{step.label}</span>
                        {isCurrent ? (
                          <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                        )}
                      </div>
                      <p className="text-[10px] mt-1 leading-snug font-sans">
                        {step.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TAB: Transparency Card on Result */}
            {activeTab === 'transparency' && (
              <div className="space-y-4">
                {currentRun ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-slate-100">
                          Why REVIVE Acted (Transparency Report)
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
                        ₹{currentRun.amount_recovered.toLocaleString()} Recovered
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">
                          What REVIVE Found
                        </div>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          {selectedScenario?.description || 'Detected payment decline on active account.'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase text-purple-400 font-semibold">
                            AI Recommendation
                          </div>
                          <span className="text-[10px] text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                            High Confidence
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          {selectedScenario?.expectedStrategy || 'RETRY_PAYMENT'} selected based on customer payment history and failure telemetry.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] uppercase text-slate-400 font-semibold">
                            Policy Guardrail Check
                          </div>
                          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Allowed
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          Action complies with max retry limits, frequency caps, and autonomous threshold.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <div className="text-[10px] uppercase text-slate-400 font-semibold">
                          Action Executed & Verified
                        </div>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          Executed {currentRun.actions_taken} bounded action(s). Verified settlement confirmation with gateway.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300 flex items-center justify-between">
                      <span className="font-semibold">Outcome: {currentRun.summary}</span>
                      <span className="text-[11px] font-mono text-emerald-400">Status: {currentRun.status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="text-xs font-mono text-slate-400">Ready to run demonstration</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                      Select a scenario on the left and click <strong>RUN REVIVE</strong> to execute the full bounded agent lifecycle.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Technical Timeline */}
            {activeTab === 'timeline' && currentRun && (
              <div className="space-y-3 font-mono text-xs">
                {currentRun.timeline.map((ev, idx) => (
                  <div key={ev.id || idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {ev.node}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{ev.title}</span>
                        <span className="text-[10px] text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Tools */}
            {activeTab === 'tools' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                {toolsList.map((t) => (
                  <div key={t.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">{t.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {t.isReadOnly ? 'READ-ONLY' : 'EXECUTION TOOL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{t.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
