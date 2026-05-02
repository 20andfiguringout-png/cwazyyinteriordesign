import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";

const router  = Router();
const pool    = new Pool({ connectionString: process.env["DATABASE_URL"] });

// ── In-memory helpers (kept for permission & mention-read state; these are
//    not yet persisted to DB, which is fine — they reset on restart and are
//    advisory-only features). ────────────────────────────────────────────────

type DesignCommentPermissions = {
  ownerEmail?: string;
  defaultRole: "viewer" | "editor";
  editors: string[];
};

const permissionStore: Map<string, DesignCommentPermissions> =
  ((globalThis as Record<string, unknown>).__alveoDesignCommentPermissions as Map<string, DesignCommentPermissions>) ??
  new Map<string, DesignCommentPermissions>();
(globalThis as Record<string, unknown>).__alveoDesignCommentPermissions = permissionStore;

const mentionReadStore: Map<string, Set<string>> =
  ((globalThis as Record<string, unknown>).__alveoDesignCommentMentionRead as Map<string, Set<string>>) ??
  new Map<string, Set<string>>();
(globalThis as Record<string, unknown>).__alveoDesignCommentMentionRead = mentionReadStore;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterSec: number } {
  const now   = Date.now();
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

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  return Array.from(new Set(matches.map((t) => t.slice(1).toLowerCase())));
}

function mentionKeysForUser(userEmail?: string): string[] {
  if (!userEmail) return [];
  const normalized = userEmail.trim().toLowerCase();
  const local      = normalized.split("@")[0] ?? normalized;
  return Array.from(new Set([normalized, local]));
}

function getEffectiveRole(permissions: DesignCommentPermissions, userEmail?: string): "viewer" | "editor" {
  if (permissions.ownerEmail && userEmail && permissions.ownerEmail.toLowerCase() === userEmail.toLowerCase()) return "editor";
  if (!userEmail) return permissions.defaultRole;
  const normalized = userEmail.toLowerCase();
  if (permissions.editors.map((v) => v.toLowerCase()).includes(normalized)) return "editor";
  return permissions.defaultRole;
}

function canManagePermissions(permissions: DesignCommentPermissions, userEmail?: string): boolean {
  if (!userEmail) return false;
  const normalized = userEmail.toLowerCase();
  if (permissions.ownerEmail?.toLowerCase() === normalized) return true;
  return permissions.editors.map((v) => v.toLowerCase()).includes(normalized);
}

function parseBoundaryTimestamp(value: string | null | undefined, endOfDay: boolean): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isDateOnly  = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const candidate   = isDateOnly ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : trimmed;
  const millis      = Date.parse(candidate);
  return Number.isNaN(millis) ? null : millis;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const postSchema = z.object({
  designId: z.string().min(1).max(200),
  text:     z.string().min(1).max(500),
  parentId: z.string().min(1).max(200).optional(),
});

const patchPermissionSchema = z.object({
  designId:      z.string().min(1).max(200),
  defaultRole:   z.enum(["viewer", "editor"]).optional(),
  addEditor:     z.string().email().optional(),
  removeEditor:  z.string().email().optional(),
  transferOwner: z.string().email().optional(),
});

const mentionAckSchema = z.object({
  action:      z.literal("mention-ack"),
  mentionUser: z.string().min(1).max(120),
  commentId:   z.string().min(1).max(200),
  read:        z.boolean(),
});

// ── DB row type ───────────────────────────────────────────────────────────────

interface CommentRow {
  id:          string;
  design_id:   string;
  user_email:  string;
  author_name: string;
  text:        string;
  parent_id:   string | null;
  mentions:    string[];
  mention_read: boolean;
  created_at:  string;
}

function rowToComment(r: CommentRow) {
  return {
    id:        r.id,
    designId:  r.design_id,
    text:      r.text,
    author:    r.author_name,
    createdAt: r.created_at,
    parentId:  r.parent_id ?? undefined,
    mentions:  r.mentions ?? [],
    mentionRead: r.mention_read,
  };
}

