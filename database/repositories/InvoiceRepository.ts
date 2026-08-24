/**
 * @license
 * REVIVE — Invoice Repository
 */

import { db } from '../db';
import { Invoice } from '../schema';

export class InvoiceRepository {
  findById(invoiceId: string): Invoice | null {
    return db.invoices.get(invoiceId) || null;
  }

  findByCustomerId(customerId: string): Invoice[] {
    const results: Invoice[] = [];
    for (const inv of db.invoices.values()) {
      if (inv.customer_id === customerId) {
        results.push(inv);
      }
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  findAll(limit = 100, offset = 0, status?: string): { items: Invoice[]; total: number } {
    let list = Array.from(db.invoices.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (status) {
      list = list.filter((i) => i.status === status);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(invoice: Invoice): Invoice {
    db.invoices.set(invoice.invoice_id, invoice);
    return invoice;
  }

  update(invoiceId: string, partial: Partial<Invoice>): Invoice | null {
    const existing = db.invoices.get(invoiceId);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    db.invoices.set(invoiceId, updated);
    return updated;
  }
}

export const invoiceRepository = new InvoiceRepository();
