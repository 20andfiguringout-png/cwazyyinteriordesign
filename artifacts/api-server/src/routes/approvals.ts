import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";
import crypto from "crypto";
import { requireAuthJwt } from "../middlewares/auth.js";

const router = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alveo_design_approvals (
      id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      design_id        TEXT NOT NULL,
      owner_email      TEXT NOT NULL,
      design_name      TEXT,
      client_email     TEXT,
      token            TEXT UNIQUE NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      client_note      TEXT,
      design_snapshot  JSONB,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at     TIMESTAMPTZ
    )
  `);
}
ensureTable().catch(() => {});

const sendApprovalSchema = z.object({
  designId:       z.string().min(1),
  designName:     z.string().max(200).optional(),
  clientEmail:    z.string().email().optional().nullable(),
  designSnapshot: z.record(z.unknown()).optional(),
});

const respondSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  note:   z.string().max(2000).optional(),
});

router.post("/approvals/send", requireAuthJwt, async (req: Request, res: Response) => {
  const email = (req as Request & { userEmail: string }).userEmail;
  const parsed = sendApprovalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { designId, designName, clientEmail, designSnapshot } = parsed.data;
  const token = crypto.randomBytes(32).toString("hex");
  try {
    const result = await pool.query<{ id: string; token: string }>(
      `INSERT INTO alveo_design_approvals
         (design_id, owner_email, design_name, client_email, token, design_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, token`,
      [designId, email, designName ?? null, clientEmail ?? null, token, designSnapshot ? JSON.stringify(designSnapshot) : null],
    );
    res.status(201).json({ approval: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to create approval request" });
  }
});

router.get("/approvals/portal/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  try {
    const result = await pool.query<{
      id: string; design_id: string; design_name: string | null; owner_email: string;
      client_email: string | null; status: string; client_note: string | null;
      design_snapshot: unknown; created_at: string; responded_at: string | null;
    }>(
      "SELECT id, design_id, design_name, owner_email, client_email, status, client_note, design_snapshot, created_at, responded_at FROM alveo_design_approvals WHERE token = $1",
      [token],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Approval request not found" });
      return;
    }
    res.json({ approval: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to fetch approval" });
  }
});

router.post("/approvals/portal/:token/respond", async (req: Request, res: Response) => {
  const { token } = req.params;
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { status, note } = parsed.data;
  try {
    const result = await pool.query(
      `UPDATE alveo_design_approvals
       SET status = $1, client_note = $2, responded_at = NOW()
       WHERE token = $3 AND status = 'pending'
       RETURNING id`,
      [status, note ?? null, token],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Approval not found or already responded" });
      return;
    }
    res.json({ ok: true, status });
  } catch {
    res.status(500).json({ error: "Failed to submit response" });
  }
});

router.get("/approvals/design/:designId", requireAuthJwt, async (req: Request, res: Response) => {
  const email = (req as Request & { userEmail: string }).userEmail;
  const { designId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, design_id, design_name, client_email, status, client_note, created_at, responded_at
       FROM alveo_design_approvals
       WHERE design_id = $1 AND owner_email = $2
       ORDER BY created_at DESC`,
      [designId, email],
    );
    res.json({ approvals: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

router.get("/approvals", requireAuthJwt, async (req: Request, res: Response) => {
  const email = (req as Request & { userEmail: string }).userEmail;
  try {
    const result = await pool.query(
      `SELECT id, design_id, design_name, client_email, status, client_note, created_at, responded_at
       FROM alveo_design_approvals
       WHERE owner_email = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [email],
    );
    res.json({ approvals: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

export default router;
