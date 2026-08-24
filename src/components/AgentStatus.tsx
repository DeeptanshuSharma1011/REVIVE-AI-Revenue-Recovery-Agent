import React from 'react';
import { AgentStatusType } from '../types';

interface AgentStatusProps {
  status?: AgentStatusType | string;
  showDetails?: boolean;
  className?: string;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({
  status = 'READY',
  showDetails = false,
  className = '',
}) => {
  const getStatusConfig = (s: AgentStatusType | string) => {
    switch (s) {
      case 'READY':
        return {
          label: 'AGENT READY',
          dotColor: 'bg-emerald-500',
          badgeBg: 'bg-emerald-950/60',
          badgeBorder: 'border-emerald-800/80',
          textColor: 'text-emerald-400',
          pulse: true,
          description: 'Standing by for revenue-risk telemetry.',
        };
      case 'INVESTIGATING':
        return {
          label: 'INVESTIGATING',
          dotColor: 'bg-amber-400',
          badgeBg: 'bg-amber-950/60',
          badgeBorder: 'border-amber-800/80',
          textColor: 'text-amber-300',
          pulse: true,
          description: 'Extracting customer, payment, and subscription history.',
        };
      case 'REASONING':
        return {
          label: 'REASONING',
          dotColor: 'bg-sky-400',
          badgeBg: 'bg-sky-950/60',
          badgeBorder: 'border-sky-800/80',
          textColor: 'text-sky-300',
          pulse: true,
          description: 'Formulating bounded recovery intervention strategy.',
        };
      case 'EXECUTING':
        return {
          label: 'EXECUTING ACTION',
          dotColor: 'bg-indigo-400',
          badgeBg: 'bg-indigo-950/60',
          badgeBorder: 'border-indigo-800/80',
          textColor: 'text-indigo-300',
          pulse: true,
          description: 'Executing authorized tool intervention.',
        };
      case 'VERIFYING':
        return {
          label: 'VERIFYING OUTCOME',
          dotColor: 'bg-teal-400',
          badgeBg: 'bg-teal-950/60',
          badgeBorder: 'border-teal-800/80',
          textColor: 'text-teal-300',
          pulse: true,
          description: 'Validating payment status and ledger confirmation.',
        };
      case 'RECOVERED':
        return {
          label: 'RECOVERED',
          dotColor: 'bg-emerald-400',
          badgeBg: 'bg-emerald-950/80',
          badgeBorder: 'border-emerald-700',
          textColor: 'text-emerald-300',
          pulse: false,
          description: 'Revenue successfully recovered and credited.',
        };
      case 'ESCALATED':
        return {
          label: 'ESCALATED TO HUMAN',
          dotColor: 'bg-rose-500',
          badgeBg: 'bg-rose-950/60',
          badgeBorder: 'border-rose-800/80',
          textColor: 'text-rose-300',
          pulse: false,
          description: 'Autonomous guardrail triggered. Human review required.',
        };
      case 'ERROR':
      default:
        return {
          label: 'SYSTEM ALERT',
          dotColor: 'bg-rose-500',
          badgeBg: 'bg-rose-950/60',
          badgeBorder: 'border-rose-800/80',
          textColor: 'text-rose-400',
          pulse: false,
          description: 'Agent encountered an unhandled condition.',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono tracking-wide ${config.badgeBg} ${config.badgeBorder} ${config.textColor}`}
      >
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
        </span>
        <span className="font-semibold">{config.label}</span>
      </div>
      {showDetails && (
        <span className="text-[11px] text-slate-400 mt-1 font-mono">{config.description}</span>
      )}
    </div>
  );
};
