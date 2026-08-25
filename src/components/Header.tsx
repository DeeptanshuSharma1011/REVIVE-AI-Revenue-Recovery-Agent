import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface HeaderProps {
  agentStatus?: string;
  backendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Brand area: Logo and Name only */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-bold text-slate-100 tracking-tight text-lg font-mono">REVIVE</span>
          <span className="text-xs text-slate-400 font-medium tracking-wide">AI Revenue Recovery</span>
        </div>
      </div>
    </header>
  );
};


