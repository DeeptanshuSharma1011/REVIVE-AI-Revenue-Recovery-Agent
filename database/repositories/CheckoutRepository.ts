/**
 * @license
 * REVIVE — Checkout Repository
 */

import { db } from '../db';
import { CheckoutEvent } from '../schema';

export class CheckoutRepository {
  findById(eventId: string): CheckoutEvent | null {
    return db.checkoutEvents.get(eventId) || null;
  }

  findByCustomerId(customerId: string): CheckoutEvent[] {
    const results: CheckoutEvent[] = [];
    for (const evt of db.checkoutEvents.values()) {
      if (evt.customer_id === customerId) {
        results.push(evt);
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  findBySessionId(sessionId: string): CheckoutEvent[] {
    const results: CheckoutEvent[] = [];
    for (const evt of db.checkoutEvents.values()) {
      if (evt.session_id === sessionId) {
        results.push(evt);
      }
    }
    return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  findAll(limit = 100, offset = 0, eventType?: string): { items: CheckoutEvent[]; total: number } {
    let list = Array.from(db.checkoutEvents.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (eventType) {
      list = list.filter((e) => e.event_type === eventType);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(event: CheckoutEvent): CheckoutEvent {
    db.checkoutEvents.set(event.event_id, event);
    return event;
  }
}

export const checkoutRepository = new CheckoutRepository();
