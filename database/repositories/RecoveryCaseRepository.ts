/**
 * @license
 * REVIVE — Recovery Case Repository
 */

import { db } from '../db';
import { RecoveryCase } from '../schema';

export class RecoveryCaseRepository {
  findById(caseId: string): RecoveryCase | null {
    return db.recoveryCases.get(caseId) || null;
  }

  findByCustomerId(customerId: string): RecoveryCase[] {
    const results: RecoveryCase[] = [];
    for (const c of db.recoveryCases.values()) {
      if (c.customer_id === customerId) {
        results.push(c);
      }
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  findByScenarioTag(tag: string): RecoveryCase | null {
    for (const c of db.recoveryCases.values()) {
      if (c.scenario_tag === tag) {
        return c;
      }
    }
    return null;
  }

  findAll(
    limit = 100,
    offset = 0,
    filters?: { status?: string; priority?: string; sourceType?: string }
  ): { items: RecoveryCase[]; total: number } {
    let list = Array.from(db.recoveryCases.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.priority) {
      list = list.filter((c) => c.priority === filters.priority);
    }
    if (filters?.sourceType) {
      list = list.filter((c) => c.source_type === filters.sourceType);
    }

    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(recoveryCase: RecoveryCase): RecoveryCase {
    db.recoveryCases.set(recoveryCase.case_id, recoveryCase);
    return recoveryCase;
  }

  update(caseId: string, partial: Partial<RecoveryCase>): RecoveryCase | null {
    const existing = db.recoveryCases.get(caseId);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    db.recoveryCases.set(caseId, updated);
    return updated;
  }
}

export const recoveryCaseRepository = new RecoveryCaseRepository();
