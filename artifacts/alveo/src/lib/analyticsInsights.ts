export type AnalyticsEvent = {
  name: string;
  at: string;
  props?: Record<string, string | number | boolean | null>;
};

export type DateRangeFilter = '24h' | '7d' | '30d' | 'all';

const rangeToMs: Record<Exclude<DateRangeFilter, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function filterEventsByRange(
  events: AnalyticsEvent[],
  range: DateRangeFilter,
  nowMs = Date.now(),
): AnalyticsEvent[] {
  if (range === 'all') return events;
  const cutoff = nowMs - rangeToMs[range];
  return events.filter((event) => {
    const time = new Date(event.at).getTime();
    return !Number.isNaN(time) && time >= cutoff;
  });
}

export function countByEventName(events: AnalyticsEvent[]): Array<{ name: string; count: number }> {
  const map = new Map<string, number>();
  for (const event of events) {
    map.set(event.name, (map.get(event.name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildFunnel(events: AnalyticsEvent[], stepNames: string[]) {
  const counts = stepNames.map((step) => ({
    step,
    count: events.filter((event) => event.name === step).length,
  }));

  return counts.map((row, index) => {
    if (index === 0) {
      return { ...row, conversionFromPrevPct: 100 };
    }
    const prev = counts[index - 1].count;
    const conversionFromPrevPct = prev > 0 ? Math.round((row.count / prev) * 100) : 0;
    return { ...row, conversionFromPrevPct };
  });
}

type DailyTrendRow = {
  day: string;
  counts: Record<string, number>;
};

function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDailyStepTrend(
  events: AnalyticsEvent[],
  stepNames: string[],
  days: number,
  now = new Date(),
): DailyTrendRow[] {
  const rows: DailyTrendRow[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const counts = Object.fromEntries(stepNames.map((step) => [step, 0])) as Record<string, number>;
    rows.push({ day: toDayKey(date), counts });
  }

  const byDay = new Map(rows.map((row) => [row.day, row]));

  for (const event of events) {
    if (!stepNames.includes(event.name)) continue;
    const date = new Date(event.at);
    if (Number.isNaN(date.getTime())) continue;
    const day = toDayKey(date);
    const row = byDay.get(day);
    if (!row) continue;
    row.counts[event.name] += 1;
  }

  return rows;
}

export type SessionJourney = {
  sessionId: string;
  startedAt: string;
  lastAt: string;
  totalEvents: number;
  stepsSeen: string[];
};

export function buildSessionJourneys(
  events: AnalyticsEvent[],
  stepNames: string[],
): SessionJourney[] {
  const stepSet = new Set(stepNames);
  const sessions = new Map<string, {
    startedAt: string;
    lastAt: string;
    totalEvents: number;
    stepsSeen: Set<string>;
  }>();

  for (const event of events) {
    const rawSessionId = event.props?.sessionId;
    if (typeof rawSessionId !== 'string' || rawSessionId.length === 0) continue;

    const existing = sessions.get(rawSessionId);
    if (!existing) {
      sessions.set(rawSessionId, {
        startedAt: event.at,
        lastAt: event.at,
        totalEvents: 1,
        stepsSeen: new Set(stepSet.has(event.name) ? [event.name] : []),
      });
      continue;
    }

    existing.totalEvents += 1;
    if (event.at < existing.startedAt) existing.startedAt = event.at;
    if (event.at > existing.lastAt) existing.lastAt = event.at;
    if (stepSet.has(event.name)) existing.stepsSeen.add(event.name);
  }

  return Array.from(sessions.entries())
    .map(([sessionId, value]) => ({
      sessionId,
      startedAt: value.startedAt,
      lastAt: value.lastAt,
      totalEvents: value.totalEvents,
      stepsSeen: stepNames.filter((step) => value.stepsSeen.has(step)),
    }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}
