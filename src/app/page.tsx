import Link from "next/link";
import { Footer, PageHeader, SiteNav } from "@/components/Brand";

const cards = [
  {
    href: "/setup",
    title: "Start with setup",
    body: "Upload a care plan and review the parsed profile.",
  },
  {
    href: "/patient",
    title: "Patient view",
    body: "Morning briefing, memory support, and panic mode.",
  },
  {
    href: "/family",
    title: "Family view",
    body: "Track activity and current status in one place.",
  },
  {
    href: "/research",
    title: "Research view",
    body: "Get quick guidance for carers.",
  },
];

export default function HomePage() {
  return (
    <main>
      <SiteNav active="/" />
      <PageHeader
        eyebrow="MemoryBridge"
        title="A simplified companion for people who need calm, not clutter."
        subtitle="This version keeps the useful product pieces in the main repo and leaves the full CopilotKit/A2UI starter only as a reference."
        action={
          <Link href="/setup" className="primary-button">
            Open demo
          </Link>
        }
      />

      <section className="wrap grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="surface-card">
            <p className="card-kicker">Route</p>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <span className="card-link">Open page</span>
          </Link>
        ))}
      </section>

      <Footer />
    </main>
  );
}

