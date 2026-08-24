import React from 'react';
import { NavTab } from '../types';
import { LayoutDashboard, FileText, Cpu, BarChart3, ShieldAlert, Sparkles, Terminal, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openCasesCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  openCasesCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'simulator',
      label: 'Simulation Lab',
      icon: <Terminal className="w-4 h-4" />,
      badge: 'PHASE 2',
    },
    {
      id: 'cases',
      label: 'Recovery Cases',
      icon: <FileText className="w-4 h-4" />,
      badge: openCasesCount > 0 ? openCasesCount.toString() : undefined,
    },
    {
      id: 'ground_truth',
      label: 'Ground Truth Benchmarks',
      icon: <Sparkles className="w-4 h-4" />,
      badge: '6',
    },
    {
      id: 'live_agent',
      label: 'Live Agent',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'policy_guardrails',
      label: 'Policy & Guardrails',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'PHASE 6',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'human_review',
      label: 'Human Review',
      icon: <ShieldAlert className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-950/40 px-4 sm:px-6">
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono tracking-wide transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800/90 text-slate-100 font-semibold border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-slate-500'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
