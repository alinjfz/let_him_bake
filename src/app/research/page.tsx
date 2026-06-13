"use client";

import { useState } from "react";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";
import type { EvidenceCard } from "@/lib/llm";
import { buildResearchAnswer } from "@/lib/memorybridge";

export default function ResearchPage() {
  const [query, setQuery] = useState(
    "What helps with evening agitation in mid-stage support?",
  );
  const [answer, setAnswer] = useState<EvidenceCard>(() =>
    buildResearchAnswer(query),
  );
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error("request failed");
      const data = (await response.json()) as { evidence?: EvidenceCard };
      if (data.evidence) {
        setAnswer(data.evidence);
        return;
      }
      setAnswer(buildResearchAnswer(query));
    } catch {
      setAnswer(buildResearchAnswer(query));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <SiteNav active="/research" />
      <PageHeader
        eyebrow="Research"
        title="Find the guidance fast."
        subtitle="Short answers for carers, each backed by a source."
      />

      <section className="wrap two-col">
        <section className="surface-card panel">
          <p className="card-kicker">Ask a question</p>
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="textarea"
          />
          <button className="primary-button" onClick={() => void search()}>
            {loading ? "Searching..." : "Search"}
          </button>
        </section>

        <section className="surface-card panel">
          <p className="card-kicker">Evidence card</p>
          <h2>{answer.suggestion}</h2>
          <p>{answer.summary}</p>
          <div className="button-row">
            <span className="pill">{answer.source}</span>
            <span className="pill">{answer.confidence} confidence</span>
          </div>
          {answer.url ? (
            <a href={answer.url} target="_blank" rel="noreferrer" className="card-link">
              Open source
            </a>
          ) : null}
        </section>
      </section>

      <Footer />
    </main>
  );
}
