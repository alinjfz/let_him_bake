import { NextResponse } from "next/server";
import { getState, updateActivity } from "@/lib/app-state";
import { generatePatientAnswer, generatePatientMoment } from "@/lib/llm";
import {
  buildMomentPlan,
  fallbackAskMoment,
  fallbackMoment,
  momentSpecContext,
  type PatientMoment,
} from "@/lib/patient-moments";

function nowTimestamp() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date());
}

async function resolveMoment(step: number): Promise<PatientMoment> {
  const state = getState();
  const profile = state.profile;
  const plan = buildMomentPlan(profile);
  const boundedStep = Math.max(0, Math.min(step, plan.length - 1));
  const spec = plan[boundedStep];
  const fallback = fallbackMoment(spec, profile, boundedStep, plan.length);

  const moment = await generatePatientMoment({
    profile,
    kind: spec.kind,
    contextJson: momentSpecContext(spec, profile),
    step: boundedStep,
    total: plan.length,
    fallback,
  });

  if (spec.kind === "memory") {
    moment.imageUrl = fallback.imageUrl;
  }

  if (spec.kind === "greeting") {
    updateActivity({
      timestamp: nowTimestamp(),
      type: "memory_viewed",
      description: `${profile.first_name} opened their morning greeting`,
      severity: "normal",
    });
  }

  if (spec.kind === "memory") {
    updateActivity({
      timestamp: nowTimestamp(),
      type: "memory_viewed",
      description: "A memory card was shown",
      severity: "normal",
    });
  }

  if (spec.kind === "medication") {
    updateActivity({
      timestamp: nowTimestamp(),
      type: "medication_taken",
      description: "Medication moment acknowledged",
      severity: "normal",
    });
  }

  return moment;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { action?: string; step?: number; message?: string }
    | null;

  const action = body?.action ?? "wake";
  const step = typeof body?.step === "number" ? body.step : 0;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (action === "ask" && message) {
    const state = getState();
    const plan = buildMomentPlan(state.profile);
    const fallback = fallbackAskMoment(message, state.profile, step, plan.length);
    const moment = await generatePatientAnswer({
      profile: state.profile,
      question: message,
      step,
      total: plan.length,
      fallback,
    });

    return NextResponse.json({ moment });
  }

  if (action === "advance") {
    const moment = await resolveMoment(step + 1);
    return NextResponse.json({ moment });
  }

  if (action === "moment") {
    const moment = await resolveMoment(step);
    return NextResponse.json({ moment });
  }

  const moment = await resolveMoment(0);
  return NextResponse.json({ moment });
}
