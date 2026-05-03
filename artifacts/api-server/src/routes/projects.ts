import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";
import { requireAuthJwt } from "../middlewares/auth.js";
import { writeAuditLog } from "../lib/auditLog.js";

const router = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alveo_projects (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_email TEXT NOT NULL,
      name        TEXT NOT NULL,
      client_name TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE alveo_designs ADD COLUMN IF NOT EXISTS project_id TEXT;`);
}
ensureTable().catch(() => {});

const projectSchema = z.object({
  name:       z.string().min(1).max(200),
  clientName: z.string().max(200).optional().nullable(),
  status:     z.enum(["active", "completed", "on-hold"]).default("active"),
  notes:      z.string().max(2000).optional().nullable(),
});

const linkDesignSchema = z.object({
  designId: z.string().min(1).max(200),
});

type AuthedReq = Request & { userEmail: string };

router.get("/projects", requireAuthJwt, async (req: Request, res: Response) => {
  const email = (req as AuthedReq).userEmail;
  try {
    const result = await pool.query<{
      id: string; name: string; client_name: string | null; status: string;
      notes: string | null; created_at: string; updated_at: string; design_count: string;
    }>(
      `SELECT p.*, COUNT(d.id) AS design_count
       FROM alveo_projects p
       LEFT JOIN alveo_designs d ON d.project_id = p.id AND d.user_email = p.owner_email
       WHERE p.owner_email = $1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [email],
    );
    res.json({ projects: result.rows.map((r) => ({ ...r, designCount: parseInt(r.design_count) })) });
  } catch {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", requireAuthJwt, async (req: Request, res: Response) => {
  const email  = (req as AuthedReq).userEmail;
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const { name, clientName, status, notes } = parsed.data;
  try {
    const result = await pool.query<{ id: string; name: string }>(
      `INSERT INTO alveo_projects (owner_email, name, client_name, status, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, name, clientName ?? null, status, notes ?? null],
    );
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: email, action: "project.create", resourceType: "project", resourceId: result.rows[0]?.id, ip, meta: { name } });
    res.status(201).json({ project: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.put("/projects/:id", requireAuthJwt, async (req: Request, res: Response) => {
  const email  = (req as AuthedReq).userEmail;
  const id     = req.params.id as string;
  const parsed = projectSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (parsed.data.name       !== undefined) { fields.push(`name = $${i++}`);        values.push(parsed.data.name); }
    if (parsed.data.clientName !== undefined) { fields.push(`client_name = $${i++}`); values.push(parsed.data.clientName); }
    if (parsed.data.status     !== undefined) { fields.push(`status = $${i++}`);      values.push(parsed.data.status); }
    if (parsed.data.notes      !== undefined) { fields.push(`notes = $${i++}`);       values.push(parsed.data.notes); }
    if (fields.length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
    fields.push(`updated_at = NOW()`);
    values.push(email, id);
    const result = await pool.query(
      `UPDATE alveo_projects SET ${fields.join(", ")} WHERE owner_email = $${i} AND id = $${i + 1} RETURNING *`,
      values,
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: email, action: "project.update", resourceType: "project", resourceId: id, ip, meta: { fields: Object.keys(parsed.data) } });
    res.json({ project: result.rows[0] });
  } catch {
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", requireAuthJwt, async (req: Request, res: Response) => {
  const email  = (req as AuthedReq).userEmail;
  const id     = req.params.id as string;
  try {
    await pool.query("UPDATE alveo_designs SET project_id = NULL WHERE project_id = $1 AND user_email = $2", [id, email]);
    await pool.query("DELETE FROM alveo_projects WHERE id = $1 AND owner_email = $2", [id, email]);
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: email, action: "project.delete", resourceType: "project", resourceId: id, ip });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.post("/projects/:id/designs", requireAuthJwt, async (req: Request, res: Response) => {
  const email     = (req as AuthedReq).userEmail;
  const projectId = req.params.id as string;

  const parsed = linkDesignSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "designId required and must be a non-empty string" }); return; }
  const { designId } = parsed.data;

  try {
    // Verify the project belongs to the authenticated user before linking
    const projectCheck = await pool.query(
      "SELECT id FROM alveo_projects WHERE id = $1 AND owner_email = $2",
      [projectId, email],
    );
    if (projectCheck.rows.length === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Only link designs that also belong to the user
    const result = await pool.query(
      "UPDATE alveo_designs SET project_id = $1 WHERE id = $2 AND user_email = $3 RETURNING id",
      [projectId, designId, email],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Design not found" });
      return;
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: email, action: "project.link_design", resourceType: "project", resourceId: projectId, ip, meta: { designId } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to link design" });
  }
});

export default router;
