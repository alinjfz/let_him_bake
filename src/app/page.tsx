"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Brand";

const ROLE_KEY = "memorybridge.role";

export default function HomePage() {
  const router = useRouter();
  const [lastRole, setLastRole] = useState<"patient" | "family" | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_KEY);
    if (stored === "patient" || stored === "family") {
      setLastRole(stored);
    }
  }, []);

  function enter(role: "patient" | "family") {
    window.localStorage.setItem(ROLE_KEY, role);
    router.push(role === "patient" ? "/patient" : "/family");
  }

  return (
    <main className="home-shell">
      <section className="home-hero-shell">
        <div className="home-bg" />
        <div className="wrap home-grid">
          <section className="home-copy-card surface-card">
            <p className="eyebrow">MemoryBridge</p>
            <h1>Choose your care view.</h1>
            <p>
              Patient stays calm, simple, and protected. Family gets the controls,
              memory policies, and research.
            </p>
            <div className="button-row home-actions">
              {lastRole ? (
                <button className="primary-button" type="button" onClick={() => enter(lastRole)}>
                  Continue as {lastRole}
                </button>
              ) : null}
              <Link href="/setup" className="secondary-button">
                Start setup
              </Link>
            </div>
          </section>

          <section className="home-role-grid">
            <button className="home-role-card patient" type="button" onClick={() => enter("patient")}>
              <span className="role-pill">Patient</span>
              <strong>Open the calm screen</strong>
              <span>Greeting, memory, voice, and worried-mode only.</span>
            </button>
            <button className="home-role-card family" type="button" onClick={() => enter("family")}>
              <span className="role-pill family">Family</span>
              <strong>Open the control room</strong>
              <span>Edit memories, review activity, and guide research.</span>
            </button>
            <article className="home-note-card">
              <p className="card-kicker">Hackathon</p>
              <h3>Generative UI, but safe.</h3>
              <p>
                The agent shapes the cards. The patient never touches the data.
              </p>
            </article>
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}

