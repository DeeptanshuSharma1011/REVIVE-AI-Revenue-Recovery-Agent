import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { RecoveryCase, StrategyDecision, GroundTruthScenario } from '../types';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Bot,
  Cpu,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Terminal,
} from 'lucide-react';

interface DecisionItem {
  id: string;
  caseId: string;
  customerName: string;
  revenueAtRisk: number;
  found: string;
  recommendation: string;
  confidence: number;
  policyStatus: 'ALLOWED' | 'MODIFIED' | 'BLOCKED' | 'ESCALATED';
  policyReason: string;
  action: string;
  verification: string;
  outcome: 'RECOVERED' | 'ESCALATED' | 'IN_PROGRESS' | 'HALTED';
  recoveredAmount?: number;
  source: 'SUBSCRIPTION' | 'CHECKOUT' | 'INVOICE';
  timestamp: string;
  strategyKey: string;
}

const DEFAULT_DECISIONS: DecisionItem[] = [
  {
    id: 'dec-1',
    caseId: 'case_sub_transient_01',
    customerName: 'TechCorp India',
    revenueAtRisk: 12500,
    found: 'Payment failed due to temporary payment gateway timeout (network error). Customer has 6 months of prompt payment history.',
    recommendation: 'Immediate payment retry with payment gateway',
    confidence: 0.94,
    policyStatus: 'ALLOWED',
    policyReason: 'Under maximum retry limit (attempt 1/3) and below autonomous ceiling (₹12,500 <= ₹25,000).',
    action: 'Triggered immediate API retry with Razorpay gateway.',
    verification: 'Transaction status verified: SUCCESS (Payment ID: pay_sim_849201).',
    outcome: 'RECOVERED',
    recoveredAmount: 12500,
    source: 'SUBSCRIPTION',
    timestamp: '2 min ago',
    strategyKey: 'RETRY_PAYMENT',
  },
  {
    id: 'dec-2',
    caseId: 'case_chk_dropoff_02',
    customerName: 'Anita Sharma',
    revenueAtRisk: 8400,
    found: 'Abandoned checkout cart after session expiration during payment step. High purchase intent with 3 prior page visits.',
    recommendation: 'Generate single-click checkout recovery link and send SMS reminder',
    confidence: 0.89,
    policyStatus: 'ALLOWED',
    policyReason: 'Customer contact limit not exceeded (0/2 notifications sent in past 24h).',
    action: 'Generated secure payment link and dispatched automated recovery message.',
    verification: 'Payment link generated with 24-hour expiration token.',
    outcome: 'IN_PROGRESS',
    source: 'CHECKOUT',
    timestamp: '5 min ago',
    strategyKey: 'GENERATE_LINK',
  },
  {
    id: 'dec-3',
    caseId: 'case_inv_highval_03',
    customerName: 'Global Logistics Enterprises',
    revenueAtRisk: 48000,
    found: 'Enterprise invoice overdue by 14 days. Amount is ₹48,000.',
    recommendation: 'Autonomous direct debit retry proposed by AI model.',
    confidence: 0.81,
    policyStatus: 'ESCALATED',
    policyReason: 'Policy Guardrail Triggered: Amount ₹48,000 exceeds ₹25,000 autonomous threshold. Routed to human review queue.',
    action: 'Autonomous execution halted. Case placed in Human Escalation Review queue with executive summary.',
    verification: 'Escalation logged in audit ledger.',
    outcome: 'ESCALATED',
    source: 'INVOICE',
    timestamp: '8 min ago',
    strategyKey: 'ESCALATE',
  },
  {
    id: 'dec-4',
    caseId: 'case_sub_insufficient_04',
    customerName: 'Rahul Verma',
    revenueAtRisk: 4200,
    found: 'Card declined with code `insufficient_funds` on 1st of month.',
    recommendation: 'Schedule smart retry on salary disbursement date (5th of month).',
    confidence: 0.91,
    policyStatus: 'ALLOWED',
    policyReason: 'Smart retry window complies with maximum 14-day recovery window.',
    action: 'Scheduled recurring charge retry for 5th of the month at 10:00 AM.',
    verification: 'Retry successfully triggered and charged on scheduled date.',
    outcome: 'RECOVERED',
    recoveredAmount: 4200,
    source: 'SUBSCRIPTION',
    timestamp: '14 min ago',
    strategyKey: 'SCHEDULE_RETRY',
  },
  {
    id: 'dec-5',
    caseId: 'case_sub_expired_05',
    customerName: 'Apex Media & Design',
    revenueAtRisk: 18000,
    found: 'Credit card expiration date reached. 3 previous retry attempts failed.',
    recommendation: 'Request payment method update portal link.',
    confidence: 0.93,
    policyStatus: 'ALLOWED',
    policyReason: 'Direct retries halted (max retries reached). Method update request permitted.',
    action: 'Sent interactive billing update link to primary account contact.',
    verification: 'Customer updated card details via secure portal; next billing cycle authorized.',
    outcome: 'RECOVERED',
    recoveredAmount: 18000,
    source: 'SUBSCRIPTION',
    timestamp: '22 min ago',
    strategyKey: 'UPDATE_METHOD',
  },
  {
    id: 'dec-6',
    caseId: 'case_unrecoverable_06',
    customerName: 'Closed Account Inc',
    revenueAtRisk: 6500,
    found: 'Hard bank decline code `account_closed`.',
    recommendation: 'Halt all autonomous retries and mark unrecoverable.',
    confidence: 0.98,
    policyStatus: 'ALLOWED',
    policyReason: 'Prevents wasteful gateway fees and negative customer experience.',
    action: 'Terminated automated recovery workflow immediately.',
    verification: 'Case marked STOPPED with diagnostic reason logged.',
    outcome: 'HALTED',
    source: 'SUBSCRIPTION',
    timestamp: '35 min ago',
    strategyKey: 'STOP',
  },
];

