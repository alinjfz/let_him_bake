"use client";

import { useMemo, useState } from "react";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";
import {
  DEMO_PROFILE,
  buildMemoryHighlight,
  buildMedicationSummary,
  buildMorningGreeting,
  buildMorningTasks,
} from "@/lib/memorybridge";

type Mode = "morning" | "memory" | "panic";

export default function PatientPage() {
  const [mode, setMode] = useState<Mode>("morning");
  const [musicMode, setMusicMode] = useState(false);
  const greeting = useMemo(() => buildMorningGreeting(DEMO_PROFILE), []);
  const tasks = useMemo(() => buildMorningTasks(DEMO_PROFILE), []);
  const meds = useMemo(() => buildMedicationSummary(DEMO_PROFILE), []);
  const memory = useMemo(() => buildMemoryHighlight(DEMO_PROFILE), []);

  async function logEvent(
    type:
      | "task_completed"
      | "memory_viewed"
      | "panic"
      | "panic_resolved"
      | "medication_taken",
    description: string,
    severity: "normal" | "alert" = "normal",
  ) {
    await fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Intl.DateTimeFormat("en-GB", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "Europe/London",
        }).format(new Date()),
        type,
        description,
        severity,
      }),
    }).catch(() => {});
  }

  return (
    <main>
      <SiteNav active="/patient" />
      <PageHeader
        eyebrow="Patient"
        title={`${greeting.name}, ${greeting.dayOfWeek}`}
        subtitle="The surface stays warm, simple, and reassuring."
        action={
          <div className="button-row">
            <button className="secondary-button" onClick={() => setMode("morning")}>
              Morning
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setMode("memory");
                void logEvent("memory_viewed", "Memory opened");
              }}
            >
              Memory
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setMode("panic");
                setMusicMode(false);
                void logEvent("panic", "Panic button pressed", "alert");
              }}
            >
              PANIC
            </button>
          </div>
        }
      />

      <section className="wrap">
        {mode === "panic" ? (
          <div className="two-col">
            <section className="surface-card panic-card">
              <p className="card-kicker">Calm mode</p>
              <h2>You are safe at home. We are with you.</h2>
              <p className="panic-copy">
                Margaret, breathe slowly. We will take one step.
              </p>
              <div className="voice-card">
                <p className="card-kicker">Voice</p>
                <strong>ElevenLabs calm audio</strong>
                <span>“Margaret, you are safe at home.”</span>
              </div>
            </section>

            <section className="surface-card panel">
              <h3>Choose one</h3>
              <div className="options-grid">
                {[
                  ["Play music", "🎵"],
                  ["Talk to me", "💬"],
                  ["See family", "👪"],
                  ["Breathe", "🌿"],
                ].map(([label, icon]) => (
                  <button
                    key={label}
                    className="panic-option"
                    onClick={() => {
                      if (label === "Play music") {
                        setMusicMode(true);
                        void logEvent("panic_resolved", "Music started after panic");
                      }
                    }}
                  >
                    <span className="panic-icon">{icon}</span>
                    <strong>{label}</strong>
                    <span>One gentle step at a time.</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="two-col">
            <section className="surface-card panel">
              <div className="header-row">
                <div>
                  <p className="card-kicker">Morning briefing</p>
                  <h2>
                    {greeting.name}, {greeting.dateString}
                  </h2>
                </div>
                <span className="location-badge">{greeting.weatherEmoji}</span>
              </div>

              <div className="split-cards">
                <div className="memory-card">
                  <p className="card-kicker">Memory</p>
                  <h3>{memory.title}</h3>
                  <p>{memory.story}</p>
                </div>

                <div className="memory-card">
                  <p className="card-kicker">Medication</p>
                  <h3>{meds.nextDueIn}</h3>
                  <div className="stack">
                    {meds.medications.map((med) => (
                      <div key={`${med.name}-${med.time}`} className="mini-list-card">
                        <strong>
                          {med.name} {med.dose}
                        </strong>
                        <span>{med.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <h3>Today’s tasks</h3>
              <div className="task-list">
                {tasks.map((task) => (
                  <div key={`${task.time}-${task.description}`} className="task-card">
                    <span className="task-icon">{task.icon}</span>
                    <div>
                      <p className="card-kicker">{task.time}</p>
                      <strong>{task.description}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card panel">
              <div className="reassurance-card">
                <p className="card-kicker">Reassurance</p>
                <h3>You’re doing well, Margaret.</h3>
                <p>One step. Then the next.</p>
              </div>

              <h3>Family</h3>
              <div className="stack">
                {DEMO_PROFILE.family_members.map((member) => (
                  <div key={member.name} className="mini-list-card">
                    <strong>{member.name}</strong>
                    <span>
                      {member.relationship} · {member.location}
                    </span>
                  </div>
                ))}
              </div>

              <button
                className="primary-button block"
                onClick={() => {
                  setMode("panic");
                  void logEvent("panic", "Panic button pressed", "alert");
                }}
              >
                PANIC
              </button>
            </section>
          </div>
        )}

        {musicMode ? (
          <section className="surface-card music-card">
            <div className="header-row">
              <div className="music-hero">
                <span className="music-badge">🎙️</span>
                <div>
                  <p className="card-kicker">Music</p>
                  <h3>Fly Me to the Moon</h3>
                  <p>Frank Sinatra</p>
                </div>
              </div>
            </div>
            <p>Her favourite song for a gentle reset.</p>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                "Frank Sinatra Fly Me to the Moon",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="primary-button inline"
            >
              Open YouTube search
            </a>
          </section>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}

