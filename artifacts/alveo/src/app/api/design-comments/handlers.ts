import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

export type DesignComment = {
  id: string;
  designId: string;
  text: string;
  author: string;
  createdAt: string;
  parentId?: string;
  mentions?: string[];
};

export type DesignCommentPermissions = {
  ownerEmail?: string;
  defaultRole: 'viewer' | 'editor';
  editors: string[];
};

export type DesignCommentAuditEntry = {
  id: string;
  designId: string;
  action:
    | 'comment_added'
    | 'default_role_updated'
    | 'editor_added'
    | 'editor_removed'
    | 'owner_transferred';
  actor: string;
  at: string;
  details?: string;
};

const postSchema = z.object({
  designId: z.string().min(1).max(200),
  text: z.string().min(1).max(500),
  parentId: z.string().min(1).max(200).optional(),
});

const patchPermissionSchema = z.object({
  designId: z.string().min(1).max(200),
  defaultRole: z.enum(['viewer', 'editor']).optional(),
  addEditor: z.string().email().optional(),
  removeEditor: z.string().email().optional(),
  transferOwner: z.string().email().optional(),
});

const mentionAckSchema = z.object({
  mentionUser: z.string().min(1).max(120),
  commentId: z.string().min(1).max(200),
  read: z.boolean(),
});

const defaultStore: Map<string, DesignComment[]> =
  (globalThis as any).__alveoDesignComments || new Map<string, DesignComment[]>();
(globalThis as any).__alveoDesignComments = defaultStore;

const defaultPermissionStore: Map<string, DesignCommentPermissions> =
  (globalThis as any).__alveoDesignCommentPermissions ||
  new Map<string, DesignCommentPermissions>();
(globalThis as any).__alveoDesignCommentPermissions = defaultPermissionStore;

const defaultMentionReadStore: Map<string, Set<string>> =
  (globalThis as any).__alveoDesignCommentMentionRead ||
  new Map<string, Set<string>>();
(globalThis as any).__alveoDesignCommentMentionRead = defaultMentionReadStore;

const defaultAuditStore: Map<string, DesignCommentAuditEntry[]> =
  (globalThis as any).__alveoDesignCommentAudit ||
  new Map<string, DesignCommentAuditEntry[]>();
(globalThis as any).__alveoDesignCommentAudit = defaultAuditStore;

function mentionKeysForUser(userEmail?: string): string[] {
  if (!userEmail) return [];
  const normalized = userEmail.trim().toLowerCase();
  const local = normalized.split('@')[0] ?? normalized;
  return Array.from(new Set([normalized, local]));
}

function parseBoundaryTimestamp(
  value: string | null | undefined,
  endOfDay: boolean,
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const candidate = isDateOnly
    ? `${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`
    : trimmed;
  const millis = Date.parse(candidate);
  return Number.isNaN(millis) ? null : millis;
}

function pushAudit(
  designId: string,
  entry: Omit<DesignCommentAuditEntry, 'id' | 'designId' | 'at'>,
  auditStore: Map<string, DesignCommentAuditEntry[]>,
) {
  const next: DesignCommentAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    designId,
    action: entry.action,
    actor: entry.actor,
    details: entry.details,
    at: new Date().toISOString(),
  };
  const current = auditStore.get(designId) ?? [];
  auditStore.set(designId, [...current, next].slice(-200));
}

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9._-]+)/g) ?? [];
  const names = matches.map((token) => token.slice(1).toLowerCase());
  return Array.from(new Set(names));
}

function getEffectiveRole(
  permissions: DesignCommentPermissions,
  userEmail?: string,
): 'viewer' | 'editor' {
  if (permissions.ownerEmail && userEmail) {
    if (permissions.ownerEmail.toLowerCase() === userEmail.toLowerCase()) {
      return 'editor';
    }
  }
  if (!userEmail) return permissions.defaultRole;
  const normalized = userEmail.toLowerCase();
  if (permissions.editors.map((v) => v.toLowerCase()).includes(normalized)) {
    return 'editor';
  }
  return permissions.defaultRole;
}

