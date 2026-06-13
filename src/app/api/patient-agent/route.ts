import { NextResponse } from "next/server";
import {
  buildPatientView,
  createMusicTrack,
  setMusicTrack,
  setPatientMode,
  setPatientPrompt,
  updateActivity,
  getState,
} from "@/lib/app-state";

function nowTimestamp() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { message?: string }
    | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  const state = getState();
  const profile = state.profile;
  const lower = message.toLowerCase();

  if (lower.includes("__panic__") || /panic|scared|lost|help|afraid/.test(lower)) {
    setPatientMode("panic");
    updateActivity({
      timestamp: nowTimestamp(),
      type: "panic",
      description: "Patient pressed the panic button",
      severity: "alert",
    });
    const view = buildPatientView(getState(), message);
    return NextResponse.json({
      reply: `You are safe, ${profile.first_name}. We will keep this gentle.`,
      view,
    });
  }

  if (lower.includes("i am fine") || lower.includes("i'm fine") || lower === "__fine__") {
    setPatientMode("home");
    setPatientPrompt(message);
    updateActivity({
      timestamp: nowTimestamp(),
      type: "panic_resolved",
      description: "Patient said they are fine",
      severity: "normal",
    });
    const view = buildPatientView(getState(), message);
    return NextResponse.json({
      reply: `Okay, ${profile.first_name}. I will stay nearby.`,
      view,
    });
  }

  if (/music|song|sing|play/.test(lower)) {
    const track = createMusicTrack(profile);
    setMusicTrack(profile);
    setPatientMode("music");
    setPatientPrompt(message);
    updateActivity({
      timestamp: nowTimestamp(),
      type: "panic_resolved",
      description: `Music requested: ${track.artist}`,
      severity: "normal",
    });
    const view = buildPatientView(getState(), message);
    return NextResponse.json({
      reply: `Playing something familiar for ${profile.first_name}.`,
      track,
      view,
    });
  }

  setPatientPrompt(message);
  setPatientMode("talk");
  const view = buildPatientView(getState(), message);
  return NextResponse.json({
    reply:
      view.cards.find((card) => card.kind === "talk")?.body ??
      `I am here with you, ${profile.first_name}.`,
    view,
  });
}
