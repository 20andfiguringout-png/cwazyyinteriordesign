import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleDesignCommentMentionAck,
  handleDesignCommentsGetAll,
  handleDesignCommentsGet,
  handleDesignCommentsGetMentionsForUser,
  handleDesignCommentsPatch,
  handleDesignCommentsPost,
} from '../app/api/design-comments/handlers';

describe('design comments handlers', () => {
  it('returns 400 for missing designId in GET', async () => {
    const res = handleDesignCommentsGet(null);
    assert.equal(res.status, 400);
  });

  it('returns role and permissions in GET', async () => {
    const store = new Map([
      ['d1', [{ id: 'c1', designId: 'd1', text: 'Hi', author: 'a', createdAt: '2026-03-22T12:00:00.000Z' }]],
    ]);
    const permissionStore = new Map([
      ['d1', { defaultRole: 'viewer' as const, editors: ['editor@example.com'] }],
    ]);

    const res = handleDesignCommentsGet('d1', 'viewer@example.com', {
      store,
      permissionStore,
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      role: string;
      comments: Array<{ id: string }>;
      permissions: { defaultRole: string; ownerEmail?: string };
      canManage: boolean;
    };
    assert.equal(body.role, 'viewer');
    assert.equal(body.permissions.defaultRole, 'viewer');
    assert.equal(body.comments.length, 1);
    assert.equal(body.canManage, false);
  });

  it('adds comment and returns comment list', async () => {
    const store = new Map();
    const res = handleDesignCommentsPost(
      { designId: 'd1', text: 'Looks great @alex!' },
      '127.0.0.1',
      'designer@example.com',
      {
        store,
        checkRateLimitFn: () => ({ allowed: true, remaining: 77, retryAfterSec: 1 }),
        nowIso: () => '2026-03-22T12:00:00.000Z',
        idFactory: () => 'c1',
      },
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      comments: Array<{ id: string; author: string; mentions?: string[] }>;
    };
    assert.equal(body.comments.length, 1);
    assert.equal(body.comments[0].id, 'c1');
    assert.equal(body.comments[0].author, 'designer@example.com');
    assert.deepEqual(body.comments[0].mentions, ['alex']);
  });

  it('returns 429 when rate limited', async () => {
    const res = handleDesignCommentsPost(
      { designId: 'd1', text: 'x' },
      '127.0.0.1',
      undefined,
      {
        checkRateLimitFn: () => ({ allowed: false, remaining: 0, retryAfterSec: 10 }),
      },
    );

    assert.equal(res.status, 429);
  });

  it('blocks posting for viewer role', async () => {
    const permissionStore = new Map([
      ['d1', { defaultRole: 'viewer' as const, editors: [] }],
    ]);

    const res = handleDesignCommentsPost(
      { designId: 'd1', text: 'Cannot add' },
      '127.0.0.1',
      'viewer@example.com',
      {
        permissionStore,
        checkRateLimitFn: () => ({ allowed: true, remaining: 70, retryAfterSec: 1 }),
      },
    );

    assert.equal(res.status, 403);
  });

  it('updates permissions via patch handler', async () => {
    const permissionStore = new Map();
    const patchRes = handleDesignCommentsPatch(
      { designId: 'd1', defaultRole: 'viewer', addEditor: 'editor@example.com' },
      'owner@example.com',
      { permissionStore },
    );
    assert.equal(patchRes.status, 200);

    const postRes = handleDesignCommentsPost(
      { designId: 'd1', text: 'Editor can post' },
      '127.0.0.1',
      'editor@example.com',
      {
        permissionStore,
        checkRateLimitFn: () => ({ allowed: true, remaining: 70, retryAfterSec: 1 }),
      },
    );
    assert.equal(postRes.status, 200);
  });

  it('forbids permission patch when requester is not manager', async () => {
    const permissionStore = new Map([
      ['d1', { ownerEmail: 'owner@example.com', defaultRole: 'viewer' as const, editors: [] }],
    ]);

    const patchRes = handleDesignCommentsPatch(
      { designId: 'd1', defaultRole: 'editor' },
      'outsider@example.com',
      { permissionStore },
    );
    assert.equal(patchRes.status, 403);
  });

  it('returns mention feed from global comments endpoint', async () => {
    const store = new Map([
      [
        'd1',
        [
          {
            id: 'c1',
            designId: 'd1',
            text: 'Hello @alex',
            author: 'a',
            createdAt: '2026-03-22T12:00:00.000Z',
            mentions: ['alex'],
          },
          {
            id: 'c2',
            designId: 'd1',
            text: 'No mention',
            author: 'b',
            createdAt: '2026-03-22T12:01:00.000Z',
          },
        ],
      ],
    ]);

    const headers = new Headers({ 'x-admin-token': 'token' });
    const res = handleDesignCommentsGetAll(headers, 'alex', {
      store,
      adminToken: 'token',
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { comments: Array<{ id: string }> };
    assert.equal(body.comments.length, 1);
    assert.equal(body.comments[0].id, 'c1');
  });

  it('supports owner transfer in permission patch', async () => {
    const permissionStore = new Map([
      ['d1', { ownerEmail: 'owner@example.com', defaultRole: 'editor' as const, editors: [] }],
    ]);

    const transfer = handleDesignCommentsPatch(
      { designId: 'd1', transferOwner: 'newowner@example.com' },
      'owner@example.com',
      { permissionStore },
    );
    assert.equal(transfer.status, 200);

    const takeover = handleDesignCommentsPatch(
      { designId: 'd1', defaultRole: 'viewer' },
      'newowner@example.com',
      { permissionStore },
    );
    assert.equal(takeover.status, 200);
  });

  it('marks and returns mention read status', async () => {
    const store = new Map([
      [
        'd1',
        [
          {
            id: 'c1',
            designId: 'd1',
            text: 'Ping @alex',
            author: 'a',
            createdAt: '2026-03-22T12:00:00.000Z',
            mentions: ['alex'],
          },
        ],
      ],
    ]);
    const mentionReadStore = new Map<string, Set<string>>();

    const ack = handleDesignCommentMentionAck(
      { mentionUser: 'alex', commentId: 'c1', read: true },
      new Headers({ 'x-admin-token': 'token' }),
      { adminToken: 'token', mentionReadStore },
    );
    assert.equal(ack.status, 200);

    const feed = handleDesignCommentsGetAll(
      new Headers({ 'x-admin-token': 'token' }),
      'alex',
      { store, adminToken: 'token', mentionReadStore },
    );
    const body = (await feed.json()) as {
      comments: Array<{ id: string; mentionRead?: boolean }>;
    };
    assert.equal(body.comments[0].id, 'c1');
    assert.equal(body.comments[0].mentionRead, true);
  });

  it('supports server-side filtered pagination for global comments', async () => {
    const store = new Map([
      [
        'd1',
        [
          { id: 'c1', designId: 'd1', text: 'One', author: 'a', createdAt: '2026-03-22T12:00:00.000Z' },
          { id: 'c2', designId: 'd1', text: 'Two', author: 'a', createdAt: '2026-03-22T12:01:00.000Z' },
          { id: 'c3', designId: 'd2', text: 'Three', author: 'b', createdAt: '2026-03-22T12:02:00.000Z' },
        ],
      ],
    ]);

    const res = handleDesignCommentsGetAll(
      new Headers({ 'x-admin-token': 'token' }),
      { author: 'a', page: 1, pageSize: 1 },
      { store, adminToken: 'token' },
    );
    const body = (await res.json()) as {
      comments: Array<{ id: string }>;
      total: number;
      hasNextPage: boolean;
    };

    assert.equal(body.total, 2);
    assert.equal(body.comments.length, 1);
    assert.equal(body.hasNextPage, true);
  });

  it('supports most-mentioned sort for global comments', async () => {
    const store = new Map([
      [
        'd1',
        [
          {
            id: 'c1',
            designId: 'd1',
            text: 'One @alex',
            author: 'a',
            createdAt: '2026-03-22T12:00:00.000Z',
            mentions: ['alex'],
          },
          {
            id: 'c2',
            designId: 'd1',
            text: 'Two @alex @sam',
            author: 'a',
            createdAt: '2026-03-22T12:01:00.000Z',
            mentions: ['alex', 'sam'],
          },
        ],
      ],
    ]);

    const res = handleDesignCommentsGetAll(
      new Headers({ 'x-admin-token': 'token' }),
      { sort: 'most-mentioned', page: 1, pageSize: 10 },
      { store, adminToken: 'token' },
    );
    const body = (await res.json()) as {
      comments: Array<{ id: string }>;
    };

    assert.equal(body.comments[0].id, 'c2');
    assert.equal(body.comments[1].id, 'c1');
  });

  it('supports from/to date filters for global comments', async () => {
    const store = new Map([
      [
        'd1',
        [
          {
            id: 'c1',
            designId: 'd1',
            text: 'Old note',
            author: 'a',
            createdAt: '2026-03-20T09:00:00.000Z',
          },
          {
            id: 'c2',
            designId: 'd1',
            text: 'New note',
            author: 'a',
            createdAt: '2026-03-22T09:00:00.000Z',
          },
        ],
      ],
    ]);

    const res = handleDesignCommentsGetAll(
      new Headers({ 'x-admin-token': 'token' }),
      {
        from: '2026-03-22',
        to: '2026-03-22',
        page: 1,
        pageSize: 10,
      },
      { store, adminToken: 'token' },
    );
    const body = (await res.json()) as {
      comments: Array<{ id: string }>;
      total: number;
    };

    assert.equal(body.total, 1);
    assert.equal(body.comments[0].id, 'c2');
  });

  it('returns mention inbox for signed-in user key', async () => {
    const store = new Map([
      [
        'd1',
        [
          {
            id: 'c1',
            designId: 'd1',
            text: 'Hello @alex',
            author: 'a',
            createdAt: '2026-03-22T12:00:00.000Z',
            mentions: ['alex'],
          },
        ],
      ],
    ]);

    const res = handleDesignCommentsGetMentionsForUser('alex@example.com', { store });
    const body = (await res.json()) as {
      unreadCount: number;
      comments: Array<{ id: string }>;
    };

    assert.equal(body.unreadCount, 1);
    assert.equal(body.comments.length, 1);
    assert.equal(body.comments[0].id, 'c1');
  });
});
