import React, { useEffect, useState } from 'react';
import { AgentStatus } from './AgentStatus';
import { AgentStatusType } from '../types';
import { ShieldCheck, Terminal, Sparkles, Cpu, Bot } from 'lucide-react';
import { apiService } from '../services/api';

interface HeaderProps {
  agentStatus: AgentStatusType;
  backendConnected: boolean;
  strategyMode?: 'deterministic' | 'ai';
  onStrategyModeChange?: (mode: 'deterministic' | 'ai') => void;
}

export const Header: React.FC<HeaderProps> = ({
  agentStatus = 'READY',
  backendConnected = false,
  strategyMode = 'deterministic',
  onStrategyModeChange,
}) => {
  const [currentMode, setCurrentMode] = useState<'deterministic' | 'ai'>(strategyMode);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setCurrentMode(strategyMode);
  }, [strategyMode]);

  const toggleMode = async () => {
    const newMode = currentMode === 'ai' ? 'deterministic' : 'ai';
    setIsUpdating(true);
    try {
      const res = await apiService.setStrategyMode(newMode);
      setCurrentMode(res.mode);
      if (onStrategyModeChange) {
        onStrategyModeChange(res.mode);
      }
    } catch (err) {
      console.error('Failed to switch strategy mode:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand area */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-semibold text-slate-100 tracking-tight text-base font-mono">REVIVE</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80 font-mono tracking-wide flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              PHASE 4 AI DECISION ENGINE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Bounded Autonomy • Decision Intelligence Layer • Gemini 3.7
          </p>
        </div>
      </div>

      {/* Mode Switcher & Status Indicators */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {/* Strategy Engine Mode Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={toggleMode}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentMode === 'deterministic'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Deterministic Rule-Based Engine (No LLM)"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Deterministic</span>
          </button>
          <button
            onClick={toggleMode}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentMode === 'ai'
                ? 'bg-purple-950/80 text-purple-200 font-semibold shadow-sm border border-purple-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Gemini AI Reasoning Layer with Bounded Autonomy"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Gemini AI</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
          <span>API:</span>
          <span className={backendConnected ? 'text-emerald-400' : 'text-rose-400'}>
            {backendConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <AgentStatus status={agentStatus} />
      </div>
    </header>
  );
};
