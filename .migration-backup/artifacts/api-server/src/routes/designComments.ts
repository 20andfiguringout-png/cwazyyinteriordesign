import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";
import { Pool } from "pg";

const router  = Router();
const pool    = new Pool({ connectionString: process.env["DATABASE_URL"] });

// ── Types ────────────────────────────────────────────────────────────────────

type DesignCommentPermissions = {
  ownerEmail?: string;
  defaultRole: "viewer" | "editor";
  editors: string[];
};

// ── Rate limiting ─────────────────────────────────────────────────────────────

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

// ── Audit helper ──────────────────────────────────────────────────────────────

async function writeAudit(opts: {
  actorEmail?: string;
  action: string;
  designId?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO alveo_design_audit (actor_email, action, design_id, target_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        opts.actorEmail ?? null,
        opts.action,
        opts.designId ?? null,
        opts.targetId ?? null,
        opts.before !== undefined ? JSON.stringify(opts.before) : null,
        opts.after  !== undefined ? JSON.stringify(opts.after)  : null,
      ],
    );
  } catch (auditErr) {
    console.error("[audit write failed]", auditErr);
  }
}

// ── Permission helpers ────────────────────────────────────────────────────────

async function getPermissions(designId: string): Promise<DesignCommentPermissions> {
  const result = await pool.query<{ owner_email: string | null; default_role: string; editors: string[] }>(
    `SELECT owner_email, default_role, editors FROM alveo_design_permissions WHERE design_id = $1`,
    [designId],
  );
  if (result.rows.length === 0) {
    return { ownerEmail: undefined, defaultRole: "editor", editors: [] };
  }
  const row = result.rows[0]!;
  return {
    ownerEmail:  row.owner_email ?? undefined,
    defaultRole: (row.default_role as "viewer" | "editor") ?? "editor",
    editors:     row.editors ?? [],
  };
}

async function upsertPermissions(designId: string, perms: DesignCommentPermissions): Promise<void> {
  await pool.query(
    `INSERT INTO alveo_design_permissions (design_id, owner_email, default_role, editors)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (design_id) DO UPDATE
       SET owner_email  = EXCLUDED.owner_email,
           default_role = EXCLUDED.default_role,
           editors      = EXCLUDED.editors`,
    [designId, perms.ownerEmail ?? null, perms.defaultRole, perms.editors],
  );
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
    const orderBy  = sort === "oldest" ? "ASC" : "DESC";
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

  try {
    const permissions  = await getPermissions(designId);
    const role         = getEffectiveRole(permissions, userEmail);
    const mentionKeys  = mentionKeysForUser(userEmail);

    // Fetch which comment IDs have been read by this user from DB
    const relevantRead = new Set<string>();
    if (mentionKeys.length > 0) {
      const readRows = await pool.query<{ comment_id: string }>(
        `SELECT comment_id FROM alveo_mention_reads
         WHERE mention_user = ANY($1) AND read = TRUE`,
        [mentionKeys],
      );
      for (const r of readRows.rows) relevantRead.add(r.comment_id);
    }

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

  try {
    let permissions = await getPermissions(parsed.data.designId);

    // If no permissions exist yet, initialize with current user as owner
    if (!permissions.ownerEmail && userEmail) {
      permissions = { ownerEmail: userEmail, defaultRole: "editor", editors: [] };
      await upsertPermissions(parsed.data.designId, permissions);
    }

    if (getEffectiveRole(permissions, userEmail) !== "editor") {
      res.status(403).json({ error: "Read-only comments" }); return;
    }

    const id       = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mentions = extractMentions(parsed.data.text);

    await pool.query(
      `INSERT INTO alveo_design_comments
         (id, design_id, user_email, author_name, text, parent_id, mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, parsed.data.designId, userEmail ?? "guest", userEmail ?? "Guest", parsed.data.text.trim(), parsed.data.parentId ?? null, mentions],
    );

    await writeAudit({
      actorEmail: userEmail,
      action: "comment.create",
      designId: parsed.data.designId,
      targetId: id,
      after: { text: parsed.data.text.trim(), parentId: parsed.data.parentId ?? null, mentions },
    });

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

router.patch("/design-comments", async (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  const userEmail       = req.headers["x-user-email"] as string | undefined;

  // mention-ack path
  const mentionAckParsed = mentionAckSchema.safeParse(req.body);
  if (mentionAckParsed.success) {
    if (!configuredToken || req.headers["x-admin-token"] !== configuredToken) {
      res.status(401).json({ error: "Unauthorized" }); return;
    }
    const { mentionUser, commentId, read } = mentionAckParsed.data;
    const key = mentionUser.trim().toLowerCase();

    try {
      if (read) {
        await pool.query(
          `INSERT INTO alveo_mention_reads (mention_user, comment_id, read)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (mention_user, comment_id) DO UPDATE SET read = TRUE`,
          [key, commentId],
        );
      } else {
        await pool.query(
          `INSERT INTO alveo_mention_reads (mention_user, comment_id, read)
           VALUES ($1, $2, FALSE)
           ON CONFLICT (mention_user, comment_id) DO UPDATE SET read = FALSE`,
          [key, commentId],
        );
      }

      await writeAudit({
        actorEmail: userEmail,
        action: "mention.ack",
        targetId: commentId,
        after: { mentionUser: key, read },
      });

      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*) FROM alveo_mention_reads WHERE mention_user = $1 AND read = TRUE`,
        [key],
      );
      const readCount = parseInt(countResult.rows[0]?.count ?? "0", 10);
      res.json({ ok: true, readCount });
    } catch (err) {
      console.error("[design-comments PATCH mention-ack]", err);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  // permission management path
  const parsed = patchPermissionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  if (!userEmail) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    let current = await getPermissions(parsed.data.designId);
    const before = { ...current };

    // Bootstrap permissions if none exist
    if (!current.ownerEmail) {
      current = { ownerEmail: userEmail, defaultRole: "editor", editors: [] };
    }

    if (!canManagePermissions(current, userEmail)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const actions: string[] = [];
    if (parsed.data.defaultRole) {
      actions.push(`defaultRole:${current.defaultRole}→${parsed.data.defaultRole}`);
      current.defaultRole = parsed.data.defaultRole;
    }
    if (parsed.data.addEditor) {
      const n = parsed.data.addEditor.toLowerCase();
      if (!current.editors.map((v) => v.toLowerCase()).includes(n)) {
        current.editors.push(parsed.data.addEditor);
        actions.push(`addEditor:${parsed.data.addEditor}`);
      }
    }
    if (parsed.data.removeEditor) {
      current.editors = current.editors.filter((v) => v.toLowerCase() !== parsed.data.removeEditor!.toLowerCase());
      actions.push(`removeEditor:${parsed.data.removeEditor}`);
    }
    if (parsed.data.transferOwner) {
      current.ownerEmail = parsed.data.transferOwner;
      current.editors    = current.editors.filter((v) => v.toLowerCase() !== parsed.data.transferOwner!.toLowerCase());
      actions.push(`transferOwner:${parsed.data.transferOwner}`);
    }

    await upsertPermissions(parsed.data.designId, current);

    await writeAudit({
      actorEmail: userEmail,
      action: "permissions.update",
      designId: parsed.data.designId,
      before,
      after: { ...current, changes: actions },
    });

    res.json({ permissions: current });
  } catch (err) {
    console.error("[design-comments PATCH permissions]", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
