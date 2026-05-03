import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { issueToken, verifyToken } from "../middlewares/auth.js";
import { writeAuditLog } from "../lib/auditLog.js";

const router = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function ensurePasswordColumn() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
}
ensurePasswordColumn().catch(() => {});

// ─── Schemas ──────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email:     z.string().email().max(300),
  password:  z.string().min(8).max(200),
  firstName: z.string().max(100).optional(),
  lastName:  z.string().max(100).optional(),
});

const loginSchema = z.object({
  email:    z.string().email().max(300),
  password: z.string().max(200),
});

// ─── In-memory brute-force protection ────────────────────────────────────────
const authRateMap = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX       = 10;
  const now       = Date.now();
  const entry     = authRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    authRateMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  entry.count++;
  if (entry.count > MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

// ─── Dummy hash used for constant-time comparison on unknown emails ────────────
const DUMMY_HASH = await bcrypt.hash("dummy-constant-time-placeholder", 12);

// ─── POST /auth/register ─────────────────────────────────────────────────────
router.post("/auth/register", async (req: Request, res: Response) => {
  const ip  = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rl  = authRateLimit(`register:${ip}`);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    res.status(429).json({ error: "Too many requests — please wait before trying again" });
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { email, password, firstName, lastName } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [emailLower]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const hash   = await bcrypt.hash(password, 12);
    const result = await pool.query<{ id: string; email: string; first_name: string | null; last_name: string | null }>(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [emailLower, hash, firstName ?? null, lastName ?? null],
    );
    const user  = result.rows[0];
    const token = issueToken(emailLower);
    writeAuditLog({ actorEmail: emailLower, action: "auth.register", resourceType: "user", resourceId: emailLower, ip });
    res.status(201).json({
      token,
      user: { email: user.email, firstName: user.first_name, lastName: user.last_name },
    });
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rl = authRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    res.status(429).json({ error: "Too many requests — please wait before trying again" });
    return;
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    const result = await pool.query<{
      id: string; email: string; first_name: string | null; last_name: string | null;
      profile_image_url: string | null; password_hash: string | null;
    }>(
      "SELECT id, email, first_name, last_name, profile_image_url, password_hash FROM users WHERE email = $1",
      [emailLower],
    );

    const user = result.rows[0];

    if (!user || !user.password_hash) {
      // Always run bcrypt to prevent timing-based email enumeration
      await bcrypt.compare(password, DUMMY_HASH);
      writeAuditLog({ actorEmail: emailLower, action: "auth.login.failure", resourceType: "user", resourceId: emailLower, ip, meta: { reason: !user ? "unknown_email" : "no_password_hash" } });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
      } else {
        res.status(401).json({ error: "This account uses a different sign-in method" });
      }
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      writeAuditLog({ actorEmail: emailLower, action: "auth.login.failure", resourceType: "user", resourceId: emailLower, ip, meta: { reason: "wrong_password" } });
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = issueToken(emailLower);
    writeAuditLog({ actorEmail: emailLower, action: "auth.login.success", resourceType: "user", resourceId: emailLower, ip });
    res.json({
      token,
      user: {
        email:           user.email,
        firstName:       user.first_name,
        lastName:        user.last_name,
        profileImageUrl: user.profile_image_url,
      },
    });
  } catch (err) {
    console.error("login error", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/auth/me", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const email = verifyToken(token);
  if (!email) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  try {
    const result = await pool.query<{
      email: string; first_name: string | null; last_name: string | null; profile_image_url: string | null;
    }>(
      "SELECT email, first_name, last_name, profile_image_url FROM users WHERE email = $1",
      [email],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const u = result.rows[0];
    res.json({
      user: {
        email:           u.email,
        firstName:       u.first_name,
        lastName:        u.last_name,
        profileImageUrl: u.profile_image_url,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
