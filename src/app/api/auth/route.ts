import { NextResponse } from "next/server";
import { recordToAppState } from "@/lib/app-state";
import {
  applyDemoToActive,
  connectPatient,
  createPatient,
  getActiveRecord,
} from "@/lib/patient-store";
import { loadDemoPackage } from "@/lib/demo-data";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        caretakerName?: string;
        pin?: string;
        accessCode?: string;
        demoId?: string;
      }
    | null;

  const action = body?.action ?? "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  const caretakerName =
    typeof body?.caretakerName === "string" ? body.caretakerName.trim() : "";
  const accessCode =
    typeof body?.accessCode === "string" ? body.accessCode.trim().toUpperCase() : "";

  if (action === "create") {
    if (!caretakerName || pin.length < 4) {
      return NextResponse.json(
        { error: "Add your name and a passcode of at least 4 characters." },
        { status: 400 },
      );
    }
    const record = createPatient(caretakerName, pin);
    return NextResponse.json({
      accessCode: record.accessCode,
      state: recordToAppState(record),
    });
  }

  if (action === "connect") {
    if (!accessCode || pin.length < 4) {
      return NextResponse.json(
        { error: "Enter the patient code and passcode." },
        { status: 400 },
      );
    }
    const record = connectPatient(accessCode, pin);
    if (!record) {
      return NextResponse.json(
        { error: "That code or passcode did not match." },
        { status: 401 },
      );
    }
    return NextResponse.json({
      accessCode: record.accessCode,
      state: recordToAppState(record),
    });
  }

  if (action === "loadDemo") {
    const active = getActiveRecord();
    if (!active) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    if (active.caregiverPin !== pin) {
      return NextResponse.json({ error: "Passcode did not match." }, { status: 401 });
    }
    const demo = loadDemoPackage(body?.demoId ?? "george-thomas");
    if (!demo) {
      return NextResponse.json({ error: "Demo package not found." }, { status: 404 });
    }
    const record = applyDemoToActive(demo);
    if (!record) {
      return NextResponse.json({ error: "Could not load demo." }, { status: 500 });
    }
    return NextResponse.json({
      accessCode: record.accessCode,
      state: recordToAppState(record),
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
