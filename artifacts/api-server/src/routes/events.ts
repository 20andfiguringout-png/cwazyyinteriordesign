import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

const router = Router();

const schema = z.object({
  name: z.string().min(1).max(100),
  props: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

type EventRecord = {
  name: string;
  props?: Record<string, string | number | boolean | null>;
  at: string;
};

const store: EventRecord[] = (globalThis as Record<string, unknown>).__alveoEvents as EventRecord[] || [];
(globalThis as Record<string, unknown>).__alveoEvents = store;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
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

router.post("/events", (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
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

  store.push({ ...parsed.data, at: new Date().toISOString() });
  if (store.length > 1000) store.splice(0, store.length - 1000);

  res.json({ ok: true });
});

router.get("/events", (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  // Fail-closed: if no token is configured, deny all access to the admin listing.
  // This prevents accidental exposure of analytics data in unprotected deployments.
  if (!configuredToken || req.headers["x-admin-token"] !== configuredToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ events: store.slice(-200) });
});

export default router;
