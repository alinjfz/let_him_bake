"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPatientView,
  createMemoryImage,
  createMusicTrack,
  type AppState,
  type MusicCard,
  type PatientViewModel,
  type PlaybackStatus,
} from "@/lib/app-state";

const ROLE_KEY = "memorybridge.role";

type PatientResponse = {
  reply?: string;
  track?: ReturnType<typeof createMusicTrack>;
  view?: PatientViewModel;
};

function initialReply(view?: PatientViewModel | null) {
  const card = view?.cards.find((item) => item.kind === "reassurance");
  return card && "body" in card ? card.body : "Hello, Margaret.";
}

function modeForMessage(message: string) {
  const lower = message.toLowerCase();
  if (/panic|scared|lost|help|afraid/.test(lower)) return "panic";
  if (/music|song|sing|play/.test(lower)) return "music";
  if (/i am fine|i'm fine|__fine__/.test(lower)) return "panic";
  return "talk";
}

export default function PatientPage() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<PatientViewModel | null>(null);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("Hello, Margaret.");
  const [busy, setBusy] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "speaking" | "done">("idle");
  const [voiceText, setVoiceText] = useState("");
  const [track, setTrack] = useState<ReturnType<typeof createMusicTrack> | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPin, setLogoutPin] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  async function loadState() {
    const response = await fetch("/api/state").catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (!data) return;
    setState(data);
    const nextView = buildPatientView(data, data.patientPrompt || "");
    setView(nextView);
    setReply(initialReply(nextView));
    if (data.currentTrack) setTrack(data.currentTrack);
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setVoiceText(text);
    setVoiceState("speaking");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 0.95;
    utterance.onend = () => setVoiceState("done");
    utterance.onerror = () => setVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(message: string) {
    const current = state;
    const optimistic = current
      ? buildPatientView(
          {
            ...current,
            currentMode: modeForMessage(message),
            patientPrompt: message,
          },
          message,
        )
      : null;

    if (optimistic) {
      setView(optimistic);
      setReply(
        optimistic.cards.find((card) => card.kind === "talk")?.body ??
          optimistic.cards.find((card) => card.kind === "panic")?.body ??
          optimistic.cards.find((card) => card.kind === "reassurance" && "body" in card)?.body ??
          "I am here with you.",
      );
    }

    setBusy(true);
    try {
      const response = await fetch("/api/patient-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as PatientResponse;
      if (data.view) {
        setView(data.view);
        setReply(initialReply(data.view));
      }
      if (typeof data.reply === "string") {
        setReply(data.reply);
        speak(data.reply);
      }
      if (data.track) {
        setTrack(data.track);
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: { currentTrack: data.track } }),
        }).catch(() => {});
      }
    } catch {
      setReply("I am here with you, Margaret.");
    } finally {
      setBusy(false);
      setPrompt("");
    }
  }

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    void loadState();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored && stored !== "patient") {
      router.push(stored === "family" ? "/family" : "/");
    }
  }, [router]);

  useEffect(() => {
    if (!track || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = track.streamUrl;
    void audio.play().catch(() => {});
  }, [track]);

  function updateTrackStatus(status: PlaybackStatus) {
    if (!track) return;
    const nextTrack = { ...track, status };
    setTrack(nextTrack);
    void fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { currentTrack: nextTrack } }),
    }).catch(() => {});
  }

  async function confirmLogout() {
    const pin = state?.caregiverPin ?? "2468";
    if (logoutPin.trim() !== pin) {
      setLogoutError("That passcode did not work.");
      return;
    }
    window.localStorage.removeItem(ROLE_KEY);
    router.push("/");
  }

  const cards = view?.cards ?? [];
  const profile = state?.profile;
  const panicCard = cards.find((card) => card.kind === "panic");
  const talkCard = cards.find((card) => card.kind === "talk");
  const musicCard = cards.find((card) => card.kind === "music") as MusicCard | undefined;
  const memoryCard = cards.find((card) => card.kind === "memory");
  const modeLabel =
    view?.mode === "panic"
      ? "Lockdown"
      : view?.mode === "music"
        ? "Music"
        : view?.mode === "talk"
          ? "Talk"
          : "Calm";

  return (
    <main className="patient-shell">
      <section className="patient-topbar">
        <div>
          <p className="eyebrow">Patient</p>
          <h1>{view?.heading ?? `Hello, ${profile?.first_name ?? "Margaret"}`}</h1>
          <p className="muted">{modeLabel}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setLogoutOpen(true)}>
          Logout
        </button>
      </section>

      <section className="patient-grid-layout">
        <section className="patient-grid-main">
          <article className="surface-card patient-hero-card">
            <p className="card-kicker">Reassurance</p>
            <h2>You are safe. One small step.</h2>
            <p>{reply}</p>
          </article>

          {memoryCard && memoryCard.kind === "memory" ? (
            <article className="surface-card patient-memory-card">
              <div className="memory-image-wrap">
                <img
                  src={
                    (memoryCard as NonNullable<typeof memoryCard>).imageUrl ||
                    createMemoryImage({
                      id: memoryCard.id,
                      title: memoryCard.title,
                      story: memoryCard.story,
                      photoHint: memoryCard.photoHint,
                      relationship: memoryCard.relationship,
                    })
                  }
                  alt={memoryCard.title}
                />
              </div>
              <div className="patient-memory-copy">
                <p className="card-kicker">Memory</p>
                <h3>{memoryCard.title}</h3>
                <p className="pill">{memoryCard.relationship}</p>
                <p>{memoryCard.story}</p>
              </div>
            </article>
          ) : null}

          {cards.some((card) => card.kind === "tasks") ? (
            <article className="surface-card patient-card">
              <p className="card-kicker">Today</p>
              <h3>What comes next</h3>
              <div className="card-grid">
                {cards
                  .filter((card) => card.kind === "tasks")
                  .flatMap((card) => ("items" in card ? card.items : []))
                  .map((item) => (
                    <div key={`${item.time}-${item.description}`} className="grid-tile">
                      <span className="grid-icon">{item.icon}</span>
                      <strong>{item.time}</strong>
                      <p>{item.description}</p>
                    </div>
                  ))}
              </div>
            </article>
          ) : null}

          {cards.some((card) => card.kind === "medication") ? (
            <article className="surface-card patient-card">
              <p className="card-kicker">Medication</p>
              <h3>Simple reminders</h3>
              <div className="card-grid">
                {cards
                  .filter((card) => card.kind === "medication")
                  .flatMap((card) => ("items" in card ? card.items : []))
                  .map((item) => (
                    <div key={`${item.name}-${item.time}`} className="grid-tile">
                      <span className="grid-icon">💊</span>
                      <strong>
                        {item.name} {item.dose}
                      </strong>
                      <p>{item.time}</p>
                    </div>
                  ))}
              </div>
            </article>
          ) : null}

          {talkCard && talkCard.kind === "talk" ? (
            <article className="surface-card patient-talk-card">
              <p className="card-kicker">Gentle reply</p>
              <h3>{talkCard.title}</h3>
              <p>{talkCard.body}</p>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={() => speak(reply)}>
                  Play voice
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setVoiceState("idle");
                  }}
                >
                  Stop voice
                </button>
              </div>
            </article>
          ) : null}
        </section>

        <aside className="patient-grid-side">
          <section className="surface-card patient-talk-panel">
            <p className="card-kicker">Talk</p>
            <h3>Ask me something gentle</h3>
            <form
              className="patient-talk-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!prompt.trim()) return;
                void sendMessage(prompt);
              }}
            >
              <input
                className="patient-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask a simple question"
              />
              <div className="button-row">
                <button className="primary-button" type="submit" disabled={busy}>
                  {busy ? "Working..." : "Talk to me"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setPrompt("I am fine!");
                    void sendMessage("I am fine!");
                  }}
                >
                  I am fine!
                </button>
              </div>
            </form>
          </section>

          <section className="surface-card patient-lock-card">
            <p className="card-kicker">Lockdown</p>
            <h3>I am worried</h3>
            <button
              className="panic-main"
              type="button"
              onClick={() => void sendMessage("__PANIC__")}
            >
              I am worried
            </button>
            <p>We stay here until things feel calmer.</p>
          </section>

          {panicCard && panicCard.kind === "panic" ? (
            <section className="surface-card patient-lock-card">
              <p className="card-kicker">Calm choices</p>
              <h3>{panicCard.title}</h3>
              <p>{panicCard.body}</p>
              <div className="panic-actions">
                {panicCard.options.map((option) => (
                  <button
                    key={option.id}
                    className="panic-option"
                    type="button"
                    onClick={() => {
                      if (option.id === "music") {
                        void sendMessage("play music");
                        return;
                      }
                      if (option.id === "talk") {
                        void sendMessage("talk to me");
                        return;
                      }
                      if (option.id === "fine") {
                        void sendMessage("I am fine!");
                        return;
                      }
                      void sendMessage("show family");
                    }}
                  >
                    <span className="panic-icon">{option.icon}</span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="surface-card voice-card-shell">
            <p className="card-kicker">Voice</p>
            <h3>{voiceState === "speaking" ? "Speaking now" : "Ready"}</h3>
            <p>{voiceText || "A calm voice will appear here."}</p>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => speak(reply)}>
                Play voice
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setVoiceState("idle");
                }}
              >
                Stop
              </button>
            </div>
            <div className="voice-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="muted">
              {speechSupported ? "Browser voice is available." : "Voice is not available here."}
            </p>
          </section>

          {musicCard ? (
            <section className="surface-card music-shell">
              <p className="card-kicker">Music</p>
              <h3>{musicCard.title}</h3>
              <p>{musicCard.memoryTouch}</p>
              <div className="track-meta">
                <strong>{musicCard.artist}</strong>
                <span>{musicCard.sourceName}</span>
              </div>
              <audio
                ref={audioRef}
                controls
                onPlay={() => updateTrackStatus("playing")}
                onWaiting={() => updateTrackStatus("buffering")}
                onPause={() => updateTrackStatus("idle")}
                onError={() => updateTrackStatus("error")}
              />
              <a href={musicCard.sourceUrl} target="_blank" rel="noreferrer" className="card-link">
                Open source
              </a>
            </section>
          ) : null}
        </aside>
      </section>

      {logoutOpen ? (
        <div className="modal-backdrop">
          <section className="surface-card logout-modal">
            <p className="card-kicker">Logout</p>
            <h3>Enter the passcode</h3>
            <p>This keeps logout safe if it happens by accident.</p>
            <input
              className="patient-input"
              inputMode="numeric"
              value={logoutPin}
              onChange={(event) => {
                setLogoutPin(event.target.value);
                setLogoutError("");
              }}
              placeholder="Passcode"
            />
            {logoutError ? <p className="error-text">{logoutError}</p> : null}
            <div className="button-row">
              <button className="primary-button" type="button" onClick={confirmLogout}>
                Confirm
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setLogoutOpen(false);
                  setLogoutPin("");
                  setLogoutError("");
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

