/**
 * @license
 * REVIVE — Centralized Policy & Guardrail Configuration
 * Phase 6 — Policy Engine & Guardrails
 *
 * Centralizes all policy thresholds and versioning constants.
 * All values default safely and can be configured via environment variables.
 */

export interface PolicyConfig {
  MAX_PAYMENT_RETRIES: number;
  MAX_ACTIONS_PER_CASE: number;
  HIGH_VALUE_THRESHOLD: number;
  AI_CONFIDENCE_THRESHOLD: number;
  MAX_CUSTOMER_CONTACTS: number;
  RECOVERY_WINDOW_DAYS: number;
  POLICY_VERSION: string;
}

export function getPolicyConfig(): PolicyConfig {
  return {
    MAX_PAYMENT_RETRIES: parseInt(process.env.MAX_PAYMENT_RETRIES || '2', 10),
    MAX_ACTIONS_PER_CASE: parseInt(process.env.MAX_ACTIONS_PER_CASE || '3', 10),
    HIGH_VALUE_THRESHOLD: parseFloat(process.env.HIGH_VALUE_THRESHOLD || '25000'),
    AI_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.70'),
    MAX_CUSTOMER_CONTACTS: parseInt(process.env.MAX_CUSTOMER_CONTACTS || '2', 10),
    RECOVERY_WINDOW_DAYS: parseInt(process.env.RECOVERY_WINDOW_DAYS || '7', 10),
    POLICY_VERSION: process.env.POLICY_VERSION || 'REVIVE_POLICY_V1',
  };
}

export const policyConfig = getPolicyConfig();
