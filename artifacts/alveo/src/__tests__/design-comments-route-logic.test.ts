import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextResponse } from 'next/server';
import {
  dispatchDesignCommentsGet,
  dispatchDesignCommentsPatch,
} from '../app/api/design-comments/route-logic';

describe('design comments route logic', () => {
  it('routes all-mode GET to global handler with options', async () => {
    let received: unknown;
    const res = dispatchDesignCommentsGet(
      new Headers({ 'x-admin-token': 'token' }),
      {
        mode: 'all',
        options: {
          author: 'owner@example.com',
          page: 2,
          pageSize: 15,
          sort: 'oldest',
        },
      },
      'user@example.com',
      {
        getAll: (_headers, options) => {
          received = options;
          return NextResponse.json({ ok: true });
        },
        getByDesign: () => NextResponse.json({}),
        getMentionsForUser: () => NextResponse.json({}),
      },
    );

    assert.equal(res.status, 200);
    assert.deepEqual(received, {
      author: 'owner@example.com',
      page: 2,
      pageSize: 15,
      sort: 'oldest',
    });
  });

  it('routes mention-ack PATCH to mention ack handler', async () => {
    let calledAck = false;
    let calledPermissions = false;

    const res = dispatchDesignCommentsPatch(
      new Headers({ 'x-admin-token': 'token' }),
      {
        action: 'mention-ack',
        mentionUser: 'alex',
        commentId: 'c1',
        read: true,
      },
      'user@example.com',
      {
        patchMentionAck: () => {
          calledAck = true;
          return NextResponse.json({ ok: true });
        },
        patchPermissions: () => {
          calledPermissions = true;
          return NextResponse.json({});
        },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(calledAck, true);
    assert.equal(calledPermissions, false);
  });

  it('routes normal PATCH to permissions handler', async () => {
    let calledAck = false;
    let calledPermissions = false;

    const res = dispatchDesignCommentsPatch(
      new Headers(),
      { designId: 'd1', defaultRole: 'viewer' },
      'owner@example.com',
      {
        patchMentionAck: () => {
          calledAck = true;
          return NextResponse.json({});
        },
        patchPermissions: () => {
          calledPermissions = true;
          return NextResponse.json({ ok: true });
        },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(calledAck, false);
    assert.equal(calledPermissions, true);
  });
});
