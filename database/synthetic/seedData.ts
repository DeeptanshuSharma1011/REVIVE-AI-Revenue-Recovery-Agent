/**
 * @license
 * REVIVE — Synthetic Seed Data Generator
 * Phase 1 — Data Foundation
 */

import {
  Customer,
  Subscription,
  Payment,
  Invoice,
  CheckoutEvent,
  RecoveryCase,
  RecoveryAction,
  AuditLog,
  CustomerSegment,
  CommunicationChannel,
  PaymentFailureReason,
  PaymentMethod,
} from '../schema';
import {
  DeterministicPRNG,
  FIRST_NAMES,
  LAST_NAMES,
  COMPANY_NAMES,
  SUBSCRIPTION_PLANS,
} from './generator';

export interface SeedDataset {
  customers: Customer[];
  subscriptions: Subscription[];
  payments: Payment[];
  invoices: Invoice[];
  checkoutEvents: CheckoutEvent[];
  recoveryCases: RecoveryCase[];
  recoveryActions: RecoveryAction[];
  auditLogs: AuditLog[];
  groundTruthMetadata: Record<string, { caseId: string; description: string; expectedStrategy: string }>;
}

export function generateSyntheticData(seed = 42, scaleMultiplier = 1.0): SeedDataset {
  const prng = new DeterministicPRNG(seed);

  const customers: Customer[] = [];
  const subscriptions: Subscription[] = [];
  const payments: Payment[] = [];
  const invoices: Invoice[] = [];
  const checkoutEvents: CheckoutEvent[] = [];
  const recoveryCases: RecoveryCase[] = [];
  const recoveryActions: RecoveryAction[] = [];
  const auditLogs: AuditLog[] = [];
  const groundTruthMetadata: Record<string, { caseId: string; description: string; expectedStrategy: string }> = {};

  const customerCount = Math.round(500 * scaleMultiplier);
  const baseDate = new Date('2026-08-01T00:00:00Z');

  // Helper for generating ISO dates relative to base
  const randomPastDate = (daysBackMin = 1, daysBackMax = 180): string => {
    const days = prng.nextInt(daysBackMin, daysBackMax);
    const d = new Date(baseDate.getTime() - days * 86400000 + prng.nextInt(0, 86400) * 1000);
    return d.toISOString();
  };

  // -------------------------------------------------------------
  // 1. GROUND TRUTH SCENARIO 1: GT_SUCCESSFUL_RETRY
  // Rahul Sharma, 13 successful payments, active sub ₹2,499, failed due to temporary_failure
  // -------------------------------------------------------------
  const gt1Customer: Customer = {
    customer_id: '11111111-1111-4111-a111-111111111111',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+919876543210',
    segment: 'STANDARD',
    lifetime_value: 32487,
    preferred_channel: 'WHATSAPP',
    created_at: new Date('2025-06-15T10:00:00Z').toISOString(),
  };
  customers.push(gt1Customer);

  const gt1Sub: Subscription = {
    subscription_id: '11111111-2222-4111-a111-111111111111',
    customer_id: gt1Customer.customer_id,
    plan_name: 'Growth Suite',
    amount: 2499,
    billing_cycle: 'MONTHLY',
    status: 'ACTIVE',
    next_billing_date: new Date('2026-08-25T00:00:00Z').toISOString(),
    created_at: gt1Customer.created_at,
  };
  subscriptions.push(gt1Sub);

  // 13 historical successful payments
  for (let i = 13; i >= 1; i--) {
    const pDate = new Date(baseDate.getTime() - i * 30 * 86400000).toISOString();
    payments.push({
      payment_id: prng.uuid('pay-gt1-hist'),
      customer_id: gt1Customer.customer_id,
      subscription_id: gt1Sub.subscription_id,
      amount: 2499,
      status: 'SUCCESS',
      failure_reason: null,
      attempt_number: 1,
      payment_method: 'UPI',
      created_at: pDate,
      updated_at: pDate,
    });
  }

  // 1 failed payment (today)
  const gt1FailedPayment: Payment = {
    payment_id: '11111111-3333-4111-a111-111111111111',
    customer_id: gt1Customer.customer_id,
    subscription_id: gt1Sub.subscription_id,
    amount: 2499,
    status: 'FAILED',
    failure_reason: 'temporary_failure',
    attempt_number: 1,
    payment_method: 'UPI',
    created_at: new Date('2026-08-23T08:30:00Z').toISOString(),
    updated_at: new Date('2026-08-23T08:30:00Z').toISOString(),
  };
  payments.push(gt1FailedPayment);

  const gt1Case: RecoveryCase = {
    case_id: '11111111-4444-4111-a111-111111111111',
    customer_id: gt1Customer.customer_id,
    source_type: 'PAYMENT',
    source_id: gt1FailedPayment.payment_id,
    revenue_at_risk: 2499,
    priority: 'HIGH',
    status: 'OPEN',
    current_strategy: null,
    scenario_tag: 'GT_SUCCESSFUL_RETRY',
    created_at: new Date('2026-08-23T08:30:10Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt1Case);
  groundTruthMetadata['GT_SUCCESSFUL_RETRY'] = {
    caseId: gt1Case.case_id,
    description: 'Customer with 13 successful payments and 1 temporary payment failure with 0 prior retries.',
    expectedStrategy: 'RETRY_PAYMENT or SCHEDULE_RETRY',
  };

  // -------------------------------------------------------------
  // 2. GROUND TRUTH SCENARIO 2: GT_PAYMENT_METHOD_UPDATE
  // Priya Patel, Active sub ₹4,999, failure expired_card, attempt 3, retries exhausted
  // -------------------------------------------------------------
  const gt2Customer: Customer = {
    customer_id: '22222222-1111-4222-a222-222222222222',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '+919812345678',
    segment: 'PREMIUM',
    lifetime_value: 49990,
    preferred_channel: 'EMAIL',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  };
  customers.push(gt2Customer);

  const gt2Sub: Subscription = {
    subscription_id: '22222222-2222-4222-a222-222222222222',
    customer_id: gt2Customer.customer_id,
    plan_name: 'Business Plus',
    amount: 4999,
    billing_cycle: 'MONTHLY',
    status: 'PAST_DUE',
    next_billing_date: new Date('2026-08-20T00:00:00Z').toISOString(),
    created_at: gt2Customer.created_at,
  };
  subscriptions.push(gt2Sub);

  const gt2FailedPayment: Payment = {
    payment_id: '22222222-3333-4222-a222-222222222222',
    customer_id: gt2Customer.customer_id,
    subscription_id: gt2Sub.subscription_id,
    amount: 4999,
    status: 'FAILED',
    failure_reason: 'expired_card',
    attempt_number: 3,
    payment_method: 'CARD',
    created_at: new Date('2026-08-22T14:15:00Z').toISOString(),
    updated_at: new Date('2026-08-23T06:00:00Z').toISOString(),
  };
  payments.push(gt2FailedPayment);

  const gt2Case: RecoveryCase = {
    case_id: '22222222-4444-4222-a222-222222222222',
    customer_id: gt2Customer.customer_id,
    source_type: 'PAYMENT',
    source_id: gt2FailedPayment.payment_id,
    revenue_at_risk: 4999,
    priority: 'HIGH',
    status: 'OPEN',
    current_strategy: null,
    scenario_tag: 'GT_PAYMENT_METHOD_UPDATE',
    created_at: new Date('2026-08-22T14:15:05Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt2Case);
  groundTruthMetadata['GT_PAYMENT_METHOD_UPDATE'] = {
    caseId: gt2Case.case_id,
    description: 'Expired card with 3 attempts. Blind retrying forbidden by policy; update link required.',
    expectedStrategy: 'PAYMENT_METHOD_UPDATE',
  };

  // -------------------------------------------------------------
  // 3. GROUND TRUTH SCENARIO 3: GT_HIGH_VALUE_ESCALATION
  // Apex Global Technologies (ENTERPRISE), Revenue at risk ₹85,000 > ₹25,000 limit
  // -------------------------------------------------------------
  const gt3Customer: Customer = {
    customer_id: '33333333-1111-4333-a333-333333333333',
    name: 'Apex Global Technologies',
    email: 'billing@apexglobaltech.com',
    phone: '+919900112233',
    segment: 'ENTERPRISE',
    lifetime_value: 450000,
    preferred_channel: 'EMAIL',
    created_at: new Date('2024-04-10T09:00:00Z').toISOString(),
  };
  customers.push(gt3Customer);

  const gt3Invoice: Invoice = {
    invoice_id: '33333333-2222-4333-a333-333333333333',
    customer_id: gt3Customer.customer_id,
    amount: 85000,
    issue_date: new Date('2026-07-20T00:00:00Z').toISOString(),
    due_date: new Date('2026-08-10T00:00:00Z').toISOString(),
    status: 'OVERDUE',
    days_overdue: 13,
    last_reminder_at: new Date('2026-08-18T10:00:00Z').toISOString(),
    created_at: new Date('2026-07-20T00:00:00Z').toISOString(),
  };
  invoices.push(gt3Invoice);

  const gt3Case: RecoveryCase = {
    case_id: '33333333-4444-4333-a333-333333333333',
    customer_id: gt3Customer.customer_id,
    source_type: 'INVOICE',
    source_id: gt3Invoice.invoice_id,
    revenue_at_risk: 85000,
    priority: 'CRITICAL',
    status: 'OPEN',
    current_strategy: null,
    scenario_tag: 'GT_HIGH_VALUE_ESCALATION',
    created_at: new Date('2026-08-11T09:00:00Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt3Case);
  groundTruthMetadata['GT_HIGH_VALUE_ESCALATION'] = {
    caseId: gt3Case.case_id,
    description: 'Enterprise invoice of ₹85,000 exceeds ₹25,000 autonomous threshold.',
    expectedStrategy: 'ESCALATE',
  };

  // -------------------------------------------------------------
  // 4. GROUND TRUTH SCENARIO 4: GT_CHECKOUT_ABANDONMENT
  // Ananya Verma, Cart value ₹12,500, CHECKOUT_ABANDONED
  // -------------------------------------------------------------
  const gt4Customer: Customer = {
    customer_id: '44444444-1111-4444-a444-444444444444',
    name: 'Ananya Verma',
    email: 'ananya.verma@example.com',
    phone: '+919711223344',
    segment: 'PREMIUM',
    lifetime_value: 38000,
    preferred_channel: 'WHATSAPP',
    created_at: new Date('2025-08-01T00:00:00Z').toISOString(),
  };
  customers.push(gt4Customer);

  const gt4SessionId = 'sess-gt4-ananya-8941';
  const gt4Event1: CheckoutEvent = {
    event_id: '44444444-2222-4444-a444-444444444441',
    customer_id: gt4Customer.customer_id,
    session_id: gt4SessionId,
    cart_value: 12500,
    event_type: 'CHECKOUT_STARTED',
    timestamp: new Date('2026-08-23T11:00:00Z').toISOString(),
  };
  const gt4Event2: CheckoutEvent = {
    event_id: '44444444-2222-4444-a444-444444444442',
    customer_id: gt4Customer.customer_id,
    session_id: gt4SessionId,
    cart_value: 12500,
    event_type: 'PAYMENT_PAGE_REACHED',
    timestamp: new Date('2026-08-23T11:04:00Z').toISOString(),
  };
  const gt4Event3: CheckoutEvent = {
    event_id: '44444444-2222-4444-a444-444444444443',
    customer_id: gt4Customer.customer_id,
    session_id: gt4SessionId,
    cart_value: 12500,
    event_type: 'CHECKOUT_ABANDONED',
    timestamp: new Date('2026-08-23T11:15:00Z').toISOString(),
  };
  checkoutEvents.push(gt4Event1, gt4Event2, gt4Event3);

  const gt4Case: RecoveryCase = {
    case_id: '44444444-4444-4444-a444-444444444444',
    customer_id: gt4Customer.customer_id,
    source_type: 'CHECKOUT',
    source_id: gt4Event3.event_id,
    revenue_at_risk: 12500,
    priority: 'MEDIUM',
    status: 'OPEN',
    current_strategy: null,
    scenario_tag: 'GT_CHECKOUT_ABANDONMENT',
    created_at: new Date('2026-08-23T11:15:10Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt4Case);
  groundTruthMetadata['GT_CHECKOUT_ABANDONMENT'] = {
    caseId: gt4Case.case_id,
    description: 'High-intent cart abandonment for ₹12,500 after reaching payment page.',
    expectedStrategy: 'PAYMENT_LINK or CUSTOMER_NOTIFICATION',
  };

  // -------------------------------------------------------------
  // 5. GROUND TRUTH SCENARIO 5: GT_OVERDUE_RELIABLE
  // Rajesh Gupta, Invoice ₹65,000, 15 days overdue, historically paid every previous invoice
  // -------------------------------------------------------------
  const gt5Customer: Customer = {
    customer_id: '55555555-1111-4555-a555-555555555555',
    name: 'Rajesh Gupta',
    email: 'rajesh.gupta@zephyrltd.in',
    phone: '+919833445566',
    segment: 'ENTERPRISE',
    lifetime_value: 390000,
    preferred_channel: 'EMAIL',
    created_at: new Date('2024-01-15T00:00:00Z').toISOString(),
  };
  customers.push(gt5Customer);

  // 5 historical paid invoices
  for (let i = 5; i >= 1; i--) {
    const invDate = new Date(baseDate.getTime() - i * 60 * 86400000).toISOString();
    const invDueDate = new Date(baseDate.getTime() - (i * 60 - 30) * 86400000).toISOString();
    invoices.push({
      invoice_id: prng.uuid('inv-gt5-hist'),
      customer_id: gt5Customer.customer_id,
      amount: 65000,
      issue_date: invDate,
      due_date: invDueDate,
      status: 'PAID',
      days_overdue: 0,
      last_reminder_at: null,
      created_at: invDate,
    });
  }

  // 1 overdue invoice
  const gt5Invoice: Invoice = {
    invoice_id: '55555555-2222-4555-a555-555555555555',
    customer_id: gt5Customer.customer_id,
    amount: 65000,
    issue_date: new Date('2026-07-15T00:00:00Z').toISOString(),
    due_date: new Date('2026-08-08T00:00:00Z').toISOString(),
    status: 'OVERDUE',
    days_overdue: 15,
    last_reminder_at: null,
    created_at: new Date('2026-07-15T00:00:00Z').toISOString(),
  };
  invoices.push(gt5Invoice);

  const gt5Case: RecoveryCase = {
    case_id: '55555555-4444-4555-a555-555555555555',
    customer_id: gt5Customer.customer_id,
    source_type: 'INVOICE',
    source_id: gt5Invoice.invoice_id,
    revenue_at_risk: 65000,
    priority: 'HIGH',
    status: 'OPEN',
    current_strategy: null,
    scenario_tag: 'GT_OVERDUE_RELIABLE',
    created_at: new Date('2026-08-09T08:00:00Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt5Case);
  groundTruthMetadata['GT_OVERDUE_RELIABLE'] = {
    caseId: gt5Case.case_id,
    description: 'Historically reliable customer with ₹65,000 overdue invoice. Prefer reminder before escalation.',
    expectedStrategy: 'CUSTOMER_NOTIFICATION',
  };

  // -------------------------------------------------------------
  // 6. GROUND TRUTH SCENARIO 6: GT_MAX_RETRY_STOP
  // Vikram Malhotra, 3 failed retry attempts already executed
  // -------------------------------------------------------------
  const gt6Customer: Customer = {
    customer_id: '66666666-1111-4666-a666-666666666666',
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@example.com',
    phone: '+919877889900',
    segment: 'STANDARD',
    lifetime_value: 5997,
    preferred_channel: 'SMS',
    created_at: new Date('2026-02-01T00:00:00Z').toISOString(),
  };
  customers.push(gt6Customer);

  const gt6Sub: Subscription = {
    subscription_id: '66666666-2222-4666-a666-666666666666',
    customer_id: gt6Customer.customer_id,
    plan_name: 'Starter Pro',
    amount: 1999,
    billing_cycle: 'MONTHLY',
    status: 'PAST_DUE',
    next_billing_date: new Date('2026-08-15T00:00:00Z').toISOString(),
    created_at: gt6Customer.created_at,
  };
  subscriptions.push(gt6Sub);

  const gt6FailedPayment: Payment = {
    payment_id: '66666666-3333-4666-a666-666666666666',
    customer_id: gt6Customer.customer_id,
    subscription_id: gt6Sub.subscription_id,
    amount: 1999,
    status: 'FAILED',
    failure_reason: 'insufficient_funds',
    attempt_number: 3,
    payment_method: 'UPI',
    created_at: new Date('2026-08-15T09:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T10:00:00Z').toISOString(),
  };
  payments.push(gt6FailedPayment);

  const gt6Case: RecoveryCase = {
    case_id: '66666666-4444-4666-a666-666666666666',
    customer_id: gt6Customer.customer_id,
    source_type: 'PAYMENT',
    source_id: gt6FailedPayment.payment_id,
    revenue_at_risk: 1999,
    priority: 'LOW',
    status: 'ACTION_PENDING',
    current_strategy: null,
    scenario_tag: 'GT_MAX_RETRY_STOP',
    created_at: new Date('2026-08-15T09:00:10Z').toISOString(),
    resolved_at: null,
  };
  recoveryCases.push(gt6Case);

  // 3 previous failed actions
  for (let a = 1; a <= 3; a++) {
    const actDate = new Date(new Date(gt6Case.created_at).getTime() + a * 86400000).toISOString();
    const actionId = prng.uuid('act-gt6');
    recoveryActions.push({
      action_id: actionId,
      case_id: gt6Case.case_id,
      action_type: 'RETRY_PAYMENT',
      reason: `Automated retry attempt ${a} of 3`,
      status: 'FAILED',
      executed_at: actDate,
      result: { error: 'insufficient_funds', attempt: a },
      amount_recovered: 0,
    });
    auditLogs.push({
      log_id: prng.uuid('log-gt6'),
      case_id: gt6Case.case_id,
      agent_step: `RETRY_ATTEMPT_${a}`,
      tool_name: 'retry_payment',
      input_summary: { payment_id: gt6FailedPayment.payment_id, attempt: a },
      output_summary: { status: 'failed', reason: 'insufficient_funds' },
      policy_result: { status: 'PASSED', rule: 'MAX_RETRIES_CHECK', currentAttempts: a - 1, limit: 3 },
      timestamp: actDate,
    });
  }

  groundTruthMetadata['GT_MAX_RETRY_STOP'] = {
    caseId: gt6Case.case_id,
    description: '3 retry attempts already exhausted. Policy engine must block further retries.',
    expectedStrategy: 'STOP or REQUEST_PAYMENT_METHOD_UPDATE',
  };

  // -------------------------------------------------------------
  // 7. BULK SYNTHETIC DATA GENERATION (Scaled to target metrics)
  // -------------------------------------------------------------
  const failureReasons: PaymentFailureReason[] = [
    'insufficient_funds',
    'expired_card',
    'bank_timeout',
    'payment_method_error',
    'temporary_failure',
    'unknown',
  ];
  const failureWeights = [0.35, 0.20, 0.20, 0.10, 0.10, 0.05];

  for (let i = 7; i <= customerCount; i++) {
    const isEnterprise = prng.next() < 0.10;
    const isPremium = !isEnterprise && prng.next() < 0.30;
    const segment: CustomerSegment = isEnterprise ? 'ENTERPRISE' : isPremium ? 'PREMIUM' : 'STANDARD';

    const firstName = prng.choice(FIRST_NAMES);
    const lastName = prng.choice(LAST_NAMES);
    const name = isEnterprise ? prng.choice(COMPANY_NAMES) : `${firstName} ${lastName}`;
    const email = isEnterprise
      ? `billing@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
      : `${firstName.toLowerCase()}.${lastName.toLowerCase()}${prng.nextInt(10, 999)}@gmail.com`;
    const phone = `+91${prng.nextInt(7000000000, 9999999999)}`;
    const preferredChannel: CommunicationChannel = prng.choice(['EMAIL', 'WHATSAPP', 'SMS']);
    const createdAt = randomPastDate(60, 365);

    const customer: Customer = {
      customer_id: prng.uuid('cust'),
      name,
      email,
      phone,
      segment,
      lifetime_value: 0,
      preferred_channel: preferredChannel,
      created_at: createdAt,
    };
    customers.push(customer);

    let customerLtv = 0;

    // Subscriptions: 1-3 subscriptions per customer
    const subCount = isEnterprise ? prng.nextInt(2, 4) : prng.nextInt(1, 2);
    for (let s = 0; s < subCount; s++) {
      const plan = isEnterprise
        ? prng.choice([SUBSCRIPTION_PLANS[3], SUBSCRIPTION_PLANS[4], SUBSCRIPTION_PLANS[5]])
        : isPremium
        ? prng.choice([SUBSCRIPTION_PLANS[1], SUBSCRIPTION_PLANS[2], SUBSCRIPTION_PLANS[4]])
        : prng.choice([SUBSCRIPTION_PLANS[0], SUBSCRIPTION_PLANS[1]]);

      const subStatus = prng.weightedChoice(
        ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED'] as const,
        [0.75, 0.15, 0.07, 0.03]
      );

      const nextBilling = new Date(baseDate.getTime() + prng.nextInt(1, 30) * 86400000).toISOString();
      const sub: Subscription = {
        subscription_id: prng.uuid('sub'),
        customer_id: customer.customer_id,
        plan_name: plan.name,
        amount: plan.amount,
        billing_cycle: plan.cycle,
        status: subStatus,
        next_billing_date: nextBilling,
        created_at: createdAt,
      };
      subscriptions.push(sub);

      // Payments per subscription (4 to 12 cycles)
      const paymentCycles = prng.nextInt(3, 10);
      for (let p = 0; p < paymentCycles; p++) {
        const isLatest = p === paymentCycles - 1;
        const pDate = new Date(new Date(createdAt).getTime() + (p + 1) * 30 * 86400000).toISOString();
        
        let pStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS';
        let failureReason: PaymentFailureReason = null;
        let attemptNum = 1;

        if (isLatest && subStatus === 'PAST_DUE') {
          pStatus = 'FAILED';
          failureReason = prng.weightedChoice(failureReasons, failureWeights);
          attemptNum = prng.nextInt(1, 3);
        } else if (!isLatest && prng.next() < 0.08) {
          // Occasional historical transient failure that was retried
          pStatus = 'FAILED';
          failureReason = prng.choice(['temporary_failure', 'bank_timeout']);
        }

        const paymentMethod: PaymentMethod = prng.choice(['CARD', 'UPI', 'NETBANKING', 'WALLET']);
        const pay: Payment = {
          payment_id: prng.uuid('pay'),
          customer_id: customer.customer_id,
          subscription_id: sub.subscription_id,
          amount: plan.amount,
          status: pStatus,
          failure_reason: failureReason,
          attempt_number: attemptNum,
          payment_method: paymentMethod,
          created_at: pDate,
          updated_at: pDate,
        };
        payments.push(pay);

        if (pStatus === 'SUCCESS') {
          customerLtv += plan.amount;
        } else if (pStatus === 'FAILED' && isLatest && recoveryCases.length < 320) {
          // Create recovery case for failed active payment
          const prio = plan.amount >= 25000 ? 'CRITICAL' : plan.amount >= 5000 ? 'HIGH' : 'MEDIUM';
          const rCase: RecoveryCase = {
            case_id: prng.uuid('case-pay'),
            customer_id: customer.customer_id,
            source_type: 'PAYMENT',
            source_id: pay.payment_id,
            revenue_at_risk: plan.amount,
            priority: prio,
            status: prng.weightedChoice(['OPEN', 'INVESTIGATING', 'RECOVERED', 'ESCALATED'] as const, [0.4, 0.3, 0.2, 0.1]),
            current_strategy: null,
            created_at: pDate,
            resolved_at: null,
          };
          if (rCase.status === 'RECOVERED') {
            rCase.resolved_at = new Date(new Date(pDate).getTime() + 86400000).toISOString();
            recoveryActions.push({
              action_id: prng.uuid('act'),
              case_id: rCase.case_id,
              action_type: 'RETRY_PAYMENT',
              reason: 'Scheduled automated retry after bank settlement window.',
              status: 'SUCCESS',
              executed_at: rCase.resolved_at,
              result: { payment_id: pay.payment_id, status: 'recovered' },
              amount_recovered: plan.amount,
            });
          }
          recoveryCases.push(rCase);
        }
      }
    }

    // Invoices for Enterprise & High Value Customers
    if (isEnterprise || prng.next() < 0.25) {
      const invCount = prng.nextInt(1, 3);
      for (let inv = 0; inv < invCount; inv++) {
        const invAmount = isEnterprise ? prng.nextInt(35000, 150000) : prng.nextInt(10000, 35000);
        const invStatus = prng.weightedChoice(['PAID', 'OVERDUE', 'PENDING'] as const, [0.65, 0.25, 0.10]);
        const issueDate = randomPastDate(15, 90);
        const dueDate = new Date(new Date(issueDate).getTime() + 30 * 86400000).toISOString();
        const isOverdue = invStatus === 'OVERDUE';
        const daysOverdue = isOverdue ? Math.max(1, Math.floor((baseDate.getTime() - new Date(dueDate).getTime()) / 86400000)) : 0;

        const invoice: Invoice = {
          invoice_id: prng.uuid('inv'),
          customer_id: customer.customer_id,
          amount: invAmount,
          issue_date: issueDate,
          due_date: dueDate,
          status: invStatus,
          days_overdue: daysOverdue,
          last_reminder_at: isOverdue && prng.next() < 0.5 ? randomPastDate(1, 5) : null,
          created_at: issueDate,
        };
        invoices.push(invoice);

        if (invStatus === 'PAID') {
          customerLtv += invAmount;
        } else if (isOverdue && recoveryCases.length < 320) {
          const rCase: RecoveryCase = {
            case_id: prng.uuid('case-inv'),
            customer_id: customer.customer_id,
            source_type: 'INVOICE',
            source_id: invoice.invoice_id,
            revenue_at_risk: invAmount,
            priority: invAmount >= 25000 ? 'CRITICAL' : 'HIGH',
            status: prng.weightedChoice(['OPEN', 'INVESTIGATING', 'ESCALATED'] as const, [0.5, 0.3, 0.2]),
            current_strategy: null,
            created_at: dueDate,
            resolved_at: null,
          };
          recoveryCases.push(rCase);
        }
      }
    }

    // Checkout Events & Abandonments
    if (prng.next() < 0.5) {
      const sessionId = `sess-${prng.nextInt(10000, 99999)}`;
      const cartVal = prng.nextInt(2000, 25000);
      const isAbandoned = prng.next() < 0.40;
      const t1 = randomPastDate(1, 30);
      const t2 = new Date(new Date(t1).getTime() + 180000).toISOString();
      const t3 = new Date(new Date(t1).getTime() + 600000).toISOString();

      checkoutEvents.push({
        event_id: prng.uuid('chk-1'),
        customer_id: customer.customer_id,
        session_id: sessionId,
        cart_value: cartVal,
        event_type: 'CHECKOUT_STARTED',
        timestamp: t1,
      });

      checkoutEvents.push({
        event_id: prng.uuid('chk-2'),
        customer_id: customer.customer_id,
        session_id: sessionId,
        cart_value: cartVal,
        event_type: 'PAYMENT_PAGE_REACHED',
        timestamp: t2,
      });

      if (isAbandoned) {
        const abandonedEvt: CheckoutEvent = {
          event_id: prng.uuid('chk-3'),
          customer_id: customer.customer_id,
          session_id: sessionId,
          cart_value: cartVal,
          event_type: 'CHECKOUT_ABANDONED',
          timestamp: t3,
        };
        checkoutEvents.push(abandonedEvt);

        if (recoveryCases.length < 320) {
          recoveryCases.push({
            case_id: prng.uuid('case-chk'),
            customer_id: customer.customer_id,
            source_type: 'CHECKOUT',
            source_id: abandonedEvt.event_id,
            revenue_at_risk: cartVal,
            priority: cartVal >= 15000 ? 'HIGH' : 'MEDIUM',
            status: prng.choice(['OPEN', 'INVESTIGATING', 'ACTION_PENDING']),
            current_strategy: null,
            created_at: t3,
            resolved_at: null,
          });
        }
      } else {
        checkoutEvents.push({
          event_id: prng.uuid('chk-3'),
          customer_id: customer.customer_id,
          session_id: sessionId,
          cart_value: cartVal,
          event_type: 'PAYMENT_SUCCESS',
          timestamp: t3,
        });
        customerLtv += cartVal;
      }
    }

    customer.lifetime_value = customerLtv;
  }

  // Populate synthetic actions & audit logs for a subset of cases
  for (const c of recoveryCases) {
    if (c.scenario_tag === 'GT_MAX_RETRY_STOP') continue; // Already added

    if (c.status === 'RECOVERED' || c.status === 'ESCALATED' || c.status === 'ACTION_PENDING') {
      const actId = prng.uuid('act');
      const actionType = c.status === 'ESCALATED' ? 'ESCALATE' : c.source_type === 'CHECKOUT' ? 'GENERATE_PAYMENT_LINK' : 'RETRY_PAYMENT';
      const isSuccess = c.status === 'RECOVERED';
      const actDate = new Date(new Date(c.created_at).getTime() + 1800000).toISOString();

      recoveryActions.push({
        action_id: actId,
        case_id: c.case_id,
        action_type: actionType,
        reason: c.status === 'ESCALATED' ? 'High value transaction threshold exceeded.' : 'Deterministic recovery intervention executed.',
        status: isSuccess ? 'SUCCESS' : c.status === 'ESCALATED' ? 'EXECUTED' : 'PENDING',
        executed_at: actDate,
        result: {
          case_id: c.case_id,
          action: actionType,
          outcome: isSuccess ? 'recovered' : 'processed',
        },
        amount_recovered: isSuccess ? c.revenue_at_risk : 0,
      });

      auditLogs.push({
        log_id: prng.uuid('log'),
        case_id: c.case_id,
        agent_step: 'ACTION_EXECUTION',
        tool_name: actionType.toLowerCase(),
        input_summary: { case_id: c.case_id, amount: c.revenue_at_risk },
        output_summary: { status: isSuccess ? 'success' : 'executed' },
        policy_result: { status: 'PASSED', guardrails: 'Compliant with V1 policies' },
        timestamp: actDate,
      });
    }
  }

  return {
    customers,
    subscriptions,
    payments,
    invoices,
    checkoutEvents,
    recoveryCases,
    recoveryActions,
    auditLogs,
    groundTruthMetadata,
  };
}
