import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDesignCommentsGetQuery } from '../app/api/design-comments/query';

describe('design comments route query parser', () => {
  it('parses mention-me mode', () => {
    const params = new URLSearchParams({ mentionMe: '1' });
    const parsed = parseDesignCommentsGetQuery(params);

    assert.equal(parsed.mode, 'mention-me');
  });

  it('parses all mode with filters and valid paging', () => {
    const params = new URLSearchParams({
      all: '1',
      mention: 'alex',
      designId: 'd1',
      author: 'owner@example.com',
      mentionsOnly: '1',
      from: '2026-03-01',
      to: '2026-03-31',
      sort: 'most-mentioned',
      page: '3',
      pageSize: '25',
    });

    const parsed = parseDesignCommentsGetQuery(params);
    assert.equal(parsed.mode, 'all');
    if (parsed.mode !== 'all') throw new Error('Expected all mode');

    assert.equal(parsed.options.mention, 'alex');
    assert.equal(parsed.options.designId, 'd1');
    assert.equal(parsed.options.author, 'owner@example.com');
    assert.equal(parsed.options.mentionsOnly, true);
    assert.equal(parsed.options.from, '2026-03-01');
    assert.equal(parsed.options.to, '2026-03-31');
    assert.equal(parsed.options.sort, 'most-mentioned');
    assert.equal(parsed.options.page, 3);
    assert.equal(parsed.options.pageSize, 25);
  });

  it('falls back to safe paging defaults when invalid', () => {
    const params = new URLSearchParams({
      all: '1',
      page: 'nan',
      pageSize: '-5',
    });

    const parsed = parseDesignCommentsGetQuery(params);
    assert.equal(parsed.mode, 'all');
    if (parsed.mode !== 'all') throw new Error('Expected all mode');

    assert.equal(parsed.options.page, 1);
    assert.equal(parsed.options.pageSize, 30);
    assert.equal(parsed.options.sort, 'newest');
  });

  it('parses design mode when no special flags are set', () => {
    const params = new URLSearchParams({ designId: 'd42' });
    const parsed = parseDesignCommentsGetQuery(params);

    assert.equal(parsed.mode, 'design');
    if (parsed.mode !== 'design') throw new Error('Expected design mode');
    assert.equal(parsed.designId, 'd42');
  });
});
