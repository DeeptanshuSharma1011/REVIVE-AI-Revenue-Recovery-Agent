/**
 * @license
 * REVIVE — Simulation Lab (Phase 2 Recovery Simulator Console)
 *
 * Provides operators and evaluators an interactive workbench to trigger simulated
 * recovery actions deterministically, inspect state transitions, and verify outcomes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Link,
  Mail,
  CreditCard,
  UserCheck,
  ShieldAlert,
  Terminal,
  Activity,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  Calendar,
  Send,
  ExternalLink,
  FileText,
  DollarSign,
  Info,
} from 'lucide-react';
import { apiService } from '../services/api';
import {
  GroundTruthScenario,
  RecoveryCase,
  RecoveryCaseDetails,
  SimulatedPaymentLink,
  SimulatedNotification,
  SimulatedScheduledRetry,
  SimulatedPaymentMethodUpdateRequest,
} from '../types';

export const SimulationLabPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<GroundTruthScenario[]>([]);
  const [selectedScenarioTag, setSelectedScenarioTag] = useState<string>('GT_SUCCESSFUL_RETRY');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseDetails, setCaseDetails] = useState<RecoveryCaseDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Action Inputs
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [linkAmount, setLinkAmount] = useState<number>(0);
  const [notifMessage, setNotifMessage] = useState<string>('');
  const [notifChannel, setNotifChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [stopReason, setStopReason] = useState<string>('');

  // Execution Results & Verification
  const [lastActionResult, setLastActionResult] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'actions' | 'inspect' | 'registry'>('actions');

  // Simulated Registry
  const [simLinks, setSimLinks] = useState<SimulatedPaymentLink[]>([]);
  const [simNotifs, setSimNotifs] = useState<SimulatedNotification[]>([]);
  const [simSchedules, setSimSchedules] = useState<SimulatedScheduledRetry[]>([]);
  const [simRequests, setSimRequests] = useState<SimulatedPaymentMethodUpdateRequest[]>([]);

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getGroundTruthScenarios();
      setScenarios(res.scenarios);
      if (res.scenarios.length > 0) {
        const defaultSc = res.scenarios.find((s) => s.tag === selectedScenarioTag) || res.scenarios[0];
        setSelectedScenarioTag(defaultSc.tag);
        setSelectedCaseId(defaultSc.caseId);
      }
    } catch (err) {
      console.error('Failed to load scenarios', err);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioTag]);

  const loadCaseDetails = useCallback(async (caseId: string) => {
    if (!caseId) return;
    try {
      const details = await apiService.getCaseDetails(caseId);
      setCaseDetails(details);
      if (details?.case) {
        setLinkAmount(details.case.revenue_at_risk);
        setNotifMessage(
          `Hi ${details.customer?.name || 'Customer'}, please complete your payment of ₹${details.case.revenue_at_risk.toLocaleString()} to keep your service active.`
        );
        if (details.customer?.preferred_channel) {
          setNotifChannel(details.customer.preferred_channel);
        }
      }
    } catch (err) {
      console.error('Failed to load case details', err);
    }
  }, []);

  const loadRegistry = useCallback(async () => {
    try {
      const [linksRes, notifsRes, schedsRes, reqsRes] = await Promise.all([
        apiService.getSimulatedLinks(),
        apiService.getSimulatedNotifications(),
        apiService.getSimulatedSchedules(),
        apiService.getSimulatedMethodRequests(),
      ]);
      setSimLinks(linksRes.links);
      setSimNotifs(notifsRes.notifications);
      setSimSchedules(schedsRes.schedules);
      setSimRequests(reqsRes.requests);
    } catch (err) {
      console.error('Failed to load simulated registry', err);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
    loadRegistry();
  }, [loadScenarios, loadRegistry]);

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, loadCaseDetails]);

  const handleScenarioChange = (tag: string) => {
    setSelectedScenarioTag(tag);
    const sc = scenarios.find((s) => s.tag === tag);
    if (sc) {
      setSelectedCaseId(sc.caseId);
      setLastActionResult(null);
      setVerificationResult(null);
    }
  };

  const handleResetSimulator = async () => {
    try {
      await apiService.resetDatabase();
      await loadScenarios();
      if (selectedCaseId) {
        await loadCaseDetails(selectedCaseId);
      }
      await loadRegistry();
      setLastActionResult(null);
      setVerificationResult(null);
    } catch (err) {
      console.error('Failed to reset', err);
    }
  };

  // Action Handlers
  const handleRunDeterministicEngine = async () => {
    if (!caseDetails?.case) return;
    setExecutingAction('deterministic_engine');
    try {
      const res = await apiService.processRecoveryCase(caseDetails.case.case_id);
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
      await loadScenarios();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleRetryPayment = async () => {
    if (!caseDetails?.sourceDetails || caseDetails.case.source_type !== 'PAYMENT') {
      alert('This case does not have a direct payment to retry. Use another action or select a payment case.');
      return;
    }
    setExecutingAction('retry_payment');
    try {
      const res = await apiService.retryPayment(caseDetails.sourceDetails.payment_id, caseDetails.case.case_id);
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleScheduleRetry = async () => {
    if (!caseDetails?.sourceDetails || caseDetails.case.source_type !== 'PAYMENT') {
      alert('This case does not have a direct payment to schedule retry.');
      return;
    }
    setExecutingAction('schedule_payment_retry');
    try {
      const res = await apiService.schedulePaymentRetry(
        caseDetails.sourceDetails.payment_id,
        scheduleTime || undefined,
        caseDetails.case.case_id
      );
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!caseDetails?.customer) return;
    setExecutingAction('generate_payment_link');
    try {
      const res = await apiService.generatePaymentLink(
        caseDetails.customer.customer_id,
        linkAmount || caseDetails.case.revenue_at_risk,
        caseDetails.case.case_id
      );
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleSendNotification = async () => {
    if (!caseDetails?.customer) return;
    setExecutingAction('send_customer_notification');
    try {
      const res = await apiService.sendCustomerNotification(
        caseDetails.customer.customer_id,
        notifMessage,
        notifChannel,
        caseDetails.case.case_id
      );
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleRequestPaymentMethodUpdate = async () => {
    if (!caseDetails?.customer) return;
    setExecutingAction('request_payment_method_update');
    try {
      const res = await apiService.requestPaymentMethodUpdate(
        caseDetails.customer.customer_id,
        caseDetails.case.case_id
      );
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleEscalateToHuman = async () => {
    if (!caseDetails?.case) return;
    setExecutingAction('escalate_to_human');
    try {
      const res = await apiService.escalateToHuman(caseDetails.case.case_id, escalateReason || undefined);
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleStopRecovery = async () => {
    if (!caseDetails?.case) return;
    setExecutingAction('stop_recovery');
    try {
      const res = await apiService.stopRecovery(caseDetails.case.case_id, stopReason || undefined);
      setLastActionResult(res);
      await loadCaseDetails(caseDetails.case.case_id);
      await loadRegistry();
    } catch (err: any) {
      setLastActionResult({ error: err.message, simulated: true });
    } finally {
      setExecutingAction(null);
    }
  };

  const handleVerifyPayment = async () => {
    if (!caseDetails?.sourceDetails || caseDetails.case.source_type !== 'PAYMENT') return;
    try {
      const res = await apiService.checkPaymentStatus(caseDetails.sourceDetails.payment_id);
      setVerificationResult({ type: 'payment_status', data: res });
    } catch (err: any) {
      setVerificationResult({ error: err.message });
    }
  };

  const handleVerifyRecovery = async () => {
    if (!caseDetails?.case) return;
    try {
      const res = await apiService.checkRecoveryStatus(caseDetails.case.case_id);
      setVerificationResult({ type: 'recovery_status', data: res });
    } catch (err: any) {
      setVerificationResult({ error: err.message });
    }
  };

  const activeScenario = scenarios.find((s) => s.tag === selectedScenarioTag);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Phase 2 — Recovery Simulator Lab</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-500/30">
                SIMULATION ENGINE ACTIVE
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-1">
              Deterministic test harness for the 7 recovery actions. State changes, action records, and audit logs
              execute with zero randomness and complete isolation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="reset-simulator-btn"
            onClick={handleResetSimulator}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl border border-neutral-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State (Seed 42)
          </button>
        </div>
      </div>

      {/* Ground Truth Scenario Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Ground Truth Benchmark Scenarios
          </h2>
          <span className="text-xs text-neutral-500 font-mono">6 Golden Test Cases</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {scenarios.map((sc) => {
            const isSelected = sc.tag === selectedScenarioTag;
            return (
              <button
                key={sc.tag}
                onClick={() => handleScenarioChange(sc.tag)}
                className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-900 border-emerald-500 ring-1 ring-emerald-500 shadow-md text-white'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {sc.tag.replace('GT_', '')}
                  </span>
                  <p className="text-xs font-semibold mt-2 line-clamp-1">
                    {sc.caseDetails?.customer?.name || 'Customer'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-200/50 flex items-center justify-between text-[11px]">
                  <span className="font-mono font-medium text-emerald-600">
                    ₹{(sc.caseDetails?.case?.revenue_at_risk || 0).toLocaleString()}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      sc.caseDetails?.case?.status === 'RECOVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sc.caseDetails?.case?.status === 'ESCALATED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {sc.caseDetails?.case?.status || 'OPEN'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Columns): Target Case & Action Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Case Context Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-neutral-800">Target Recovery Case</span>
                {caseDetails?.case?.scenario_tag && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono font-medium">
                    {caseDetails.case.scenario_tag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    caseDetails?.case?.status === 'RECOVERED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : caseDetails?.case?.status === 'ESCALATED'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : caseDetails?.case?.status === 'CLOSED'
                      ? 'bg-neutral-200 text-neutral-800'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {caseDetails?.case?.status || 'UNKNOWN'}
                </span>
              </div>
            </div>

            {/* Customer & Source Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs">
              <div>
                <span className="text-neutral-500 block">Customer</span>
                <span className="font-semibold text-neutral-900">{caseDetails?.customer?.name || 'N/A'}</span>
                <span className="text-[10px] text-neutral-500 block">({caseDetails?.customer?.segment})</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Revenue at Risk</span>
                <span className="font-bold text-neutral-900 text-sm">
                  ₹{(caseDetails?.case?.revenue_at_risk || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Source</span>
                <span className="font-semibold text-neutral-900">{caseDetails?.case?.source_type}</span>
                <span className="text-[10px] text-neutral-500 block">
                  {caseDetails?.case?.source_type === 'PAYMENT'
                    ? (caseDetails?.sourceDetails as any)?.failure_reason || 'failure'
                    : 'event'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Current Strategy</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {caseDetails?.case?.current_strategy || 'NONE'}
                </span>
              </div>
            </div>

            {/* Benchmark Expectation Banner */}
            {activeScenario && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Scenario Objective: </span>
                    {activeScenario.description}
                    <div className="mt-1 font-mono text-[11px] text-amber-800">
                      <span className="font-semibold">Expected Action:</span> {activeScenario.expectedStrategy}
                    </div>
                  </div>
                </div>

                <button
                  id="run-deterministic-workflow-btn"
                  onClick={handleRunDeterministicEngine}
                  disabled={executingAction !== null}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-sm transition shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Deterministic Workflow</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Control Deck */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-neutral-900">Recovery Action Controls (7 Tools)</h3>
              </div>
              <span className="text-xs text-neutral-500 font-mono">Simulated Execution Mode</span>
            </div>

            <div className="space-y-4">
              {/* Action 1: Retry Payment */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-neutral-900">retry_payment(payment_id)</span>
                    <p className="text-xs text-neutral-500">
                      Executes deterministic payment retry attempt against banking gateway simulation.
                    </p>
                  </div>
                </div>
                <button
                  id="action-retry-payment-btn"
                  onClick={handleRetryPayment}
                  disabled={executingAction !== null}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                >
                  {executingAction === 'retry_payment' ? 'Simulating...' : 'Execute Retry'}
                </button>
              </div>

              {/* Action 2: Schedule Payment Retry */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-neutral-900">
                        schedule_payment_retry(payment_id, time)
                      </span>
                      <p className="text-xs text-neutral-500">
                        Queues an automated retry for optimal banking settlement window.
                      </p>
                    </div>
                  </div>
                  <button
                    id="action-schedule-retry-btn"
                    onClick={handleScheduleRetry}
                    disabled={executingAction !== null}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                  >
                    {executingAction === 'schedule_payment_retry' ? 'Scheduling...' : 'Schedule (+24h)'}
                  </button>
                </div>
              </div>

              {/* Action 3: Generate Payment Link */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                      <Link className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-neutral-900">
                        generate_payment_link(customer_id, amount)
                      </span>
                      <p className="text-xs text-neutral-500">
                        Generates a simulated direct checkout payment link (plink_sim_...).
                      </p>
                    </div>
                  </div>
                  <button
                    id="action-payment-link-btn"
                    onClick={handleGeneratePaymentLink}
                    disabled={executingAction !== null}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                  >
                    {executingAction === 'generate_payment_link' ? 'Generating...' : 'Generate Link'}
                  </button>
                </div>
              </div>

              {/* Action 4: Send Customer Notification */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-neutral-900">
                        send_customer_notification(customer_id, message, channel)
                      </span>
                      <p className="text-xs text-neutral-500">
                        Dispatches payment reminder notification via preferred channel.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={notifChannel}
                    onChange={(e: any) => setNotifChannel(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white font-mono"
                  >
                    <option value="EMAIL">EMAIL</option>
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <input
                    type="text"
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Reminder message..."
                    className="text-xs px-3 py-1.5 rounded-lg border border-neutral-300 bg-white flex-1"
                  />
                  <button
                    id="action-send-notif-btn"
                    onClick={handleSendNotification}
                    disabled={executingAction !== null}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                  >
                    {executingAction === 'send_customer_notification' ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>

              {/* Action 5: Request Payment Method Update */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-neutral-900">
                      request_payment_method_update(customer_id)
                    </span>
                    <p className="text-xs text-neutral-500">
                      Dispatches secure card update link & unlocks subsequent successful retry.
                    </p>
                  </div>
                </div>
                <button
                  id="action-update-method-btn"
                  onClick={handleRequestPaymentMethodUpdate}
                  disabled={executingAction !== null}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                >
                  {executingAction === 'request_payment_method_update' ? 'Requesting...' : 'Request Update'}
                </button>
              </div>

              {/* Action 6: Escalate to Human */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-neutral-900">
                      escalate_to_human(case_id, reason)
                    </span>
                    <p className="text-xs text-neutral-500">
                      Transfers high-value or complex case to account executive review queue.
                    </p>
                  </div>
                </div>
                <button
                  id="action-escalate-btn"
                  onClick={handleEscalateToHuman}
                  disabled={executingAction !== null}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                >
                  {executingAction === 'escalate_to_human' ? 'Escalating...' : 'Escalate'}
                </button>
              </div>

              {/* Action 7: Stop Recovery */}
              <div className="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 transition bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-neutral-900">stop_recovery(case_id, reason)</span>
                    <p className="text-xs text-neutral-500">
                      Terminates recovery operations when retries are exhausted or customer requests stop.
                    </p>
                  </div>
                </div>
                <button
                  id="action-stop-btn"
                  onClick={handleStopRecovery}
                  disabled={executingAction !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition shrink-0 disabled:opacity-50"
                >
                  {executingAction === 'stop_recovery' ? 'Stopping...' : 'Stop Recovery'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 Columns): Results, Verifications & Inspection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'actions' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Action Results & Verification
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'registry' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Simulated Registry ({simLinks.length + simNotifs.length + simSchedules.length})
            </button>
          </div>

          {activeTab === 'actions' ? (
            <>
              {/* Last Action Output Panel */}
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 shadow-lg text-white space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      Simulated Response Payload
                    </span>
                  </div>
                  {lastActionResult?.simulated && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                      simulated: true
                    </span>
                  )}
                </div>

                {lastActionResult ? (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded-xl text-xs font-mono ${
                        lastActionResult.status === 'success' ||
                        lastActionResult.status === 'scheduled' ||
                        lastActionResult.status === 'sent' ||
                        lastActionResult.status === 'requested' ||
                        lastActionResult.status === 'escalated' ||
                        lastActionResult.status === 'stopped'
                          ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-800/40'
                          : 'bg-red-950/40 text-red-200 border border-red-800/40'
                      }`}
                    >
                      <div className="font-bold mb-1">
                        ACTION: {lastActionResult.action || 'FAILED'} | STATUS: {lastActionResult.status?.toUpperCase() || 'ERROR'}
                      </div>
                      <div>{lastActionResult.message || lastActionResult.error}</div>
                      {lastActionResult.amount_recovered > 0 && (
                        <div className="mt-1 text-emerald-300 font-bold">
                          Amount Recovered: ₹{lastActionResult.amount_recovered.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <pre className="text-[11px] font-mono bg-neutral-950 p-3 rounded-xl overflow-x-auto text-neutral-300 border border-neutral-800 max-h-56">
                      {JSON.stringify(lastActionResult, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="py-8 text-center text-neutral-500 text-xs">
                    Trigger an action on the left to view the live simulator output payload.
                  </div>
                )}
              </div>

              {/* Verification Tools Panel */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-neutral-900">Verification Tools</h4>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">State Assertions</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="verify-payment-btn"
                    onClick={handleVerifyPayment}
                    className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 text-left transition bg-neutral-50 hover:bg-white"
                  >
                    <span className="text-xs font-bold block text-neutral-900">check_payment_status</span>
                    <span className="text-[11px] text-neutral-500">Assert gateway payment record</span>
                  </button>

                  <button
                    id="verify-recovery-btn"
                    onClick={handleVerifyRecovery}
                    className="p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 text-left transition bg-neutral-50 hover:bg-white"
                  >
                    <span className="text-xs font-bold block text-neutral-900">check_recovery_status</span>
                    <span className="text-[11px] text-neutral-500">Assert case & recovered total</span>
                  </button>
                </div>

                {verificationResult && (
                  <div className="p-3 bg-neutral-900 text-white rounded-xl text-xs font-mono border border-neutral-800">
                    <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Verification Result ({verificationResult.type})
                    </div>
                    <pre className="text-[11px] overflow-x-auto text-neutral-300">
                      {JSON.stringify(verificationResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Case Action History & Audit Log */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-700" />
                    <h4 className="text-sm font-bold text-neutral-900">Case Audit Trail ({caseDetails?.auditLogs?.length || 0})</h4>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {caseDetails?.auditLogs && caseDetails.auditLogs.length > 0 ? (
                    caseDetails.auditLogs.map((log) => (
                      <div key={log.log_id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-neutral-800">{log.tool_name}</span>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 mt-1">
                          Step: <span className="font-medium text-neutral-800">{log.agent_step}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-500">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700 font-mono">
                            Policy: {(log.policy_result as any)?.status || 'NOT_EVALUATED'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-neutral-400 text-xs">No audit logs recorded yet.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Registry Tab */
            <div className="space-y-4">
              {/* Payment Links */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <Link className="w-3.5 h-3.5 text-purple-600" />
                  Active Payment Links ({simLinks.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {simLinks.length > 0 ? (
                    simLinks.map((link) => (
                      <div key={link.link_id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-purple-700">{link.link_id}</span>
                          <span className="font-bold text-neutral-900">₹{link.amount.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate mt-1">{link.payment_url}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-400 text-center py-3">No payment links generated.</div>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  Dispatched Notifications ({simNotifs.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {simNotifs.length > 0 ? (
                    simNotifs.map((n) => (
                      <div key={n.notification_id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-700 font-mono text-[11px]">{n.channel}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(n.sent_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-700 mt-1">{n.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-400 text-center py-3">No notifications dispatched.</div>
                  )}
                </div>
              </div>

              {/* Scheduled Retries */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Scheduled Retries ({simSchedules.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                  {simSchedules.length > 0 ? (
                    simSchedules.map((s) => (
                      <div key={s.schedule_id} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-blue-700">{s.schedule_id}</span>
                          <span className="text-emerald-600 font-bold">{s.status}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-1">
                          For: {new Date(s.scheduled_for).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-neutral-400 text-center py-3">No scheduled retries.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
