import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { issueToken, verifyToken } from "../middlewares/auth.js";

const router = Router();
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

async function ensurePasswordColumn() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);
}

ensurePasswordColumn().catch(() => {});

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

router.post("/auth/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { email, password, firstName, lastName } = parsed.data;
  const emailLower = email.toLowerCase();

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [emailLower],
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query<{ id: string; email: string; first_name: string | null; last_name: string | null }>(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [emailLower, hash, firstName ?? null, lastName ?? null],
    );
    const user = result.rows[0];
    const token = issueToken(emailLower);

    res.status(201).json({
      token,
      user: {
        email:     user.email,
        firstName: user.first_name,
        lastName:  user.last_name,
      },
    });
  } catch (err) {
    console.error("register error", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
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

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      res.status(401).json({ error: "This account uses a different sign-in method" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = issueToken(emailLower);
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

router.post("/auth/token", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email required" });
    return;
  }
  const emailLower = email.toLowerCase();
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [emailLower]);
  if (existing.rows.length === 0) {
    await pool.query(
      "INSERT INTO users (id, email) VALUES (gen_random_uuid(), $1) ON CONFLICT DO NOTHING",
      [emailLower],
    );
  }
  const token = issueToken(emailLower);
  res.json({ token, email: emailLower });
});

export default router;
