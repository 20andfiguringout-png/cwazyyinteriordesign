import { Router, type IRouter, type Request, type Response } from "express";
import { Pool } from "pg";

const router: IRouter = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const startedAt = Date.now();

async function handleHealth(_req: Request, res: Response): Promise<void> {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  // Verify the database is reachable with a lightweight query
  let db: "ok" | "error" = "ok";
  let dbLatencyMs: number | null = null;
  try {
    const t0 = Date.now();
    await pool.query("SELECT 1");
    dbLatencyMs = Date.now() - t0;
  } catch {
    db = "error";
  }

  const status = db === "ok" ? "ok" : "degraded";
  const code   = db === "ok" ? 200 : 503;

  res.status(code).json({
    status,
    uptime: uptimeSeconds,
    db: { status: db, latencyMs: dbLatencyMs },
    timestamp: new Date().toISOString(),
  });
}

// Two paths — /api/health (user-facing) and /api/healthz (legacy)
router.get("/health",  handleHealth);
router.get("/healthz", handleHealth);

export default router;
