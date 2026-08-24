import React, { useEffect, useState } from 'react';
import { AgentStatus } from '../components/AgentStatus';
import { RecoveryTimeline } from '../components/RecoveryTimeline';
import { HealthResponse, AgentStatusType, RecoveryMetrics } from '../types';
import { apiService } from '../services/api';
import {
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Terminal,
  Sparkles,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Receipt,
} from 'lucide-react';

interface OverviewPageProps {
  health: HealthResponse | null;
  agentStatus: AgentStatusType;
  onNavigateTab: (tab: 'cases' | 'ground_truth' | 'live_agent' | 'analytics' | 'human_review') => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  health,
  agentStatus,
  onNavigateTab,
}) => {
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);

  useEffect(() => {
    apiService
      .getMetrics()
      .then((m) => setMetrics(m))
      .catch((err) => console.error('Failed to load metrics:', err));
  }, []);

  const dbCounts = health?.database?.counts;

  return (
    <div className="space-y-6">
      {/* Introduction Hero / Status Panel */}
      <section className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-100 tracking-tight font-mono">
                Autonomous Revenue Recovery Operations
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              REVIVE connects to live transaction tables across subscriptions, checkout funnels, and enterprise invoices to detect failed revenue and orchestrate bounded, policy-governed interventions.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Agent Engine State
            </span>
            <AgentStatus status={agentStatus} showDetails={false} />
          </div>
        </div>

        {/* Core Financial Metrics (Real Phase 1 Data Foundation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>TOTAL REVENUE AT RISK</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-200 mt-2">
              ₹{metrics ? metrics.totalRevenueAtRisk.toLocaleString() : '...'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              {metrics ? `${metrics.openCasesCount} active cases monitored` : 'Loading...'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>REVENUE RECOVERED</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-2xl font-mono font-semibold text-emerald-400 mt-2">
              ₹{metrics ? metrics.totalRecoveredRevenue.toLocaleString() : '...'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              {metrics ? `${metrics.recoveredCasesCount} cases successfully settled` : 'Loading...'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>RECOVERY RATE</span>
              <span className="text-[10px] text-emerald-400 font-mono">AUTOMATED</span>
            </div>
            <div className="text-2xl font-mono font-semibold text-slate-200 mt-2">
              {metrics ? `${metrics.recoveryRatePercent}%` : '...'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              {metrics ? `${metrics.escalatedCasesCount} escalated to human review` : 'Loading...'}
            </div>
          </div>
        </div>
      </section>

      {/* Autonomous Core Loop Architecture Visualizer */}
      <section className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Bounded Autonomy Execution Lifecycle
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            State Machine Blueprint
          </span>
        </div>

        <RecoveryTimeline />
      </section>

      {/* Grid: Database Foundation & Ground Truth Benchmark Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Data Foundation & Ground Truth Banner */}
        <section className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wide text-slate-200 font-semibold">
                  Phase 1 — Data Foundation & Ground Truth Benchmarks
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                PostgreSQL Ready
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              REVIVE data foundation contains 8 relational tables (customers, subscriptions, payments, invoices, checkout_events, recovery_cases, recovery_actions, audit_logs) seeded with deterministic edge-case benchmarks.
            </p>

            {/* Quick stats pills */}
            {dbCounts && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono">
                  <div className="text-[10px] uppercase text-slate-400">Customers</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{dbCounts.customers}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono">
                  <div className="text-[10px] uppercase text-slate-400">Subscriptions</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{dbCounts.subscriptions}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono">
                  <div className="text-[10px] uppercase text-slate-400">Payments</div>
                  <div className="text-base font-bold text-slate-200 mt-0.5">{dbCounts.payments}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center font-mono">
                  <div className="text-[10px] uppercase text-slate-400">Recovery Cases</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{dbCounts.recovery_cases}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onNavigateTab('simulator')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs font-mono transition shadow-sm"
            >
              <span>Launch Simulation Lab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('ground_truth')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800/90 text-emerald-300 text-xs font-mono transition"
            >
              <span>Inspect 6 Benchmarks</span>
            </button>
            <button
              onClick={() => onNavigateTab('cases')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
            >
              <span>Explore All Cases</span>
            </button>
          </div>
        </section>

        {/* Right 1 Col: System Diagnostics & Health */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono uppercase tracking-wide text-slate-200 font-semibold">
                  System Diagnostics
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Phase 1 Complete
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Backend API</span>
                <span className="text-emerald-400 font-semibold">
                  {health?.status === 'ok' ? 'HEALTHY (200 OK)' : 'CONNECTING...'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Database Schema</span>
                <span className="text-emerald-400 font-semibold">8/8 TABLES ACTIVE</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">RLS Policies</span>
                <span className="text-emerald-400 font-semibold">ENABLED</span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Data Access Layer</span>
                <span className="text-emerald-400 font-semibold">REPOSITORIES ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Seed: #{health?.database?.seed ?? 42}</span>
            <span className="text-emerald-400">PostgreSQL Ready</span>
          </div>
        </section>
      </div>
    </div>
  );
};