function canManagePermissions(
  permissions: DesignCommentPermissions,
  userEmail?: string,
): boolean {
  if (!userEmail) return false;
  const normalized = userEmail.toLowerCase();
  if (permissions.ownerEmail?.toLowerCase() === normalized) return true;
  return permissions.editors.map((v) => v.toLowerCase()).includes(normalized);
}

export function handleDesignCommentsGet(
  designId: string | null,
  userEmail?: string,
  deps?: {
    store?: Map<string, DesignComment[]>;
    permissionStore?: Map<string, DesignCommentPermissions>;
    mentionReadStore?: Map<string, Set<string>>;
    auditStore?: Map<string, DesignCommentAuditEntry[]>;
  },
) {
  if (!designId) {
    return NextResponse.json({ error: 'Missing designId' }, { status: 400 });
  }

  const store = deps?.store ?? defaultStore;
  const permissionStore = deps?.permissionStore ?? defaultPermissionStore;
  const mentionReadStore = deps?.mentionReadStore ?? defaultMentionReadStore;
  const auditStore = deps?.auditStore ?? defaultAuditStore;
  const permissions = permissionStore.get(designId) ?? {
    ownerEmail: undefined,
    defaultRole: 'editor' as const,
    editors: [],
  };
  const role = getEffectiveRole(permissions, userEmail);
  const comments = store.get(designId) ?? [];
  const mentionKeys = mentionKeysForUser(userEmail);
  const relevantReadSet = new Set<string>();
  for (const key of mentionKeys) {
    const readSet = mentionReadStore.get(key);
    if (!readSet) continue;
    for (const id of readSet) relevantReadSet.add(id);
  }

  const commentsWithRead = comments.map((comment) => {
    const mentions = comment.mentions ?? [];
    const hasMention = mentionKeys.some((key) => mentions.includes(key));
    return {
      ...comment,
      mentionRead: !hasMention || relevantReadSet.has(comment.id),
    };
  });

  return NextResponse.json({
    comments: commentsWithRead,
    permissions,
    role,
    canManage: canManagePermissions(permissions, userEmail),
    auditTrail: (auditStore.get(designId) ?? []).slice(-20).reverse(),
    unreadMentionCount: commentsWithRead.filter((comment) => !comment.mentionRead).length,
  });
}

