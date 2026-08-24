import React from 'react';
import { AgentStatus } from '../components/AgentStatus';
import { RecoveryTimeline } from '../components/RecoveryTimeline';
import { Cpu, Terminal, Radio } from 'lucide-react';

export const LiveAgentPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-100 font-mono">Autonomous Agent Operations Center</h2>
          <p className="text-xs text-slate-400">
            Real-time multi-step reasoning, policy clearance, and tool execution workspace.
          </p>
        </div>

        <AgentStatus status="READY" />
      </div>

      {/* Live Agent State Visualizer */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-200 font-semibold">
              Live Investigation & Action Pipeline
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Standby Mode</span>
        </div>

        <RecoveryTimeline />
      </section>

      {/* Agent Terminal / Console Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span>Current Reasoning Context</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">IDLE</span>
          </div>

          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No active investigation in progress.
            <div className="mt-1 text-[11px] text-slate-600">
              LangGraph state orchestration & Gemini reasoning pipeline active in Phase 4 & 5.
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Bounded Tool Execution Log</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">0 ACTIONS</span>
          </div>

          <div className="py-8 text-center text-xs font-mono text-slate-500">
            Awaiting action trigger events.
            <div className="mt-1 text-[11px] text-slate-600">
              Recovery Simulator & deterministic execution tools active in Phase 2 & 3.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
