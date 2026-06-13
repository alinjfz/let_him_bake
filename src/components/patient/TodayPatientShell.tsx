"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MirrorRenderer, parseA2UISurface } from "@/a2ui/MirrorRenderer";
import type { A2UISurface } from "@/a2ui/catalog/definitions";
import { PatientProviders } from "@/components/patient/PatientProviders";
import "@/a2ui/theme.css";
import "@/components/patient/patient.css";
import { buildMemoryHighlight, type DailyTask, type PatientProfile } from "@/lib/echoes";
import { createMemoryImage } from "@/lib/app-state";
import type { PatientStepPayload } from "@/lib/patient-step-service";
import { clearSession, readSession, writePatientSession } from "@/lib/session";

const ROLE_KEY = "echoes.role";

type DashboardAnchor = {
  label: string;
  value: string;
  detail: string;
  icon: string;
};

function limitWords(text: string, maxWords: number) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function londonNow() {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/London",
  }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/London",
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(now),
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      minute: "2-digit",
      timeZone: "Europe/London",
    }).format(now),
  );
  return {
    day,
    date,
    time,
    minutes: Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : now.getHours() * 60 + now.getMinutes(),
  };
}

function parseClockMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const suffix = match[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function taskClock(task: DailyTask) {
  return task.time.replace(/\s+/g, " ").trim();
}

function taskSummary(task: DailyTask) {
  return limitWords(task.description, 5);
}

function taskSearchText(task: DailyTask) {
  return `${task.time} ${task.description}`.toLowerCase();
}

function chooseInitialTaskIndex(tasks: DailyTask[]) {
  if (!tasks.length) return 0;
  const now = londonNow();

  let bestIndex = 0;
  let bestDelta = Number.POSITIVE_INFINITY;

  tasks.forEach((task, index) => {
    const minutes = parseClockMinutes(task.time);
    if (minutes === null) return;
    const delta = minutes >= now.minutes ? minutes - now.minutes : 24 * 60 - now.minutes + minutes;
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function findTask(tasks: DailyTask[], patterns: RegExp[]) {
  return tasks.find((task) => patterns.some((pattern) => pattern.test(taskSearchText(task))));
}

function pickMedication(profile: PatientProfile) {
  const now = londonNow();
  const morning = profile.medications.find((med) => /morning/i.test(med.time));
  const evening = profile.medications.find((med) => /evening/i.test(med.time));
  if (now.minutes < 14 * 60) return morning ?? profile.medications[0] ?? null;
  return evening ?? profile.medications[profile.medications.length - 1] ?? null;
}

function buildAnchors(profile: PatientProfile): DashboardAnchor[] {
  const call = findTask(profile.daily_tasks, [/\bcall\b/i, /\bphone\b/i, /\btalk\b/i, /\bvideo\b/i]);
  const walk = findTask(profile.daily_tasks, [/\bwalk\b/i, /\bgarden\b/i, /\bstroll\b/i, /\bout\b/i]);
  const medication = pickMedication(profile);
  const callValue = call
    ? taskSummary(call)
    : profile.family_members[0]?.name
      ? `Call ${profile.family_members[0].name}`
      : "Family";

  return [
    {
      label: "Meds",
      value: medication ? `${medication.name} ${medication.dose}` : "None listed",
      detail: medication ? medication.time : "Today",
      icon: "💊",
    },
    {
      label: "Call",
      value: callValue,
      detail: call ? call.time : "Today",
      icon: "📞",
    },
    {
      label: "Walk",
      value: walk ? taskSummary(walk) : "Fresh air",
      detail: walk ? walk.time : "Today",
      icon: "🚶",
    },
  ];
}

async function fetchDashboardProfile(accessCode: string) {
  const response = await fetch(`/api/state?accessCode=${encodeURIComponent(accessCode)}`).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json().catch(() => null)) as { profile?: PatientProfile } | null;
  return data?.profile ?? null;
}

async function fetchPatientStep(accessCode: string, payload: Record<string, string | number>) {
  const response = await fetch("/api/patient-a2ui", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessCode, ...payload }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "request failed");
  }
  return (await response.json()) as PatientStepPayload;
}

export function TodayPatientShell() {
  return (
    <PatientProviders>
      <PatientDashboard />
    </PatientProviders>
  );
}

function PatientDashboard() {
  const router = useRouter();
  const spokeRef = useRef("");
  const dashboardSeededRef = useRef(false);
  const clockTimerRef = useRef<number | null>(null);
  const helpMusicTimerRef = useRef<number | null>(null);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linked, setLinked] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leavePin, setLeavePin] = useState("");
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpError, setHelpError] = useState("");
  const [helpSurface, setHelpSurface] = useState<A2UISurface | null>(null);
  const [helpStep, setHelpStep] = useState(0);
  const [helpTotal, setHelpTotal] = useState(0);
  const [helpShowOkay, setHelpShowOkay] = useState(false);
  const [helpOkayLabel, setHelpOkayLabel] = useState("Okay");
  const [helpTheme, setHelpTheme] = useState<{ accent: string; surface: string; text: string } | undefined>();
  const [clockTick, setClockTick] = useState(0);

  const clock = useMemo(() => londonNow(), [clockTick]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.98;
    window.speechSynthesis.speak(utterance);
  }, []);

  const currentTask = useMemo(() => {
    if (!profile?.daily_tasks.length) {
      return {
        time: "Now",
        description: "Take one slow breath.",
        icon: "🌿",
      };
    }
    return profile.daily_tasks[Math.min(taskIndex, profile.daily_tasks.length - 1)] ?? profile.daily_tasks[0];
  }, [profile, taskIndex]);

  const memory = useMemo(() => (profile ? buildMemoryHighlight(profile) : null), [profile]);
  const upcomingTasks = useMemo(() => profile?.daily_tasks.slice(taskIndex, taskIndex + 3) ?? [], [profile, taskIndex]);
  const memories = useMemo(() => profile?.key_memories.slice(0, 3) ?? [], [profile]);

  const anchors = useMemo(() => {
    if (!profile) return [];
    return buildAnchors(profile);
  }, [profile, clockTick]);

  const helpIsMusic = helpSurface?.components[0]?.component === "MusicCard";

  useEffect(() => {
    clockTimerRef.current = window.setInterval(() => setClockTick((value) => value + 1), 30_000);
    return () => {
      if (clockTimerRef.current !== null) {
        window.clearInterval(clockTimerRef.current);
      }
      if (helpMusicTimerRef.current !== null) {
        window.clearTimeout(helpMusicTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored === "family") {
      window.localStorage.setItem(ROLE_KEY, "caretaker");
    }
    const role = stored === "family" ? "caretaker" : stored;
    if (role && role !== "patient") {
      router.push(role === "caretaker" ? "/caretaker" : "/");
      return;
    }
    const session = readSession();
    if (session.patientCode) {
      setAccessCode(session.patientCode);
      setLinked(true);
    }
  }, [router]);

  useEffect(() => {
    if (!linked || !accessCode) return;
    let active = true;
    void (async () => {
      const nextProfile = await fetchDashboardProfile(accessCode);
      if (!active || !nextProfile) return;
      setProfile(nextProfile);
      if (!dashboardSeededRef.current) {
        dashboardSeededRef.current = true;
        setTaskIndex(chooseInitialTaskIndex(nextProfile.daily_tasks));
      }
    })();
    return () => {
      active = false;
    };
  }, [linked, accessCode]);

  async function linkPatient() {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setError("Enter the home code.");
      return;
    }
    setBusy(true);
    setError("");
    const profileData = await fetchDashboardProfile(code);
    setBusy(false);
    if (!profileData) {
      setError("That code did not work.");
      return;
    }
    writePatientSession(code);
    dashboardSeededRef.current = false;
    setAccessCode(code);
    setProfile(profileData);
    setTaskIndex(chooseInitialTaskIndex(profileData.daily_tasks));
    setLinked(true);
  }

  function handleBack() {
    setTaskIndex((value) => Math.max(0, value - 1));
  }

  function handleNext() {
    if (!profile?.daily_tasks.length) return;
    setTaskIndex((value) => Math.min(profile.daily_tasks.length - 1, value + 1));
  }

  async function openHelp() {
    const code = readSession().patientCode || accessCode;
    if (!code) {
      setError("Missing home code.");
      return;
    }

    if (helpMusicTimerRef.current !== null) {
      window.clearTimeout(helpMusicTimerRef.current);
      helpMusicTimerRef.current = null;
    }
    setHelpOpen(true);
    setHelpBusy(true);
    setHelpError("");

    try {
      const data = await fetchPatientStep(code, {
        action: "panic",
        step: 0,
        message: "__PANIC__",
      });
      setHelpSurface(parseA2UISurface(data.surface));
      setHelpStep(data.step ?? 0);
      setHelpTotal(data.total ?? 0);
      setHelpShowOkay(Boolean(data.showOkay));
      setHelpOkayLabel(data.okayLabel ?? "Okay");
      setHelpTheme(data.theme);
      if (data.speakText && spokeRef.current !== data.speakText) {
        spokeRef.current = data.speakText;
        speak(data.speakText);
      }
      if (data.step === 0) {
        helpMusicTimerRef.current = window.setTimeout(() => {
          helpMusicTimerRef.current = null;
          void requestMusic();
        }, 900);
      }
    } catch {
      setHelpError("Help is quiet right now.");
    } finally {
      setHelpBusy(false);
    }
  }

  async function advanceHelp(nextStep: number) {
    const code = readSession().patientCode || accessCode;
    if (!code) return;

    setHelpBusy(true);
    setHelpError("");

    try {
      const data = await fetchPatientStep(code, {
        action: "panic",
        step: nextStep,
      });
      setHelpSurface(parseA2UISurface(data.surface));
      setHelpStep(data.step ?? nextStep);
      setHelpTotal(data.total ?? 0);
      setHelpShowOkay(Boolean(data.showOkay));
      setHelpOkayLabel(data.okayLabel ?? "Okay");
      setHelpTheme(data.theme);
      if (data.speakText && spokeRef.current !== data.speakText) {
        spokeRef.current = data.speakText;
        speak(data.speakText);
      }
    } catch {
      setHelpError("Help is quiet right now.");
    } finally {
      setHelpBusy(false);
    }
  }

  async function requestMusic() {
    const code = readSession().patientCode || accessCode;
    if (!code) return;

    if (helpMusicTimerRef.current !== null) {
      window.clearTimeout(helpMusicTimerRef.current);
      helpMusicTimerRef.current = null;
    }
    setHelpBusy(true);
    setHelpError("");

    try {
      const data = await fetchPatientStep(code, {
        action: "music",
        step: 0,
        message: "__MUSIC__",
      });
      setHelpSurface(parseA2UISurface(data.surface));
      setHelpStep(data.step ?? 0);
      setHelpTotal(data.total ?? 0);
      setHelpShowOkay(Boolean(data.showOkay));
      setHelpOkayLabel(data.okayLabel ?? "Okay");
      setHelpTheme(data.theme);
      if (data.speakText && spokeRef.current !== data.speakText) {
        spokeRef.current = data.speakText;
        speak(data.speakText);
      }
    } catch {
      setHelpError("Music is quiet right now.");
    } finally {
      setHelpBusy(false);
    }
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

      <button className="patient-dashboard-leave" type="button" onClick={() => setLeaveOpen(true)}>
        Leave
      </button>

      <section className="patient-dashboard-shell">
        <header className="patient-dashboard-header">
          <div className="patient-dashboard-heading">
            <h1>Hi, {profile?.first_name || "Home"}</h1>
            <p className="patient-dashboard-subtitle">
              {clock.day} · {clock.date} · {clock.time}
            </p>
          </div>
        </header>

        <article className="patient-dashboard-card" aria-live="polite">
          <div className="patient-dashboard-card-head">
            <span className="patient-dashboard-label">Now</span>
            <span className="patient-dashboard-step">
              {profile?.daily_tasks.length
                ? `Step ${Math.min(taskIndex, profile.daily_tasks.length - 1) + 1} of ${profile.daily_tasks.length}`
                : "One step"}
            </span>
          </div>
          <div className="patient-dashboard-task-icon" aria-hidden="true">
            {currentTask.icon}
          </div>
          <h2>{taskSummary(currentTask) || taskClock(currentTask)}</h2>
          <p className="patient-dashboard-task-copy">{taskClock(currentTask)}</p>
          <p className="patient-dashboard-task-note">Just one thing.</p>
        </article>

        {memory ? (
          <article className="patient-dashboard-memory">
            <div className="patient-dashboard-memory-art" aria-hidden="true">
              <img src={createMemoryImage(memory)} alt="" />
            </div>
            <div className="patient-dashboard-memory-copy">
              <p className="patient-dashboard-label">Memory</p>
              <h2>{memory.title}</h2>
              <p>{limitWords(memory.story, 10)}</p>
              <small>{memory.relationship}</small>
            </div>
          </article>
        ) : null}

        <section className="patient-dashboard-feed" aria-label="Cards">
          <div className="patient-dashboard-feed-head">
            <p className="patient-dashboard-label">Cards</p>
            <span>{upcomingTasks.length} steps · {memories.length} memories</span>
          </div>
          <div className="patient-dashboard-feed-grid">
            {upcomingTasks.map((task, index) => (
              <article key={`${task.time}-${task.description}`} className="patient-dashboard-mini-card patient-dashboard-step-card">
                <span className="patient-dashboard-mini-kicker">Step {taskIndex + index + 1}</span>
                <span className="patient-dashboard-mini-icon" aria-hidden="true">
                  {task.icon}
                </span>
                <strong>{taskSummary(task)}</strong>
                <small>{taskClock(task)}</small>
              </article>
            ))}
            {memories.map((item) => (
              <article key={item.id} className="patient-dashboard-mini-card patient-dashboard-memory-card">
                <span className="patient-dashboard-mini-kicker">Memory</span>
                <span className="patient-dashboard-mini-icon" aria-hidden="true">
                  ✦
                </span>
                <strong>{item.title}</strong>
                <small>{limitWords(item.story, 8)}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="patient-dashboard-strip" aria-label="Today at a glance">
          {anchors.map((anchor) => (
            <article key={anchor.label} className="patient-dashboard-chip">
              <span className="patient-dashboard-chip-icon" aria-hidden="true">
                {anchor.icon}
              </span>
              <span className="patient-dashboard-chip-label">{anchor.label}</span>
              <strong>{anchor.value}</strong>
              <small>{anchor.detail}</small>
            </article>
          ))}
        </section>

        {error ? <p className="patient-dashboard-error">{error}</p> : null}

        <div className="patient-dashboard-actions">
          <button className="patient-dashboard-action" type="button" onClick={handleBack} disabled={taskIndex <= 0}>
            Back
          </button>
          <button
            className="patient-dashboard-action"
            type="button"
            onClick={handleNext}
            disabled={!profile?.daily_tasks.length || taskIndex >= profile.daily_tasks.length - 1}
          >
            Next
          </button>
          <button className="patient-dashboard-help" type="button" disabled={helpBusy} onClick={() => void openHelp()}>
            I need help
          </button>
        </div>
      </section>

      {leaveOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm leave">
          <section className="patient-leave-modal">
            <h2 className="patient-leave-title">Leave this screen?</h2>
            <p className="patient-leave-body">Enter your caretaker&apos;s password.</p>
            <input
              className="caretaker-input"
              type="password"
              autoComplete="off"
              value={leavePin}
              onChange={(e) => setLeavePin(e.target.value)}
              placeholder="Caretaker password"
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmLeave();
              }}
            />
            {leaveError ? <p className="patient-focus-error">{leaveError}</p> : null}
            <div className="patient-leave-actions">
              <button className="patient-leave-cancel" type="button" disabled={leaveBusy} onClick={() => setLeaveOpen(false)}>
                Stay
              </button>
              <button className="patient-leave-confirm" type="button" disabled={leaveBusy} onClick={() => void confirmLeave()}>
                {leaveBusy ? "Checking..." : "Leave"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Help">
          <section className="patient-help-modal">
            <div className="patient-help-top">
              <div>
                <p className="patient-help-kicker">Help</p>
                <h2>{profile?.first_name || "Home"}</h2>
              </div>
              <button
                className="patient-help-close"
                type="button"
                onClick={() => {
                  if (helpMusicTimerRef.current !== null) {
                    window.clearTimeout(helpMusicTimerRef.current);
                    helpMusicTimerRef.current = null;
                  }
                  setHelpOpen(false);
                  setHelpError("");
                }}
              >
                Back to dashboard
              </button>
            </div>
            {helpBusy && !helpSurface ? <p className="patient-dashboard-note">One moment...</p> : null}
            {helpError ? <p className="patient-dashboard-error">{helpError}</p> : null}
            <MirrorRenderer
              surface={helpSurface}
              single
              pill={false}
              step={helpStep}
              total={helpTotal}
              theme={helpTheme}
              onPanicSelect={(id) => {
                if (id === "music") {
                  void requestMusic();
                }
              }}
            />
            {helpShowOkay ? (
              <button
                className="patient-dashboard-help confirm"
                type="button"
                disabled={helpBusy}
                onClick={() => {
                  if (helpIsMusic) {
                    setHelpOpen(false);
                    setHelpError("");
                    return;
                  }
                  void advanceHelp(helpStep + 1);
                }}
              >
                {helpOkayLabel}
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
