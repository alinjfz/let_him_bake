import {
  buildMorningGreeting,
  type DailyTask,
  type Memory,
  type Medication,
  type PatientProfile,
} from "@/lib/echoes";
import { createMemoryImage } from "@/lib/app-state";

export type MomentKind = "greeting" | "task" | "memory" | "medication" | "talk" | "done";

export type MomentTheme = {
  mood: MomentKind;
  accent: string;
  surface: string;
  text: string;
  icon: string;
};

export type MomentSpec = {
  id: string;
  kind: MomentKind;
  context: Record<string, unknown>;
};

export type PatientMoment = {
  step: number;
  total: number;
  kind: MomentKind;
  title: string;
  body: string;
  speakText: string;
  theme: MomentTheme;
  showOkay: boolean;
  okayLabel: string;
  imageUrl?: string;
};

const THEMES: Record<MomentKind, MomentTheme> = {
  greeting: {
    mood: "greeting",
    accent: "#4a7fb8",
    surface: "linear-gradient(155deg, #f0f7ff 0%, #fdf9f4 100%)",
    text: "#1e4a72",
    icon: "🌅",
  },
  task: {
    mood: "task",
    accent: "#5a9f7a",
    surface: "linear-gradient(155deg, #f2fbf6 0%, #faf8f5 100%)",
    text: "#2d5a45",
    icon: "✓",
  },
  memory: {
    mood: "memory",
    accent: "#7b6bb5",
    surface: "linear-gradient(155deg, #f3f0fb 0%, #fdf9f4 100%)",
    text: "#3d3560",
    icon: "💫",
  },
  medication: {
    mood: "medication",
    accent: "#2d6a9f",
    surface: "linear-gradient(155deg, #eef4fa 0%, #faf8f5 100%)",
    text: "#1e4a72",
    icon: "💊",
  },
  talk: {
    mood: "talk",
    accent: "#c4846a",
    surface: "linear-gradient(155deg, #fdf5f0 0%, #faf8f5 100%)",
    text: "#5c4030",
    icon: "💬",
  },
  done: {
    mood: "done",
    accent: "#7ec8a4",
    surface: "linear-gradient(155deg, #f4faf7 0%, #faf8f5 100%)",
    text: "#3d6b58",
    icon: "☀️",
  },
};

function londonHour() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date()),
  );
  return Number.isFinite(hour) ? hour : new Date().getHours();
}

function pickNextTask(profile: PatientProfile): DailyTask {
  const hour = londonHour();
  const tasks = profile.daily_tasks;
  if (!tasks.length) {
    return { time: "Now", description: "Take one slow breath.", icon: "🌿" };
  }
  if (hour < 10) return tasks[0] ?? tasks[tasks.length - 1];
  if (hour < 13) return tasks[1] ?? tasks[0];
  if (hour < 16) return tasks[2] ?? tasks[tasks.length - 1];
  if (hour < 19) return tasks[3] ?? tasks[tasks.length - 1];
  return tasks[tasks.length - 1] ?? tasks[0];
}

function pickMedication(profile: PatientProfile): Medication | null {
  const hour = londonHour();
  const morning = profile.medications.find((med) => /morning/i.test(med.time));
  const evening = profile.medications.find((med) => /evening/i.test(med.time));
  if (hour < 14) return morning ?? profile.medications[0] ?? null;
  return evening ?? profile.medications[profile.medications.length - 1] ?? null;
}

export function buildMomentPlan(profile: PatientProfile): MomentSpec[] {
  const greeting = buildMorningGreeting(profile);
  const task = pickNextTask(profile);
  const memory = profile.key_memories[0];
  const medication = pickMedication(profile);

  const plan: MomentSpec[] = [
    { id: "greeting", kind: "greeting", context: { greeting, hour: londonHour() } },
    { id: "task", kind: "task", context: { task } },
  ];

  if (memory) {
    plan.push({ id: "memory", kind: "memory", context: { memory } });
  }

  if (medication) {
    plan.push({ id: "medication", kind: "medication", context: { medication } });
  }

  plan.push({ id: "done", kind: "done", context: { greeting } });

  return plan;
}

