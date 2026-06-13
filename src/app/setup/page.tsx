"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";
import { extractPdfText } from "@/lib/pdf";
import { DEMO_PROFILE, parseCarePlanText, type PatientProfile } from "@/lib/memorybridge";

const STORAGE_KEY = "memorybridge.profile";

export default function SetupPage() {
  const [profile, setProfile] = useState<PatientProfile>(DEMO_PROFILE);
  const [status, setStatus] = useState("Ready to upload a plan.");

  useEffect(() => {
    const cached = window.sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setProfile(JSON.parse(cached) as PatientProfile);
        setStatus("Loaded saved profile.");
        return;
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    void fetch("/api/state")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { profile?: PatientProfile } | null) => {
        if (data?.profile) {
          setProfile(data.profile);
          setStatus("Loaded shared profile.");
        }
      })
      .catch(() => {});
  }, []);

  const summary = useMemo(
    () => [
      `${profile.stage}-stage support`,
      `${profile.daily_tasks.length} daily steps`,
      `${profile.medications.length} medicines`,
      `${profile.key_memories.length} memories`,
    ],
    [profile],
  );

  async function persistProfile(nextProfile: PatientProfile, message: string) {
    setStatus(message);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: nextProfile }),
    }).catch(() => {});
  }

  async function handleFile(file: File) {
    setStatus(`Reading ${file.name}...`);
    try {
      const { text } = await extractPdfText(file);
      const parsed = parseCarePlanText(text);
      setProfile(parsed);
      await persistProfile(parsed, "Profile extracted and saved.");
    } catch {
      setStatus("Could not read that file.");
    }
  }

  return (
    <main>
      <SiteNav active="/setup" />
      <PageHeader
        eyebrow="Setup"
        title="Upload the care plan. Review the shape."
        subtitle="The file becomes a person-specific profile before the patient ever sees a screen."
      />

      <section className="wrap two-col">
        <section className="surface-card panel">
          <p className="card-kicker">Care plan PDF</p>
          <label className="upload-box">
            <span className="upload-icon">📄</span>
            <strong>Choose a PDF</strong>
            <span>We parse it locally, then cache the result.</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>

          <div className="pill-grid">
            {summary.map((item) => (
              <span key={item} className="pill">
                {item}
              </span>
            ))}
          </div>

          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setProfile(DEMO_PROFILE);
                void persistProfile(DEMO_PROFILE, "Loaded the demo profile.");
              }}
            >
              Use demo profile
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(STORAGE_KEY);
                setProfile(DEMO_PROFILE);
                setStatus("Cleared saved profile.");
              }}
            >
              Reset
            </button>
          </div>

          <p className="status-line">{status}</p>
        </section>

        <section className="surface-card panel">
          <div className="header-row">
            <div>
              <p className="card-kicker">Extracted profile</p>
              <h2>{profile.name}</h2>
            </div>
            <span className="location-badge">{profile.location_area}</span>
          </div>

          <div className="stats-grid">
            {[
              ["Age", String(profile.age)],
              ["Stage", profile.stage],
              ["Music", profile.music_preference],
            ].map(([label, value]) => (
              <div key={label} className="mini-card">
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <h3>Family members</h3>
          <div className="stack">
            {profile.family_members.map((member) => (
              <div key={member.name} className="mini-list-card">
                <strong>{member.name}</strong>
                <span>
                  {member.relationship} · {member.age} · {member.location}
                </span>
              </div>
            ))}
          </div>

          <button
            className="primary-button block"
            type="button"
            onClick={() => {
              void persistProfile(profile, "Profile approved and ready.");
            }}
          >
            Approve profile
          </button>
        </section>
      </section>

      <Footer />
    </main>
  );
}

