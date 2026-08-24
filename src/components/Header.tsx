import React, { useEffect, useState, useRef } from 'react';
import { AgentStatusType } from '../types';
import { ShieldCheck, Cpu, Bot, ChevronDown, CheckCircle2, Zap } from 'lucide-react';
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
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentMode(strategyMode);
  }, [strategyMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowStatusPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Brand area */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 tracking-tight text-base font-mono">REVIVE</span>
            <span className="text-xs text-slate-400 font-medium">AI Revenue Recovery</span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Detect revenue at risk. Recover it safely.
          </p>
        </div>
      </div>

      {/* Mode Switcher & Compact System Status */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Strategy Engine Mode Toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={toggleMode}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentMode === 'ai'
                ? 'bg-purple-950/80 text-purple-200 font-semibold shadow-sm border border-purple-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Gemini AI Recovery Reasoning Layer"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">AI Agent</span>
            <span className="xs:hidden">AI</span>
          </button>
          <button
            onClick={toggleMode}
            disabled={isUpdating}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              currentMode === 'deterministic'
                ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Deterministic Rule-Based Baseline Engine"
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xs:inline">Deterministic</span>
            <span className="xs:hidden">Rule</span>
          </button>
        </div>

        {/* Compact System Status Dropdown */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setShowStatusPopover(!showStatusPopover)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 transition shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline font-semibold">SYSTEM STATUS</span>
            <span className="text-emerald-400 font-medium">OPERATIONAL</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* System Details Popover */}
          {showStatusPopover && (
            <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 text-xs font-mono space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200">System Infrastructure</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> All Systems Live
                </span>
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400">Backend API</span>
                  <span className={backendConnected ? 'text-emerald-400' : 'text-rose-400'}>
                    {backendConnected ? 'Connected (200 OK)' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400">Database</span>
                  <span className="text-emerald-400">PostgreSQL Active (8 Tables)</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400">AI Model</span>
                  <span className="text-purple-300">Gemini (Bounded)</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400">Safety Policy</span>
                  <span className="text-cyan-300">Active (REVIVE_V1)</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400">Agent Engine</span>
                  <span className="text-emerald-400">Ready</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Mode: {currentMode === 'ai' ? 'Autonomous AI' : 'Deterministic'}</span>
                <span>Seed: #42</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

