import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';

const schema = z.object({
  name: z.string().min(1).max(100),
  props: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

export type EventRecord = {
  name: string;
  props?: Record<string, string | number | boolean | null>;
  at: string;
};

const defaultEventStore: EventRecord[] = (globalThis as any).__alveoEvents || [];
(globalThis as any).__alveoEvents = defaultEventStore;

export async function handleEventsPost(
  ip: string,
  body: unknown,
  deps?: {
    checkRateLimitFn?: (
      key: string,
      options: { windowMs: number; max: number },
    ) => { allowed: boolean; remaining: number; retryAfterSec: number };
    eventStoreRef?: EventRecord[];
  },
) {
  const checkRateLimitFn = deps?.checkRateLimitFn ?? checkRateLimit;
  const store = deps?.eventStoreRef ?? defaultEventStore;

  const limit = checkRateLimitFn(`events:${ip}`, { windowMs: 60_000, max: 100 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  store.push({ ...parsed.data, at: new Date().toISOString() });
  if (store.length > 1000) store.splice(0, store.length - 1000);

  return NextResponse.json({ ok: true });
}

export function handleEventsGet(
  headers: Headers,
  deps?: {
    eventStoreRef?: EventRecord[];
    eventsAdminToken?: string;
  },
) {
  const store = deps?.eventStoreRef ?? defaultEventStore;
  const configuredToken = deps?.eventsAdminToken ?? process.env.EVENTS_ADMIN_TOKEN;

  if (configuredToken) {
    const providedToken = headers.get('x-admin-token');
    if (providedToken !== configuredToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.json({ events: store.slice(-200) });
}
