"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useCallback, useState } from "react";
import Link from "next/link";
import { MirrorRenderer, parseA2UISurface } from "@/a2ui/MirrorRenderer";
import type { A2UISurface } from "@/a2ui/catalog/definitions";
import "@/a2ui/theme.css";
import { SponsorFooter } from "@/components/Brand";

export default function ResearchPage() {
  const [surface, setSurface] = useState<A2UISurface | null>(null);
  const [busy, setBusy] = useState(false);

  const askResearch = useCallback(async (query: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as { surface?: unknown };
      setSurface(parseA2UISurface(data.surface));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit-research" agent="research_agent">
      <main className="research-shell">
        <div className="caretaker-bg" aria-hidden="true" />
        <div className="research-inner">
          <header className="caretaker-header">
            <Link className="caretaker-text-btn" href="/caretaker">
              ← Caretaker home
            </Link>
            <span className="home-brand-mark">✦</span>
            <h1>Research guidance</h1>
            <p className="caretaker-lead">
              Linkup-powered clinical answers for caregivers. Powered by CopilotKit AG-UI + A2UI EvidenceCards.
            </p>
          </header>

          <section className="research-grid">
            <div className="caretaker-card research-chat">
              <CopilotChat
                labels={{
                  title: "Ask about care",
                  initial:
                    "Try: What helps with evening agitation? Or dementia support groups near Bristol.",
                }}
              />
              <div className="research-quick">
                <button type="button" disabled={busy} onClick={() => void askResearch("What helps with evening agitation?")}>
                  Evening agitation
                </button>
                <button type="button" disabled={busy} onClick={() => void askResearch("Dementia support groups near Bristol")}>
                  Local support
                </button>
              </div>
            </div>

            <div className="caretaker-card">
              <h2>Evidence surface</h2>
              <MirrorRenderer surface={surface} pill />
            </div>
          </section>

          <SponsorFooter />
        </div>
      </main>
    </CopilotKit>
  );
}
