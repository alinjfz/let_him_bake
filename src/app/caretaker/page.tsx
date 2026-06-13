"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppState, MemoryPolicy } from "@/lib/app-state";
import {
  createEmptyMemory,
  createEmptyProfile,
  createMemoryId,
  DEMO_PROFILE,
  parseCarePlanText,
  type Memory,
  type PatientProfile,
  type Stage,
} from "@/lib/echoes";
import { extractPdfText } from "@/lib/pdf";

const ROLE_KEY = "echoes.role";

type OnboardingStep = "welcome" | "patient" | "import" | "memories" | "routine" | "preferences" | "done";

const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "patient",
  "import",
  "memories",
  "routine",
  "preferences",
  "done",
];

function defaultMemoryPolicy(memory: Memory): MemoryPolicy {
  if (/wife|husband|partner/i.test(memory.relationship)) return "redirect";
  return "show";
}

function buildPolicies(profile: PatientProfile) {
  return Object.fromEntries(
    profile.key_memories.map((memory) => [memory.id, defaultMemoryPolicy(memory)]),
  ) as Record<string, MemoryPolicy>;
}

function syncFirstName(profile: PatientProfile): PatientProfile {
  const first = profile.name.trim().split(/\s+/)[0] ?? profile.first_name;
  return { ...profile, first_name: first || profile.first_name };
}

