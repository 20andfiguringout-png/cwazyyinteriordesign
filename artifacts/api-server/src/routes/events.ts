import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";

const router = Router();
const pool   = new Pool({ connectionString: process.env["DATABASE_URL"] });

pool.query(`
  CREATE TABLE IF NOT EXISTS alveo_events (
    id BIGSERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    properties JSONB,
    session_id TEXT,
    user_email TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

const schema = z.object({
  name: z.string().min(1).max(100),
  props: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterSec: number } {
  const now   = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count++;
  if (entry.count > max) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

// Use req.ip (Express normalised, trusted-proxy-aware) rather than raw x-forwarded-for
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

router.post("/events", async (req: Request, res: Response) => {
  const ip    = clientIp(req);
  const limit = checkRateLimit(`events:${ip}`, 60_000, 100);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO alveo_events (event_name, properties, session_id) VALUES ($1, $2, $3)`,
      [parsed.data.name, JSON.stringify(parsed.data.props ?? {}), null],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("[events POST]", err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/events", async (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  if (!configuredToken || req.headers["x-admin-token"] !== configuredToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await pool.query<{ id: number; event_name: string; properties: unknown; session_id: string | null; created_at: string }>(
      `SELECT id, event_name, properties, session_id, created_at
       FROM alveo_events ORDER BY created_at DESC LIMIT 200`,
    );
    const events = result.rows.map((r) => ({ name: r.event_name, props: r.properties, at: r.created_at }));
    res.json({ events });
  } catch (err) {
    console.error("[events GET]", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
