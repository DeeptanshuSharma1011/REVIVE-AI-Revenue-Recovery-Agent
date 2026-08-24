import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  CreditCard,
  Receipt,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Bot,
  ExternalLink,
} from 'lucide-react';

interface EscalatedCaseItem {
  id: string;
  caseId: string;
  customerName: string;
  revenueAtRisk: number;
  sourceType: 'INVOICE' | 'SUBSCRIPTION' | 'CHECKOUT';
  reason: string;
  aiProposedAction: string;
  confidence: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  resolvedAction?: string;
  createdAt: string;
}

const INITIAL_ESCALATED_CASES: EscalatedCaseItem[] = [
  {
    id: 'esc-1',
    caseId: 'case_inv_highval_03',
    customerName: 'Global Logistics Enterprises',
    revenueAtRisk: 48000,
    sourceType: 'INVOICE',
    reason: 'Policy Guardrail: Invoice amount (₹48,000) exceeds autonomous threshold (₹25,000). Manual approval required.',
    aiProposedAction: 'Issue targeted settlement link with 5% early-pay discount.',
    confidence: 0.84,
    status: 'PENDING_REVIEW',
    createdAt: '12 min ago',
  },
  {
    id: 'esc-2',
    caseId: 'case_sub_maxretries_07',
    customerName: 'Zenith Health Systems',
    revenueAtRisk: 31500,
    sourceType: 'SUBSCRIPTION',
    reason: 'Policy Guardrail: Maximum autonomous retry attempts (3/3) exhausted with repeated generic declines.',
    aiProposedAction: 'Request account manager reach out for updated ACH / corporate card.',
    confidence: 0.78,
    status: 'PENDING_REVIEW',
    createdAt: '25 min ago',
  },
  {
    id: 'esc-3',
    caseId: 'case_chk_fraud_09',
    customerName: 'Unknown Guest User',
    revenueAtRisk: 14200,
    sourceType: 'CHECKOUT',
    reason: 'Policy Guardrail: Low AI model confidence (54% < 70% threshold) due to conflicting location telemetry.',
    aiProposedAction: 'Route to fraud verification team prior to triggering payment recovery link.',
    confidence: 0.54,
    status: 'PENDING_REVIEW',
    createdAt: '42 min ago',
  },
];

export const HumanReviewPage: React.FC = () => {
  const [cases, setCases] = useState<EscalatedCaseItem[]>(INITIAL_ESCALATED_CASES);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const pendingCount = cases.filter((c) => c.status === 'PENDING_REVIEW').length;

  const handleApprove = (id: string, actionDesc: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'APPROVED', resolvedAction: `Approved: ${actionDesc}` }
          : c
      )
    );
    setActionFeedback(`Case ${id} approved for execution.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleReject = (id: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'REJECTED', resolvedAction: 'Recovery halted by human operator.' }
          : c
      )
    );
    setActionFeedback(`Case ${id} recovery stopped.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100 font-mono">
              Human Review Queue
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cases REVIVE decided should not be handled autonomously due to safety guardrails, high value, or low confidence.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
          <span className="text-slate-400">Pending Review:</span>
          <span className={`font-bold ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {pendingCount} cases
          </span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Cases List */}
      <div className="space-y-4">
        {cases.map((item) => {
          const isPending = item.status === 'PENDING_REVIEW';
          return (
            <div
              key={item.id}
              className={`border rounded-2xl p-5 transition space-y-4 shadow-sm ${
                isPending
                  ? 'bg-slate-900/60 border-amber-900/40 hover:border-amber-700/60'
                  : item.status === 'APPROVED'
                  ? 'bg-slate-900/30 border-emerald-900/40'
                  : 'bg-slate-900/20 border-slate-800/80 opacity-75'
              }`}
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {item.sourceType === 'INVOICE' && <Receipt className="w-4 h-4" />}
                    {item.sourceType === 'SUBSCRIPTION' && <CreditCard className="w-4 h-4" />}
                    {item.sourceType === 'CHECKOUT' && <ShoppingCart className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <span>{item.customerName}</span>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        ({item.caseId})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.sourceType} • Escalated {item.createdAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Revenue at Risk</div>
                    <div className="text-sm font-mono font-bold text-rose-300">
                      ₹{item.revenueAtRisk.toLocaleString()}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                      isPending
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : item.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {isPending ? 'Action Required' : item.status}
                  </span>
                </div>
              </div>

              {/* Guardrail Reason & AI Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Why Review Is Required</span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {item.reason}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase text-purple-400 font-semibold flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Proposed Action</span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                      {Math.round(item.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {item.aiProposedAction}
                  </p>
                </div>
              </div>

              {/* Action Buttons or Resolution Summary */}
              {isPending ? (
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs font-semibold transition"
                  >
                    Reject / Halt Recovery
                  </button>
                  <button
                    onClick={() => handleApprove(item.id, item.aiProposedAction)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold transition shadow-sm"
                  >
                    Approve Recovery Action
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item.resolvedAction}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Audited by Operator</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
