import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteDesignBodySchema,
  postDesignBodySchema,
} from '../lib/designSchemas';
import { checkRateLimit } from '../lib/rateLimit';

describe('Design API schemas', () => {
  it('accepts a valid design payload', () => {
    const result = postDesignBodySchema.safeParse({
      design: {
        id: 'abc123',
        name: 'My Layout',
        savedAt: new Date().toISOString(),
        config: {
          closetType: 'reach-in',
          dimensions: { width: 96, height: 96, depth: 24 },
          wardrobe: {
            longDresses: 1,
            shortJackets: 2,
            suits: 0,
            shirts: 8,
            pants: 4,
            tShirts: 10,
            sweaters: 3,
            jeans: 2,
            underwear: 12,
            bags: 2,
            belts: 1,
            jewelry: true,
            ties: 0,
          },
          shoes: { sneakers: 3, heels: 1, boots: 0, flats: 2 },
          userInfo: {
            userType: 'homeowner',
            stylePreference: 'modern',
            woodFinish: 'medium',
            drawerPreference: 'mixed',
            priorityItems: ['hanging'],
          },
        },
      },
    });

    assert.equal(result.success, true);
  });

  it('rejects invalid values and malformed payloads', () => {
    const result = postDesignBodySchema.safeParse({
      design: {
        id: '',
        name: 'x',
        savedAt: '',
        config: {
          closetType: 'not-a-type',
          dimensions: { width: -1, height: 0, depth: -2 },
        },
      },
    });

    assert.equal(result.success, false);
  });

  it('validates delete payload id constraints', () => {
    const valid = deleteDesignBodySchema.safeParse({ id: 'to-delete' });
    const invalid = deleteDesignBodySchema.safeParse({ id: '' });

    assert.equal(valid.success, true);
    assert.equal(invalid.success, false);
  });
});

describe('Rate limiter', () => {
  it('allows up to max requests and then blocks', () => {
    const key = `test:${Math.random().toString(36).slice(2)}`;
    const options = { windowMs: 60_000, max: 2 };

    const first = checkRateLimit(key, options);
    const second = checkRateLimit(key, options);
    const third = checkRateLimit(key, options);

    assert.equal(first.allowed, true);
    assert.equal(second.allowed, true);
    assert.equal(third.allowed, false);
    assert.equal(third.remaining, 0);
    assert.ok(third.retryAfterSec >= 1);
  });

  it('resets after window expiry', () => {
    const key = `reset:${Math.random().toString(36).slice(2)}`;
    const options = { windowMs: 1_000, max: 1 };

    const originalNow = Date.now;
    let fakeNow = 1_000_000;
    Date.now = () => fakeNow;

    try {
      const first = checkRateLimit(key, options);
      const blocked = checkRateLimit(key, options);

      fakeNow += 1_100;
      const reset = checkRateLimit(key, options);

      assert.equal(first.allowed, true);
      assert.equal(blocked.allowed, false);
      assert.equal(reset.allowed, true);
      assert.equal(reset.remaining, 0);
    } finally {
      Date.now = originalNow;
    }
  });
});
