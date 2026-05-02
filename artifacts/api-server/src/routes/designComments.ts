import { Router } from "express";
import { z } from "zod";
import type { Request, Response } from "express";

const router = Router();

type DesignComment = {
  id: string;
  designId: string;
  text: string;
  author: string;
  createdAt: string;
  parentId?: string;
  mentions?: string[];
};

type DesignCommentPermissions = {
  ownerEmail?: string;
  defaultRole: "viewer" | "editor";
  editors: string[];
};

type AuditEntry = {
  id: string;
  designId: string;
  action: string;
  actor: string;
  at: string;
  details?: string;
};

const commentStore: Map<string, DesignComment[]> = (globalThis as Record<string, unknown>).__alveoDesignComments as Map<string, DesignComment[]> || new Map<string, DesignComment[]>();
(globalThis as Record<string, unknown>).__alveoDesignComments = commentStore;

const permissionStore: Map<string, DesignCommentPermissions> = (globalThis as Record<string, unknown>).__alveoDesignCommentPermissions as Map<string, DesignCommentPermissions> || new Map<string, DesignCommentPermissions>();
(globalThis as Record<string, unknown>).__alveoDesignCommentPermissions = permissionStore;

const mentionReadStore: Map<string, Set<string>> = (globalThis as Record<string, unknown>).__alveoDesignCommentMentionRead as Map<string, Set<string>> || new Map<string, Set<string>>();
(globalThis as Record<string, unknown>).__alveoDesignCommentMentionRead = mentionReadStore;

const auditStore: Map<string, AuditEntry[]> = (globalThis as Record<string, unknown>).__alveoDesignCommentAudit as Map<string, AuditEntry[]> || new Map<string, AuditEntry[]>();
(globalThis as Record<string, unknown>).__alveoDesignCommentAudit = auditStore;

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

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  const names = matches.map((t) => t.slice(1).toLowerCase());
  return Array.from(new Set(names));
}

function mentionKeysForUser(userEmail?: string): string[] {
  if (!userEmail) return [];
  const normalized = userEmail.trim().toLowerCase();
  const local = normalized.split("@")[0] ?? normalized;
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

function pushAudit(designId: string, action: string, actor: string, details?: string) {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    designId,
    action,
    actor,
    at: new Date().toISOString(),
    details,
  };
  const current = auditStore.get(designId) ?? [];
  auditStore.set(designId, [...current, entry].slice(-200));
}