export default function CaretakerPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(true);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [profile, setProfile] = useState<PatientProfile>(createEmptyProfile());
  const [policies, setPolicies] = useState<Record<string, MemoryPolicy>>({});
  const [activity, setActivity] = useState<AppState["activity"]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<"memories" | "routine" | "about">("memories");

  async function loadState() {
    const response = await fetch("/api/state").catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (!data) return;
    setProfile(data.profile);
    setPolicies(data.memoryPolicies);
    setActivity(data.activity);
    setOnboarding(!data.onboardingComplete);
    setReady(true);
  }

  async function persist(nextProfile: PatientProfile, complete = false, nextPolicies = policies) {
    setBusy(true);
    setStatus("Saving...");
    const synced = syncFirstName(nextProfile);
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: synced,
        state: {
          memoryPolicies: nextPolicies,
          onboardingComplete: complete ? true : undefined,
        },
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setStatus("Save failed.");
      return false;
    }
    const data = (await response.json().catch(() => null)) as AppState | null;
    if (data) {
      setProfile(data.profile);
      setPolicies(data.memoryPolicies);
      setActivity(data.activity);
      if (complete) setOnboarding(false);
    }
    setStatus(complete ? "All set." : "Saved.");
    return true;
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored === "family") {
      window.localStorage.setItem(ROLE_KEY, "caretaker");
    }
    const role = stored === "family" ? "caretaker" : stored;
    if (role && role !== "caretaker") {
      router.push(role === "patient" ? "/patient" : "/");
      return;
    }
    void loadState();
  }, [router]);

  useEffect(() => {
    if (onboarding) return;
    const timer = window.setInterval(() => void loadState(), 5000);
    return () => window.clearInterval(timer);
  }, [onboarding]);

  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const latestEvent = activity[0];

  const memoryCount = profile.key_memories.length;
  const taskCount = profile.daily_tasks.length;

  async function handlePdf(file: File) {
    setStatus(`Reading ${file.name}...`);
    try {
      const { text } = await extractPdfText(file);
      const parsed = parseCarePlanText(text);
      const next = syncFirstName(parsed);
      setProfile(next);
      setPolicies(buildPolicies(next));
      setStatus("Care plan imported.");
    } catch {
      setStatus("Could not read that file.");
    }
  }

  function useDemoProfile() {
    setProfile(DEMO_PROFILE);
    setPolicies(buildPolicies(DEMO_PROFILE));
    setStatus("Demo profile loaded.");
  }

  function addMemory() {
    setProfile((current) => ({
      ...current,
      key_memories: [...current.key_memories, createEmptyMemory()],
    }));
  }

  function updateMemory(index: number, patch: Partial<Memory>) {
    setProfile((current) => ({
      ...current,
      key_memories: current.key_memories.map((memory, i) => {
        if (i !== index) return memory;
        const next = { ...memory, ...patch };
        if (patch.title && !patch.id) {
          next.id = createMemoryId(patch.title);
        }
        return next;
      }),
    }));
  }

  function removeMemory(index: number) {
    setProfile((current) => ({
      ...current,
      key_memories: current.key_memories.filter((_, i) => i !== index),
    }));
  }

  function addTask() {
    setProfile((current) => ({
      ...current,
      daily_tasks: [
        ...current.daily_tasks,
        { time: "9:00 AM", description: "A gentle step", icon: "✨" },
      ],
    }));
  }

  function addMedication() {
    setProfile((current) => ({
      ...current,
      medications: [
        ...current.medications,
        { name: "Medicine", dose: "1 tablet", time: "Morning" },
      ],
    }));
  }

  async function finishOnboarding() {
    const synced = syncFirstName(profile);
    const nextPolicies = buildPolicies(synced);
    setPolicies(nextPolicies);
    await persist(synced, true, nextPolicies);
  }

  const onboardingTitle = useMemo(() => {
    switch (step) {
      case "welcome":
        return "Welcome to Echoes";
      case "patient":
        return "Who are you caring for?";
      case "import":
        return "Bring in what you know";
      case "memories":
        return "Shape their memories";
      case "routine":
        return "Daily rhythm";
      case "preferences":
        return "Little comforts";
      case "done":
        return "Ready to begin";
      default:
        return "Echoes";
    }
  }, [step]);

  if (!ready) {
    return (
      <main className="caretaker-shell">
        <div className="caretaker-bg" aria-hidden="true" />
        <p className="caretaker-loading">Loading...</p>
      </main>
    );
  }

  if (onboarding) {
    return (
      <main className="caretaker-shell">
        <div className="caretaker-bg" aria-hidden="true" />

        <div className="caretaker-inner">
          <header className="caretaker-header">
            <span className="home-brand-mark">✦</span>
            <p className="caretaker-eyebrow">
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h1>{onboardingTitle}</h1>
          </header>

          <section className="caretaker-card">
            {step === "welcome" && (
              <p className="caretaker-lead">
                Set up one patient profile. Echoes will greet them with warmth using what you add here.
              </p>
            )}

            {step === "patient" && (
              <div className="caretaker-form">
                <label>
                  Full name
                  <input
                    className="caretaker-input"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Margaret Thompson"
                  />
                </label>
                <label>
                  Age
                  <input
                    className="caretaker-input"
                    type="number"
                    value={profile.age || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, age: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label>
                  Home area
                  <input
                    className="caretaker-input"
                    value={profile.location_area}
                    onChange={(e) => setProfile({ ...profile, location_area: e.target.value })}
                    placeholder="Leeds"
                  />
                </label>
                <label>
                  Support stage
                  <select
                    className="caretaker-input"
                    value={profile.stage}
                    onChange={(e) =>
                      setProfile({ ...profile, stage: e.target.value as Stage })
                    }
                  >
                    <option value="early">Early</option>
                    <option value="mid">Mid</option>
                    <option value="late">Late</option>
                  </select>
                </label>
              </div>
            )}

            {step === "import" && (
              <div className="caretaker-form">
                <p className="caretaker-lead">
                  Upload a care plan PDF, try the demo, or skip and fill things in by hand.
                </p>
                <label className="caretaker-upload">
                  <strong>Upload PDF</strong>
                  <span>We read it locally on your device.</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePdf(file);
                    }}
                  />
                </label>
                <button className="caretaker-secondary" type="button" onClick={useDemoProfile}>
                  Use demo profile
                </button>
              </div>
            )}

            {step === "memories" && (
              <div className="caretaker-stack">
                <p className="caretaker-lead">Short stories work best. One warm moment at a time.</p>
                {profile.key_memories.map((memory, index) => (
                  <article key={memory.id} className="caretaker-item">
                    <input
                      className="caretaker-input"
                      value={memory.title}
                      placeholder="Memory title"
                      onChange={(e) => updateMemory(index, { title: e.target.value })}
                    />
                    <textarea
                      className="caretaker-textarea"
                      value={memory.story}
                      placeholder="A short story they can hold onto"
                      onChange={(e) => updateMemory(index, { story: e.target.value })}
                    />
                    <div className="caretaker-row">
                      <input
                        className="caretaker-input"
                        value={memory.relationship}
                        placeholder="Relationship"
                        onChange={(e) => updateMemory(index, { relationship: e.target.value })}
                      />
                      <input
                        className="caretaker-input caretaker-input-short"
                        value={memory.photoHint}
                        placeholder="Emoji"
                        onChange={(e) => updateMemory(index, { photoHint: e.target.value })}
                      />
                      <button
                        className="caretaker-text-btn"
                        type="button"
                        onClick={() => removeMemory(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
                <button className="caretaker-secondary" type="button" onClick={addMemory}>
                  Add a memory
                </button>
              </div>
            )}

            {step === "routine" && (
              <div className="caretaker-stack">
                <p className="caretaker-kicker">Daily steps</p>
                {profile.daily_tasks.map((task, index) => (
                  <article key={`task-${index}`} className="caretaker-item caretaker-row">
                    <input
                      className="caretaker-input caretaker-input-short"
                      value={task.time}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          daily_tasks: profile.daily_tasks.map((item, i) =>
                            i === index ? { ...item, time: e.target.value } : item,
                          ),
                        })
                      }
                    />
                    <input
                      className="caretaker-input"
                      value={task.description}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          daily_tasks: profile.daily_tasks.map((item, i) =>
                            i === index ? { ...item, description: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </article>
                ))}
                <button className="caretaker-secondary" type="button" onClick={addTask}>
                  Add a step
                </button>

                <p className="caretaker-kicker">Medications</p>
                {profile.medications.map((med, index) => (
                  <article key={`med-${index}`} className="caretaker-item caretaker-row">
                    <input
                      className="caretaker-input"
                      value={med.name}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          medications: profile.medications.map((item, i) =>
                            i === index ? { ...item, name: e.target.value } : item,
                          ),
                        })
                      }
                    />
                    <input
                      className="caretaker-input caretaker-input-short"
                      value={med.dose}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          medications: profile.medications.map((item, i) =>
                            i === index ? { ...item, dose: e.target.value } : item,
                          ),
                        })
                      }
                    />
                    <input
                      className="caretaker-input caretaker-input-short"
                      value={med.time}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          medications: profile.medications.map((item, i) =>
                            i === index ? { ...item, time: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </article>
                ))}
                <button className="caretaker-secondary" type="button" onClick={addMedication}>
                  Add medication
                </button>
              </div>
            )}

            {step === "preferences" && (
              <div className="caretaker-form">
                <label>
                  Favourite music
                  <input
                    className="caretaker-input"
                    value={profile.music_preference}
                    onChange={(e) =>
                      setProfile({ ...profile, music_preference: e.target.value })
                    }
                    placeholder="Frank Sinatra"
                  />
                </label>
                <label>
                  Loved ones (name, relationship)
                  <input
                    className="caretaker-input"
                    value={profile.family_members[0]?.name ?? ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      const member = profile.family_members[0] ?? {
                        name: "",
                        relationship: "family",
                        age: 0,
                        location: profile.location_area,
                      };
                      setProfile({
                        ...profile,
                        family_members: [{ ...member, name }],
                      });
                    }}
                    placeholder="Sarah"
                  />
                </label>
                <input
                  className="caretaker-input"
                  value={profile.family_members[0]?.relationship ?? ""}
                  onChange={(e) => {
                    const member = profile.family_members[0] ?? {
                      name: "",
                      relationship: "",
                      age: 0,
                      location: profile.location_area,
                    };
                    setProfile({
                      ...profile,
                      family_members: [{ ...member, relationship: e.target.value }],
                    });
                  }}
                  placeholder="daughter"
                />
                <label>
                  Other comforts
                  <input
                    className="caretaker-input"
                    value={profile.other_preferences.join(", ")}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        other_preferences: e.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Yorkshire tea, gardening"
                  />
                </label>
              </div>
            )}

            {step === "done" && (
              <div className="caretaker-done">
                <p className="caretaker-lead">
                  {profile.first_name || profile.name || "Your patient"} is ready.
                </p>
                <ul className="caretaker-summary">
                  <li>{memoryCount} memories</li>
                  <li>{taskCount} daily steps</li>
                  <li>{profile.medications.length} medications</li>
                </ul>
              </div>
            )}

            {status ? <p className="caretaker-status">{status}</p> : null}

            <div className="caretaker-actions">
              {stepIndex > 0 && step !== "done" ? (
                <button
                  className="caretaker-secondary"
                  type="button"
                  onClick={() => setStep(ONBOARDING_STEPS[stepIndex - 1])}
                >
                  Back
                </button>
              ) : null}
              {step === "done" ? (
                <button
                  className="caretaker-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void finishOnboarding()}
                >
                  {busy ? "Saving..." : "Open caretaker home"}
                </button>
              ) : (
                <button
                  className="caretaker-primary"
                  type="button"
                  disabled={step === "patient" && !profile.name.trim()}
                  onClick={() => setStep(ONBOARDING_STEPS[stepIndex + 1])}
                >
                  Continue
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="caretaker-shell">
      <div className="caretaker-bg" aria-hidden="true" />

      <div className="caretaker-inner caretaker-dashboard">
        <header className="caretaker-header caretaker-header-row">
          <div>
            <p className="caretaker-eyebrow">Caretaker</p>
            <h1>{profile.first_name || profile.name}</h1>
            <p className="caretaker-meta">
              {latestEvent ? `${latestEvent.description} · ${latestEvent.timestamp}` : "All quiet right now."}
            </p>
          </div>
          <button
            className="caretaker-text-btn"
            type="button"
            onClick={() => {
              window.localStorage.removeItem(ROLE_KEY);
              router.push("/");
            }}
          >
            Leave
          </button>
        </header>

        <div className="caretaker-tabs">
          {(["memories", "routine", "about"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={dashboardTab === tab ? "caretaker-tab active" : "caretaker-tab"}
              onClick={() => setDashboardTab(tab)}
            >
              {tab === "memories" ? "Memories" : tab === "routine" ? "Routine" : "About"}
            </button>
          ))}
        </div>

        <section className="caretaker-card">
          {dashboardTab === "memories" && (
            <div className="caretaker-stack">
              {profile.key_memories.map((memory, index) => (
                <article key={memory.id} className="caretaker-item">
                  <strong>{memory.title || "Untitled memory"}</strong>
                  <textarea
                    className="caretaker-textarea"
                    value={memory.story}
                    onChange={(e) => updateMemory(index, { story: e.target.value })}
                  />
                  <select
                    className="caretaker-input"
                    value={policies[memory.id] ?? "show"}
                    onChange={(e) =>
                      setPolicies((current) => ({
                        ...current,
                        [memory.id]: e.target.value as MemoryPolicy,
                      }))
                    }
                  >
                    <option value="show">Show as written</option>
                    <option value="soften">Soften language</option>
                    <option value="redirect">Redirect gently</option>
                    <option value="hide">Hide for now</option>
                  </select>
                </article>
              ))}
              <button className="caretaker-secondary" type="button" onClick={addMemory}>
                Add memory
              </button>
            </div>
          )}

          {dashboardTab === "routine" && (
            <div className="caretaker-stack">
              {profile.daily_tasks.map((task, index) => (
                <article key={`dash-task-${index}`} className="caretaker-item caretaker-row">
                  <span className="caretaker-chip">{task.icon}</span>
                  <input
                    className="caretaker-input caretaker-input-short"
                    value={task.time}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        daily_tasks: profile.daily_tasks.map((item, i) =>
                          i === index ? { ...item, time: e.target.value } : item,
                        ),
                      })
                    }
                  />
                  <input
                    className="caretaker-input"
                    value={task.description}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        daily_tasks: profile.daily_tasks.map((item, i) =>
                          i === index ? { ...item, description: e.target.value } : item,
                        ),
                      })
                    }
                  />
                </article>
              ))}
              <button className="caretaker-secondary" type="button" onClick={addTask}>
                Add step
              </button>
            </div>
          )}

          {dashboardTab === "about" && (
            <div className="caretaker-form">
              <label>
                Music
                <input
                  className="caretaker-input"
                  value={profile.music_preference}
                  onChange={(e) =>
                    setProfile({ ...profile, music_preference: e.target.value })
                  }
                />
              </label>
              <label>
                Location
                <input
                  className="caretaker-input"
                  value={profile.location_area}
                  onChange={(e) =>
                    setProfile({ ...profile, location_area: e.target.value })
                  }
                />
              </label>
              <label>
                Stage
                <select
                  className="caretaker-input"
                  value={profile.stage}
                  onChange={(e) =>
                    setProfile({ ...profile, stage: e.target.value as Stage })
                  }
                >
                  <option value="early">Early</option>
                  <option value="mid">Mid</option>
                  <option value="late">Late</option>
                </select>
              </label>
            </div>
          )}

          {status ? <p className="caretaker-status">{status}</p> : null}

          <div className="caretaker-actions">
            <button
              className="caretaker-primary"
              type="button"
              disabled={busy}
              onClick={() => void persist(profile, false, buildPolicies(profile))}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button
              className="caretaker-secondary"
              type="button"
              onClick={() => router.push("/patient")}
            >
              Preview patient view
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