// ── GET /design-comments ──────────────────────────────────────────────────────

router.get("/design-comments", async (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  const userEmail       = req.headers["x-user-email"] as string | undefined;
  const isAll           = req.query["all"] === "1";

  if (isAll) {
    // Fail-closed: require a configured token; deny access if not set.
    if (!configuredToken || req.headers["x-admin-token"] !== configuredToken) {
      res.status(401).json({ error: "Unauthorized" }); return;
    }

    const mentionNeedle  = (req.query["mention"]   as string | undefined)?.trim().toLowerCase();
    const designNeedle   = (req.query["designId"]  as string | undefined)?.trim().toLowerCase();
    const authorNeedle   = (req.query["author"]    as string | undefined)?.trim().toLowerCase();
    const mentionsOnly   = req.query["mentionsOnly"] === "1";
    const fromTs         = parseBoundaryTimestamp(req.query["from"]  as string | undefined, false);
    const toTs           = parseBoundaryTimestamp(req.query["to"]    as string | undefined, true);
    const sort           = (req.query["sort"] as string | undefined) ?? "newest";
    const pageSize       = Math.max(1, Math.min(100, parseInt((req.query["pageSize"] as string) ?? "30", 10) || 30));
    const page           = Math.max(1, parseInt((req.query["page"] as string) ?? "1", 10) || 1);
    const offset         = (page - 1) * pageSize;

    const conditions: string[]    = [];
    const params:     unknown[]   = [];
    let   pi                      = 1;

    if (fromTs      !== null) { conditions.push(`created_at >= to_timestamp($${pi++}/1000.0)`); params.push(fromTs); }
    if (toTs        !== null) { conditions.push(`created_at <= to_timestamp($${pi++}/1000.0)`); params.push(toTs); }
    if (mentionNeedle)        { conditions.push(`$${pi++} = ANY(mentions)`);                    params.push(mentionNeedle); }
    if (designNeedle)         { conditions.push(`LOWER(design_id) LIKE $${pi++}`);              params.push(`%${designNeedle}%`); }
    if (authorNeedle)         { conditions.push(`LOWER(author_name) LIKE $${pi++}`);            params.push(`%${authorNeedle}%`); }
    if (mentionsOnly)         { conditions.push(`array_length(mentions, 1) > 0`); }

    const where    = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy  = sort === "oldest" ? "ASC"
                   : sort === "most-mentioned" ? "DESC" /* fallback */ : "DESC";
    const orderCol = sort === "most-mentioned" ? "array_length(mentions, 1) DESC NULLS LAST, created_at" : "created_at";

    try {
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM alveo_design_comments ${where}`, params,
      );
      const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

      const rows = await pool.query<CommentRow>(
        `SELECT * FROM alveo_design_comments ${where}
         ORDER BY ${orderCol} ${orderBy}
         LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, pageSize, offset],
      );

      const comments = rows.rows.map(rowToComment);
      res.json({ comments, total, page, pageSize, hasNextPage: offset + pageSize < total });
    } catch (err) {
      console.error("[design-comments GET all]", err);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  const designId = req.query["designId"] as string | undefined;
  if (!designId) { res.status(400).json({ error: "Missing designId" }); return; }

  const permissions  = permissionStore.get(designId) ?? { ownerEmail: undefined, defaultRole: "editor" as const, editors: [] };
  const role         = getEffectiveRole(permissions, userEmail);
  const mentionKeys  = mentionKeysForUser(userEmail);
  const relevantRead = new Set<string>();
  for (const k of mentionKeys) {
    const s = mentionReadStore.get(k);
    if (s) for (const id of s) relevantRead.add(id);
  }

  try {
    const rows = await pool.query<CommentRow>(
      `SELECT * FROM alveo_design_comments WHERE design_id = $1 ORDER BY created_at ASC`,
      [designId],
    );

    const comments = rows.rows.map((r) => {
      const base    = rowToComment(r);
      const hasMen  = mentionKeys.some((k) => (r.mentions ?? []).includes(k));
      return { ...base, mentionRead: !hasMen || relevantRead.has(r.id) };
    });

    res.json({
      comments,
      permissions,
      role,
      canManage: canManagePermissions(permissions, userEmail),
      unreadMentionCount: comments.filter((c) => !c.mentionRead).length,
    });
  } catch (err) {
    console.error("[design-comments GET]", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ── POST /design-comments ─────────────────────────────────────────────────────

router.post("/design-comments", async (req: Request, res: Response) => {
  const ip        = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const userEmail = req.headers["x-user-email"] as string | undefined;
  const limit     = checkRateLimit(`design-comments:${ip}`, 60_000, 80);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const permissions = permissionStore.get(parsed.data.designId) ?? { ownerEmail: userEmail, defaultRole: "editor" as const, editors: [] };
  permissionStore.set(parsed.data.designId, permissions);
  if (getEffectiveRole(permissions, userEmail) !== "editor") {
    res.status(403).json({ error: "Read-only comments" }); return;
  }

  const id       = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mentions = extractMentions(parsed.data.text);

  try {
    await pool.query(
      `INSERT INTO alveo_design_comments
         (id, design_id, user_email, author_name, text, parent_id, mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, parsed.data.designId, userEmail ?? "guest", userEmail ?? "Guest", parsed.data.text.trim(), parsed.data.parentId ?? null, mentions],
    );

    const rows = await pool.query<CommentRow>(
      `SELECT * FROM alveo_design_comments WHERE design_id = $1 ORDER BY created_at ASC`,
      [parsed.data.designId],
    );
    res.json({ comments: rows.rows.map(rowToComment) });
  } catch (err) {
    console.error("[design-comments POST]", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ── PATCH /design-comments ────────────────────────────────────────────────────

router.patch("/design-comments", (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  const userEmail       = req.headers["x-user-email"] as string | undefined;

  // mention-ack path
  const mentionAckParsed = mentionAckSchema.safeParse(req.body);
  if (mentionAckParsed.success) {
    // Fail-closed: mention-ack requires a configured admin token too.
    if (!configuredToken || req.headers["x-admin-token"] !== configuredToken) {
      res.status(401).json({ error: "Unauthorized" }); return;
    }
    const { mentionUser, commentId, read } = mentionAckParsed.data;
    const key     = mentionUser.trim().toLowerCase();
    const current = mentionReadStore.get(key) ?? new Set<string>();
    if (read) { current.add(commentId); } else { current.delete(commentId); }
    mentionReadStore.set(key, current);
    res.json({ ok: true, readCount: current.size });
    return;
  }

  // permission management path
  const parsed = patchPermissionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  if (!userEmail) { res.status(401).json({ error: "Unauthorized" }); return; }

  const current = permissionStore.get(parsed.data.designId) ?? { ownerEmail: userEmail, defaultRole: "editor" as const, editors: [] };
  if (!canManagePermissions(current, userEmail)) { res.status(403).json({ error: "Forbidden" }); return; }

  if (parsed.data.defaultRole)   { current.defaultRole = parsed.data.defaultRole; }
  if (parsed.data.addEditor) {
    const n = parsed.data.addEditor.toLowerCase();
    if (!current.editors.map((v) => v.toLowerCase()).includes(n)) current.editors.push(parsed.data.addEditor);
  }
  if (parsed.data.removeEditor)  { current.editors = current.editors.filter((v) => v.toLowerCase() !== parsed.data.removeEditor!.toLowerCase()); }
  if (parsed.data.transferOwner) {
    current.ownerEmail = parsed.data.transferOwner;
    current.editors    = current.editors.filter((v) => v.toLowerCase() !== parsed.data.transferOwner!.toLowerCase());
  }

  permissionStore.set(parsed.data.designId, current);
  res.json({ permissions: current });
});

export default router;
