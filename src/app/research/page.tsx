"use client";

import { useState } from "react";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";
import { buildResearchAnswer } from "@/lib/memorybridge";

export default function ResearchPage() {
  const [query, setQuery] = useState(
    "What helps with evening agitation in mid-stage support?",
  );
  const answer = buildResearchAnswer(query);

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
          <button className="primary-button" onClick={() => setQuery(query.trim())}>
            Search
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

