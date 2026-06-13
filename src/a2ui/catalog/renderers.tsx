"use client";

import type { CSSProperties } from "react";
import type {
  CalmingMessageProps,
  DailyTaskProps,
  EvidenceCardProps,
  MemoryCardProps,
  MedicationReminderProps,
  MusicCardProps,
  PanicOptionsProps,
  PatientGreetingProps,
} from "@/a2ui/catalog/definitions";

export function PatientGreetingRenderer({ props }: { props: PatientGreetingProps }) {
  return (
    <article className="a2ui-card a2ui-greeting">
      <span className="a2ui-emoji" aria-hidden="true">
        {props.weatherEmoji ?? "🌅"}
      </span>
      <h1>
        Good morning, {props.name}
      </h1>
      <p>
        {props.dayOfWeek}, {props.dateString}
        {props.locationArea ? ` · ${props.locationArea}` : ""}
      </p>
    </article>
  );
}

export function MemoryCardRenderer({ props }: { props: MemoryCardProps }) {
  return (
    <article className="a2ui-card a2ui-memory">
      {props.imageUrl ? (
        <div className="a2ui-memory-photo">
          <img src={props.imageUrl} alt="" />
        </div>
      ) : (
        <span className="a2ui-emoji a2ui-memory-hint" aria-hidden="true">
          {props.photoHint}
        </span>
      )}
      <h2>{props.title}</h2>
      <p>{props.story}</p>
    </article>
  );
}

export function DailyTaskRenderer({ props }: { props: DailyTaskProps }) {
  return (
    <article className="a2ui-card a2ui-task">
      <span className="a2ui-task-time">{props.time}</span>
      <span className="a2ui-emoji" aria-hidden="true">
        {props.icon}
      </span>
      <p>{props.description}</p>
      {props.completed ? <span className="a2ui-badge">Done</span> : null}
    </article>
  );
}

export function MedicationReminderRenderer({ props }: { props: MedicationReminderProps }) {
  return (
    <article className="a2ui-card a2ui-medication">
      <h2>Medicine time</h2>
      {props.nextDueIn ? <p className="a2ui-meta">{props.nextDueIn}</p> : null}
      <ul className="a2ui-med-list">
        {props.medications.map((med) => (
          <li key={`${med.name}-${med.time}`}>
            <strong>{med.name}</strong> {med.dose} · {med.time}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PanicOptionsRenderer({
  props,
  onSelect,
}: {
  props: PanicOptionsProps;
  onSelect?: (id: string) => void;
}) {
  return (
    <article className="a2ui-card a2ui-panic-options">
      <h2>{props.patientName}, choose what helps</h2>
      <div className="a2ui-panic-grid">
        {props.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="a2ui-panic-btn"
            style={{ "--panic-color": option.color } as CSSProperties}
            onClick={() => onSelect?.(option.id)}
          >
            <span aria-hidden="true">{option.icon}</span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </article>
  );
}

export function CalmingMessageRenderer({ props }: { props: CalmingMessageProps }) {
  return (
    <article className="a2ui-card a2ui-calming">
      <span className="a2ui-emoji a2ui-calming-bg" aria-hidden="true">
        {props.backgroundEmoji ?? "🌿"}
      </span>
      <h1>{props.message}</h1>
      {props.audioUrl ? <audio autoPlay src={props.audioUrl} /> : null}
    </article>
  );
}

export function MusicCardRenderer({ props }: { props: MusicCardProps }) {
  const href = props.youtubeSearchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(props.youtubeSearchQuery)}`
    : undefined;
  return (
    <article className="a2ui-card a2ui-music">
      <span className="a2ui-emoji" aria-hidden="true">
        {props.coverEmoji}
      </span>
      <h2>{props.songTitle}</h2>
      <p>{props.artist}</p>
      <p className="a2ui-meta">{props.description}</p>
      {href ? (
        <a className="a2ui-link" href={href} target="_blank" rel="noreferrer">
          Listen now
        </a>
      ) : null}
    </article>
  );
}

export function EvidenceCardRenderer({ props }: { props: EvidenceCardProps }) {
  return (
    <article className="a2ui-card a2ui-evidence">
      <span className={`a2ui-confidence ${props.confidence}`}>{props.confidence} confidence</span>
      <h2>{props.suggestion}</h2>
      <p>{props.summary}</p>
      <footer>
        <cite>{props.source}</cite>
        {props.url ? (
          <a className="a2ui-link" href={props.url} target="_blank" rel="noreferrer">
            Read source
          </a>
        ) : null}
      </footer>
    </article>
  );
}