export const AgentDecisionsPage: React.FC = () => {
  const [decisions, setDecisions] = useState<DecisionItem[]>(DEFAULT_DECISIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredDecisions = decisions.filter((d) => {
    if (outcomeFilter !== 'ALL' && d.outcome !== outcomeFilter) return false;
    if (strategyFilter !== 'ALL' && d.strategyKey !== strategyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.customerName.toLowerCase().includes(q) ||
        d.caseId.toLowerCase().includes(q) ||
        d.found.toLowerCase().includes(q) ||
        d.recommendation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPolicyBadge = (status: DecisionItem['policyStatus']) => {
    switch (status) {
      case 'ALLOWED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>Allowed</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-mono">
            <AlertTriangle className="w-3 h-3" />
            <span>Modified by Policy</span>
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>Escalated to Human</span>
          </span>
        );
      case 'BLOCKED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono">
            <span>Blocked</span>
          </span>
        );
    }
  };

  const getOutcomeBadge = (outcome: DecisionItem['outcome'], amount?: number) => {
    switch (outcome) {
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-mono font-semibold">
            ₹{amount?.toLocaleString() ?? 0} Recovered
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-mono font-semibold">
            Needs Human Review
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800 text-xs font-mono font-semibold">
            In Progress
          </span>
        );
      case 'HALTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 text-xs font-mono">
            Halted (Unrecoverable)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100 font-mono">Agent Decisions</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent explanations for every decision REVIVE makes — zero jargon, 100% policy-audited.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Total Audited Decisions:</span>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {decisions.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, case ID, or diagnostic summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="RECOVERED">Recovered</option>
            <option value="ESCALATED">Escalated</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="HALTED">Halted</option>
          </select>

          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Strategies</option>
            <option value="RETRY_PAYMENT">Retry Payment</option>
            <option value="GENERATE_LINK">Payment Link</option>
            <option value="SCHEDULE_RETRY">Schedule Retry</option>
            <option value="UPDATE_METHOD">Update Method</option>
            <option value="ESCALATE">Escalate</option>
            <option value="STOP">Stop</option>
          </select>
        </div>
      </div>

      {/* Decision Cards Stream */}
      <div className="space-y-4">
        {filteredDecisions.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs font-mono">
            No decisions match the selected filters.
          </div>
        ) : (
          filteredDecisions.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition space-y-4 shadow-sm"
              >
                {/* Top Row: Case & Financial Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 font-bold text-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                        <span>{item.customerName}</span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">
                          ({item.caseId})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.source} • {item.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Revenue at Risk</div>
                      <div className="text-xs font-mono font-bold text-rose-300">
                        ₹{item.revenueAtRisk.toLocaleString()}
                      </div>
                    </div>
                    {getOutcomeBadge(item.outcome, item.recoveredAmount)}
                  </div>
                </div>

                {/* Structured Transparency Card Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* What REVIVE Found */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide">
                      What REVIVE Found
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {item.found}
                    </p>
                  </div>

                  {/* AI Recommendation */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-purple-400 font-semibold tracking-wide flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Recommendation
                      </span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                        {Math.round(item.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {item.recommendation}
                    </p>
                  </div>

                  {/* Policy Check */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide">
                        Safety Guardrail Check
                      </span>
                      {getPolicyBadge(item.policyStatus)}
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {item.policyReason}
                    </p>
                  </div>

                  {/* Action & Verification */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wide">
                      Action Executed & Verified
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {item.action} <span className="text-emerald-400 font-mono text-[11px]">{item.verification}</span>
                    </p>
                  </div>
                </div>

                {/* Progressive Disclosure: Technical Inspect */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
                  >
                    <span>{isExpanded ? 'Hide Technical Parameters' : 'Inspect Bounded Parameters'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[10px] text-slate-500">100% Policy Audited</span>
                </div>

                {isExpanded && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-2 text-slate-300 animate-in fade-in duration-150">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Audit Record Payload</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-500">Strategy Key:</span> {item.strategyKey}
                      </div>
                      <div>
                        <span className="text-slate-500">Confidence Score:</span> {item.confidence}
                      </div>
                      <div>
                        <span className="text-slate-500">Policy Verdict:</span> {item.policyStatus}
                      </div>
                      <div>
                        <span className="text-slate-500">Ledger Status:</span> VERIFIED
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
