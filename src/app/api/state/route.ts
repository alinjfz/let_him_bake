import { NextResponse } from "next/server";
import {
  getState,
  patchState,
  resetState,
  saveProfile,
  updateMemoryPolicy,
  updateActivity,
  type AppState,
  type MemoryPolicy,
} from "@/lib/app-state";
import type { PatientProfile } from "@/lib/echoes";

export async function GET() {
  return NextResponse.json(getState());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        profile?: PatientProfile;
        memoryPolicy?: {
          memoryId?: string;
          policy?: MemoryPolicy;
        };
        activity?: Parameters<typeof updateActivity>[0];
        state?: Partial<AppState>;
      }
    | null;

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