export function handleDesignCommentsPost(
  body: unknown,
  ip: string,
  userEmail?: string,
  deps?: {
    store?: Map<string, DesignComment[]>;
    permissionStore?: Map<string, DesignCommentPermissions>;
    auditStore?: Map<string, DesignCommentAuditEntry[]>;
    checkRateLimitFn?: (
      key: string,
      options: { windowMs: number; max: number },
    ) => { allowed: boolean; remaining: number; retryAfterSec: number };
    nowIso?: () => string;
    idFactory?: () => string;
  },
) {
  const checkRateLimitFn = deps?.checkRateLimitFn ?? checkRateLimit;
  const limit = checkRateLimitFn(`design-comments:${ip}`, { windowMs: 60_000, max: 80 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const store = deps?.store ?? defaultStore;
  const permissionStore = deps?.permissionStore ?? defaultPermissionStore;
  const auditStore = deps?.auditStore ?? defaultAuditStore;
  const nowIso = deps?.nowIso ?? (() => new Date().toISOString());
  const idFactory = deps?.idFactory ?? (() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const permissions = permissionStore.get(parsed.data.designId) ?? {
    ownerEmail: userEmail,
    defaultRole: 'editor' as const,
    editors: [],
  };
  permissionStore.set(parsed.data.designId, permissions);
  const role = getEffectiveRole(permissions, userEmail);
  if (role !== 'editor') {
    return NextResponse.json({ error: 'Read-only comments' }, { status: 403 });
  }

  const nextComment: DesignComment = {
    id: idFactory(),
    designId: parsed.data.designId,
    text: parsed.data.text.trim(),
    author: userEmail ?? 'Guest',
    createdAt: nowIso(),
    parentId: parsed.data.parentId,
    mentions: extractMentions(parsed.data.text),
  };

  const current = store.get(parsed.data.designId) ?? [];
  const next = [...current, nextComment].slice(-200);
  store.set(parsed.data.designId, next);
  pushAudit(
    parsed.data.designId,
    {
      action: 'comment_added',
      actor: userEmail ?? 'Guest',
      details: nextComment.parentId ? `reply:${nextComment.parentId}` : undefined,
    },
    auditStore,
  );

  return NextResponse.json({ comments: next });
}

export function handleDesignCommentsPatch(
  body: unknown,
  requesterEmail?: string,
  deps?: {
    permissionStore?: Map<string, DesignCommentPermissions>;
    auditStore?: Map<string, DesignCommentAuditEntry[]>;
  },
) {
  const parsed = patchPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const permissionStore = deps?.permissionStore ?? defaultPermissionStore;
  const auditStore = deps?.auditStore ?? defaultAuditStore;
  const current = permissionStore.get(parsed.data.designId) ?? {
    ownerEmail: requesterEmail,
    defaultRole: 'editor' as const,
    editors: [],
  };

  if (!requesterEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canManagePermissions(current, requesterEmail)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (parsed.data.defaultRole) {
    current.defaultRole = parsed.data.defaultRole;
    pushAudit(
      parsed.data.designId,
      {
        action: 'default_role_updated',
        actor: requesterEmail,
        details: parsed.data.defaultRole,
      },
      auditStore,
    );
  }

  if (parsed.data.addEditor) {
    const normalized = parsed.data.addEditor.toLowerCase();
    if (!current.editors.map((v) => v.toLowerCase()).includes(normalized)) {
      current.editors.push(parsed.data.addEditor);
      pushAudit(
        parsed.data.designId,
        {
          action: 'editor_added',
          actor: requesterEmail,
          details: parsed.data.addEditor,
        },
        auditStore,
      );
    }
  }

  if (parsed.data.removeEditor) {
    const target = parsed.data.removeEditor.toLowerCase();
    current.editors = current.editors.filter((value) => value.toLowerCase() !== target);
    pushAudit(
      parsed.data.designId,
      {
        action: 'editor_removed',
        actor: requesterEmail,
        details: parsed.data.removeEditor,
      },
      auditStore,
    );
  }

  if (parsed.data.transferOwner) {
    current.ownerEmail = parsed.data.transferOwner;
    const transferred = parsed.data.transferOwner.toLowerCase();
    current.editors = current.editors.filter((value) => value.toLowerCase() !== transferred);
    pushAudit(
      parsed.data.designId,
      {
        action: 'owner_transferred',
        actor: requesterEmail,
        details: parsed.data.transferOwner,
      },
      auditStore,
    );
  }

  permissionStore.set(parsed.data.designId, current);
  return NextResponse.json({ permissions: current });
}

export function handleDesignCommentMentionAck(
  body: unknown,
  headers: Headers,
  deps?: {
    adminToken?: string;
    mentionReadStore?: Map<string, Set<string>>;
  },
) {
  const configuredToken = deps?.adminToken ?? process.env.EVENTS_ADMIN_TOKEN;
  if (configuredToken) {
    const providedToken = headers.get('x-admin-token');
    if (providedToken !== configuredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const parsed = mentionAckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const store = deps?.mentionReadStore ?? defaultMentionReadStore;
  const key = parsed.data.mentionUser.trim().toLowerCase();
  const current = store.get(key) ?? new Set<string>();

  if (parsed.data.read) {
    current.add(parsed.data.commentId);
  } else {
    current.delete(parsed.data.commentId);
  }
  store.set(key, current);

  return NextResponse.json({ ok: true, readCount: current.size });
}

export function handleDesignCommentsGetAll(
  headers: Headers,
  options?:
    | string
    | {
    mention?: string | null;
    designId?: string | null;
    author?: string | null;
    mentionsOnly?: boolean;
    from?: string | null;
    to?: string | null;
    sort?: 'newest' | 'oldest' | 'most-mentioned';
    page?: number;
    pageSize?: number;
    },
  deps?: {
    store?: Map<string, DesignComment[]>;
    adminToken?: string;
    mentionReadStore?: Map<string, Set<string>>;
  },
) {
  const configuredToken = deps?.adminToken ?? process.env.EVENTS_ADMIN_TOKEN;
  if (configuredToken) {
    const providedToken = headers.get('x-admin-token');
    if (providedToken !== configuredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const store = deps?.store ?? defaultStore;
  const mentionReadStore = deps?.mentionReadStore ?? defaultMentionReadStore;
  const all = Array.from(store.values()).flat();
  const normalizedOptions =
    typeof options === 'string' ? { mention: options } : (options ?? {});
  const mentionNeedle = normalizedOptions.mention?.trim().toLowerCase();
  const designNeedle = normalizedOptions.designId?.trim().toLowerCase();
  const authorNeedle = normalizedOptions.author?.trim().toLowerCase();
  const mentionsOnly = !!normalizedOptions.mentionsOnly;
  const fromTs = parseBoundaryTimestamp(normalizedOptions.from, false);
  const toTs = parseBoundaryTimestamp(normalizedOptions.to, true);
  const sort = normalizedOptions.sort ?? 'newest';

  const filtered = all.filter((comment) => {
    if (fromTs !== null || toTs !== null) {
      const createdTs = Date.parse(comment.createdAt);
      if (Number.isNaN(createdTs)) return false;
      if (fromTs !== null && createdTs < fromTs) return false;
      if (toTs !== null && createdTs > toTs) return false;
    }
    if (mentionNeedle && !(comment.mentions ?? []).includes(mentionNeedle)) {
      return false;
    }
    if (designNeedle && !comment.designId.toLowerCase().includes(designNeedle)) {
      return false;
    }
    if (authorNeedle && !comment.author.toLowerCase().includes(authorNeedle)) {
      return false;
    }
    if (mentionsOnly && (comment.mentions?.length ?? 0) === 0) {
      return false;
    }
    return true;
  });

  const readSet = mentionNeedle
    ? (mentionReadStore.get(mentionNeedle) ?? new Set<string>())
    : new Set<string>();

  if (sort === 'oldest') {
    filtered.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  } else if (sort === 'most-mentioned') {
    filtered.sort((a, b) => {
      const mentionDelta = (b.mentions?.length ?? 0) - (a.mentions?.length ?? 0);
      if (mentionDelta !== 0) return mentionDelta;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  } else {
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const pageSize = Math.max(1, Math.min(100, normalizedOptions.pageSize ?? 30));
  const page = Math.max(1, normalizedOptions.page ?? 1);
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const comments = paged.map((comment) => ({
    ...comment,
    mentionRead: readSet.has(comment.id),
  }));
  return NextResponse.json({
    comments,
    total: filtered.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < filtered.length,
  });
}

export function handleDesignCommentsGetMentionsForUser(
  userEmail: string | undefined,
  deps?: {
    store?: Map<string, DesignComment[]>;
    mentionReadStore?: Map<string, Set<string>>;
  },
) {
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = deps?.store ?? defaultStore;
  const mentionReadStore = deps?.mentionReadStore ?? defaultMentionReadStore;
  const keys = mentionKeysForUser(userEmail);
  const all = Array.from(store.values()).flat();

  const readSet = new Set<string>();
  for (const key of keys) {
    const set = mentionReadStore.get(key);
    if (!set) continue;
    for (const id of set) readSet.add(id);
  }

  const comments = all
    .filter((comment) => {
      const mentions = comment.mentions ?? [];
      return keys.some((k) => mentions.includes(k));
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 100)
    .map((comment) => ({
      ...comment,
      mentionRead: readSet.has(comment.id),
    }));

  return NextResponse.json({
    comments,
    unreadCount: comments.filter((c) => !c.mentionRead).length,
  });
}
