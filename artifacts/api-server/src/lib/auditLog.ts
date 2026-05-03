/**
 * auditLog.ts — shared tamper-evident request audit trail
 *
 * Writes fire-and-forget rows to `alveo_audit_log`.
 * Every sensitive mutation (and auth events) should call `writeAuditLog`.
 * Failures are swallowed so they never affect the request path.
 */
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

pool.query(`
  CREATE TABLE IF NOT EXISTS alveo_audit_log (
    id            BIGSERIAL    PRIMARY KEY,
    actor_email   TEXT,
    action        TEXT         NOT NULL,
    resource_type TEXT,
    resource_id   TEXT,
    ip            TEXT,
    meta          JSONB,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

pool.query(`
  CREATE INDEX IF NOT EXISTS alveo_audit_log_actor  ON alveo_audit_log (actor_email);
  CREATE INDEX IF NOT EXISTS alveo_audit_log_action ON alveo_audit_log (action);
  CREATE INDEX IF NOT EXISTS alveo_audit_log_ts     ON alveo_audit_log (created_at DESC);
`).catch(() => {});

export interface AuditEntry {
  actorEmail?:   string | null;
  action:        string;
  resourceType?: string | null;
  resourceId?:   string | null;
  ip?:           string | null;
  meta?:         Record<string, unknown> | null;
}

export function writeAuditLog(entry: AuditEntry): void {
  pool.query(
    `INSERT INTO alveo_audit_log (actor_email, action, resource_type, resource_id, ip, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.actorEmail  ?? null,
      entry.action,
      entry.resourceType ?? null,
      entry.resourceId   ?? null,
      entry.ip           ?? null,
      entry.meta         ? JSON.stringify(entry.meta) : null,
    ],
  ).catch(() => { /* never block the request */ });
}
