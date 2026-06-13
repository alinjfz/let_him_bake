"use client";

import { useRouter } from "next/navigation";

const ROLE_KEY = "echoes.role";

export default function HomePage() {
  const router = useRouter();

  function enter(role: "patient" | "caretaker") {
    window.localStorage.setItem(ROLE_KEY, role);
    router.push(role === "patient" ? "/patient" : "/caretaker");
  }

  return (
    <main className="home-minimal">
      <div className="home-minimal-bg" aria-hidden="true" />
      <div className="home-minimal-orb home-minimal-orb-a" aria-hidden="true" />
      <div className="home-minimal-orb home-minimal-orb-b" aria-hidden="true" />

      <div className="home-minimal-inner">
        <header className="home-brand-minimal">
          <span className="home-brand-mark">✦</span>
          <strong className="home-brand-title">Echoes</strong>
          <p className="home-brand-tagline">Memories that stay close</p>
        </header>

        <div className="home-login-panel">
          <div className="home-login-stack">
            <button
              className="home-login-btn patient"
              type="button"
              onClick={() => enter("patient")}
            >
              <span className="home-login-label">Patient</span>
            </button>

            <button
              className="home-login-btn caretaker"
              type="button"
              onClick={() => enter("caretaker")}
            >
              <span className="home-login-label">Caretaker</span>
              <span className="home-login-sub">Family, friends &amp; loved ones</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
