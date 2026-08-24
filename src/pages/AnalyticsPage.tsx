import React from 'react';
import { BarChart3, TrendingUp, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 font-mono">Revenue Recovery Analytics</h2>
          <p className="text-xs text-slate-400">
            Simulated financial impact, recovery efficiency, policy compliance, and automation rates.
          </p>
        </div>

        <div className="text-[11px] font-mono text-slate-400 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
          Simulation Baseline
        </div>
      </div>

      {/* Analytics KPI Metric Cards (Phase 0 Empty/Baseline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>TOTAL REVENUE AT RISK</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-mono font-semibold text-slate-200">₹0.00</div>
          <div className="text-[10px] text-slate-500 font-mono">Awaiting recovery scenarios</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>TOTAL RECOVERED</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-semibold text-emerald-400">₹0.00</div>
          <div className="text-[10px] text-slate-500 font-mono">0.0% overall recovery rate</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>POLICY COMPLIANCE</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-semibold text-emerald-400">100.0%</div>
          <div className="text-[10px] text-slate-500 font-mono">Zero guardrail violations</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>AVG RECOVERY TIME</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-mono font-semibold text-slate-200">--</div>
          <div className="text-[10px] text-slate-500 font-mono">Calculated on active recoveries</div>
        </div>
      </div>

      {/* Analytics Visualization Placeholder */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-slate-200">Analytics Engine Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Comprehensive recovery rates categorized by scenario (Subscriptions, Cart Abandonment, Overdue Invoices) and intervention type will populate in Phase 7 & 8.
          </p>
        </div>
      </div>
    </div>
  );
};
