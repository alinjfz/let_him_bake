import { NextResponse } from "next/server";
import { getState } from "@/lib/app-state";
import { activatePatient, connectPatient } from "@/lib/patient-store";
import { resolveCaretakerToken } from "@/lib/server-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accessCode = searchParams.get("accessCode")?.trim().toUpperCase() ?? "";
  const pin = searchParams.get("pin")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";

  if (token) {
    const session = await resolveCaretakerToken(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else if (accessCode && pin && !connectPatient(accessCode, pin)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  } else if (accessCode && !pin && !activatePatient(accessCode)) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const activity = getState().activity;
  return NextResponse.json({ activity, events: activity });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        accessCode?: string;
        pin?: string;
        timestamp?: string;
        type?: string;
        description?: string;
        severity?: "normal" | "alert";
        id?: string;
      }
    | null;

  const accessCode =
    typeof body?.accessCode === "string" ? body.accessCode.trim().toUpperCase() : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

  if (!accessCode || !pin || !connectPatient(accessCode, pin)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (body?.description && body.timestamp && body.type) {
    const { updateActivity } = await import("@/lib/app-state");
    updateActivity({
      id: body.id,
      timestamp: body.timestamp,
      type: body.type as Parameters<typeof updateActivity>[0]["type"],
      description: body.description,
      severity: body.severity ?? "normal",
    });
  }

  return NextResponse.json({ events: getState().activity });
}
