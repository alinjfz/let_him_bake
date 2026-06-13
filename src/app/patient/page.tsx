"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { PatientMoment } from "@/lib/patient-moments";

const ROLE_KEY = "echoes.role";

type SpeechRecognitionResultLike = {
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

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
    (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition;
  return ctor ? new ctor() : null;
}

export default function PatientPage() {
  const router = useRouter();
  const spokeRef = useRef("");
  const [moment, setMoment] = useState<PatientMoment | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [error, setError] = useState("");

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.98;
    window.speechSynthesis.speak(utterance);
  }, []);

  const loadMoment = useCallback(
    async (action: "wake" | "advance" | "moment" | "ask", nextStep: number, message?: string) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/patient-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            step: nextStep,
            message,
          }),
        });
        if (!response.ok) throw new Error("request failed");
        const data = (await response.json()) as { moment?: PatientMoment };
        if (!data.moment) throw new Error("missing moment");
        setMoment(data.moment);
        setStep(data.moment.step);
        if (spokeRef.current !== data.moment.speakText) {
          spokeRef.current = data.moment.speakText;
          speak(data.moment.speakText);
        }
      } catch {
        setError("Something went quiet. Tap okay to try again.");
      } finally {
        setBusy(false);
      }
    },
    [speak],
  );

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError("Voice is not available on this device.");
      return;
    }

    window.speechSynthesis?.cancel();
    setListening(true);
    setError("");
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        void loadMoment("ask", step, transcript);
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setError("I did not catch that. Try again.");
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }, [loadMoment, step]);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognition()));
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored === "family") {
      window.localStorage.setItem(ROLE_KEY, "caretaker");
    }
    const role = stored === "family" ? "caretaker" : stored;
    if (role && role !== "patient") {
      router.push(role === "caretaker" ? "/caretaker" : "/");
      return;
    }
    spokeRef.current = "";
    void loadMoment("wake", 0);
  }, [router, loadMoment]);

  async function handleOkay() {
    if (!moment || busy) return;
    if (moment.kind === "done" || !moment.showOkay) return;
    if (moment.kind === "talk") {
      spokeRef.current = "";
      await loadMoment("moment", step);
      return;
    }
    spokeRef.current = "";
    await loadMoment("advance", step);
  }

  const theme = moment?.theme;

  return (
    <main className="patient-focus-shell">
      <div className="patient-focus-bg" aria-hidden="true" />

      <button
        className="patient-focus-exit"
        type="button"
        onClick={() => {
          window.localStorage.removeItem(ROLE_KEY);
          router.push("/");
        }}
      >
        Leave
      </button>

      <section className="patient-focus-stage">
        {moment && theme ? (
          <article
            className={`patient-moment-card mood-${moment.kind}`}
            style={
              {
                "--moment-accent": theme.accent,
                "--moment-surface": theme.surface,
                "--moment-text": theme.text,
              } as CSSProperties
            }
          >
            <div className="patient-moment-icon" aria-hidden="true">
              {theme.icon}
            </div>

            {moment.imageUrl ? (
              <div className="patient-moment-photo">
                <img src={moment.imageUrl} alt="" />
              </div>
            ) : null}

            <h1 className="patient-moment-title">{moment.title}</h1>
            <p className="patient-moment-body">{moment.body}</p>

            {moment.showOkay ? (
              <button
                className="patient-moment-okay"
                type="button"
                disabled={busy}
                onClick={() => void handleOkay()}
              >
                {busy ? "One moment..." : moment.okayLabel}
              </button>
            ) : null}
          </article>
        ) : (
          <article className="patient-moment-card mood-greeting">
            <p className="patient-moment-body">{busy ? "Waking gently..." : "Hello."}</p>
          </article>
        )}

        {error ? <p className="patient-focus-error">{error}</p> : null}

        <div className="patient-focus-actions">
          <button
            className={`patient-ask-btn${listening ? " listening" : ""}`}
            type="button"
            disabled={busy || listening}
            onClick={startListening}
          >
            <span className="patient-ask-icon" aria-hidden="true">
              {listening ? "◉" : "🎙"}
            </span>
            {listening ? "Listening..." : "Ask me anything"}
          </button>
          {!voiceSupported ? (
            <p className="patient-focus-note">Voice works best in Chrome or Safari.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
