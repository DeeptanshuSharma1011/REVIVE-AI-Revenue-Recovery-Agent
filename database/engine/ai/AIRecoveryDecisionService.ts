/**
 * @license
 * REVIVE — AI Recovery Decision Service
 * Phase 4 — AI Decision Engine (Bounded Autonomy Architecture)
 *
 * Implements Gemini-powered bounded reasoning for revenue recovery strategies.
 * Server-side only. Acts as an advisory decision intelligence layer.
 * Enforces strict input schema, strict output validation, confidence thresholding,
 * and safe deterministic fallback.
 */

import { GoogleGenAI } from '@google/genai';
import {
  InvestigationContext,
  DiagnosisResult,
  StrategyDecision,
  AIDecisionOutput,
  CaseStrategy,
  RiskLevel,
} from '../types';
import { deterministicStrategyProvider } from './DeterministicStrategyProvider';

export const PROMPT_VERSION = process.env.PROMPT_VERSION || 'REVIVE_DECISION_V1';
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
export const DEFAULT_CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.70');

const ALLOWED_STRATEGIES: CaseStrategy[] = [
  'RETRY_PAYMENT',
  'SCHEDULE_RETRY',
  'PAYMENT_LINK',
  'PAYMENT_METHOD_UPDATE',
  'CUSTOMER_NOTIFICATION',
  'ESCALATE',
  'STOP',
];

