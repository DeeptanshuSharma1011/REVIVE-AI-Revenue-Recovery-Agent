import React from 'react';
import { NavTab } from '../types';
import {
  LayoutDashboard,
  FileText,
  PlayCircle,
  FlaskConical,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openCasesCount?: number;
  escalatedCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  openCasesCount = 0,
  escalatedCount = 0,
}) => {
  // Normalize any alias tab to its primary business equivalent
  const normalizedActiveTab: NavTab = (() => {
    if (activeTab === 'simulator') return 'simulate';
    if (activeTab === 'live_agent') return 'run_agent';
    if (activeTab === 'policy_guardrails') return 'guardrails';
    if (activeTab === 'evaluation' || activeTab === 'analytics' || activeTab === 'ground_truth') return 'performance';
    return activeTab;
  })();

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'cases',
      label: 'Recovery Cases',
      icon: <FileText className="w-4 h-4" />,
      badge: openCasesCount > 0 ? `${openCasesCount}` : undefined,
    },
    {
      id: 'run_agent',
      label: 'Run Agent',
      icon: <PlayCircle className="w-4 h-4" />,
    },
    {
      id: 'simulate',
      label: 'Simulate',
      icon: <FlaskConical className="w-4 h-4" />,
    },
    {
      id: 'decisions',
      label: 'Agent Decisions',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'guardrails',
      label: 'Guardrails',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'human_review',
      label: 'Human Review',
      icon: <UserCheck className="w-4 h-4" />,
      badge: escalatedCount > 0 ? `${escalatedCount}` : undefined,
      badgeColor: 'amber',
    },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6">
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = normalizedActiveTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800/90 text-slate-100 font-semibold border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    tab.badgeColor === 'amber'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : isActive
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

