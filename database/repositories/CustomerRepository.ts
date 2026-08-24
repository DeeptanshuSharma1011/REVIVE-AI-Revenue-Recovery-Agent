/**
 * @license
 * REVIVE — Customer Repository
 */

import { db } from '../db';
import { Customer } from '../schema';

export class CustomerRepository {
  findById(customerId: string): Customer | null {
    return db.customers.get(customerId) || null;
  }

  findByEmail(email: string): Customer | null {
    for (const customer of db.customers.values()) {
      if (customer.email.toLowerCase() === email.toLowerCase()) {
        return customer;
      }
    }
    return null;
  }

  findAll(limit = 100, offset = 0, segment?: string): { items: Customer[]; total: number } {
    let list = Array.from(db.customers.values());
    if (segment) {
      list = list.filter((c) => c.segment === segment);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(customer: Customer): Customer {
    db.customers.set(customer.customer_id, customer);
    return customer;
  }

  update(customerId: string, partial: Partial<Customer>): Customer | null {
    const existing = db.customers.get(customerId);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    db.customers.set(customerId, updated);
    return updated;
  }
}

export const customerRepository = new CustomerRepository();
