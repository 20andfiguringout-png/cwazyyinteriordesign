import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleDesignsDelete,
  handleDesignsGet,
  handleDesignsPost,
} from '../app/api/designs/handlers';
import { handleEventsGet, handleEventsPost } from '../app/api/events/handlers';

describe('Designs route handlers', () => {
  it('returns 401 when user is missing on GET', async () => {
    const res = await handleDesignsGet(undefined, '127.0.0.1');
    assert.equal(res.status, 401);
  });

  it('returns 429 when rate limit denies GET', async () => {
    const res = await handleDesignsGet('user@example.com', '127.0.0.1', {
      checkRateLimitFn: () => ({ allowed: false, remaining: 0, retryAfterSec: 9 }),
    });

    assert.equal(res.status, 429);
    assert.equal(res.headers.get('Retry-After'), '9');
  });

  it('returns 400 for invalid POST body', async () => {
    const res = await handleDesignsPost('user@example.com', '127.0.0.1', {
      design: { bad: true },
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string; details?: unknown[] };
    assert.equal(body.error, 'Invalid request body');
    assert.ok(Array.isArray(body.details));
  });

  it('returns 200 for valid POST and preserves rate header', async () => {
    const sampleDesign = {
      id: 'd1',
      name: 'Sample',
      savedAt: new Date().toISOString(),
      config: {
        closetType: 'reach-in' as const,
        dimensions: { width: 96, height: 96, depth: 24 },
      },
    };

    const res = await handleDesignsPost(
      'user@example.com',
      '127.0.0.1',
      { design: sampleDesign },
      {
        checkRateLimitFn: () => ({ allowed: true, remaining: 17, retryAfterSec: 1 }),
        addDesignFn: async () => [sampleDesign],
      },
    );

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-RateLimit-Remaining'), '17');
    const body = (await res.json()) as { designs: Array<{ id: string }> };
    assert.equal(body.designs.length, 1);
    assert.equal(body.designs[0].id, 'd1');
  });

  it('returns 400 for invalid DELETE body', async () => {
    const res = await handleDesignsDelete('user@example.com', '127.0.0.1', { id: '' });
    assert.equal(res.status, 400);
  });

  it('returns 200 for valid DELETE', async () => {
    const res = await handleDesignsDelete(
      'user@example.com',
      '127.0.0.1',
      { id: 'd1' },
      {
        checkRateLimitFn: () => ({ allowed: true, remaining: 12, retryAfterSec: 1 }),
        removeDesignFn: async () => [],
      },
    );

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('X-RateLimit-Remaining'), '12');
  });
});

describe('Events route handlers', () => {
  it('returns events when no admin token is configured', async () => {
    const headers = new Headers();
    const res = handleEventsGet(headers, {
      eventStoreRef: [{ name: 'opened', at: new Date().toISOString() }],
      eventsAdminToken: undefined,
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { events: Array<{ name: string }> };
    assert.equal(body.events.length, 1);
    assert.equal(body.events[0].name, 'opened');
  });

  it('returns 401 when admin token is configured but missing', async () => {
    const headers = new Headers();
    const res = handleEventsGet(headers, {
      eventStoreRef: [],
      eventsAdminToken: 'secret-token',
    });

    assert.equal(res.status, 401);
  });

  it('returns 200 when admin token matches', async () => {
    const headers = new Headers({ 'x-admin-token': 'secret-token' });
    const res = handleEventsGet(headers, {
      eventStoreRef: [{ name: 'tracked', at: new Date().toISOString() }],
      eventsAdminToken: 'secret-token',
    });

    assert.equal(res.status, 200);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await handleEventsPost('127.0.0.1', { foo: 'bar' });
    assert.equal(res.status, 400);
  });

  it('returns 429 when rate limited', async () => {
    const res = await handleEventsPost(
      '127.0.0.1',
      { name: 'preview_opened' },
      { checkRateLimitFn: () => ({ allowed: false, remaining: 0, retryAfterSec: 5 }) },
    );

    assert.equal(res.status, 429);
  });

  it('stores events on valid payload', async () => {
    const localStore: Array<{ name: string; at: string }> = [];
    const res = await handleEventsPost(
      '127.0.0.1',
      { name: 'preview_opened', props: { source: 'test' } },
      {
        checkRateLimitFn: () => ({ allowed: true, remaining: 99, retryAfterSec: 1 }),
        eventStoreRef: localStore as any,
      },
    );

    assert.equal(res.status, 200);
    assert.equal(localStore.length, 1);
    assert.equal(localStore[0].name, 'preview_opened');
    assert.ok(typeof localStore[0].at === 'string');
  });
});
