export type Stage = "early" | "mid" | "late";

export interface DailyTask {
  time: string;
  description: string;
  icon: string;
}

export interface Medication {
  name: string;
  dose: string;
  time: string;
  taken?: boolean;
}

export interface Memory {
  id: string;
  title: string;
  story: string;
  photoHint: string;
  relationship: string;
  photoPath?: string;
}

export interface Person {
  name: string;
  relationship: string;
  age: number;
  location: string;
}

export interface PatientProfile {
  name: string;
  first_name: string;
  age: number;
  stage: Stage;
  daily_tasks: DailyTask[];
  medications: Medication[];
  key_memories: Memory[];
  family_members: Person[];
  music_preference: string;
  other_preferences: string[];
  location_area: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type:
    | "task_completed"
    | "memory_viewed"
    | "panic"
    | "panic_resolved"
    | "medication_taken";
  description: string;
  severity: "normal" | "alert";
}

export function createEmptyProfile(): PatientProfile {
  return {
    name: "",
    first_name: "",
    age: 70,
    stage: "mid",
    daily_tasks: [],
    medications: [],
    key_memories: [],
    family_members: [],
    music_preference: "",
    other_preferences: [],
    location_area: "",
  };
}

export function createMemoryId(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `memory-${Date.now()}`;
}

export function createEmptyMemory(): Memory {
  return {
    id: createMemoryId(`memory-${Date.now()}`),
    title: "",
    story: "",
    photoHint: "✨",
    relationship: "",
  };
}

export function parseCarePlanText(text: string): PatientProfile {
  const profile = createEmptyProfile();
  const lower = text.toLowerCase();

  if (lower.includes("late-stage") || lower.includes("full care")) {
    profile.stage = "late";
  } else if (lower.includes("early-stage") || lower.includes("independent")) {
    profile.stage = "early";
  }

  const nameMatch = text.match(/(?:patient|name)[:\s]+([A-Za-z' -]+)/i);
  if (nameMatch?.[1]) {
    profile.name = nameMatch[1].trim();
    profile.first_name = profile.name.split(/\s+/)[0] ?? profile.first_name;
  }

  const ageMatch = text.match(/(\d{2})\s*(?:years old|yo|year old)/i);
  if (ageMatch) profile.age = Number(ageMatch[1]);

  const locationMatch = text.match(/(?:location|area|town|city)[:\s]+([A-Za-z ]+)/i);
  if (locationMatch?.[1]) profile.location_area = locationMatch[1].trim();

  return profile;
}

export function buildMorningGreeting(profile: PatientProfile) {
  return {
    name: profile.first_name,
    dayOfWeek: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: "Europe/London",
    }).format(new Date()),
    dateString: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/London",
    }).format(new Date()),
    weatherEmoji: "🌤️",
  };
}

export function buildMorningTasks(profile: PatientProfile) {
  const count = Math.min(profile.daily_tasks.length, profile.stage === "late" ? 2 : 3);
  return profile.daily_tasks.slice(0, count).map((task, index) => ({
    id: `task-${index}`,
    ...task,
    completed: index === 0,
    complexity: profile.stage === "early" ? "detailed" : "simple",
  }));
}

export function buildMedicationSummary(profile: PatientProfile) {
  return {
    medications: profile.medications.map((med, index) => ({
      ...med,
      taken: index === 0,
    })),
    nextDueIn: profile.medications.length ? "when it is due" : "none scheduled",
  };
}

export function buildMemoryHighlight(profile: PatientProfile) {
  return profile.key_memories[0] ?? null;
}

export function buildResearchAnswer(query: string) {
  const lower = query.toLowerCase();
  if (lower.includes("evening") || lower.includes("agitation")) {
    return {
      suggestion: "Keep evenings calm and predictable.",
      source: "NHS NICE guidance",
      url: "https://www.nice.org.uk/",
      confidence: "high" as const,
      summary:
        "Use routine, lighting, gentle reassurance, and avoid overstimulation.",
    };
  }

  if (lower.includes("music")) {
    return {
      suggestion: "Use familiar music to settle the moment.",
      source: "Alzheimer's Society",
      url: "https://www.alzheimers.org.uk/",
      confidence: "medium" as const,
      summary:
        "Personal songs can reduce distress and invite connection quickly.",
    };
  }

  return {
    suggestion: "Keep the question simple and ask one thing at a time.",
    source: "NHS",
    url: "https://www.nhs.uk/",
    confidence: "medium" as const,
    summary: "Short sentences, calm tone, and one-step prompts help most.",
  };
}
