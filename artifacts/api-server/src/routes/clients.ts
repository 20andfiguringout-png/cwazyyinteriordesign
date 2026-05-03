import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";
import { requireAuth } from "../middlewares/authMiddleware";
import { writeAuditLog } from "../lib/auditLog.js";

const router = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alveo_clients (
      id           TEXT NOT NULL,
      owner_email  TEXT NOT NULL,
      name         TEXT NOT NULL,
      email        TEXT,
      phone        TEXT,
      address      TEXT,
      project_type TEXT,
      status       TEXT NOT NULL DEFAULT 'active',
      notes        TEXT,
      budget       TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (owner_email, id)
    )
  `);
}

const clientBodySchema = z.object({
  client: z.object({
    id:          z.string().optional(),
    name:        z.string().min(1).max(200),
    email:       z.string().email().optional().nullable(),
    phone:       z.string().max(50).optional().nullable(),
    address:     z.string().max(500).optional().nullable(),
    projectType: z.string().max(100).optional().nullable(),
    status:      z.enum(["active", "completed", "on-hold"]).default("active"),
    notes:       z.string().max(2000).optional().nullable(),
    budget:      z.string().max(100).optional().nullable(),
  }),
});

const deleteClientSchema = z.object({
  id: z.string().min(1).max(200),
});

router.get("/clients", requireAuth, async (req: Request, res: Response) => {
  const user = req.user?.email ?? null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await ensureTable();
    const result = await pool.query(`SELECT * FROM alveo_clients WHERE owner_email = $1 ORDER BY created_at DESC`, [user]);
    res.json({ clients: result.rows });
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/clients", requireAuth, async (req: Request, res: Response) => {
  const user = req.user?.email ?? null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = clientBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { client } = parsed.data;
  const id = client.id ?? crypto.randomUUID();
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO alveo_clients
         (id, owner_email, name, email, phone, address, project_type, status, notes, budget, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (owner_email, id) DO UPDATE SET
         name=$3, email=$4, phone=$5, address=$6, project_type=$7,
         status=$8, notes=$9, budget=$10, updated_at=NOW()`,
      [id, user, client.name, client.email ?? null, client.phone ?? null,
       client.address ?? null, client.projectType ?? null, client.status,
       client.notes ?? null, client.budget ?? null],
    );
    const result = await pool.query(`SELECT * FROM alveo_clients WHERE owner_email = $1 ORDER BY created_at DESC`, [user]);
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: user, action: client.id ? "client.update" : "client.create", resourceType: "client", resourceId: id, ip, meta: { name: client.name } });
    res.json({ clients: result.rows });
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

router.delete("/clients", requireAuth, async (req: Request, res: Response) => {
  const user = req.user?.email ?? null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = deleteClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid or missing client id" });
    return;
  }

  try {
    await ensureTable();
    await pool.query(`DELETE FROM alveo_clients WHERE owner_email = $1 AND id = $2`, [user, parsed.data.id]);
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    writeAuditLog({ actorEmail: user, action: "client.delete", resourceType: "client", resourceId: parsed.data.id, ip });
    const result = await pool.query(`SELECT * FROM alveo_clients WHERE owner_email = $1 ORDER BY created_at DESC`, [user]);
    res.json({ clients: result.rows });
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
