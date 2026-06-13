"use client";

import { PatientProviders } from "@/components/patient/PatientProviders";
import { useAgent } from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MirrorRenderer, parseA2UISurface } from "@/a2ui/MirrorRenderer";
import type { A2UISurface } from "@/a2ui/catalog/definitions";
import { patientStepBus } from "@/a2ui/patient-step-bus";
import "@/a2ui/theme.css";
import "@/components/patient/patient.css";
import { clearSession, readSession, writePatientSession } from "@/lib/session";
import type { PatientStepPayload } from "@/lib/patient-step-service";

type PatientFlowMode = "morning" | "panic" | "ask";

type StepPayload = {
  surface?: unknown;
  step?: number;
  total?: number;
  showOkay?: boolean;
  okayLabel?: string;
  speakText?: string;
  mode?: PatientFlowMode;
  theme?: { accent: string; surface: string; text: string };
};

type SpeechRecognitionResultLike = { 0: { transcript: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const ctor =
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition ??
    (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition;
  return ctor ? new ctor() : null;
}

async function fetchStepFallback(
  accessCode: string,
  payload: Record<string, string | number>,
): Promise<StepPayload> {
  const response = await fetch("/api/patient-a2ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode, ...payload }),
  });
  if (!response.ok) throw new Error("failed");
  return (await response.json()) as StepPayload;
}

export function PatientShell() {
  return (
    <PatientProviders>
      <PatientSurface />
    </PatientProviders>
  );
}

function PatientSurface() {
  const router = useRouter();
  const { agent } = useAgent({ agentId: "patient_agent" });
  const spokeRef = useRef("");
  const wakeRef = useRef(false);
  const morningStepRef = useRef(0);

  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(1);
  const [showOkay, setShowOkay] = useState(true);
  const [okayLabel, setOkayLabel] = useState("Okay");
  const [cardTheme, setCardTheme] = useState<
    { accent: string; surface: string; text: string } | undefined
  >();
  const [flowMode, setFlowMode] = useState<PatientFlowMode>("morning");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [linked, setLinked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leavePin, setLeavePin] = useState("");
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [agentReady, setAgentReady] = useState(false);

  useEffect(() => {
    setAgentReady(Boolean(agent));
  }, [agent]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    if (spokeRef.current === text) return;
    spokeRef.current = text;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.98;
    window.speechSynthesis.speak(utterance);
  }, []);

  const applyStep = useCallback(
    (data: StepPayload) => {
      const parsed = parseA2UISurface(data.surface);
      setSurface(parsed);
      setStep(data.step ?? 0);
      setTotal(data.total ?? 1);
      setShowOkay(data.showOkay ?? true);
      setOkayLabel(data.okayLabel ?? "Okay");
      setCardTheme(data.theme);
      if (data.mode) setFlowMode(data.mode);
      if (data.mode === "morning") morningStepRef.current = data.step ?? 0;
      if (data.speakText) speak(data.speakText);
    },
    [speak],
  );

  useEffect(() => {
    return patientStepBus.subscribe((payload: PatientStepPayload) => {
      applyStep(payload);
    });
  }, [applyStep]);

  const loadStep = useCallback(
    async (payload: Record<string, string | number>) => {
      const code = readSession().patientCode || accessCode;
      if (!code) return;
      setBusy(true);
      setError("");
      patientStepBus.reset();

      const action = { accessCode: code, ...payload };
      let captured = false;

      try {
        if (agent) {
          let resolved = false;
          const unsub = agent.subscribe({
            onEvent({ event }) {
              const typed = event as { type?: string; name?: string; value?: StepPayload };
              if (typed.type !== "CUSTOM" && typed.type !== "Custom") return;
              if (typed.name === "echoes-patient-step" && typed.value) {
                applyStep(typed.value);
                captured = true;
                resolved = true;
              }
            },
          });

          agent.addMessage({
            id: crypto.randomUUID(),
            role: "user",
            content: JSON.stringify(action),
          });

          await agent.runAgent({ forwardedProps: { patientAction: action } });
          unsub.unsubscribe();

          if (!resolved) {
            const fromBus = patientStepBus.latest();
            if (fromBus) {
              applyStep(fromBus);
              captured = true;
            }
          }
        }

        if (!captured) {
          const data = await fetchStepFallback(code, payload);
          applyStep(data);
        }
      } catch {
        try {
          const data = await fetchStepFallback(code, payload);
          applyStep(data);
        } catch {
          setError("Something went quiet. Try again.");
        }
      } finally {
        setBusy(false);
      }
    },
    [accessCode, agent, applyStep],
  );

  useEffect(() => {
    const session = readSession();
    if (session.role && session.role !== "patient") {
      router.push(session.role === "caretaker" ? "/caretaker" : "/");
      return;
    }
    if (session.patientCode) {
      setAccessCode(session.patientCode);
      setLinked(true);
    }
  }, [router]);

  useEffect(() => {
    if (!linked || !accessCode || !agentReady || wakeRef.current) return;
    wakeRef.current = true;
    spokeRef.current = "";
    void loadStep({ action: "wake", step: 0 });
  }, [linked, accessCode, agentReady, loadStep]);

  async function linkPatient() {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setError("Enter the home code from your caretaker.");
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/state?accessCode=${encodeURIComponent(code)}`).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError("That code did not work. Check with your caretaker.");
      return;
    }
    writePatientSession(code);
    wakeRef.current = false;
    setAccessCode(code);
    setLinked(true);
  }

  function handleOkay() {
    if (busy) return;
    spokeRef.current = "";
    if (flowMode === "ask") {
      void loadStep({ action: "moment", step: morningStepRef.current });
      return;
    }
    if (flowMode === "panic") {
      void loadStep({ action: "panic", step: step + 1 });
      return;
    }
    if (step >= total - 1 && !showOkay) return;
    void loadStep({ action: "advance", step });
  }

  function startListening() {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError("Voice is not available on this device.");
      return;
    }
    window.speechSynthesis?.cancel();
    setListening(true);
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        spokeRef.current = "";
        void loadStep({ action: "ask", message: transcript, step: morningStepRef.current });
      }
    };
    recognition.onerror = () => setError("I did not catch that. Try again.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  function startPanic() {
    spokeRef.current = "";
    void loadStep({ action: "panic", message: "__PANIC__", step: 0 });
  }

  async function confirmLeave() {
    const code = readSession().patientCode || accessCode;
    if (!leavePin.trim()) {
      setLeaveError("Enter your caretaker's password.");
      return;
    }
    setLeaveBusy(true);
    const response = await fetch("/api/patient-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode: code, pin: leavePin.trim() }),
    });
    setLeaveBusy(false);
    if (!response.ok) {
      setLeaveError("That password is not correct.");
      return;
    }
    clearSession();
    router.push("/");
  }

  if (!linked) {
    return (
      <main className="patient-focus-shell">
        <div className="patient-focus-bg" aria-hidden="true" />
        <section className="patient-focus-stage">
          <article className="patient-moment-card mood-greeting">
            <h1 className="patient-moment-title">Enter home code</h1>
            <p className="patient-moment-body">Your caretaker can share this with you.</p>
            <input
              className="caretaker-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="ECHO-7K2M"
            />
            {error ? <p className="patient-focus-error">{error}</p> : null}
            <button className="patient-moment-okay" type="button" disabled={busy} onClick={() => void linkPatient()}>
              {busy ? "One moment..." : "Continue"}
            </button>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className="patient-shell">
      <div className="patient-focus-bg" aria-hidden="true" />
      <div className="patient-shell-toolbar">
        <button className="patient-shell-btn leave" type="button" onClick={() => setLeaveOpen(true)}>
          Leave
        </button>
        <button className="patient-shell-btn panic" type="button" disabled={busy} onClick={startPanic}>
          I need help
        </button>
      </div>

      <section className="patient-shell-stage">
        {busy && !surface ? <p className="patient-focus-note">One moment...</p> : null}
        <MirrorRenderer
          key={`${flowMode}-${step}`}
          surface={surface}
          single
          step={step}
          total={total}
          theme={cardTheme}
          onPanicSelect={(id) => {
            if (id === "music") void loadStep({ action: "music", message: "__MUSIC__", step: 0 });
          }}
        />
        {showOkay ? (
          <button className="patient-moment-okay patient-shell-okay" type="button" disabled={busy} onClick={handleOkay}>
            {busy ? "One moment..." : okayLabel}
          </button>
        ) : null}
        {error ? <p className="patient-focus-error">{error}</p> : null}
      </section>

      <div className="patient-shell-actions">
        <button
          className={`patient-shell-ask${listening ? " listening" : ""}`}
          type="button"
          disabled={busy || listening}
          onClick={startListening}
        >
          {listening ? "Listening..." : "Ask me anything"}
        </button>
        <p className="patient-shell-note">CopilotKit AG-UI · one card at a time</p>
      </div>

      {leaveOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="patient-leave-modal">
            <h2 className="patient-leave-title">Leave this screen?</h2>
            <input
              className="caretaker-input"
              type="password"
              value={leavePin}
              onChange={(e) => setLeavePin(e.target.value)}
              placeholder="Caretaker password"
            />
            {leaveError ? <p className="patient-focus-error">{leaveError}</p> : null}
            <div className="patient-leave-actions">
              <button className="patient-leave-cancel" type="button" onClick={() => setLeaveOpen(false)}>
                Stay
              </button>
              <button className="patient-leave-confirm" type="button" disabled={leaveBusy} onClick={() => void confirmLeave()}>
                Leave
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
