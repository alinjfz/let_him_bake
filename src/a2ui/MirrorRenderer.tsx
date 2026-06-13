"use client";

import {
  A2UISurfaceSchema,
  type A2UIComponent,
  type A2UISurface,
} from "@/a2ui/catalog/definitions";
import {
  CalmingMessageRenderer,
  DailyTaskRenderer,
  EvidenceCardRenderer,
  MemoryCardRenderer,
  MemoryContextCardRenderer,
  MemoryLibraryHeaderRenderer,
  MedicationReminderRenderer,
  MusicCardRenderer,
  PanicOptionsRenderer,
  PatientGreetingRenderer,
} from "@/a2ui/catalog/renderers";
import type { CSSProperties, ReactNode } from "react";

export function parseA2UISurface(input: unknown): A2UISurface | null {
  const parsed = A2UISurfaceSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

function renderComponent(
  item: A2UIComponent,
  onPanicSelect?: (id: string) => void,
  theme?: { accent: string; surface: string; text: string },
) {
  const style = theme
    ? ({
        "--moment-accent": theme.accent,
        "--moment-surface": theme.surface,
        "--moment-text": theme.text,
      } as CSSProperties)
    : undefined;

  const wrap = (node: ReactNode, className: string) => (
    <div className={`a2ui-single-card ${className}`} style={style}>
      {node}
    </div>
  );

  switch (item.component) {
    case "PatientGreeting":
      return wrap(<PatientGreetingRenderer props={item.props} />, "a2ui-single-greeting");
    case "MemoryCard":
      return wrap(
        <MemoryCardRenderer props={item.props} />,
        `a2ui-single-memory mood-${item.props.relationship ?? "memory"}`,
      );
    case "DailyTask":
      return wrap(<DailyTaskRenderer props={item.props} />, "a2ui-single-task");
    case "MedicationReminder":
      return wrap(<MedicationReminderRenderer props={item.props} />, "a2ui-single-medication");
    case "PanicOptions":
      return wrap(
        <PanicOptionsRenderer props={item.props} onSelect={onPanicSelect} />,
        "a2ui-single-panic",
      );
    case "CalmingMessage":
      return wrap(<CalmingMessageRenderer props={item.props} />, "a2ui-single-calming");
    case "MusicCard":
      return wrap(<MusicCardRenderer props={item.props} />, "a2ui-single-music");
    case "EvidenceCard":
      return wrap(<EvidenceCardRenderer props={item.props} />, "a2ui-single-evidence");
    case "MemoryLibraryHeader":
      return wrap(<MemoryLibraryHeaderRenderer props={item.props} />, "a2ui-single-library");
    case "MemoryContextCard":
      return wrap(<MemoryContextCardRenderer props={item.props} />, "a2ui-single-context");
    default:
      return null;
  }
}

export function MirrorRenderer({
  surface,
  onPanicSelect,
  pill = true,
  single = false,
  step,
  total,
  theme,
}: {
  surface: A2UISurface | null;
  onPanicSelect?: (id: string) => void;
  pill?: boolean;
  single?: boolean;
  step?: number;
  total?: number;
  theme?: { accent: string; surface: string; text: string };
}) {
  if (!surface?.components.length) {
    return (
      <div className="a2ui-empty">
        <p>Waiting for your companion...</p>
      </div>
    );
  }

  const card = surface.components[0];
  const showSingle = single || surface.components.length === 1;

  return (
    <div className="a2ui-canvas">
      {pill ? (
        <div className="a2ui-pill" title="Generative UI via A2UI + CopilotKit AG-UI">
          ✦ A2UI
          {typeof step === "number" && typeof total === "number"
            ? ` · ${step + 1} of ${total}`
            : showSingle
              ? " · one card"
              : ` · ${surface.components.length} cards`}
        </div>
      ) : null}
      {showSingle && card ? (
        renderComponent(card, onPanicSelect, theme)
      ) : (
        <div className="a2ui-stack">
          {surface.components.map((item) => renderComponent(item, onPanicSelect, theme))}
        </div>
      )}
    </div>
  );
}
