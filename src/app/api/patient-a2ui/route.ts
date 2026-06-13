import { NextResponse } from "next/server";
import { resolvePatientStep, type PatientActionInput } from "@/lib/patient-step-service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PatientActionInput | null;
  const result = await resolvePatientStep(body ?? {});
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
