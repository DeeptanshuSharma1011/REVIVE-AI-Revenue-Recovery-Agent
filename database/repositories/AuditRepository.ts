/**
 * @license
 * REVIVE — Audit Repository
 */

import { db } from '../db';
import { AuditLog } from '../schema';

export class AuditRepository {
  findById(logId: string): AuditLog | null {
    return db.auditLogs.get(logId) || null;
  }

  findByCaseId(caseId: string): AuditLog[] {
    const results: AuditLog[] = [];
    for (const log of db.auditLogs.values()) {
      if (log.case_id === caseId) {
        results.push(log);
      }
    }
    return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  findAll(limit = 100, offset = 0): { items: AuditLog[]; total: number } {
    const list = Array.from(db.auditLogs.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  create(log: AuditLog): AuditLog {
    db.auditLogs.set(log.log_id, log);
    return log;
  }
}

export const auditRepository = new AuditRepository();