export function fallbackMoment(
  spec: MomentSpec,
  profile: PatientProfile,
  step: number,
  total: number,
): PatientMoment {
  const theme = { ...THEMES[spec.kind] };
  const firstName = profile.first_name;

  if (spec.kind === "greeting") {
    const greeting = spec.context.greeting as ReturnType<typeof buildMorningGreeting>;
    const hour = londonHour();
    const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return {
      step,
      total,
      kind: "greeting",
      title: `${salutation}, ${firstName}`,
      body: `It is ${greeting.dayOfWeek}. You are safe at home in ${profile.location_area}.`,
      speakText: `${salutation}, ${firstName}. You are safe at home.`,
      theme: { ...theme, icon: hour < 12 ? "🌅" : hour < 17 ? "🌤️" : "🌙" },
      showOkay: true,
      okayLabel: "Okay",
    };
  }

  if (spec.kind === "task") {
    const task = spec.context.task as DailyTask;
    return {
      step,
      total,
      kind: "task",
      title: "One small step",
      body: `${task.icon} ${task.description}`,
      speakText: `Next, ${task.description.toLowerCase()}.`,
      theme: { ...theme, icon: task.icon || theme.icon },
      showOkay: true,
      okayLabel: "Okay",
    };
  }

  if (spec.kind === "memory") {
    const memory = spec.context.memory as Memory;
    const story = memory.story.split(".").slice(0, 1).join(".").trim();
    return {
      step,
      total,
      kind: "memory",
      title: memory.title,
      body: story || "A warm memory is here for you.",
      speakText: story || `Remember ${memory.title}.`,
      theme: { ...theme, icon: memory.photoHint || theme.icon },
      showOkay: true,
      okayLabel: "Okay",
      imageUrl: createMemoryImage(memory),
    };
  }

  if (spec.kind === "medication") {
    const medication = spec.context.medication as Medication;
    return {
      step,
      total,
      kind: "medication",
      title: "Medicine time",
      body: `${medication.name} ${medication.dose}. Take it ${medication.time.toLowerCase()}.`,
      speakText: `${medication.name} ${medication.dose} now.`,
      theme,
      showOkay: true,
      okayLabel: "Taken",
    };
  }

  return {
    step,
    total,
    kind: "done",
    title: "You are all set",
    body: "Rest easy. Tap ask me anything if you need me.",
    speakText: `You are all set, ${firstName}. I am here if you need me.`,
    theme,
    showOkay: false,
    okayLabel: "Okay",
  };
}

export function fallbackAskMoment(
  message: string,
  profile: PatientProfile,
  step: number,
  total: number,
): PatientMoment {
  const lower = message.toLowerCase();
  const firstName = profile.first_name;
  let body = `I am here with you, ${firstName}.`;

  if (/child|daughter|son|grand/.test(lower) || profile.family_members.some((m) => lower.includes(m.name.toLowerCase()))) {
    const person =
      profile.family_members.find((member) => lower.includes(member.name.toLowerCase())) ??
      profile.family_members[0];
    if (person) {
      body = `Yes, ${person.name} is your ${person.relationship}. They love you very much.`;
    }
  } else if (/who am i|my name/.test(lower)) {
    body = `You are ${firstName}. You are safe at home.`;
  } else if (/music|song/.test(lower) && profile.music_preference) {
    body = `You love ${profile.music_preference}. That music can feel like home.`;
  } else {
    const pet = profile.family_members.find((member) =>
      /cat|dog|pet/i.test(member.relationship),
    );
    if (pet && lower.includes(pet.name.toLowerCase())) {
      body = `${pet.name} is nearby. A gentle friend at home.`;
    }
  }

  return {
    step,
    total,
    kind: "talk",
    title: "For you",
    body,
    speakText: body,
    theme: THEMES.talk,
    showOkay: true,
    okayLabel: "Okay",
  };
}

export function momentSpecContext(spec: MomentSpec, profile: PatientProfile) {
  return JSON.stringify({
    kind: spec.kind,
    profile: {
      first_name: profile.first_name,
      stage: profile.stage,
      location_area: profile.location_area,
      music_preference: profile.music_preference,
      family_members: profile.family_members.map((m) => ({
        name: m.name,
        relationship: m.relationship,
      })),
    },
    context: spec.context,
  });
}