function parseBoundaryTimestamp(value: string | null | undefined, endOfDay: boolean): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const candidate = isDateOnly ? `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : trimmed;
  const millis = Date.parse(candidate);
  return Number.isNaN(millis) ? null : millis;
}

const postSchema = z.object({
  designId: z.string().min(1).max(200),
  text: z.string().min(1).max(500),
  parentId: z.string().min(1).max(200).optional(),
});

const patchPermissionSchema = z.object({
  designId: z.string().min(1).max(200),
  defaultRole: z.enum(["viewer", "editor"]).optional(),
  addEditor: z.string().email().optional(),
  removeEditor: z.string().email().optional(),
  transferOwner: z.string().email().optional(),
});

const mentionAckSchema = z.object({
  action: z.literal("mention-ack"),
  mentionUser: z.string().min(1).max(120),
  commentId: z.string().min(1).max(200),
  read: z.boolean(),
});

router.get("/design-comments", (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  const userEmail = req.headers["x-user-email"] as string | undefined;
  const isAll = req.query["all"] === "1";

  if (isAll) {
    if (configuredToken) {
      if (req.headers["x-admin-token"] !== configuredToken) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const mentionNeedle = (req.query["mention"] as string | undefined)?.trim().toLowerCase();
    const designNeedle = (req.query["designId"] as string | undefined)?.trim().toLowerCase();
    const authorNeedle = (req.query["author"] as string | undefined)?.trim().toLowerCase();
    const mentionsOnly = req.query["mentionsOnly"] === "1";
    const fromTs = parseBoundaryTimestamp(req.query["from"] as string | undefined, false);
    const toTs = parseBoundaryTimestamp(req.query["to"] as string | undefined, true);
    const sort = (req.query["sort"] as string | undefined) ?? "newest";
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query["pageSize"] as string ?? "30", 10) || 30));
    const page = Math.max(1, parseInt(req.query["page"] as string ?? "1", 10) || 1);

    const all = Array.from(commentStore.values()).flat();
    const filtered = all.filter((comment) => {
      if (fromTs !== null || toTs !== null) {
        const createdTs = Date.parse(comment.createdAt);
        if (Number.isNaN(createdTs)) return false;
        if (fromTs !== null && createdTs < fromTs) return false;
        if (toTs !== null && createdTs > toTs) return false;
      }
      if (mentionNeedle && !(comment.mentions ?? []).includes(mentionNeedle)) return false;
      if (designNeedle && !comment.designId.toLowerCase().includes(designNeedle)) return false;
      if (authorNeedle && !comment.author.toLowerCase().includes(authorNeedle)) return false;
      if (mentionsOnly && (comment.mentions?.length ?? 0) === 0) return false;
      return true;
    });

    const readSet = mentionNeedle ? (mentionReadStore.get(mentionNeedle) ?? new Set<string>()) : new Set<string>();

    if (sort === "oldest") {
      filtered.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    } else if (sort === "most-mentioned") {
      filtered.sort((a, b) => (b.mentions?.length ?? 0) - (a.mentions?.length ?? 0) || (a.createdAt < b.createdAt ? 1 : -1));
    } else {
      filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }

    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    const comments = paged.map((c) => ({ ...c, mentionRead: readSet.has(c.id) }));

    res.json({ comments, total: filtered.length, page, pageSize, hasNextPage: start + pageSize < filtered.length });
    return;
  }

  const designId = req.query["designId"] as string | undefined;
  if (!designId) {
    res.status(400).json({ error: "Missing designId" });
    return;
  }

  const permissions = permissionStore.get(designId) ?? { ownerEmail: undefined, defaultRole: "editor" as const, editors: [] };
  const role = getEffectiveRole(permissions, userEmail);
  const comments = commentStore.get(designId) ?? [];
  const mentionKeys = mentionKeysForUser(userEmail);
  const relevantReadSet = new Set<string>();
  for (const key of mentionKeys) {
    const readSet = mentionReadStore.get(key);
    if (!readSet) continue;
    for (const id of readSet) relevantReadSet.add(id);
  }

  const commentsWithRead = comments.map((comment) => {
    const mentions = comment.mentions ?? [];
    const hasMention = mentionKeys.some((k) => mentions.includes(k));
    return { ...comment, mentionRead: !hasMention || relevantReadSet.has(comment.id) };
  });

  res.json({
    comments: commentsWithRead,
    permissions,
    role,
    canManage: canManagePermissions(permissions, userEmail),
    auditTrail: (auditStore.get(designId) ?? []).slice(-20).reverse(),
    unreadMentionCount: commentsWithRead.filter((c) => !c.mentionRead).length,
  });
});

router.post("/design-comments", (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
  const userEmail = req.headers["x-user-email"] as string | undefined;
  const limit = checkRateLimit(`design-comments:${ip}`, 60_000, 80);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const permissions = permissionStore.get(parsed.data.designId) ?? { ownerEmail: userEmail, defaultRole: "editor" as const, editors: [] };
  permissionStore.set(parsed.data.designId, permissions);
  const role = getEffectiveRole(permissions, userEmail);
  if (role !== "editor") {
    res.status(403).json({ error: "Read-only comments" });
    return;
  }

  const nextComment: DesignComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    designId: parsed.data.designId,
    text: parsed.data.text.trim(),
    author: userEmail ?? "Guest",
    createdAt: new Date().toISOString(),
    parentId: parsed.data.parentId,
    mentions: extractMentions(parsed.data.text),
  };

  const current = commentStore.get(parsed.data.designId) ?? [];
  const next = [...current, nextComment].slice(-200);
  commentStore.set(parsed.data.designId, next);
  pushAudit(parsed.data.designId, "comment_added", userEmail ?? "Guest", nextComment.parentId ? `reply:${nextComment.parentId}` : undefined);
  res.json({ comments: next });
});

router.patch("/design-comments", (req: Request, res: Response) => {
  const configuredToken = process.env["EVENTS_ADMIN_TOKEN"];
  const userEmail = req.headers["x-user-email"] as string | undefined;

  const mentionAckParsed = mentionAckSchema.safeParse(req.body);
  if (mentionAckParsed.success) {
    if (configuredToken && req.headers["x-admin-token"] !== configuredToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { mentionUser, commentId, read } = mentionAckParsed.data;
    const key = mentionUser.trim().toLowerCase();
    const current = mentionReadStore.get(key) ?? new Set<string>();
    if (read) { current.add(commentId); } else { current.delete(commentId); }
    mentionReadStore.set(key, current);
    res.json({ ok: true, readCount: current.size });
    return;
  }

  const parsed = patchPermissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  if (!userEmail) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const current = permissionStore.get(parsed.data.designId) ?? { ownerEmail: userEmail, defaultRole: "editor" as const, editors: [] };
  if (!canManagePermissions(current, userEmail)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (parsed.data.defaultRole) {
    current.defaultRole = parsed.data.defaultRole;
    pushAudit(parsed.data.designId, "default_role_updated", userEmail, parsed.data.defaultRole);
  }
  if (parsed.data.addEditor) {
    const normalized = parsed.data.addEditor.toLowerCase();
    if (!current.editors.map((v) => v.toLowerCase()).includes(normalized)) {
      current.editors.push(parsed.data.addEditor);
      pushAudit(parsed.data.designId, "editor_added", userEmail, parsed.data.addEditor);
    }
  }
  if (parsed.data.removeEditor) {
    const target = parsed.data.removeEditor.toLowerCase();
    current.editors = current.editors.filter((v) => v.toLowerCase() !== target);
    pushAudit(parsed.data.designId, "editor_removed", userEmail, parsed.data.removeEditor);
  }
  if (parsed.data.transferOwner) {
    current.ownerEmail = parsed.data.transferOwner;
    const transferred = parsed.data.transferOwner.toLowerCase();
    current.editors = current.editors.filter((v) => v.toLowerCase() !== transferred);
    pushAudit(parsed.data.designId, "owner_transferred", userEmail, parsed.data.transferOwner);
  }

  permissionStore.set(parsed.data.designId, current);
  res.json({ permissions: current });
});

export default router;
