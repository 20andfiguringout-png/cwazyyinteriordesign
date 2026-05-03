import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now   = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }
  entry.count++;
  const remaining = Math.max(0, max - entry.count);
  if (entry.count > max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining, retryAfterSec: 0 };
}

const postDesignBodySchema = z.object({
  design: z.object({
    id:   z.string().min(1).max(200),
    name: z.string().max(200).optional().default("Design"),
  }).passthrough(),
});

const deleteDesignBodySchema = z.object({
  id: z.string().min(1),
});

// GET /designs — list all designs for the authenticated user
router.get("/designs", async (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const ip    = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(`designs:get:${user}:${ip}`, 60_000, 120);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  try {
    const result = await pool.query<{ id: string; name: string; config: unknown; saved_at: string }>(
      `SELECT id, name, config, saved_at FROM alveo_designs
       WHERE user_email = $1
       ORDER BY saved_at DESC
       LIMIT 100`,
      [user],
    );
    const designs = result.rows.map((r) => ({
      ...(r.config as Record<string, unknown>),
      id:      r.id,
      name:    r.name,
      savedAt: r.saved_at,
    }));
    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    res.json({ designs });
  } catch (err) {
    console.error("[designs GET]", err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /designs — upsert a design for the authenticated user
router.post("/designs", async (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const ip    = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(`designs:post:${user}:${ip}`, 60_000, 40);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = postDesignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    return;
  }

  const { id, name, ...rest } = parsed.data.design;
  const designName = (name as string | undefined) ?? "Design";

  try {
    await pool.query(
      `INSERT INTO alveo_designs (id, user_email, name, config, saved_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_email, id) DO UPDATE
         SET name = EXCLUDED.name,
             config = EXCLUDED.config,
             saved_at = NOW()`,
      [id, user, designName, JSON.stringify(rest)],
    );

    // Return updated list
    const result = await pool.query<{ id: string; name: string; config: unknown; saved_at: string }>(
      `SELECT id, name, config, saved_at FROM alveo_designs
       WHERE user_email = $1
       ORDER BY saved_at DESC
       LIMIT 100`,
      [user],
    );
    const designs = result.rows.map((r) => ({
      ...(r.config as Record<string, unknown>),
      id:      r.id,
      name:    r.name,
      savedAt: r.saved_at,
    }));
    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    res.json({ designs });
  } catch (err) {
    console.error("[designs POST]", err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /designs — delete a design for the authenticated user
router.delete("/designs", async (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const ip    = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(`designs:delete:${user}:${ip}`, 60_000, 50);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = deleteDesignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" }); return;
  }

  try {
    await pool.query(
      `DELETE FROM alveo_designs WHERE user_email = $1 AND id = $2`,
      [user, parsed.data.id],
    );

    const result = await pool.query<{ id: string; name: string; config: unknown; saved_at: string }>(
      `SELECT id, name, config, saved_at FROM alveo_designs
       WHERE user_email = $1
       ORDER BY saved_at DESC
       LIMIT 100`,
      [user],
    );
    const designs = result.rows.map((r) => ({
      ...(r.config as Record<string, unknown>),
      id:      r.id,
      name:    r.name,
      savedAt: r.saved_at,
    }));
    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    res.json({ designs });
  } catch (err) {
    console.error("[designs DELETE]", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
