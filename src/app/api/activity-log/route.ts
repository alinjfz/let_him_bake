import { NextResponse } from "next/server";
import type { ActivityEvent } from "@/lib/echoes";
import { initialActivityLog } from "@/lib/echoes";

const store: ActivityEvent[] = initialActivityLog();

function makeId() {
  return `activity-${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET() {
  return NextResponse.json({ events: store });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Partial<ActivityEvent>
    | null;

  if (body?.description && body?.timestamp && body?.type) {
    store.unshift({
      id: body.id ?? makeId(),
      timestamp: body.timestamp,
      type: body.type,
      description: body.description,
      severity: body.severity ?? "normal",
    });
  }

  return NextResponse.json({ events: store });
}