const ALLOWED_RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export class AIRecoveryDecisionService {
  private client: GoogleGenAI | null = null;
  private apiKey: string | undefined;
  private modelName: string;
  private confidenceThreshold: number;

  // In-memory decision cache to prevent redundant LLM invocations
  private decisionCache: Map<string, { decision: StrategyDecision; expiresAt: number }> = new Map();
  // Quota rate-limit cooldown timestamp (ms)
  private quotaCooldownUntil: number = 0;
  private lastRequestTimestamp: number = 0;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    confidenceThreshold?: number;
  }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = options?.model || DEFAULT_GEMINI_MODEL;
    this.confidenceThreshold = options?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  }

  /**
   * Clears the cached decisions (useful for tests or database resets).
   */
  public clearCache(): void {
    this.decisionCache.clear();
    this.quotaCooldownUntil = 0;
  }

  /**
   * Lazily initializes GoogleGenAI client with required headers.
   */
  private getClient(): GoogleGenAI | null {
    if (this.client) return this.client;
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) return null;

    try {
      this.client = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      return this.client;
    } catch (err) {
      console.warn('[REVIVE:AI] Failed to initialize GoogleGenAI client:', err);
      return null;
    }
  }

  /**
   * Returns current service configuration and availability.
   */
  public getStatus() {
    const hasKey = Boolean(this.apiKey || process.env.GEMINI_API_KEY);
    const isCooldown = Date.now() < this.quotaCooldownUntil;
    return {
      available: hasKey,
      model: this.modelName,
      confidence_threshold: this.confidenceThreshold,
      prompt_version: PROMPT_VERSION,
      has_api_key: hasKey,
      quota_throttled: isCooldown,
      cache_size: this.decisionCache.size,
    };
  }

  /**
   * Generates a deterministic cache key from the investigation and diagnosis state.
   */
  private getCacheKey(context: InvestigationContext, diagnosis: DiagnosisResult): string {
    const attempt = context.attempt_number ?? (context.source as any)?.attempt_number ?? 1;
    const failureReason = (context.source as any)?.failure_reason || 'none';
    return `${context.case_id}::${context.source_type}::${diagnosis.diagnosis}::${attempt}::${failureReason}::${this.modelName}`;
  }

  /**
   * Builds compact, sanitized context object for LLM inference.
   * Strips PII and raw infrastructure secrets.
   */
  public buildPromptContext(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): Record<string, unknown> {
    return {
      case: {
        case_id: context.case_id,
        source_type: context.source_type,
        revenue_at_risk_inr: context.revenue_at_risk,
        priority: context.case.priority,
        current_status: context.case.status,
        scenario_tag: context.case.scenario_tag || null,
      },
      customer: {
        segment: context.customer_segment,
        lifetime_value_inr: context.lifetime_value,
        preferred_channel: context.preferred_channel,
        past_successful_payments: context.successful_past_payments_count,
        past_failed_payments: context.failed_past_payments_count,
        past_paid_invoices: context.successful_past_invoices_count,
      },
      source_details: {
        failure_reason: (context.source as any)?.failure_reason || null,
        attempt_number: context.attempt_number ?? (context.source as any)?.attempt_number ?? 1,
        payment_method: (context.source as any)?.payment_method || null,
        days_overdue: context.days_overdue ?? (context.source as any)?.days_overdue ?? 0,
        cart_value_inr: context.cart_value ?? (context.source as any)?.cart_value ?? null,
        checkout_event: (context.source as any)?.event_type || null,
      },
      prior_actions_count: context.previous_actions.length,
      recent_action_types: context.previous_actions.map((a) => a.action_type),
      diagnosis: {
        diagnosis_code: diagnosis.diagnosis,
        summary: diagnosis.summary,
        confidence: diagnosis.confidence,
      },
    };
  }

  /**
   * Generates the system prompt and instructions for the Gemini decision engine.
   */
  private getSystemInstruction(): string {
    return `You are REVIVE Decision Intelligence, a bounded AI reasoning layer for autonomous revenue recovery.
Your mission is to analyze customer context, revenue risk, and diagnostic signals to propose the single optimal recovery strategy.

BOUNDED RECOVERY RULES & CONSTRAINTS:
1. Propose action ONLY. You do not execute transactions or database updates.
2. Select exactly ONE strategy from:
   - RETRY_PAYMENT: For temporary payment failures (e.g. timeout, network glitch) on reliable accounts with 0 previous retries.
   - SCHEDULE_RETRY: For anticipated fund availability or off-peak optimal retry windows.
   - PAYMENT_LINK: For high-intent abandoned checkouts or direct invoice links.
   - PAYMENT_METHOD_UPDATE: When payment method is expired, invalid, or repeatedly failed (never blindly retry expired cards).
   - CUSTOMER_NOTIFICATION: For overdue invoices or friendly reminders for loyal/good customers during grace period.
   - ESCALATE: For high-value enterprise cases (> ₹25,000 threshold), complex contract disputes, or when uncertain.
   - STOP: When max retries (>= 3) exceeded, customer churned, case already recovered, or recovery is unviable.
3. High-Value Escalation Rule: Any invoice or risk exceeding ₹25,000 MUST be ESCALATED for high-touch human handling.
4. Expired Card Rule: Never recommend RETRY_PAYMENT for expired payment cards; recommend PAYMENT_METHOD_UPDATE.
5. High-Intent Abandonment: For checkout drop after payment page reach, recommend PAYMENT_LINK.
6. Provide a concise, clear business reason (< 300 characters) and operational explanation (< 600 characters).
7. Assign confidence (0.0 to 1.0) and risk_level (LOW, MEDIUM, HIGH).

OUTPUT FORMAT:
Respond with ONLY valid JSON matching this schema:
{
  "strategy": "RETRY_PAYMENT" | "SCHEDULE_RETRY" | "PAYMENT_LINK" | "PAYMENT_METHOD_UPDATE" | "CUSTOMER_NOTIFICATION" | "ESCALATE" | "STOP",
  "confidence": number (between 0.0 and 1.0),
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "reason": string (concise business justification, max 300 chars),
  "explanation": string (step-by-step rationale for operators, max 600 chars),
  "suggested_parameters": {
    "scheduled_delay_hours": number | null,
    "message_channel": "EMAIL" | "SMS" | "WHATSAPP" | null,
    "custom_message": string | null
  },
  "requires_human_review": boolean,
  "missing_information": string[]
}`;
  }

  /**
   * Strict validation of AI response according to REVIVE bounded autonomy rules.
   */
  public validateDecisionOutput(rawOutput: unknown): {
    valid: boolean;
    data?: AIDecisionOutput;
    error?: string;
  } {
    if (!rawOutput || typeof rawOutput !== 'object') {
      return { valid: false, error: 'Output must be a non-null object' };
    }

    const obj = rawOutput as Record<string, unknown>;

    // 1. Validate Strategy enum
    if (typeof obj.strategy !== 'string' || !ALLOWED_STRATEGIES.includes(obj.strategy as CaseStrategy)) {
      return {
        valid: false,
        error: `Invalid or missing strategy: ${String(obj.strategy)}. Allowed: ${ALLOWED_STRATEGIES.join(', ')}`,
      };
    }

    // 2. Validate Confidence range
    if (typeof obj.confidence !== 'number' || Number.isNaN(obj.confidence) || obj.confidence < 0.0 || obj.confidence > 1.0) {
      return {
        valid: false,
        error: `Confidence must be a number between 0.0 and 1.0. Received: ${obj.confidence}`,
      };
    }

    // 3. Validate Risk Level
    if (typeof obj.risk_level !== 'string' || !ALLOWED_RISK_LEVELS.includes(obj.risk_level as RiskLevel)) {
      return {
        valid: false,
        error: `Invalid risk_level: ${String(obj.risk_level)}. Allowed: ${ALLOWED_RISK_LEVELS.join(', ')}`,
      };
    }

    // 4. Validate Reason & Explanation strings
    if (typeof obj.reason !== 'string' || obj.reason.trim().length === 0) {
      return { valid: false, error: 'reason must be a non-empty string' };
    }

    if (typeof obj.explanation !== 'string' || obj.explanation.trim().length === 0) {
      return { valid: false, error: 'explanation must be a non-empty string' };
    }

    // 5. Validate Missing Information array
    const missingInfo = Array.isArray(obj.missing_information)
      ? obj.missing_information.map(String)
      : [];

    // 6. Validate requires_human_review boolean
    const humanReview = typeof obj.requires_human_review === 'boolean'
      ? obj.requires_human_review
      : obj.confidence < this.confidenceThreshold || obj.risk_level === 'HIGH';

    return {
      valid: true,
      data: {
        strategy: obj.strategy as CaseStrategy,
        confidence: Number(obj.confidence.toFixed(2)),
        risk_level: obj.risk_level as RiskLevel,
        reason: obj.reason.trim().slice(0, 300),
        explanation: obj.explanation.trim().slice(0, 600),
        suggested_parameters: obj.suggested_parameters as any,
        requires_human_review: humanReview,
        missing_information: missingInfo,
      },
    };
  }

  /**
   * Evaluates recovery case through Gemini with strict bounded validation and deterministic fallback.
   */
  public async evaluateCase(
    context: InvestigationContext,
    diagnosis: DiagnosisResult
  ): Promise<StrategyDecision> {
    const cacheKey = this.getCacheKey(context, diagnosis);

    // 1. Check in-memory decision cache
    const cached = this.decisionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.decision,
        decision_source: 'GEMINI',
      };
    }

    const client = this.getClient();
    const promptContext = this.buildPromptContext(context, diagnosis);

    // 2. Fallback if API key missing or client initialization failed
    if (!client) {
      console.warn('[REVIVE:AI] Gemini API key not configured. Executing deterministic fallback.');
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: 'GEMINI_API_KEY_NOT_CONFIGURED',
        validation_passed: true,
      };
    }

    // 3. Check if we are currently in quota cooldown
    if (Date.now() < this.quotaCooldownUntil) {
      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: 'GEMINI_RATE_LIMIT_COOLDOWN',
        validation_passed: true,
      };
    }

    try {
      // 4. Query Gemini with structured output enforcement
      const promptText = `PROMPT_VERSION: ${PROMPT_VERSION}\nCASE INVESTIGATION DATA:\n${JSON.stringify(
        promptContext,
        null,
        2
      )}\n\nAnalyze this revenue risk case and return the recommended recovery strategy JSON object:`;

      this.lastRequestTimestamp = Date.now();

      const response = await client.models.generateContent({
        model: this.modelName,
        contents: promptText,
        config: {
          systemInstruction: this.getSystemInstruction(),
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '';

      // 5. Parse JSON
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('[REVIVE:AI] Gemini JSON parse error:', parseErr, 'Raw output:', responseText);
        const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
        return {
          ...fallback,
          decision_source: 'DETERMINISTIC_FALLBACK',
          fallback_reason: 'AI_RESPONSE_JSON_MALFORMED',
          raw_model_response: responseText.slice(0, 200),
          validation_passed: false,
        };
      }

      // 6. Validate output schema & domain constraints
      const validation = this.validateDecisionOutput(parsedJson);
      if (!validation.valid || !validation.data) {
        console.warn('[REVIVE:AI] Output schema validation failed:', validation.error);
        const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
        return {
          ...fallback,
          decision_source: 'DETERMINISTIC_FALLBACK',
          fallback_reason: `AI_DECISION_INVALID: ${validation.error}`,
          raw_model_response: responseText.slice(0, 200),
          validation_passed: false,
        };
      }

      const decisionData = validation.data;

      // 7. Confidence Threshold Enforcement
      if (decisionData.confidence < this.confidenceThreshold) {
        console.info(
          `[REVIVE:AI] Low confidence (${decisionData.confidence} < ${this.confidenceThreshold}). Routing to human escalation.`
        );
        const escalateDecision: StrategyDecision = {
          strategy: 'ESCALATE',
          reason: `Confidence (${(decisionData.confidence * 100).toFixed(0)}%) below autonomous threshold (${(
            this.confidenceThreshold * 100
          ).toFixed(0)}%). Proposed: ${decisionData.strategy}.`,
          explanation: `REVIVE AI evaluated this case with confidence ${(decisionData.confidence * 100).toFixed(
            0
          )}%. Because confidence is below the safety threshold of ${(
            this.confidenceThreshold * 100
          ).toFixed(0)}%, autonomous execution is prohibited and the case is routed for human review. Rationale: ${decisionData.explanation}`,
          decision_source: 'GEMINI',
          confidence: decisionData.confidence,
          risk_level: 'HIGH',
          requires_human_review: true,
          model: this.modelName,
          prompt_version: PROMPT_VERSION,
          validation_passed: true,
        };

        // Cache for 30 minutes
        this.decisionCache.set(cacheKey, {
          decision: escalateDecision,
          expiresAt: Date.now() + 30 * 60 * 1000,
        });

        return escalateDecision;
      }

      // 8. Valid High-Confidence AI Decision
      const validDecision: StrategyDecision = {
        strategy: decisionData.strategy,
        reason: decisionData.reason,
        explanation: decisionData.explanation,
        parameters: decisionData.suggested_parameters,
        decision_source: 'GEMINI',
        confidence: decisionData.confidence,
        risk_level: decisionData.risk_level,
        requires_human_review: decisionData.requires_human_review,
        model: this.modelName,
        prompt_version: PROMPT_VERSION,
        validation_passed: true,
      };

      // Cache for 30 minutes
      this.decisionCache.set(cacheKey, {
        decision: validDecision,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });

      return validDecision;
    } catch (apiErr: any) {
      const errMsg = String(apiErr?.message || apiErr || '');
      const isQuotaError =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        apiErr?.status === 'RESOURCE_EXHAUSTED' ||
        apiErr?.code === 429;

      if (isQuotaError) {
        // Set cooldown for 25 seconds to protect the quota
        this.quotaCooldownUntil = Date.now() + 25000;
        console.warn(
          '[REVIVE:AI] Gemini free-tier rate limit reached (429). Activating zero-downtime deterministic fallback strategy.'
        );
      } else {
        console.warn('[REVIVE:AI] Gemini API invocation warning:', errMsg);
      }

      const fallback = deterministicStrategyProvider.selectStrategy(context, diagnosis);
      return {
        ...fallback,
        decision_source: 'DETERMINISTIC_FALLBACK',
        fallback_reason: isQuotaError ? 'GEMINI_RATE_LIMIT_COOLDOWN' : `GEMINI_API_FAILURE: ${errMsg}`,
        validation_passed: true,
      };
    }
  }
}

export const aiRecoveryDecisionService = new AIRecoveryDecisionService();
