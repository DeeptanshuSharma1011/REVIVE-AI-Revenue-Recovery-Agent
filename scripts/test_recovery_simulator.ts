/**
 * @license
 * REVIVE — Phase 2 Recovery Simulator Test Suite
 * Validates deterministic execution of all 7 recovery actions, state changes,
 * audit logging, and Ground Truth benchmarks.
 */

import { db } from '../database/db';
import { recoverySimulator } from '../database/simulator/recoverySimulator';
import { recoveryActionRepository } from '../database/repositories/RecoveryActionRepository';
import { auditRepository } from '../database/repositories/AuditRepository';
import { resetUpdatedPaymentMethods } from '../database/simulator/outcomes';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: any) {
  if (condition) {
    results.push({ suite, test, passed: true, details });
    console.log(`  ✓ [${suite}] ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: 'Assertion failed', details });
    console.error(`  ✗ [${suite}] ${test}: Assertion failed`, details);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('REVIVE PHASE 2 — RECOVERY SIMULATOR VERIFICATION');
  console.log('====================================================\n');

  // Reset database & simulator state
  db.seed(42);
  resetUpdatedPaymentMethods();

  const gt = db.groundTruthMetadata;

  // -----------------------------------------------------------------
  // SUITE 1: ACTION 1 — RETRY PAYMENT (GT_SUCCESSFUL_RETRY)
  // -----------------------------------------------------------------
  console.log('Suite 1: Retry Payment & State Transitions...');
  const gt1Case = db.recoveryCases.get(gt['GT_SUCCESSFUL_RETRY'].caseId)!;
  const gt1Payment = db.payments.get(gt1Case.source_id)!;

  assert(gt1Payment.status === 'FAILED', 'Retry Payment', 'Initial payment status is FAILED');
  assert(gt1Case.status === 'OPEN', 'Retry Payment', 'Initial case status is OPEN');

  const retryRes = recoverySimulator.retryPayment(gt1Payment.payment_id, gt1Case.case_id);
  assert(retryRes.status === 'success', 'Retry Payment', 'Retry response status is success', retryRes);
  assert(retryRes.simulated === true, 'Retry Payment', 'Response has simulated: true flag');
  assert(retryRes.amount_recovered === 2499, 'Retry Payment', 'Amount recovered matches ₹2,499');

  const gt1PaymentAfter = db.payments.get(gt1Payment.payment_id)!;
  assert(gt1PaymentAfter.status === 'SUCCESS', 'Retry Payment', 'Payment status transitioned to SUCCESS in DB');

  const gt1CaseAfter = db.recoveryCases.get(gt1Case.case_id)!;
  assert(gt1CaseAfter.status === 'RECOVERED', 'Retry Payment', 'Case status transitioned to RECOVERED in DB');
  assert(gt1CaseAfter.resolved_at !== null, 'Retry Payment', 'Case resolved_at timestamp set');

  const actionsGt1 = recoveryActionRepository.findByCaseId(gt1Case.case_id);
  assert(actionsGt1.length > 0 && actionsGt1[actionsGt1.length - 1].action_type === 'RETRY_PAYMENT', 'Retry Payment', 'Recovery action logged in repository');

  const auditsGt1 = auditRepository.findByCaseId(gt1Case.case_id);
  assert(auditsGt1.length > 0 && auditsGt1[auditsGt1.length - 1].tool_name === 'retry_payment', 'Retry Payment', 'Audit log recorded with tool_name retry_payment');
  assert(auditsGt1[auditsGt1.length - 1].policy_result.status === 'NOT_EVALUATED', 'Retry Payment', 'Audit log policy_result is NOT_EVALUATED');

  // -----------------------------------------------------------------
  // SUITE 2: ACTION 2 — SCHEDULE PAYMENT RETRY
  // -----------------------------------------------------------------
  console.log('\nSuite 2: Schedule Payment Retry...');
  const schedRes = recoverySimulator.schedulePaymentRetry(gt1Payment.payment_id, '2026-08-25T10:00:00Z', gt1Case.case_id);
  assert(schedRes.status === 'scheduled', 'Schedule Retry', 'Schedule response status is scheduled', schedRes);
  assert(schedRes.simulated === true, 'Schedule Retry', 'Schedule response has simulated: true');
  assert(recoverySimulator.getSimulatedSchedules().length > 0, 'Schedule Retry', 'Scheduled retries list contains new record');

  // -----------------------------------------------------------------
  // SUITE 3: ACTION 3 — GENERATE PAYMENT LINK (GT_CHECKOUT_ABANDONMENT)
  // -----------------------------------------------------------------
  console.log('\nSuite 3: Generate Payment Link...');
  const gt4Case = db.recoveryCases.get(gt['GT_CHECKOUT_ABANDONMENT'].caseId)!;
  const linkRes = recoverySimulator.generatePaymentLink(gt4Case.customer_id, 12500, gt4Case.case_id);
  assert(linkRes.status === 'success', 'Payment Link', 'Generate payment link status is success', linkRes);
  assert(linkRes.payment_link_id.startsWith('plink_sim_'), 'Payment Link', 'Link ID starts with plink_sim_ prefix');
  assert(linkRes.payment_url.includes('demo.revive.local'), 'Payment Link', 'Payment URL formatted with simulated domain');
  assert(linkRes.simulated === true, 'Payment Link', 'Payment link response has simulated: true');

  // -----------------------------------------------------------------
  // SUITE 4: ACTION 4 — SEND CUSTOMER NOTIFICATION (GT_OVERDUE_RELIABLE)
  // -----------------------------------------------------------------
  console.log('\nSuite 4: Send Customer Notification...');
  const gt5Case = db.recoveryCases.get(gt['GT_OVERDUE_RELIABLE'].caseId)!;
  const notifRes = recoverySimulator.sendCustomerNotification(
    gt5Case.customer_id,
    'Friendly reminder: Invoice #55555555 for ₹65,000 is due.',
    'EMAIL',
    gt5Case.case_id
  );
  assert(notifRes.status === 'sent', 'Customer Notification', 'Notification response status is sent', notifRes);
  assert(notifRes.channel === 'EMAIL', 'Customer Notification', 'Notification channel is EMAIL');
  assert(notifRes.simulated === true, 'Customer Notification', 'Notification response has simulated: true');

  const gt5CaseAfter = db.recoveryCases.get(gt5Case.case_id)!;
  assert(gt5CaseAfter.status === 'OPEN', 'Customer Notification', 'Case status remains OPEN after notification');

  // -----------------------------------------------------------------
  // SUITE 5: ACTION 5 — REQUEST PAYMENT METHOD UPDATE (GT_PAYMENT_METHOD_UPDATE)
  // -----------------------------------------------------------------
  console.log('\nSuite 5: Request Payment Method Update...');
  const gt2Case = db.recoveryCases.get(gt['GT_PAYMENT_METHOD_UPDATE'].caseId)!;
  const gt2Payment = db.payments.get(gt2Case.source_id)!;

  // Before update: retry should fail because card is expired
  const retryBeforeUpdate = recoverySimulator.retryPayment(gt2Payment.payment_id, gt2Case.case_id);
  assert(retryBeforeUpdate.status === 'failed', 'Method Update', 'Retry before method update fails as expected');
  assert(retryBeforeUpdate.failure_reason === 'expired_card', 'Method Update', 'Failure reason is expired_card');

  // Dispatch payment method update request
  const pmuRes = recoverySimulator.requestPaymentMethodUpdate(gt2Case.customer_id, gt2Case.case_id);
  assert(pmuRes.status === 'requested', 'Method Update', 'PMU response status is requested', pmuRes);
  assert(pmuRes.request_id.startsWith('pmu_req_'), 'Method Update', 'Request ID format is valid');
  assert(pmuRes.simulated === true, 'Method Update', 'PMU response has simulated: true');

  // Subsequent retry should succeed now that payment method is updated!
  const retryAfterUpdate = recoverySimulator.retryPayment(gt2Payment.payment_id, gt2Case.case_id);
  assert(retryAfterUpdate.status === 'success', 'Method Update', 'Retry after method update succeeds deterministically');
  assert(retryAfterUpdate.amount_recovered === 4999, 'Method Update', 'Amount recovered is ₹4,999');

  // -----------------------------------------------------------------
  // SUITE 6: ACTION 6 — ESCALATE TO HUMAN (GT_HIGH_VALUE_ESCALATION)
  // -----------------------------------------------------------------
  console.log('\nSuite 6: Escalate to Human...');
  const gt3Case = db.recoveryCases.get(gt['GT_HIGH_VALUE_ESCALATION'].caseId)!;
  const escRes = recoverySimulator.escalateToHuman(gt3Case.case_id, 'Enterprise invoice of ₹85,000 exceeds ₹25,000 autonomous threshold.');
  assert(escRes.status === 'escalated', 'Escalate to Human', 'Escalation response status is escalated', escRes);
  assert(escRes.simulated === true, 'Escalate to Human', 'Escalation response has simulated: true');

  const gt3CaseAfter = db.recoveryCases.get(gt3Case.case_id)!;
  assert(gt3CaseAfter.status === 'ESCALATED', 'Escalate to Human', 'Case status in DB is ESCALATED');
  assert(gt3CaseAfter.current_strategy === 'ESCALATE', 'Escalate to Human', 'Case current_strategy is ESCALATE');

  // -----------------------------------------------------------------
  // SUITE 7: ACTION 7 — STOP RECOVERY (GT_MAX_RETRY_STOP)
  // -----------------------------------------------------------------
  console.log('\nSuite 7: Stop Recovery...');
  const gt6Case = db.recoveryCases.get(gt['GT_MAX_RETRY_STOP'].caseId)!;
  const stopRes = recoverySimulator.stopRecovery(gt6Case.case_id, '3 retry attempts already exhausted.');
  assert(stopRes.status === 'stopped', 'Stop Recovery', 'Stop response status is stopped', stopRes);
  assert(stopRes.simulated === true, 'Stop Recovery', 'Stop response has simulated: true');

  const gt6CaseAfter = db.recoveryCases.get(gt6Case.case_id)!;
  assert(gt6CaseAfter.status === 'CLOSED', 'Stop Recovery', 'Case status in DB is CLOSED');

  // -----------------------------------------------------------------
  // SUITE 8: VERIFICATION TOOLS
  // -----------------------------------------------------------------
  console.log('\nSuite 8: Verification Tools...');
  const payStatus = recoverySimulator.checkPaymentStatus(gt1Payment.payment_id);
  assert(payStatus.status === 'SUCCESS', 'Verification', 'check_payment_status returns updated status SUCCESS', payStatus);
  assert(payStatus.simulated === true, 'Verification', 'check_payment_status returns simulated: true');

  const recStatus = recoverySimulator.checkRecoveryStatus(gt1Case.case_id);
  assert(recStatus.status === 'RECOVERED', 'Verification', 'check_recovery_status returns status RECOVERED', recStatus);
  assert(recStatus.amount_recovered === 2499, 'Verification', 'check_recovery_status returns recovered amount ₹2,499');
  assert(recStatus.action_count > 0, 'Verification', 'check_recovery_status counts actions correctly');
  assert(recStatus.audit_count > 0, 'Verification', 'check_recovery_status counts audit logs correctly');
  assert(recStatus.simulated === true, 'Verification', 'check_recovery_status returns simulated: true');

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    console.error('Some tests failed.');
    process.exit(1);
  } else {
    console.log('All Phase 2 Recovery Simulator tests passed successfully!');
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
