import { NextResponse } from "next/server";
import type { ActivityEvent } from "@/lib/memorybridge";
import { initialActivityLog } from "@/lib/memorybridge";

const store: ActivityEvent[] = initialActivityLog();

export async function GET() {
  return NextResponse.json({ events: store });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<ActivityEvent>
    | null;

  if (body?.description && body?.timestamp && body?.type) {
    store.unshift({
      timestamp: body.timestamp,
      type: body.type,
      description: body.description,
      severity: body.severity ?? "normal",
    });
  }

  return NextResponse.json({ events: store });
}

