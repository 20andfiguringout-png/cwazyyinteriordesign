import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import {
  handleDesignCommentsPost,
} from './handlers';
import { parseDesignCommentsGetQuery } from './query';
import {
  dispatchDesignCommentsGet,
  dispatchDesignCommentsPatch,
} from './route-logic';

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? undefined;
  const query = parseDesignCommentsGetQuery(req.nextUrl.searchParams);
  return dispatchDesignCommentsGet(req.headers, query, userEmail);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? undefined;
  return handleDesignCommentsPost(await req.json(), getIp(req), userEmail);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? undefined;
  return dispatchDesignCommentsPatch(req.headers, body, userEmail);
}
