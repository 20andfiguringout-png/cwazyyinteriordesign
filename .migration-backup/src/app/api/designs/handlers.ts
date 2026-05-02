import { NextResponse } from 'next/server';
import { addDesign, listDesigns, removeDesign } from '@/lib/cloudDesigns';
import { checkRateLimit } from '@/lib/rateLimit';
import { deleteDesignBodySchema, postDesignBodySchema } from '@/lib/designSchemas';
import { reportServerError } from '@/lib/monitoring';

type LimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export type DesignsDeps = {
  checkRateLimitFn?: (key: string, options: { windowMs: number; max: number }) => LimitResult;
  listDesignsFn?: typeof listDesigns;
  addDesignFn?: typeof addDesign;
  removeDesignFn?: typeof removeDesign;
};

function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    },
  );
}

export async function handleDesignsGet(
  user: string | undefined,
  ip: string,
  deps: DesignsDeps = {},
) {
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkRateLimitFn = deps.checkRateLimitFn ?? checkRateLimit;
  const listDesignsFn = deps.listDesignsFn ?? listDesigns;

  const limit = checkRateLimitFn(`designs:get:${user}:${ip}`, {
    windowMs: 60_000,
    max: 120,
  });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

  try {
    const designs = await listDesignsFn(user);
    return NextResponse.json(
      { designs },
      {
        headers: {
          'X-RateLimit-Remaining': String(limit.remaining),
        },
      },
    );
  } catch (error) {
    await reportServerError('api/designs:get', error, { user, ip });
    return NextResponse.json({ error: 'Failed to load designs' }, { status: 500 });
  }
}

export async function handleDesignsPost(
  user: string | undefined,
  ip: string,
  body: unknown,
  deps: DesignsDeps = {},
) {
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkRateLimitFn = deps.checkRateLimitFn ?? checkRateLimit;
  const addDesignFn = deps.addDesignFn ?? addDesign;

  const limit = checkRateLimitFn(`designs:post:${user}:${ip}`, {
    windowMs: 60_000,
    max: 40,
  });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

  const parsed = postDesignBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }

  try {
    const designs = await addDesignFn(user, parsed.data.design);
    return NextResponse.json(
      { designs },
      {
        headers: {
          'X-RateLimit-Remaining': String(limit.remaining),
        },
      },
    );
  } catch (error) {
    await reportServerError('api/designs:post', error, { user, ip });
    return NextResponse.json({ error: 'Failed to save design' }, { status: 500 });
  }
}

export async function handleDesignsDelete(
  user: string | undefined,
  ip: string,
  body: unknown,
  deps: DesignsDeps = {},
) {
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkRateLimitFn = deps.checkRateLimitFn ?? checkRateLimit;
  const removeDesignFn = deps.removeDesignFn ?? removeDesign;

  const limit = checkRateLimitFn(`designs:delete:${user}:${ip}`, {
    windowMs: 60_000,
    max: 50,
  });
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

  const parsed = deleteDesignBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }

  try {
    const designs = await removeDesignFn(user, parsed.data.id);
    return NextResponse.json(
      { designs },
      {
        headers: {
          'X-RateLimit-Remaining': String(limit.remaining),
        },
      },
    );
  } catch (error) {
    await reportServerError('api/designs:delete', error, { user, ip });
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
  }
}
