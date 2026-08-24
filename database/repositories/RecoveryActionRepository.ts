/**
 * @license
 * REVIVE — Recovery Action Repository
 */

import { db } from '../db';
import { RecoveryAction } from '../schema';

export class RecoveryActionRepository {
  findById(actionId: string): RecoveryAction | null {
    return db.recoveryActions.get(actionId) || null;
  }

  findByCaseId(caseId: string): RecoveryAction[] {
    const results: RecoveryAction[] = [];
    for (const a of db.recoveryActions.values()) {
      if (a.case_id === caseId) {
        results.push(a);
      }
    }
    return results.sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
  }

  findAll(limit = 100, offset = 0, status?: string): { items: RecoveryAction[]; total: number } {
    let list = Array.from(db.recoveryActions.values()).sort(
      (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    );
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(action: RecoveryAction): RecoveryAction {
    db.recoveryActions.set(action.action_id, action);
    return action;
  }

  update(actionId: string, partial: Partial<RecoveryAction>): RecoveryAction | null {
    const existing = db.recoveryActions.get(actionId);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    db.recoveryActions.set(actionId, updated);
    return updated;
  }
}

export const recoveryActionRepository = new RecoveryActionRepository();
