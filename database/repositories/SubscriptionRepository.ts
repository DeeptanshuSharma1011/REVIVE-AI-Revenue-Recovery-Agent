/**
 * @license
 * REVIVE — Subscription Repository
 */

import { db } from '../db';
import { Subscription } from '../schema';

export class SubscriptionRepository {
  findById(subscriptionId: string): Subscription | null {
    return db.subscriptions.get(subscriptionId) || null;
  }

  findByCustomerId(customerId: string): Subscription[] {
    const results: Subscription[] = [];
    for (const sub of db.subscriptions.values()) {
      if (sub.customer_id === customerId) {
        results.push(sub);
      }
    }
    return results;
  }

  findAll(limit = 100, offset = 0, status?: string): { items: Subscription[]; total: number } {
    let list = Array.from(db.subscriptions.values());
    if (status) {
      list = list.filter((s) => s.status === status);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(subscription: Subscription): Subscription {
    db.subscriptions.set(subscription.subscription_id, subscription);
    return subscription;
  }

  update(subscriptionId: string, partial: Partial<Subscription>): Subscription | null {
    const existing = db.subscriptions.get(subscriptionId);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    db.subscriptions.set(subscriptionId, updated);
    return updated;
  }
}

export const subscriptionRepository = new SubscriptionRepository();
