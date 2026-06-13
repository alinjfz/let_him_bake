import { NextResponse } from "next/server";
import {
  getState,
  patchState,
  resetState,
  saveProfile,
  updateActivity,
  updateMemoryPolicy,
  type AppState,
  type MemoryPolicy,
} from "@/lib/app-state";
import { connectPatient, getActiveRecord, activatePatient } from "@/lib/patient-store";
import type { PatientProfile } from "@/lib/echoes";

function resolveSession(body: { accessCode?: string; pin?: string } | null) {
  const accessCode =
    typeof body?.accessCode === "string" ? body.accessCode.trim().toUpperCase() : "";
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!accessCode || !pin) return false;
  return Boolean(connectPatient(accessCode, pin));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accessCode = searchParams.get("accessCode")?.trim().toUpperCase() ?? "";
  const pin = searchParams.get("pin")?.trim() ?? "";

  if (accessCode && pin) {
    if (!connectPatient(accessCode, pin)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else if (accessCode) {
    if (!activatePatient(accessCode)) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }
    const state = getState();
    return NextResponse.json({ ...state, caregiverPin: "" });
  } else if (!getActiveRecord()) {
    return NextResponse.json({ error: "No active patient session." }, { status: 401 });
  }

  return NextResponse.json(getState());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        accessCode?: string;
        pin?: string;
        profile?: PatientProfile;
        memoryPolicy?: {
          memoryId?: string;
          policy?: MemoryPolicy;
        };
        activity?: Parameters<typeof updateActivity>[0];
        state?: Partial<AppState>;
      }
    | null;

  if (!resolveSession(body)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let current = patchState({});

  if (body?.action === "reset") {
    current = resetState(body.profile);
  }

  if (body?.profile) {
    current = saveProfile(body.profile);
  }

  if (body?.memoryPolicy?.memoryId && body.memoryPolicy.policy) {
    current = updateMemoryPolicy(body.memoryPolicy.memoryId, body.memoryPolicy.policy);
  }

  if (body?.activity) {
    current = updateActivity(body.activity);
  }

  if (body?.state) {
    current = patchState(body.state);
  }

  return NextResponse.json(current);
}
