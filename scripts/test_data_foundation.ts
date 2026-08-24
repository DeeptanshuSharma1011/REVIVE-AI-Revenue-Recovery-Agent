/**
 * @license
 * REVIVE — Phase 1 Data Foundation Test Suite
 * Verifies table schemas, relational integrity, foreign keys, and Ground Truth benchmarks
 */

import { db } from '../database/db';
import { dataService } from '../database/services/dataService';
import { customerRepository } from '../database/repositories/CustomerRepository';
import { paymentRepository } from '../database/repositories/PaymentRepository';
import { recoveryCaseRepository } from '../database/repositories/RecoveryCaseRepository';

export function runDataFoundationTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push(`✅ PASS: ${testName}`);
    } else {
      results.push(`❌ FAIL: ${testName}`);
      allPassed = false;
    }
  }

  // 1. Table Counts & Seeding Check
  const counts = db.getCounts();
  assert(counts.customers >= 500, `Customers count >= 500 (Actual: ${counts.customers})`);
  assert(counts.subscriptions >= 500, `Subscriptions count >= 500 (Actual: ${counts.subscriptions})`);
  assert(counts.payments >= 1000, `Payments count >= 1000 (Actual: ${counts.payments})`);
  assert(counts.invoices >= 100, `Invoices count >= 100 (Actual: ${counts.invoices})`);
  assert(counts.checkout_events >= 500, `Checkout events count >= 500 (Actual: ${counts.checkout_events})`);
  assert(counts.recovery_cases >= 50, `Recovery cases count >= 50 (Actual: ${counts.recovery_cases})`);

  // 2. Relational Foreign Key Integrity
  let brokenPaymentFk = 0;
  for (const p of db.payments.values()) {
    if (!db.customers.has(p.customer_id)) brokenPaymentFk++;
    if (p.subscription_id && !db.subscriptions.has(p.subscription_id)) brokenPaymentFk++;
  }
  assert(brokenPaymentFk === 0, `Payment foreign keys integrity (Broken: ${brokenPaymentFk})`);

  let brokenSubscriptionFk = 0;
  for (const s of db.subscriptions.values()) {
    if (!db.customers.has(s.customer_id)) brokenSubscriptionFk++;
  }
  assert(brokenSubscriptionFk === 0, `Subscription foreign keys integrity (Broken: ${brokenSubscriptionFk})`);

  let brokenCaseFk = 0;
  for (const c of db.recoveryCases.values()) {
    if (!db.customers.has(c.customer_id)) brokenCaseFk++;
  }
  assert(brokenCaseFk === 0, `Recovery case customer foreign keys integrity (Broken: ${brokenCaseFk})`);

  let brokenActionFk = 0;
  for (const a of db.recoveryActions.values()) {
    if (!db.recoveryCases.has(a.case_id)) brokenActionFk++;
  }
  assert(brokenActionFk === 0, `Recovery action case foreign keys integrity (Broken: ${brokenActionFk})`);

  // 3. Ground Truth Benchmarks Verification
  const expectedGtTags = [
    'GT_SUCCESSFUL_RETRY',
    'GT_PAYMENT_METHOD_UPDATE',
    'GT_HIGH_VALUE_ESCALATION',
    'GT_CHECKOUT_ABANDONMENT',
    'GT_OVERDUE_RELIABLE',
    'GT_MAX_RETRY_STOP',
  ];

  for (const tag of expectedGtTags) {
    const rCase = recoveryCaseRepository.findByScenarioTag(tag);
    assert(rCase !== null, `Ground truth scenario present: ${tag}`);
    if (rCase) {
      const details = dataService.getRecoveryCaseDetails(rCase.case_id);
      assert(details !== null && details.customer !== null, `Ground truth ${tag} has full customer profile`);
    }
  }

  // 4. Domain Query Capabilities
  const firstCustomer = Array.from(db.customers.values())[0];
  const fullProfile = dataService.getCustomerProfile(firstCustomer.customer_id);
  assert(fullProfile !== null, 'dataService.getCustomerProfile returns structured domain answer');
  assert(fullProfile?.metrics !== undefined, 'Customer profile includes computed financial risk metrics');

  const metrics = dataService.getRecoveryMetrics();
  assert(metrics.totalRevenueAtRisk > 0, `Recovery metrics computed: Revenue at risk = ₹${metrics.totalRevenueAtRisk}`);

  return { passed: allPassed, results };
}

// Self-run when executed directly via tsx
const suiteResult = runDataFoundationTests();
console.log('\n--- REVIVE PHASE 1 DATA FOUNDATION TEST REPORT ---');
suiteResult.results.forEach((r) => console.log(r));
console.log(`\nOVERALL STATUS: ${suiteResult.passed ? 'ALL TESTS PASSED ✅' : 'FAILED ❌'}\n`);
