import React, { useEffect, useState } from 'react';
import { AgentStatus } from '../components/AgentStatus';
import { HealthResponse, AgentStatusType, RecoveryMetrics, NavTab } from '../types';
import { apiService } from '../services/api';
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  Play,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Clock,
  ChevronRight,
  RefreshCw,
  Sliders,
  FileText,
  CreditCard,
  Lock,
} from 'lucide-react';

interface OverviewPageProps {
  health: HealthResponse | null;
  agentStatus: AgentStatusType;
  onNavigateTab: (tab: NavTab) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  health,
  agentStatus,
  onNavigateTab,
}) => {
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService
      .getMetrics()
      .then((m) => setMetrics(m))
      .catch((err) => console.error('Failed to load metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalAtRisk = metrics ? metrics.totalRevenueAtRisk : 93400;
  const totalRecovered = metrics ? metrics.totalRecoveredRevenue : 64200;
  const recoveryRate = metrics ? metrics.recoveryRatePercent : 68.7;
  const needsReviewCount = metrics ? metrics.escalatedCasesCount : 3;

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight font-mono">
                REVIVE
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-medium">
                AI Revenue Recovery
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Detect revenue at risk. Recover it safely. REVIVE continuously identifies failed transactions and orchestrates bounded, policy-governed interventions.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end gap-3 self-stretch md:self-auto justify-between md:justify-start">
            <AgentStatus status={agentStatus} showDetails={false} />
            <button
              onClick={() => onNavigateTab('run_agent')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition shadow-sm hover:shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Agent</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 HERO METRICS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Revenue at Risk */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">Revenue at Risk</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              SIMULATED
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-rose-300 tracking-tight">
              ₹{totalAtRisk.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>{metrics ? metrics.openCasesCount : 12} active cases monitored</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Revenue Recovered */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">Revenue Recovered</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              SIMULATED
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-emerald-400 tracking-tight">
              ₹{totalRecovered.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{metrics ? metrics.recoveredCasesCount : 8} cases settled</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Recovery Rate */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">Recovery Rate</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              SIMULATED
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-slate-100 tracking-tight">
              {recoveryRate}%
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.7% lift vs baseline</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Needs Review */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">Needs Review</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              SIMULATED
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-mono font-bold text-amber-300 tracking-tight">
              {needsReviewCount}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Guardrail escalations</span>
              </span>
              <button
                onClick={() => onNavigateTab('human_review')}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                Review →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECONDARY METRICS ROW */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400">Total Agent Actions</div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">19</div>
          <div className="text-[10px] text-slate-400 font-mono">100% policy audited</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400">Multi-Step Recoveries</div>
          <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">4 Cases</div>
          <div className="text-[10px] text-slate-400 font-mono">Adaptive graph loops</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400">Guardrail Interventions</div>
          <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">3 Cases</div>
          <div className="text-[10px] text-slate-400 font-mono">Safe boundary enforced</div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400">Avg Actions / Recovery</div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">0.63</div>
          <div className="text-[10px] text-slate-400 font-mono">High efficiency</div>
        </div>
      </section>

      {/* VISUAL RECOVERY FLOW */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Recovery Flow
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Autonomous Bounded Lifecycle
          </span>
        </div>

        {/* 5 Step Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">STEP 1</span>
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            </div>
            <div className="my-2">
              <div className="text-xs font-semibold text-slate-200">Detect</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Identify failed charges, expired cards & invoices
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">STEP 2</span>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
            <div className="my-2">
              <div className="text-xs font-semibold text-slate-200">Understand</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Extract failure codes, customer tier & history
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">STEP 3</span>
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            </div>
            <div className="my-2">
              <div className="text-xs font-semibold text-slate-200">Decide</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Formulate strategy with calibrated confidence
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">STEP 4</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="my-2">
              <div className="text-xs font-semibold text-slate-200">Safe Action</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Audit against guardrails & execute bounded tools
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">STEP 5</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div className="my-2">
              <div className="text-xs font-semibold text-slate-200">Verify</div>
              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Query payment gateway & confirm revenue recovered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-COLUMN GRID: RECENT RECOVERY ACTIVITY & AI TRANSPARENCY PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Recovery Activity */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wide text-slate-200 font-semibold">
                  Recent Recovery Activity
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Live Feed
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 mt-2">
              <div className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-emerald-400">
                    ₹12,500 recovered
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Payment retry successful • TechCorp India
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">2 min ago</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-rose-300">
                    ₹8,400 at risk
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Checkout abandonment detected • Anita Sharma
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">5 min ago</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-amber-300">
                    ₹31,000 escalated
                  </div>
                  <div className="text-[11px] text-slate-300">
                    High-value transaction • Global Logistics
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">8 min ago</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-emerald-400">
                    ₹4,200 recovered
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Payment link settled • Rahul Verma
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">14 min ago</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-400">
                    ₹18,000 halted
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Max retries guardrail reached • Apex Media
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">22 min ago</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onNavigateTab('cases')}
              className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <span>View all recovery cases</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Right Column: AI Transparency Preview ("Why REVIVE Acted") */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono uppercase tracking-wide text-slate-200 font-semibold">
                  Why REVIVE Acted
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                Transparency Card
              </span>
            </div>

            <div className="mt-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">What REVIVE Found</div>
                <p className="text-xs text-slate-200 mt-0.5">
                  Temporary network failure on SaaS renewal with 1 previous successful payment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Recommended Action</div>
                  <div className="text-xs font-semibold text-purple-300 mt-0.5">
                    Retry Payment (94% Conf.)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Policy Check</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Allowed</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Outcome</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">
                    ₹12,500 Recovered
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Case #R-1024</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigateTab('decisions')}
              className="inline-flex items-center gap-1 text-xs font-mono text-purple-300 hover:text-purple-200 font-semibold"
            >
              <span>View All Agent Decisions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('guardrails')}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
            >
              Inspect Guardrails →
            </button>
          </div>
        </section>
      </div>

      {/* QUICK SHORTCUTS ROW */}
      <section className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <span className="text-slate-400">Quick Navigation:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('run_agent')}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition"
          >
            Run Agent Demonstration
          </button>
          <button
            onClick={() => onNavigateTab('cases')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
          >
            Explore Cases
          </button>
          <button
            onClick={() => onNavigateTab('guardrails')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
          >
            Inspect Guardrails
          </button>
          <button
            onClick={() => onNavigateTab('performance')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
          >
            Performance & Lift
          </button>
        </div>
      </section>
    </div>
  );
};
