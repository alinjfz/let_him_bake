import { NextResponse } from "next/server";
import { getRecord, verifyCaregiverPin } from "@/lib/patient-store";

export async function POST(request: Request) {
  const body = (await request.json()) as { accessCode?: string; pin?: string };
  const accessCode = body.accessCode?.trim().toUpperCase();
  const pin = body.pin?.trim();

  if (!accessCode || !pin) {
    return NextResponse.json({ error: "Missing access code or passcode." }, { status: 400 });
  }

  const record = getRecord(accessCode);
  if (!record) {
    return NextResponse.json(
      { error: "This home is no longer set up. Ask your caretaker to sign in again.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!verifyCaregiverPin(accessCode, pin)) {
    return NextResponse.json({ error: "That passcode is not correct." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
