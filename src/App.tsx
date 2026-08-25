import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OverviewPage } from './pages/OverviewPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { RecoveryCasesPage } from './pages/RecoveryCasesPage';
import { LiveAgentPage } from './pages/LiveAgentPage';
import { AgentDecisionsPage } from './pages/AgentDecisionsPage';
import { PolicyGuardrailsPage } from './pages/PolicyGuardrailsPage';
import { EvaluationIntelligencePage } from './pages/EvaluationIntelligencePage';
import { HumanReviewPage } from './pages/HumanReviewPage';
import { apiService } from './services/api';
import { NavTab, HealthResponse, AgentStatusType } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>('READY');
  const [strategyMode, setStrategyMode] = useState<'deterministic' | 'ai'>('deterministic');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [openCasesCount, setOpenCasesCount] = useState<number>(0);
  const [escalatedCount, setEscalatedCount] = useState<number>(3);

  useEffect(() => {
    // Initial health, strategy mode and agent status probe
    apiService
      .health()
      .then((data) => {
        setHealth(data);
        setBackendConnected(true);
        if (data?.strategyMode) {
          setStrategyMode(data.strategyMode);
        }
      })
      .catch((err) => {
        console.error('Backend connection check error:', err);
        setBackendConnected(false);
      });

    apiService
      .getStrategyMode()
      .then((res) => {
        if (res?.mode) setStrategyMode(res.mode);
      })
      .catch((err) => {
        console.warn('Strategy mode fetch fallback:', err);
      });

    apiService
      .getAgentStatus()
      .then((res) => {
        if (res?.status) {
          setAgentStatus(res.status);
        }
      })
      .catch((err) => {
        console.warn('Agent status check fallback:', err);
      });

    apiService
      .getMetrics()
      .then((m) => {
        if (m?.openCasesCount !== undefined) {
          setOpenCasesCount(m.openCasesCount);
        }
        if (m?.escalatedCasesCount !== undefined) {
          setEscalatedCount(m.escalatedCasesCount);
        }
      })
      .catch((err) => {
        console.warn('Metrics check fallback:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        agentStatus={agentStatus}
        backendConnected={backendConnected}
      />

      {/* Primary Editorial Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openCasesCount={openCasesCount}
        escalatedCount={escalatedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'overview' && (
          <OverviewPage
            health={health}
            agentStatus={agentStatus}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'cases' && <RecoveryCasesPage />}
        {(activeTab === 'run_agent' || activeTab === 'live_agent') && <LiveAgentPage />}
        {(activeTab === 'simulate' || activeTab === 'simulator') && <SimulationLabPage />}
        {activeTab === 'decisions' && <AgentDecisionsPage />}
        {(activeTab === 'guardrails' || activeTab === 'policy_guardrails') && <PolicyGuardrailsPage />}
        {(activeTab === 'performance' || activeTab === 'evaluation' || activeTab === 'analytics' || activeTab === 'ground_truth') && (
          <EvaluationIntelligencePage />
        )}
        {activeTab === 'human_review' && <HumanReviewPage />}
      </main>

      {/* Clean Global System Footer */}
      <footer className="border-t border-slate-900/80 bg-slate-950/90 backdrop-blur-sm py-4 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></span>
            <span className="text-slate-400 font-semibold">REVIVE</span>
            <span className="text-slate-600">•</span>
            <span>Autonomous &amp; Policy-Bounded Revenue Recovery</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Razorpay AI Buildathon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
