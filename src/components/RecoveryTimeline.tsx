import React from 'react';
import { TimelineStepConfig } from '../types';
import {
  AlertTriangle,
  Search,
  Activity,
  Brain,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface RecoveryTimelineProps {
  currentStep?: string;
  steps?: TimelineStepConfig[];
  className?: string;
}

const DEFAULT_TIMELINE_STEPS: TimelineStepConfig[] = [
  {
    key: 'DETECTED',
    label: '1. DETECT',
    description: 'Risk Event Identified',
    status: 'idle',
  },
  {
    key: 'INVESTIGATING',
    label: '2. INVESTIGATE',
    description: 'Retrieve Context',
    status: 'idle',
  },
  {
    key: 'DIAGNOSING',
    label: '3. DIAGNOSE',
    description: 'Root Cause Failure',
    status: 'idle',
  },
  {
    key: 'STRATEGY',
    label: '4. REASON',
    description: 'Select Strategy',
    status: 'idle',
  },
  {
    key: 'POLICY',
    label: '5. GUARDRAIL',
    description: 'Policy Authorization',
    status: 'idle',
  },
  {
    key: 'ACTION',
    label: '6. EXECUTE',
    description: 'Tool Execution',
    status: 'idle',
  },
  {
    key: 'VERIFY',
    label: '7. VERIFY',
    description: 'Ledger Confirmation',
    status: 'idle',
  },
  {
    key: 'OUTCOME',
    label: '8. AUDIT',
    description: 'Impact & Close',
    status: 'idle',
  },
];

const getStepIcon = (key: string) => {
  switch (key) {
    case 'DETECTED':
      return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'INVESTIGATING':
      return <Search className="w-3.5 h-3.5" />;
    case 'DIAGNOSING':
      return <Activity className="w-3.5 h-3.5" />;
    case 'STRATEGY':
      return <Brain className="w-3.5 h-3.5" />;
    case 'POLICY':
      return <ShieldCheck className="w-3.5 h-3.5" />;
    case 'ACTION':
      return <Zap className="w-3.5 h-3.5" />;
    case 'VERIFY':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'OUTCOME':
    default:
      return <TrendingUp className="w-3.5 h-3.5" />;
  }
};

export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({
  steps = DEFAULT_TIMELINE_STEPS,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className="min-w-[720px] grid grid-cols-8 gap-2">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isBlocked = step.status === 'blocked';

          let borderClass = 'border-slate-800/80 bg-slate-900/40 text-slate-400';
          let badgeClass = 'text-slate-500 bg-slate-800/50';

          if (isActive) {
            borderClass = 'border-amber-500/60 bg-amber-950/20 text-amber-200 shadow-sm shadow-amber-500/10';
            badgeClass = 'text-amber-400 bg-amber-900/50';
          } else if (isCompleted) {
            borderClass = 'border-emerald-600/50 bg-emerald-950/20 text-emerald-300';
            badgeClass = 'text-emerald-400 bg-emerald-900/50';
          } else if (isBlocked) {
            borderClass = 'border-rose-600/50 bg-rose-950/20 text-rose-300';
            badgeClass = 'text-rose-400 bg-rose-900/50';
          }

          return (
            <div
              key={step.key}
              className={`flex flex-col p-2.5 rounded-lg border transition-all ${borderClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`p-1 rounded ${badgeClass}`}>
                  {getStepIcon(step.key)}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {idx + 1}
                </span>
              </div>
              <span className="text-xs font-semibold tracking-tight text-slate-200">
                {step.label}
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
