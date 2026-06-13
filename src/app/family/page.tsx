"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActivityEvent } from "@/lib/echoes";
import { readSession, stateQuery } from "@/lib/session";
import { SponsorFooter } from "@/components/Brand";

export default function FamilyPage() {
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const session = readSession();
      const response = await fetch(`/api/activity-log?${stateQuery(session)}`).catch(() => null);
      if (!response?.ok) {
        setStatus("Sign in as caretaker to view activity.");
        return;
      }
      const data = (await response.json()) as { activity?: ActivityEvent[] };
      setActivity(data.activity ?? []);
      setStatus(data.activity?.length ? "Live" : "Quiet day so far");
    }
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = activity[0];
  const panicCount = activity.filter((event) => event.type === "panic").length;

  return (
    <main className="family-shell">
      <div className="caretaker-bg" aria-hidden="true" />
      <div className="family-inner">
        <header className="caretaker-header">
          <Link className="caretaker-text-btn" href="/caretaker">
            ← Caretaker home
          </Link>
          <span className="home-brand-mark">✦</span>
          <h1>Family view</h1>
          <p className="caretaker-lead">Live activity from the patient companion.</p>
        </header>

        <section className="family-grid">
          <article className="caretaker-card">
            <h2>Activity log</h2>
            <ul className="family-log">
              {activity.length ? (
                activity.map((event) => (
                  <li key={event.id} className={event.severity === "alert" ? "alert" : ""}>
                    <strong>{event.timestamp}</strong>
                    <span>{event.description}</span>
                  </li>
                ))
              ) : (
                <li>No activity yet.</li>
              )}
            </ul>
          </article>

          <article className="caretaker-card">
            <h2>Live status</h2>
            <p className="family-status">{status}</p>
            {latest ? <p className="caretaker-meta">Latest: {latest.description}</p> : null}
            <p className="caretaker-meta">Panic events today: {panicCount}</p>
          </article>
        </section>

        <SponsorFooter />
      </div>
    </main>
  );
}
