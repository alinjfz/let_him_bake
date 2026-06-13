import type { Memory, PatientProfile } from "@/lib/echoes";

export type MemoryPolicy = "show" | "soften" | "redirect" | "hide";

export type PatientMode = "home" | "talk" | "panic" | "music";

export type PlaybackStatus = "idle" | "buffering" | "playing" | "error";

export interface MusicTrack {
  title: string;
  artist: string;
  sourceName: string;
  sourceUrl: string;
  streamUrl: string;
  memoryTouch: string;
  status: PlaybackStatus;
}

export function defaultMemoryPolicy(memory: Memory): MemoryPolicy {
  if (/wife|husband|partner/i.test(memory.relationship)) return "redirect";
  return "show";
}

export function buildMemoryPoliciesFromProfile(profile: PatientProfile) {
  return Object.fromEntries(
    profile.key_memories.map((memory) => [memory.id, defaultMemoryPolicy(memory)]),
  ) as Record<string, MemoryPolicy>;
}

export function firstFamilyName(profile: PatientProfile) {
  return profile.family_members[0]?.name ?? "someone you love";
}
