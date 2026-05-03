import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

const isProduction = process.env["NODE_ENV"] === "production";
const envSecret    = process.env["JWT_SECRET"];

if (isProduction && !envSecret) {
  throw new Error("JWT_SECRET environment variable must be set in production");
}

const JWT_SECRET = envSecret ?? "alveo-dev-secret-change-in-production";

const tokenPayloadSchema = z.object({
  email: z.string().email(),
  iat:   z.number().optional(),
  exp:   z.number().optional(),
});

export type AuthenticatedRequest = Request & { userEmail: string };

export function issueToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const parsed  = tokenPayloadSchema.safeParse(payload);
    if (!parsed.success) return null;
    return parsed.data.email;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const email = verifyToken(token);
  if (!email) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  (req as AuthenticatedRequest).userEmail = email;
  next();
}

export { requireAuth as requireAuthJwt };
