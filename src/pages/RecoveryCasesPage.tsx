import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  RecoveryCase,
  RecoveryCaseDetails,
  CustomerFullProfile,
  RecoveryProcessResult,
  StrategyDecision,
  AIStatusResponse,
} from '../types';
import {
  FileText,
  Filter,
  Search,
  ChevronRight,
  AlertCircle,
  CreditCard,
  ShoppingCart,
  Receipt,
  User,
  X,
  CheckCircle,
  Play,
  RotateCw,
  Cpu,
  Bot,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export const RecoveryCasesPage: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<RecoveryCaseDetails | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerFullProfile | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Strategy Mode & AI Decision State
  const [strategyMode, setStrategyMode] = useState<'deterministic' | 'ai'>('ai');
  const [aiStatus, setAIStatus] = useState<AIStatusResponse | null>(null);
  const [previewDecision, setPreviewDecision] = useState<StrategyDecision | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  // Recovery Engine processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [processResult, setProcessResult] = useState<RecoveryProcessResult | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCases = () => {
    setLoading(true);
    apiService
      .getCases({
        limit: 100,
        sourceType: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      .then((res) => {
        setCases(res.items || []);
        setTotal(res.total || 0);
      })
      .catch((err) => console.error('Failed to load cases:', err))
      .finally(() => setLoading(false));
  };

  const fetchAIStatus = () => {
    apiService
      .getStrategyMode()
      .then((res) => {
        setStrategyMode(res.mode);
        if (res.aiStatus) setAIStatus(res.aiStatus);
      })
      .catch((err) => console.warn('Failed to fetch strategy mode:', err));
  };

  useEffect(() => {
    fetchCases();
    fetchAIStatus();
  }, [sourceFilter, priorityFilter, statusFilter]);

  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setLoadingDetails(true);
    setProcessResult(null);
    setProcessError(null);
    setActiveStepIndex(-1);
    setPreviewDecision(null);

    try {
      const details = await apiService.getCaseDetails(caseId);
      setCaseDetails(details);

      if (details.customer?.customer_id) {
        const profile = await apiService.getCustomerProfile(details.customer.customer_id);
        setCustomerProfile(profile);
      }

      // Preload AI / deterministic decision preview
      loadDecisionPreview(caseId, strategyMode);
    } catch (err) {
      console.error('Failed to fetch case details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadDecisionPreview = async (caseId: string, mode: 'deterministic' | 'ai') => {
    setLoadingDecision(true);
    try {
      const dec = await apiService.getRecoveryDecision(caseId, mode);
      setPreviewDecision(dec);
    } catch (err) {
      console.warn('Failed to fetch decision preview:', err);
    } finally {
      setLoadingDecision(false);
    }
  };

  const handleModeChange = async (newMode: 'deterministic' | 'ai') => {
    setStrategyMode(newMode);
    try {
      const res = await apiService.setStrategyMode(newMode);
      if (res.aiStatus) setAIStatus(res.aiStatus);
      if (selectedCaseId) {
        loadDecisionPreview(selectedCaseId, newMode);
      }
    } catch (err) {
      console.error('Failed to update strategy mode:', err);
    }
  };

  const handleProcessRecovery = async () => {
    if (!selectedCaseId) return;
    setIsProcessing(true);
    setProcessError(null);
    setProcessResult(null);

    // Progressive step animations for visual feedback
    const stepNames = ['DETECTED', 'INVESTIGATING', 'DIAGNOSING', 'STRATEGY', 'ACTION', 'VERIFY', 'OUTCOME'];
    for (let i = 0; i < stepNames.length - 1; i++) {
      setActiveStepIndex(i);
      await new Promise((resolve) => setTimeout(resolve, 140));
    }

    try {
      const result = await apiService.processRecoveryCase(selectedCaseId, strategyMode);
      setActiveStepIndex(stepNames.length - 1);
      setProcessResult(result);

      // Refresh case details and list
      const updatedDetails = await apiService.getCaseDetails(selectedCaseId);
      setCaseDetails(updatedDetails);
      fetchCases();
    } catch (err: any) {
      setProcessError(err.message || 'Execution error during recovery process.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.case_id.toLowerCase().includes(query) ||
      c.scenario_tag?.toLowerCase().includes(query) ||
      c.source_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100 font-mono">
              Recovery Cases Repository ({total.toLocaleString()})
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Bounded AI Decision Intelligence with Gemini 3.7 reasoning and strict deterministic safety boundaries.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search cases or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Strategy Engine Banner & Mode Selector */}
      <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Decision Intelligence Mode:</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => handleModeChange('ai')}
              className={`px-3 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 ${
                strategyMode === 'ai'
                  ? 'bg-purple-950/90 text-purple-200 font-bold border border-purple-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini AI (Bounded)</span>
            </button>
            <button
              onClick={() => handleModeChange('deterministic')}
              className={`px-3 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 ${
                strategyMode === 'deterministic'
                  ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Deterministic</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            Model: <strong className="text-purple-300">{aiStatus?.model || 'gemini-3.7-flash'}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            Confidence Threshold:{' '}
            <strong className="text-emerald-400">
              {((aiStatus?.confidence_threshold ?? 0.7) * 100).toFixed(0)}%
            </strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            Prompt:{' '}
            <strong className="text-slate-300">{aiStatus?.prompt_version || 'REVIVE_DECISION_V1'}</strong>
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-slate-600"
        >
          <option value="ALL">Source: All</option>
          <option value="PAYMENT">Payment</option>
          <option value="CHECKOUT">Checkout</option>
          <option value="INVOICE">Invoice</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-slate-600"
        >
          <option value="ALL">Priority: All</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none focus:border-slate-600"
        >
          <option value="ALL">Status: All</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="ACTION_PENDING">Action Pending</option>
          <option value="RECOVERED">Recovered</option>
          <option value="ESCALATED">Escalated</option>
          <option value="CLOSED">Closed</option>
        </select>

        <button
          onClick={fetchCases}
          className="ml-auto px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
        >
          Refresh List
        </button>
      </div>

      {/* Main Grid: Cases List & Deep Details / Processing Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cases List */}
        <div className={selectedCaseId ? 'lg:col-span-6 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Case / Scenario Tag</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">At Risk</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Loading recovery cases...
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No recovery cases found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => {
                      const isSelected = c.case_id === selectedCaseId;
                      return (
                        <tr
                          key={c.case_id}
                          onClick={() => handleSelectCase(c.case_id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-800/80 text-slate-100'
                              : 'hover:bg-slate-900/60 text-slate-300'
                          }`}
                        >
                          <td className="px-4 py-3 font-semibold">
                            <div className="flex items-center gap-1.5">
                              {c.scenario_tag ? (
                                <span className="text-emerald-400 font-bold">{c.scenario_tag}</span>
                              ) : (
                                <span>{c.case_id.slice(0, 8)}...</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {c.source_type === 'PAYMENT' && <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                              {c.source_type === 'CHECKOUT' && <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />}
                              {c.source_type === 'INVOICE' && <Receipt className="w-3.5 h-3.5 text-amber-400" />}
                              <span>{c.source_type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.priority === 'CRITICAL'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                                  : c.priority === 'HIGH'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                  : 'bg-slate-950 text-slate-400 border border-slate-800'
                              }`}
                            >
                              {c.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-200">
                            ₹{c.revenue_at_risk.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                c.status === 'RECOVERED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                                  : c.status === 'ESCALATED'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                                  : c.status === 'CLOSED'
                                  ? 'bg-slate-900 text-slate-400 border border-slate-700'
                                  : 'bg-slate-950 text-amber-300 border border-amber-800/80'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="w-4 h-4 inline-block text-slate-500" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Case Deep Details & Recovery Decision Panel */}
        {selectedCaseId && (
          <div className="lg:col-span-6 space-y-4">
            {loadingDetails || !caseDetails ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl">
                Loading case intelligence...
              </div>
            ) : (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5 font-mono text-xs">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">
                        {caseDetails.case.scenario_tag || `Case: ${caseDetails.case.case_id.slice(0, 13)}`}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-700 text-slate-300">
                        {caseDetails.case.source_type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Created: {new Date(caseDetails.case.created_at).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedCaseId(null)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* AI Decision Intelligence Advisory Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {strategyMode === 'ai' ? (
                        <Bot className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Cpu className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                        {strategyMode === 'ai'
                          ? 'Gemini Bounded Reasoning'
                          : 'Deterministic Rule Engine'}
                      </span>
                    </div>

                    {previewDecision?.decision_source && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          previewDecision.decision_source === 'GEMINI'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : previewDecision.decision_source === 'DETERMINISTIC_FALLBACK'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        Source: {previewDecision.decision_source}
                      </span>
                    )}
                  </div>

                  {loadingDecision ? (
                    <div className="py-2 text-center text-slate-400 animate-pulse">
                      Analyzing case with {strategyMode === 'ai' ? 'Gemini 3.7' : 'Deterministic Rules'}...
                    </div>
                  ) : previewDecision ? (
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div className="space-y-0.5">
                          <span className="text-slate-400 text-[10px]">Proposed Strategy:</span>
                          <div className="font-bold text-emerald-400 text-xs">{previewDecision.strategy}</div>
                        </div>

                        {previewDecision.confidence !== undefined && (
                          <div className="text-right space-y-0.5">
                            <span className="text-slate-400 text-[10px]">Confidence:</span>
                            <div className="font-bold text-slate-200">
                              {(previewDecision.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}

                        {previewDecision.risk_level && (
                          <div className="text-right space-y-0.5">
                            <span className="text-slate-400 text-[10px]">Risk Level:</span>
                            <div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  previewDecision.risk_level === 'HIGH'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                    : previewDecision.risk_level === 'MEDIUM'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {previewDecision.risk_level}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-slate-400 font-semibold">Reasoning: </span>
                        {previewDecision.reason}
                      </div>

                      {previewDecision.explanation && (
                        <div className="text-slate-400 text-[10px] bg-slate-900/20 p-2 rounded border border-slate-800/40 leading-relaxed">
                          <span className="text-slate-500 font-semibold">Operator Explanation: </span>
                          {previewDecision.explanation}
                        </div>
                      )}

                      {previewDecision.requires_human_review && (
                        <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-900/60 text-[10px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Flagged for Human Review (Confidence &lt; 70% or High Risk).</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <button
                      onClick={handleProcessRecovery}
                      disabled={isProcessing}
                      className={`w-full py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                        caseDetails.case.status === 'RECOVERED'
                          ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40'
                          : strategyMode === 'ai'
                          ? 'bg-purple-600 hover:bg-purple-500 text-slate-100 shadow-lg shadow-purple-600/20'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Executing Recovery Pipeline...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>
                            {caseDetails.case.status === 'RECOVERED'
                              ? 'Re-evaluate Recovery Case'
                              : `Execute Recovery (${strategyMode === 'ai' ? 'Gemini AI Mode' : 'Deterministic Mode'})`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Progressive Lifecycle Steps Animation */}
                  {isProcessing && (
                    <div className="pt-2">
                      <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-bold">
                        {['DETECT', 'INVESTIGATE', 'DIAGNOSE', 'AI_STRATEGY', 'EXECUTE', 'VERIFY', 'OUTCOME'].map(
                          (step, idx) => (
                            <div
                              key={step}
                              className={`p-1.5 rounded border transition-all ${
                                idx === activeStepIndex
                                  ? 'bg-purple-500 text-slate-950 border-purple-400 animate-pulse'
                                  : idx < activeStepIndex
                                  ? 'bg-slate-900 text-purple-400 border-purple-800'
                                  : 'bg-slate-950 text-slate-600 border-slate-800'
                              }`}
                            >
                              {step}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Processing Result Banner */}
                  {processResult && (
                    <div
                      className={`p-3 rounded-lg border text-[11px] space-y-1.5 ${
                        processResult.status === 'RECOVERED'
                          ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                          : processResult.status === 'ESCALATED'
                          ? 'bg-rose-950/70 border-rose-700 text-rose-200'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>
                            {processResult.status === 'RECOVERED'
                              ? '✓ RECOVERY RESOLVED'
                              : `Status: ${processResult.status}`}
                          </span>
                        </div>
                        {processResult.amount_recovered > 0 && (
                          <span className="font-bold text-emerald-400">
                            ₹{processResult.amount_recovered.toLocaleString()} recovered
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300">{processResult.summary}</p>
                      {processResult.decision_explanation && (
                        <p className="text-slate-400 text-[10px] border-t border-slate-800/80 pt-1 mt-1">
                          Rationale: {processResult.decision_explanation}
                        </p>
                      )}
                    </div>
                  )}

                  {processError && (
                    <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px]">
                      {processError}
                    </div>
                  )}
                </div>

                {/* Domain Question 1: Who is this customer? */}
                <div className="space-y-2">
                  <div className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Domain Answer: Who is this customer?</span>
                  </div>
                  {caseDetails.customer ? (
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-100 font-semibold">{caseDetails.customer.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 text-slate-300">
                          {caseDetails.customer.segment}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
                        <div>Email: {caseDetails.customer.email}</div>
                        <div>Phone: {caseDetails.customer.phone}</div>
                        <div>Preferred Channel: {caseDetails.customer.preferred_channel}</div>
                        <div>Lifetime Value: ₹{caseDetails.customer.lifetime_value.toLocaleString()}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500">Customer record not found.</div>
                  )}
                </div>

                {/* Domain Question 2: Why did their payment fail / What occurred? */}
                <div className="space-y-2">
                  <div className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Domain Answer: Root Cause / Source Event</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="text-slate-200">
                      Revenue at Risk:{' '}
                      <span className="font-bold text-emerald-400">
                        ₹{caseDetails.case.revenue_at_risk.toLocaleString()}
                      </span>
                    </div>
                    {caseDetails.sourceDetails && 'failure_reason' in caseDetails.sourceDetails && (
                      <div className="text-slate-300">
                        Failure Reason:{' '}
                        <span className="text-rose-400 font-semibold">
                          {caseDetails.sourceDetails.failure_reason || 'N/A'}
                        </span>{' '}
                        (Attempt #{caseDetails.sourceDetails.attempt_number})
                      </div>
                    )}
                    {caseDetails.sourceDetails && 'event_type' in caseDetails.sourceDetails && (
                      <div className="text-slate-300">
                        Checkout Funnel Event:{' '}
                        <span className="text-purple-400 font-semibold">
                          {caseDetails.sourceDetails.event_type}
                        </span>
                      </div>
                    )}
                    {caseDetails.sourceDetails && 'days_overdue' in caseDetails.sourceDetails && (
                      <div className="text-slate-300">
                        Invoice Status:{' '}
                        <span className="text-amber-400 font-semibold">
                          {caseDetails.sourceDetails.status}
                        </span>{' '}
                        ({caseDetails.sourceDetails.days_overdue} days overdue)
                      </div>
                    )}
                  </div>
                </div>

                {/* Domain Question 3: Subscriptions & Payment History */}
                {customerProfile && (
                  <div className="space-y-2">
                    <div className="text-slate-400 uppercase text-[10px] tracking-wider">
                      Subscriptions & Payment History Summary
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div>Active Subscriptions: {customerProfile.metrics.activeSubscriptionCount}</div>
                      <div>Total Revenue Paid: ₹{customerProfile.metrics.totalRevenuePaid.toLocaleString()}</div>
                      <div>Failed Payments: {customerProfile.metrics.failedPaymentCount}</div>
                      <div>Risk Score: {customerProfile.metrics.riskScore} / 100</div>
                    </div>
                  </div>
                )}

                {/* Prior Actions & Audit Trail */}
                <div className="space-y-2">
                  <div className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center justify-between">
                    <span>Audit Trail & Interventions ({caseDetails.actions.length})</span>
                  </div>
                  {caseDetails.actions.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-500 text-center">
                      No actions executed yet. Click &quot;Execute Recovery&quot; above to run the decision engine.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {caseDetails.actions.map((a) => (
                        <div
                          key={a.action_id}
                          className="p-2.5 rounded bg-slate-950/80 border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-400">{a.action_type}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(a.executed_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{a.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
