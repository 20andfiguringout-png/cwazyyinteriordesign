import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailyStepTrend,
  buildFunnel,
  buildSessionJourneys,
  countByEventName,
  filterEventsByRange,
} from '../lib/analyticsInsights';

describe('analytics insights helpers', () => {
  const now = new Date('2026-03-22T12:00:00.000Z').getTime();
  const events = [
    { name: 'landing_viewed', at: '2026-03-22T10:00:00.000Z' },
    { name: 'configure_opened', at: '2026-03-22T10:05:00.000Z' },
    { name: 'preview_opened', at: '2026-03-22T10:06:00.000Z' },
    { name: 'export_pdf', at: '2026-03-22T10:10:00.000Z' },
    { name: 'landing_viewed', at: '2026-03-10T10:00:00.000Z' },
  ];

  it('filters events by date range', () => {
    const past24h = filterEventsByRange(events, '24h', now);
    assert.equal(past24h.length, 4);

    const all = filterEventsByRange(events, 'all', now);
    assert.equal(all.length, 5);
  });

  it('counts by event name', () => {
    const counts = countByEventName(events);
    assert.equal(counts[0].name, 'landing_viewed');
    assert.equal(counts[0].count, 2);
  });

  it('computes funnel conversion percentages', () => {
    const funnel = buildFunnel(events, [
      'landing_viewed',
      'configure_opened',
      'preview_opened',
      'export_pdf',
    ]);

    assert.equal(funnel[0].conversionFromPrevPct, 100);
    assert.equal(funnel[1].conversionFromPrevPct, 50);
    assert.equal(funnel[2].conversionFromPrevPct, 100);
    assert.equal(funnel[3].conversionFromPrevPct, 100);
  });

  it('builds daily trend rows for funnel steps', () => {
    const trend = buildDailyStepTrend(
      events,
      ['landing_viewed', 'configure_opened', 'preview_opened', 'export_pdf'],
      3,
      new Date('2026-03-22T12:00:00.000Z'),
    );

    assert.equal(trend.length, 3);
    assert.equal(trend[2].day, '2026-03-22');
    assert.equal(trend[2].counts.landing_viewed, 1);
    assert.equal(trend[2].counts.export_pdf, 1);
  });

  it('groups events into session journeys', () => {
    const sessionEvents = [
      { name: 'landing_viewed', at: '2026-03-22T10:00:00.000Z', props: { sessionId: 's1' } },
      { name: 'configure_opened', at: '2026-03-22T10:01:00.000Z', props: { sessionId: 's1' } },
      { name: 'landing_viewed', at: '2026-03-22T10:02:00.000Z', props: { sessionId: 's2' } },
      { name: 'preview_opened', at: '2026-03-22T10:03:00.000Z', props: { sessionId: 's1' } },
    ];

    const journeys = buildSessionJourneys(sessionEvents, [
      'landing_viewed',
      'configure_opened',
      'preview_opened',
      'export_pdf',
    ]);

    assert.equal(journeys.length, 2);
    assert.equal(journeys[0].sessionId, 's1');
    assert.equal(journeys[0].totalEvents, 3);
    assert.deepEqual(journeys[0].stepsSeen, ['landing_viewed', 'configure_opened', 'preview_opened']);
  });
});
