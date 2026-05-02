import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

const router = Router();

type SavedDesign = Record<string, unknown>;

const designsStore: Map<string, SavedDesign[]> = (globalThis as Record<string, unknown>).__alveoDesignsStore as Map<string, SavedDesign[]> || new Map<string, SavedDesign[]>();
(globalThis as Record<string, unknown>).__alveoDesignsStore = designsStore;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
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
  design: z.record(z.string(), z.unknown()),
});

const deleteDesignBodySchema = z.object({
  id: z.string().min(1),
});

router.get("/designs", (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(`designs:get:${user}:${ip}`, 60_000, 120);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  const designs = designsStore.get(user) ?? [];
  res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
  res.json({ designs });
});

router.post("/designs", (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
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

  const current = designsStore.get(user) ?? [];
  const next = [...current, parsed.data.design].slice(-50);
  designsStore.set(user, next);
  res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
  res.json({ designs: next });
});

router.delete("/designs", (req: Request, res: Response) => {
  const user = req.headers["x-user-email"] as string | undefined;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(`designs:delete:${user}:${ip}`, 60_000, 50);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = deleteDesignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const current = designsStore.get(user) ?? [];
  const next = current.filter((d) => (d as Record<string, unknown>)["id"] !== parsed.data.id);
  designsStore.set(user, next);
  res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
  res.json({ designs: next });
});

export default router;
