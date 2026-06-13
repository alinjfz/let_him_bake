import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/setup", label: "Setup" },
  { href: "/patient", label: "Patient" },
  { href: "/family", label: "Family" },
  { href: "/research", label: "Research" },
];

export function SiteNav({ active }: { active?: string }) {
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">✦</span>
          <span>
            <strong>MemoryBridge</strong>
            <small>Gentle care, shaped live.</small>
          </span>
        </Link>
        <nav className="nav-links">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={active === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="hero">
      <div className="wrap hero-inner">
        <p className="eyebrow">{eyebrow}</p>
        <div className="hero-copy">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {action ? <div className="hero-action">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <p>
          MemoryBridge demo, simplified for local build and easy setup.
        </p>
        <p>
          Reference integration lives in the ignored `mydocs/starter-repo` tree.
        </p>
      </div>
    </footer>
  );
}

