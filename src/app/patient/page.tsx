"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppState,
  MemoryCard as MemoryCardType,
  PatientViewModel,
  PlaybackStatus,
  MusicCard as MusicCardType,
} from "@/lib/app-state";
import { createMusicTrack } from "@/lib/app-state";

const ROLE_KEY = "memorybridge.role";

type PatientResponse = {
  reply?: string;
  track?: ReturnType<typeof createMusicTrack>;
  view?: PatientViewModel;
};

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
  const [track, setTrack] = useState<ReturnType<typeof createMusicTrack> | null>(
    null,
  );
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPin, setLogoutPin] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  async function refreshState() {
    const response = await fetch("/api/state").catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (data) {
      setState(data);
      if (data.currentTrack) {
        setTrack(data.currentTrack);
      }
    }
  }

  async function sendMessage(message: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/patient-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as PatientResponse;
      if (data.view) setView(data.view);
      if (typeof data.reply === "string") setReply(data.reply);
      if (data.track) {
        setTrack(data.track);
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: {
              currentTrack: data.track,
            },
          }),
        }).catch(() => {});
      }
      if (data.reply) speak(data.reply);
    } catch {
      setReply("I am here, Margaret.");
    } finally {
      setBusy(false);
      setPrompt("");
    }
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

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    void refreshState();
    void sendMessage("");
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

  const cards = view?.cards ?? [];
  const profile = state?.profile;
  const greeting = view?.heading ?? `Hello, ${profile?.first_name ?? "Margaret"}`;

  const panicCard = cards.find((card) => card.kind === "panic");
  const musicCard = cards.find((card) => card.kind === "music") as
    | MusicCardType
    | undefined;

  async function confirmLogout() {
    const pin = state?.caregiverPin ?? "2468";
    if (logoutPin.trim() !== pin) {
      setLogoutError("That passcode did not work.");
      return;
    }

    window.localStorage.removeItem(ROLE_KEY);
    router.push("/");
  }

  return (
    <main className="patient-shell">
      <section className="patient-topbar">
        <div>
          <p className="eyebrow">Patient</p>
          <h1>{greeting}</h1>
        </div>
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setLogoutOpen(true)}
          >
            Logout
          </button>
        </div>
      </section>

      <section className="patient-grid">
        <section className="patient-main">
          <div className="patient-intro surface-card">
            <p className="card-kicker">Reassurance</p>
            <h2>You are safe. Take one small step.</h2>
            <p>{reply}</p>
          </div>

          {cards
            .filter((card) => card.kind !== "panic" && card.kind !== "music")
            .map((card) => {
              if (card.kind === "greeting") {
                return null;
              }
              if (card.kind === "reassurance") {
                return null;
              }
              if (card.kind === "tasks") {
                return (
                  <div key={card.id} className="surface-card patient-card">
                    <p className="card-kicker">Today</p>
                    <h3>{card.title}</h3>
                    <div className="patient-lines">
                      {card.items.map((item) => (
                        <div key={`${item.time}-${item.description}`} className="patient-line">
                          <span>{item.icon}</span>
                          <div>
                            <strong>{item.time}</strong>
                            <p>{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (card.kind === "medication") {
                return (
                  <div key={card.id} className="surface-card patient-card">
                    <p className="card-kicker">Medication</p>
                    <h3>{card.title}</h3>
                    <div className="patient-lines">
                      {card.items.map((item) => (
                        <div key={`${item.name}-${item.time}`} className="patient-line">
                          <span>💊</span>
                          <div>
                            <strong>
                              {item.name} {item.dose}
                            </strong>
                            <p>{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              if (card.kind === "memory") {
                const memory = card as MemoryCardType;
                return (
                  <div key={card.id} className="surface-card patient-card memory-panel">
                    <p className="card-kicker">Memory</p>
                    <div className="memory-hero">
                      <div className="memory-photo">{memory.photoHint}</div>
                      <div>
                        <h3>{memory.title}</h3>
                        <p>{memory.relationship}</p>
                      </div>
                    </div>
                    <p>{memory.story}</p>
                  </div>
                );
              }
              if (card.kind === "talk") {
                return (
                  <div key={card.id} className="surface-card patient-card">
                    <p className="card-kicker">Gentle reply</p>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                    <span className="pill">{card.suggestion}</span>
                  </div>
                );
              }
              return null;
            })}
        </section>

        <aside className="patient-side">
          <section className="surface-card patient-card">
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
                placeholder="Ask me a simple question"
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

          <section className="surface-card patient-card panic-shell">
            <p className="card-kicker">Panic</p>
            <h3>One calm button</h3>
            <button
              className="panic-main"
              type="button"
              onClick={() => {
                void sendMessage("__PANIC__");
              }}
            >
              PANIC
            </button>
            <p>Press only if you need help.</p>
          </section>

          {panicCard && panicCard.kind === "panic" ? (
            <section className="surface-card patient-card panic-shell">
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
                      if (option.id === "fine") {
                        void sendMessage("I am fine!");
                        return;
                      }
                      if (option.id === "music") {
                        void sendMessage("play music");
                        return;
                      }
                      if (option.id === "talk") {
                        void sendMessage("talk to me");
                        return;
                      }
                      void sendMessage("show family");
                    }}
                  >
                    <span>{option.icon}</span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="surface-card patient-card voice-card-shell">
            <p className="card-kicker">Voice</p>
            <h3>{voiceState === "speaking" ? "Speaking now" : "Ready"}</h3>
            <p>{voiceText || "A calm voice will appear here."}</p>
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
            <section className="surface-card patient-card music-shell">
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
              <a
                href={musicCard.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="card-link"
              >
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
