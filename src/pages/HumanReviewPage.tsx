import React from 'react';
import { ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react';

export const HumanReviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 font-mono">Human Escalation Review Queue</h2>
          <p className="text-xs text-slate-400">
            Cases escalated due to policy guardrails (e.g., amount &gt; ₹25,000, max retries exceeded, or repeated failure).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-400">
          <span>Pending Review:</span>
          <span className="text-emerald-400 font-semibold">0</span>
        </div>
      </div>

      {/* Escalation Queue Empty State */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
          <ShieldAlert className="w-6 h-6 text-slate-500" />
        </div>

        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-medium text-slate-200">No escalated cases pending</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            When the agent encounters cases exceeding autonomous limits (MAX_RETRIES = 3, MAX_CONTACTS = 2, or MAX_AMOUNT = ₹25,000), it halts autonomous action and routes the case here with full context.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
          <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
          <span>Policy Guardrail Engine & Escalation Routing scheduled for Phase 6</span>
        </div>
      </div>
    </div>
  );
};
