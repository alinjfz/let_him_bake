"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Brand";
import {
  type AppState,
  type MemoryPolicy,
} from "@/lib/app-state";
import type { EvidenceCard } from "@/lib/llm";

const ROLE_KEY = "memorybridge.role";

function blankState(): AppState | null {
  return null;
}

export default function FamilyPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(blankState());
  const [draftProfile, setDraftProfile] = useState<AppState["profile"] | null>(null);
  const [draftPolicies, setDraftPolicies] = useState<Record<string, MemoryPolicy>>({});
  const [expandedLog, setExpandedLog] = useState(true);
  const [researchQuery, setResearchQuery] = useState(
    "What helps with evening agitation in memory support?",
  );
  const [researchAnswer, setResearchAnswer] = useState<EvidenceCard | null>(null);
  const [researchBusy, setResearchBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function loadState() {
    const response = await fetch("/api/state").catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (data) {
      setState(data);
      setDraftProfile(data.profile);
      setDraftPolicies(data.memoryPolicies);
    }
  }

  async function saveState(nextProfile = draftProfile, nextPolicies = draftPolicies) {
    if (!nextProfile) return;
    setSaveMessage("Saving...");
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: nextProfile,
        state: {
          memoryPolicies: nextPolicies,
        },
      }),
    }).catch(() => null);
    if (!response?.ok) {
      setSaveMessage("Save failed.");
      return;
    }
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (data) {
      setState(data);
      setDraftProfile(data.profile);
      setDraftPolicies(data.memoryPolicies);
    }
    setSaveMessage("Saved.");
  }

  async function runResearch() {
    setResearchBusy(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as { evidence?: EvidenceCard };
      setResearchAnswer(data.evidence ?? null);
    } catch {
      setResearchAnswer({
        suggestion: "Keep the evening calm and predictable.",
        source: "NICE",
        confidence: "medium",
        summary:
          "Use one step at a time, reduce noise, and keep reassuring language short.",
        url: "https://www.nice.org.uk/guidance/ng97/chapter/Recommendations",
      });
    } finally {
      setResearchBusy(false);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored && stored !== "family") {
      router.push(stored === "patient" ? "/patient" : "/");
    }
    void loadState();
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadState(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const profile = draftProfile ?? state?.profile;
  const events = state?.activity ?? [];
  const stats = useMemo(
    () => ({
      tasksCompleted: events.filter((event) => event.type === "task_completed").length,
      medsTaken: events.filter((event) => event.type === "medication_taken").length,
      memoriesViewed: events.filter((event) => event.type === "memory_viewed").length,
      panicEvents: events.filter((event) => event.type === "panic").length,
    }),
    [events],
  );
  const latest = events[0];

  const statusText =
    state?.currentMode === "panic"
      ? "Panic happening now"
      : state?.currentTrack?.status === "playing"
        ? "Music is playing now"
        : state?.currentMode === "talk"
          ? "Patient is talking"
          : "Patient is settled";

  return (
    <main className="family-shell">
      <section className="family-header surface-card">
        <div>
          <p className="eyebrow">Family</p>
          <h1>Control room</h1>
          <p>Everything editable lives here.</p>
        </div>
        <div className="button-row">
          <Link href="/patient" className="secondary-button">
            Open patient
          </Link>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              window.localStorage.removeItem(ROLE_KEY);
              router.push("/");
            }}
          >
            Logout
          </button>
        </div>
      </section>

      <section className="family-grid">
        <section className="family-column">
          <section className="surface-card family-card">
            <div className="header-row">
              <div>
                <p className="card-kicker">Live status</p>
                <h2>{statusText}</h2>
              </div>
              <span className="pill">{state?.currentMode ?? "home"}</span>
            </div>
            <p>
              {latest
                ? `${latest.description} at ${latest.timestamp}`
                : "No events yet."}
            </p>
            <div className="stats-grid">
              {[
                ["Tasks", stats.tasksCompleted],
                ["Meds", stats.medsTaken],
                ["Memories", stats.memoriesViewed],
                ["Panic", stats.panicEvents],
              ].map(([label, value]) => (
                <div key={label as string} className="mini-card">
                  <p>{label}</p>
                  <strong>{value as number}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card family-card">
            <div className="header-row">
              <div>
                <p className="card-kicker">Activity</p>
                <h2>Timeline</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setExpandedLog((value) => !value)}
              >
                {expandedLog ? "Collapse" : "Expand"}
              </button>
            </div>

            <div className={expandedLog ? "activity-list expanded" : "activity-list collapsed"}>
              {events.map((event) => (
                <article
                  key={event.id}
                  className={event.severity === "alert" ? "event-card alert compact" : "event-card compact"}
                >
                  <div className="header-row">
                    <strong>{event.description}</strong>
                    <span>{event.timestamp}</span>
                  </div>
                  <p>{event.type.replaceAll("_", " ")}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="family-column">
          <section className="surface-card family-card">
            <p className="card-kicker">Profile</p>
            <h2>{profile?.name ?? "Profile"}</h2>
            <p>{profile?.location_area}</p>
            <div className="stats-grid">
              {[
                ["Age", profile?.age ?? 0],
                ["Stage", profile?.stage ?? "mid"],
                ["Music", profile?.music_preference ?? "Unknown"],
              ].map(([label, value]) => (
                <div key={label as string} className="mini-card">
                  <p>{label}</p>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card family-card">
            <div className="header-row">
              <div>
                <p className="card-kicker">Memory policy</p>
                <h2>What the patient sees</h2>
              </div>
              <button className="primary-button" type="button" onClick={() => void saveState()}>
                Save all
              </button>
            </div>
            <p className="status-line">{saveMessage}</p>
            <div className="stack">
              {profile?.key_memories.map((memory) => (
                <article key={memory.id} className="memory-editor">
                  <div className="memory-hero">
                    <div className="memory-photo">{memory.photoHint}</div>
                    <div>
                      <strong>{memory.title}</strong>
                      <p>{memory.relationship}</p>
                    </div>
                  </div>
                  <label>
                    Story
                    <textarea
                      className="textarea"
                      value={memory.story}
                      onChange={(event) => {
                        if (!draftProfile) return;
                        const next = {
                          ...draftProfile,
                          key_memories: draftProfile.key_memories.map((item) =>
                            item.id === memory.id
                              ? { ...item, story: event.target.value }
                              : item,
                          ),
                        };
                        setDraftProfile(next);
                      }}
                    />
                  </label>
                  <label>
                    Visibility
                    <select
                      className="patient-input"
                      value={draftPolicies[memory.id] ?? "show"}
                      onChange={(event) =>
                        setDraftPolicies((current) => ({
                          ...current,
                          [memory.id]: event.target.value as MemoryPolicy,
                        }))
                      }
                    >
                      <option value="show">Show</option>
                      <option value="soften">Soften</option>
                      <option value="redirect">Redirect</option>
                      <option value="hide">Hide</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card family-card">
            <p className="card-kicker">Daily plan</p>
            <div className="stack">
              {profile?.daily_tasks.map((task, index) => (
                <article key={`${task.time}-${index}`} className="mini-list-card">
                  <input
                    className="patient-input"
                    value={task.time}
                    onChange={(event) => {
                      if (!draftProfile) return;
                      const next = {
                        ...draftProfile,
                        daily_tasks: draftProfile.daily_tasks.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, time: event.target.value } : item,
                        ),
                      };
                      setDraftProfile(next);
                    }}
                  />
                  <input
                    className="patient-input"
                    value={task.description}
                    onChange={(event) => {
                      if (!draftProfile) return;
                      const next = {
                        ...draftProfile,
                        daily_tasks: draftProfile.daily_tasks.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      };
                      setDraftProfile(next);
                    }}
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card family-card">
            <p className="card-kicker">Medications</p>
            <div className="stack">
              {profile?.medications.map((med, index) => (
                <article key={`${med.name}-${index}`} className="mini-list-card">
                  <input
                    className="patient-input"
                    value={med.name}
                    onChange={(event) => {
                      if (!draftProfile) return;
                      setDraftProfile({
                        ...draftProfile,
                        medications: draftProfile.medications.map((item, medIndex) =>
                          medIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      });
                    }}
                  />
                  <input
                    className="patient-input"
                    value={med.dose}
                    onChange={(event) => {
                      if (!draftProfile) return;
                      setDraftProfile({
                        ...draftProfile,
                        medications: draftProfile.medications.map((item, medIndex) =>
                          medIndex === index ? { ...item, dose: event.target.value } : item,
                        ),
                      });
                    }}
                  />
                  <input
                    className="patient-input"
                    value={med.time}
                    onChange={(event) => {
                      if (!draftProfile) return;
                      setDraftProfile({
                        ...draftProfile,
                        medications: draftProfile.medications.map((item, medIndex) =>
                          medIndex === index ? { ...item, time: event.target.value } : item,
                        ),
                      });
                    }}
                  />
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="family-column family-wide">
          <section className="surface-card family-card">
            <p className="card-kicker">Research</p>
            <h2>Caregiver guidance here</h2>
            <textarea
              className="textarea"
              value={researchQuery}
              onChange={(event) => setResearchQuery(event.target.value)}
            />
            <button className="primary-button" type="button" onClick={() => void runResearch()}>
              {researchBusy ? "Searching..." : "Search"}
            </button>
            {researchAnswer ? (
              <article className="evidence-card">
                <strong>{researchAnswer.suggestion}</strong>
                <p>{researchAnswer.summary}</p>
                <div className="button-row">
                  <span className="pill">{researchAnswer.source}</span>
                  <span className="pill">{researchAnswer.confidence} confidence</span>
                </div>
                {researchAnswer.url ? (
                  <a href={researchAnswer.url} target="_blank" rel="noreferrer" className="card-link">
                    Open source
                  </a>
                ) : null}
              </article>
            ) : null}
          </section>
        </section>
      </section>

      <Footer />
    </main>
  );
}

