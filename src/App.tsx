import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OverviewPage } from './pages/OverviewPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { RecoveryCasesPage } from './pages/RecoveryCasesPage';
import { GroundTruthPage } from './pages/GroundTruthPage';
import { LiveAgentPage } from './pages/LiveAgentPage';
import { PolicyGuardrailsPage } from './pages/PolicyGuardrailsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
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
        if (m?.openCasesCount) {
          setOpenCasesCount(m.openCasesCount);
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
        strategyMode={strategyMode}
        onStrategyModeChange={(mode) => setStrategyMode(mode)}
      />

      {/* Primary Editorial Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openCasesCount={openCasesCount}
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
        {activeTab === 'simulator' && <SimulationLabPage />}
        {activeTab === 'cases' && <RecoveryCasesPage />}
        {activeTab === 'ground_truth' && <GroundTruthPage />}
        {activeTab === 'live_agent' && <LiveAgentPage />}
        {activeTab === 'policy_guardrails' && <PolicyGuardrailsPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'human_review' && <HumanReviewPage />}
      </main>

      {/* System Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>REVIVE Core Engine • Phase 6 (Guardrails & Policy Engine)</span>
        </div>
        <div>
          <span>Deterministic Policy Firewall • Bounded Autonomy • Cryptographic Audit Trails • Safe Escalations</span>
        </div>
      </footer>
    </div>
  );
}
