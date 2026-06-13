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
      <section className="wrap hero home-hero">
        <p className="eyebrow">MemoryBridge</p>
        <h1>Choose who you are right now.</h1>
        <p className="home-copy">
          Patient view stays calm and simple. Family view holds the controls.
        </p>
        <div className="role-grid">
          <button className="role-card" onClick={() => enter("patient")}>
            <span className="role-pill">Patient</span>
            <strong>Open the calm screen</strong>
            <span>Simple greeting, memory touch, panic help.</span>
          </button>
          <button className="role-card" onClick={() => enter("family")}>
            <span className="role-pill family">Family</span>
            <strong>Open the control room</strong>
            <span>Edit memories, review activity, manage research.</span>
          </button>
        </div>

        <div className="button-row home-actions">
          {lastRole ? (
            <button
              className="primary-button"
              onClick={() => enter(lastRole)}
            >
              Continue as {lastRole}
            </button>
          ) : null}
          <Link href="/setup" className="secondary-button">
            Start setup
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

