import { NextRequest, NextResponse } from "next/server";
import { reportServerError } from "@/lib/monitoring";
import { EventRecord, handleEventsGet, handleEventsPost } from "./handlers";

const eventStore: EventRecord[] = (globalThis as any).__alveoEvents || [];
(globalThis as any).__alveoEvents = eventStore;

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  try {
    return handleEventsPost(ip, await req.json(), { eventStoreRef: eventStore });
  } catch (error) {
    await reportServerError("api/events:post", error, { ip });
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleEventsGet(req.headers, { eventStoreRef: eventStore });
}
