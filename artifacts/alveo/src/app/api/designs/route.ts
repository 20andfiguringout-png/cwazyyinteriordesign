import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  handleDesignsDelete,
  handleDesignsGet,
  handleDesignsPost,
} from "./handlers";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  return handleDesignsGet(session?.user?.email ?? undefined, getIp(req));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  return handleDesignsPost(session?.user?.email ?? undefined, getIp(req), await req.json());
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  return handleDesignsDelete(session?.user?.email ?? undefined, getIp(req), await req.json());
}
