import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Flame,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Lock,
  FileCheck,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  PolicyConfig,
  PolicyMetrics,
  PolicyResult,
  PolicyExplanationCard,
  PolicyEvaluationAuditRecord,
  RecoveryCase,
} from '../types';

export const PolicyGuardrailsPage: React.FC = () => {
  const [config, setConfig] = useState<PolicyConfig | null>(null);
  const [metrics, setMetrics] = useState<PolicyMetrics | null>(null);
  const [history, setHistory] = useState<PolicyEvaluationAuditRecord[]>([]);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Playground form state
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [testStrategy, setTestStrategy] = useState<string>('RETRY_PAYMENT');
  const [testConfidence, setTestConfidence] = useState<number>(0.92);
  const [testReason, setTestReason] = useState<string>('Diagnosed temporary network failure.');
  const [lastEvaluation, setLastEvaluation] = useState<{
    proposed: { strategy: string; confidence: number; reason: string };
    result: PolicyResult;
    explanation_card: PolicyExplanationCard;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, metRes, histRes, casesRes] = await Promise.all([
        apiService.getPolicyConfig(),
        apiService.getPolicyMetrics(),
        apiService.getPolicyHistory(),
        apiService.getCases({ limit: 50 }),
      ]);

      setConfig(cfgRes.config);
      setMetrics(metRes);
      setHistory(histRes.history);
      setCases(casesRes.items || []);
      if (!selectedCaseId && casesRes.items && casesRes.items.length > 0) {
        setSelectedCaseId(casesRes.items[0].case_id);
      }
    } catch (err) {
      console.error('Failed to load policy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await apiService.evaluatePolicy({
        case_id: selectedCaseId || undefined,
        strategy: testStrategy,
        confidence: testConfidence,
        reason: testReason,
      });
      setLastEvaluation(res);
      // Refresh metrics and history
      const [metRes, histRes] = await Promise.all([
        apiService.getPolicyMetrics(),
        apiService.getPolicyHistory(),
      ]);
      setMetrics(metRes);
      setHistory(histRes.history);
    } catch (err: any) {
      console.error('Policy evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'MODIFY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'BLOCK':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'ESCALATE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'STOP':
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                PHASE 6: DETERMINISTIC FIREWALL ACTIVE
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                {config?.POLICY_VERSION || 'REVIVE_POLICY_V1'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Guardrails & Deterministic Policy Engine
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Strict deterministic rules that intercept and govern AI agent recommendations before execution.
              Gemini proposes recovery strategies; REVIVE Policy Engine strictly authorizes, modifies, or halts them.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono border border-slate-700 transition self-start md:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Policy State
          </button>
        </div>
      </div>

      {/* 4 Autonomy & Safety Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>Total Evaluations</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {metrics?.policy_evaluations ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {metrics?.policy_allowed ?? 0} Allowed • {metrics?.policy_modified ?? 0} Modified
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>Autonomous Action Rate</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {metrics ? `${Math.round((metrics.autonomous_action_rate || 1) * 100)}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Safe actions executed autonomously
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>Guardrail Interventions</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {metrics ? `${Math.round((metrics.guardrail_intervention_rate || 0) * 100)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {metrics?.policy_blocked ?? 0} Blocked • {metrics?.policy_escalated ?? 0} Escalated
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>Duplicate & Retry Caps</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {(metrics?.duplicate_action_blocks || 0) + (metrics?.max_retry_blocks || 0)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {metrics?.duplicate_action_blocks || 0} Duplicate loops prevented
          </div>
        </div>
      </div>

      {/* Policy Rules & Thresholds Matrix */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Active Policy Guardrails & Governance Thresholds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Financial Risk Policy</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                MAX ₹25,000
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Any state-changing financial action on transactions exceeding ₹25,000 is automatically blocked from autonomous execution and routed to human review.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Payment Retry Safety</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                MAX 2 RETRIES
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Immediate gateway retries are capped at 2. Excess retry proposals are automatically modified by REVIVE to scheduled retries or safe payment links.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>AI Confidence Gate</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                MIN 70%
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Gemini reasoning recommendations with confidence scores below 0.70 trigger instant supervisor escalation rather than speculative tool dispatch.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Policy Evaluation Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              Policy Firewall Simulator
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Deterministic Evaluation</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Target Recovery Case</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} — ₹{c.revenue_at_risk?.toLocaleString()} ({c.recovery_type} / {c.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Proposed Strategy</label>
                <select
                  value={testStrategy}
                  onChange={(e) => setTestStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="RETRY_PAYMENT">RETRY_PAYMENT</option>
                  <option value="SCHEDULE_RETRY">SCHEDULE_RETRY</option>
                  <option value="PAYMENT_LINK">PAYMENT_LINK</option>
                  <option value="PAYMENT_METHOD_UPDATE">PAYMENT_METHOD_UPDATE</option>
                  <option value="CUSTOMER_NOTIFICATION">CUSTOMER_NOTIFICATION</option>
                  <option value="ESCALATE">ESCALATE</option>
                  <option value="STOP">STOP</option>
                  <option value="INVALID_ACTION_TEST">INVALID_ACTION_TEST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  AI Confidence: {Math.round(testConfidence * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={testConfidence}
                  onChange={(e) => setTestConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">AI Recommendation Reason</label>
              <input
                type="text"
                value={testReason}
                onChange={(e) => setTestReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {evaluating ? 'Evaluating Deterministic Policy...' : 'Evaluate Against Policy Engine'}
            </button>
          </div>
        </div>

        {/* Evaluation Output Card */}
        <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Policy Decision & Explanation Card
              </h2>
              {lastEvaluation && (
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${getDecisionBadge(
                    lastEvaluation.result.decision
                  )}`}
                >
                  {lastEvaluation.result.decision}
                </span>
              )}
            </div>

            {lastEvaluation ? (
              <div className="space-y-4">
                {/* Visual Explanation Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2.5">
                  <div className="text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                    {lastEvaluation.explanation_card.title}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">AI RECOMMENDED</span>
                      <span className="text-slate-200 font-semibold">{lastEvaluation.explanation_card.ai_recommended}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">REVIVE POLICY</span>
                      <span className="text-emerald-400 font-semibold">{lastEvaluation.explanation_card.revive_policy}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500 font-mono text-[10px] block">BECAUSE:</span>
                    <p className="mt-0.5 text-slate-300">{lastEvaluation.explanation_card.because}</p>
                  </div>

                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px]">OUTCOME:</span>
                    <span>{lastEvaluation.explanation_card.result}</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400 bg-slate-950/40 p-3 rounded border border-slate-800/60">
                  <div>Rules Triggered: <span className="text-slate-200">{lastEvaluation.result.rules_triggered.join(', ')}</span></div>
                  <div>Policy Version: <span className="text-slate-200">{lastEvaluation.result.policy_id}</span></div>
                  <div>Human Review Required: <span className={lastEvaluation.result.requires_human_review ? 'text-amber-400' : 'text-slate-400'}>{lastEvaluation.result.requires_human_review ? 'YES' : 'NO'}</span></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Select parameters on the left and click "Evaluate Against Policy Engine" to test the deterministic firewall.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Immutable Policy Audit Log Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Immutable Policy Audit Log ({history.length} Events)
          </h2>
          <span className="text-xs font-mono text-slate-400">Cryptographically verifiable log</span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Original Strategy</th>
                  <th className="py-2.5 px-3">Approved Strategy</th>
                  <th className="py-2.5 px-3">Rules Triggered</th>
                  <th className="py-2.5 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {history.slice(-15).reverse().map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold whitespace-nowrap">
                      {rec.case_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getDecisionBadge(rec.decision)}`}>
                        {rec.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{rec.original_strategy}</td>
                    <td className="py-2.5 px-3 text-emerald-300 whitespace-nowrap">{rec.approved_strategy || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate">{rec.rules_triggered.join(', ')}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[250px] truncate" title={rec.reason}>
                      {rec.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No policy evaluation events recorded yet. Run agent recoveries or test policies in the playground above.
          </div>
        )}
      </div>
    </div>
  );
};
