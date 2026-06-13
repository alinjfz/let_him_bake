"use client";

import { useEffect, useState } from "react";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";
import { DEMO_ACTIVITY, type ActivityEvent } from "@/lib/memorybridge";

export default function FamilyPage() {
  const [events, setEvents] = useState<ActivityEvent[]>(DEMO_ACTIVITY);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const response = await fetch("/api/activity-log").catch(() => null);
      if (!response || !response.ok) return;
      const data = (await response.json().catch(() => null)) as
        | { events?: ActivityEvent[] }
        | null;
      if (active && data?.events) setEvents(data.events);
    };

    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const stats = {
    tasksCompleted: events.filter((event) => event.type === "task_completed").length,
    medsTaken: events.filter((event) => event.type === "medication_taken").length,
    memoriesViewed: events.filter((event) => event.type === "memory_viewed").length,
  };

  const lastEvent = events[0];

  return (
    <main>
      <SiteNav active="/family" />
      <PageHeader
        eyebrow="Family"
        title="See the day at a glance."
        subtitle="A calm timeline on the left. Current status and daily totals on the right."
      />

      <section className="wrap two-col">
        <section className="surface-card panel">
          <h2>Activity log</h2>
          <p className="muted">Newest events first.</p>
          <div className="stack">
            {events.map((event) => (
              <div
                key={`${event.timestamp}-${event.description}`}
                className={
                  event.severity === "alert" ? "event-card alert" : "event-card"
                }
              >
                <div className="header-row">
                  <strong>{event.description}</strong>
                  <span>{event.timestamp}</span>
                </div>
                <p>{event.type.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stack">
          <section className="surface-card status-card">
            <p className="card-kicker">Live status</p>
            <h2>
              {lastEvent?.type === "panic"
                ? "Panic in progress"
                : lastEvent?.type === "panic_resolved"
                  ? "Panic resolved 2 min ago"
                  : "Active and settled"}
            </h2>

            <div className="stats-grid">
              {[
                ["Tasks", stats.tasksCompleted],
                ["Meds", stats.medsTaken],
                ["Memories", stats.memoriesViewed],
              ].map(([label, value]) => (
                <div key={label as string} className="mini-card">
                  <p>{label}</p>
                  <strong>{value as number}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card panel">
            <p className="card-kicker">Snapshot</p>
            <h3>{events.length} events today</h3>
          </section>
        </section>
      </section>

      <Footer />
    </main>
  );
}

