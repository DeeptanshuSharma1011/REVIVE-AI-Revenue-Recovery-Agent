/**
 * @license
 * REVIVE — Payment Repository
 */

import { db } from '../db';
import { Payment } from '../schema';

export class PaymentRepository {
  findById(paymentId: string): Payment | null {
    return db.payments.get(paymentId) || null;
  }

  findByCustomerId(customerId: string): Payment[] {
    const results: Payment[] = [];
    for (const p of db.payments.values()) {
      if (p.customer_id === customerId) {
        results.push(p);
      }
    }
    // Sort descending by created_at
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  findBySubscriptionId(subscriptionId: string): Payment[] {
    const results: Payment[] = [];
    for (const p of db.payments.values()) {
      if (p.subscription_id === subscriptionId) {
        results.push(p);
      }
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  findAll(limit = 100, offset = 0, status?: string): { items: Payment[]; total: number } {
    let list = Array.from(db.payments.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (status) {
      list = list.filter((p) => p.status === status);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(payment: Payment): Payment {
    db.payments.set(payment.payment_id, payment);
    return payment;
  }

  update(paymentId: string, partial: Partial<Payment>): Payment | null {
    const existing = db.payments.get(paymentId);
    if (!existing) return null;
    const updated = { ...existing, ...partial, updated_at: new Date().toISOString() };
    db.payments.set(paymentId, updated);
    return updated;
  }
}

export const paymentRepository = new PaymentRepository();
