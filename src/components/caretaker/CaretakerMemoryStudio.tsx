"use client";

import { useMemo, useState } from "react";
import { MirrorRenderer } from "@/a2ui/MirrorRenderer";
import type { MemoryPolicy } from "@/lib/app-state-helpers";
import {
  buildCaretakerMemoryLibrarySurface,
  buildCaretakerMemoryWorkbenchSurface,
  POLICY_META,
} from "@/lib/caretaker-a2ui";
import type { Memory, PatientProfile } from "@/lib/echoes";
import { themeForMemory } from "@/lib/patient-moments";

type CaretakerMemoryStudioProps = {
  profile: PatientProfile;
  policies: Record<string, MemoryPolicy>;
  onUpdateMemory: (index: number, patch: Partial<Memory>) => void;
  onUpdatePolicy: (memoryId: string, policy: MemoryPolicy) => void;
  onAddMemory: () => void;
  onRemoveMemory: (index: number) => void;
  compact?: boolean;
};

export function CaretakerMemoryStudio({
  profile,
  policies,
  onUpdateMemory,
  onUpdatePolicy,
  onAddMemory,
  onRemoveMemory,
  compact = false,
}: CaretakerMemoryStudioProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const memories = profile.key_memories;
  const boundedIndex = memories.length ? Math.min(activeIndex, memories.length - 1) : 0;
  const activeMemory = memories[boundedIndex];

  const surface = useMemo(() => {
    if (!activeMemory) return buildCaretakerMemoryLibrarySurface(profile);
    return buildCaretakerMemoryWorkbenchSurface(profile, activeMemory, boundedIndex, policies);
  }, [profile, activeMemory, boundedIndex, policies]);

  const previewTheme = useMemo(() => {
    if (!activeMemory) return undefined;
    const theme = themeForMemory(activeMemory);
    return { accent: theme.accent, surface: theme.surface, text: theme.text };
  }, [activeMemory]);

  return (
    <div className="caretaker-memory-studio">
      <div className="caretaker-memory-nav" role="tablist" aria-label="Memories">
        {memories.map((memory, index) => (
          <button
            key={memory.id || `mem-${index}`}
            type="button"
            role="tab"
            aria-selected={index === boundedIndex}
            className={index === boundedIndex ? "caretaker-memory-chip active" : "caretaker-memory-chip"}
            onClick={() => setActiveIndex(index)}
          >
            <span aria-hidden="true">{memory.photoHint || "✦"}</span>
            <span>{memory.title?.trim() || `Memory ${index + 1}`}</span>
          </button>
        ))}
        <button className="caretaker-memory-chip add" type="button" onClick={onAddMemory}>
          + Add
        </button>
      </div>

      <div className="caretaker-memory-a2ui">
        <MirrorRenderer
          surface={surface}
          pill
          theme={previewTheme}
          step={boundedIndex}
          total={Math.max(memories.length, 1)}
        />
      </div>

      {activeMemory ? (
        <div className="caretaker-memory-editor">
          <div className="caretaker-memory-editor-head">
            <h3>Edit memory {boundedIndex + 1}</h3>
            <button
              className="caretaker-text-btn"
              type="button"
              onClick={() => {
                onRemoveMemory(boundedIndex);
                setActiveIndex(Math.max(0, boundedIndex - 1));
              }}
            >
              Remove
            </button>
          </div>

          <label className="caretaker-form-field">
            Title
            <input
              className="caretaker-input"
              value={activeMemory.title}
              placeholder="Blackpool Ballroom 1972"
              onChange={(e) => onUpdateMemory(boundedIndex, { title: e.target.value })}
            />
          </label>

          <label className="caretaker-form-field">
            Story
            <textarea
              className="caretaker-textarea"
              value={activeMemory.story}
              placeholder="A short warm story they can hold onto..."
              rows={compact ? 3 : 4}
              onChange={(e) => onUpdateMemory(boundedIndex, { story: e.target.value })}
            />
          </label>

          <div className="caretaker-row">
            <label className="caretaker-form-field">
              Relationship
              <input
                className="caretaker-input"
                value={activeMemory.relationship}
                placeholder="daughter"
                onChange={(e) => onUpdateMemory(boundedIndex, { relationship: e.target.value })}
              />
            </label>
            <label className="caretaker-form-field">
              Photo hint
              <input
                className="caretaker-input caretaker-input-short"
                value={activeMemory.photoHint}
                placeholder="💍"
                onChange={(e) => onUpdateMemory(boundedIndex, { photoHint: e.target.value })}
              />
            </label>
          </div>

          <label className="caretaker-form-field">
            Patient screen policy
            <select
              className="caretaker-input"
              value={policies[activeMemory.id] ?? "show"}
              onChange={(e) => onUpdatePolicy(activeMemory.id, e.target.value as MemoryPolicy)}
            >
              {(Object.keys(POLICY_META) as MemoryPolicy[]).map((key) => (
                <option key={key} value={key}>
                  {POLICY_META[key].label}
                </option>
              ))}
            </select>
          </label>
          <p className="caretaker-memory-policy-note">
            {POLICY_META[policies[activeMemory.id] ?? "show"].description}
          </p>
        </div>
      ) : (
        <div className="caretaker-memory-empty">
          <p className="caretaker-lead">No memories yet. Add the first warm story.</p>
          <button className="caretaker-secondary" type="button" onClick={onAddMemory}>
            Add first memory
          </button>
        </div>
      )}
    </div>
  );
}
