import {
  DEMO_ACTIVITY,
  DEMO_PROFILE,
  type ActivityEvent,
  type Memory,
  type PatientProfile,
} from "@/lib/memorybridge";

export type Role = "patient" | "family";

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

export interface AppState {
  profile: PatientProfile;
  activity: ActivityEvent[];
  memoryPolicies: Record<string, MemoryPolicy>;
  caregiverPin: string;
  currentMode: PatientMode;
  currentTrack: MusicTrack | null;
  patientPrompt: string;
}

export interface PatientCardBase {
  id: string;
  kind: string;
}

export interface GreetingCard extends PatientCardBase {
  kind: "greeting";
  title: string;
  subtitle: string;
}

export interface ReassuranceCard extends PatientCardBase {
  kind: "reassurance";
  title: string;
  body: string;
}

export interface MemoryCard extends PatientCardBase {
  kind: "memory";
  title: string;
  story: string;
  photoHint: string;
  relationship: string;
  policy: MemoryPolicy;
  imageUrl?: string;
}

export interface TaskCard extends PatientCardBase {
  kind: "tasks";
  title: string;
  items: Array<{ time: string; description: string; icon: string }>;
}

export interface MedicationCard extends PatientCardBase {
  kind: "medication";
  title: string;
  items: Array<{ name: string; dose: string; time: string; taken?: boolean }>;
}

export interface PanicCard extends PatientCardBase {
  kind: "panic";
  title: string;
  body: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    icon: string;
  }>;
}

export interface TalkCard extends PatientCardBase {
  kind: "talk";
  title: string;
  body: string;
  suggestion: string;
}

export interface MusicCard extends PatientCardBase {
  kind: "music";
  title: string;
  artist: string;
  sourceName: string;
  sourceUrl: string;
  streamUrl: string;
  memoryTouch: string;
}

export type PatientCard =
  | GreetingCard
  | ReassuranceCard
  | MemoryCard
  | TaskCard
  | MedicationCard
  | PanicCard
  | TalkCard
  | MusicCard;

export interface PatientViewModel {
  heading: string;
  prompt: string;
  mode: PatientMode;
  cards: PatientCard[];
}

const MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

const defaultMemoryPolicy = (memory: Memory): MemoryPolicy => {
  if (/wife|husband|partner/i.test(memory.relationship)) return "redirect";
  return "show";
};

function makeActivityId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function memoryArt(memory: Memory) {
  const seed = memory.id
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = seed % 360;
  const title = memory.title.replace(/'/g, "");
  const story = memory.photoHint || memory.relationship;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="hsl(${hue} 70% 88%)"/>
          <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 70% 78%)"/>
        </linearGradient>
      </defs>
      <rect width="900" height="600" rx="56" fill="url(#g)" />
      <circle cx="720" cy="120" r="120" fill="rgba(255,255,255,0.34)" />
      <circle cx="160" cy="470" r="150" fill="rgba(255,255,255,0.18)" />
      <text x="64" y="110" font-size="44" font-family="Arial, sans-serif" fill="#163042" font-weight="700">${story}</text>
      <text x="64" y="180" font-size="54" font-family="Arial, sans-serif" fill="#163042" font-weight="700">${title}</text>
      <text x="64" y="250" font-size="30" font-family="Arial, sans-serif" fill="#163042">${memory.relationship}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildMemoryPolicies(profile: PatientProfile) {
  return Object.fromEntries(
    profile.key_memories.map((memory) => [memory.id, defaultMemoryPolicy(memory)]),
  ) as Record<string, MemoryPolicy>;
}

function createInitialState(): AppState {
  return {
    profile: DEMO_PROFILE,
    activity: DEMO_ACTIVITY,
    memoryPolicies: buildMemoryPolicies(DEMO_PROFILE),
    caregiverPin: "2468",
    currentMode: "home",
    currentTrack: null,
    patientPrompt: "",
  };
}

type StateHolder = typeof globalThis & {
  __memorybridgeState?: AppState;
};

function getHolder() {
  return globalThis as StateHolder;
}

export function getState(): AppState {
  const holder = getHolder();
  if (!holder.__memorybridgeState) {
    holder.__memorybridgeState = createInitialState();
  }
  return cloneState(holder.__memorybridgeState);
}

export function setState(next: AppState) {
  const holder = getHolder();
  holder.__memorybridgeState = cloneState(next);
  return getState();
}

export function patchState(partial: Partial<AppState>) {
  const current = getState();
  const next: AppState = {
    ...current,
    ...partial,
    profile: partial.profile ?? current.profile,
    activity: partial.activity ?? current.activity,
    memoryPolicies: partial.memoryPolicies ?? current.memoryPolicies,
    caregiverPin: partial.caregiverPin ?? current.caregiverPin,
    currentTrack: partial.currentTrack ?? current.currentTrack,
    currentMode: partial.currentMode ?? current.currentMode,
    patientPrompt: partial.patientPrompt ?? current.patientPrompt,
  };
  return setState(next);
}

export function resetState(profile?: PatientProfile) {
  const nextProfile = profile ?? DEMO_PROFILE;
  return setState({
    profile: nextProfile,
    activity: DEMO_ACTIVITY.map((event) => ({ ...event })),
    memoryPolicies: buildMemoryPolicies(nextProfile),
    caregiverPin: "2468",
    currentMode: "home",
    currentTrack: null,
    patientPrompt: "",
  });
}

export function saveProfile(profile: PatientProfile) {
  const next = getState();
  next.profile = profile;
  next.memoryPolicies = buildMemoryPolicies(profile);
  return setState(next);
}

export function updateActivity(event: Omit<ActivityEvent, "id"> & { id?: string }) {
  const next = getState();
  next.activity = [
    {
      id: event.id ?? makeActivityId("activity"),
      timestamp: event.timestamp,
      type: event.type,
      description: event.description,
      severity: event.severity,
    },
    ...next.activity,
  ];
  return setState(next);
}

function cleanText(input: string) {
  return input
    .replace(/\b(died|dead|death|passed away|passed|loss)\b/gi, "family")
    .replace(/\b(Alzheimer's|dementia)\b/gi, "memory support")
    .trim();
}

function safeMemoryStory(memory: Memory, policy: MemoryPolicy) {
  const story = cleanText(memory.story);

  if (policy === "hide") {
    return "Here is something gentle from your life.";
  }

  if (policy === "redirect") {
    return "Would you like to call Sarah or see a happy photo?";
  }

  if (policy === "soften") {
    return story.replace(/\b(you|your)\b/gi, "you");
  }

  return story;
}

function getMusicTrack(profile: PatientProfile): MusicTrack {
  return {
    title: "Fly Me to the Moon",
    artist: profile.music_preference || "Frank Sinatra",
    sourceName: "SoundHelix",
    sourceUrl: "https://www.soundhelix.com/",
    streamUrl: MUSIC_URL,
    memoryTouch: `${profile.first_name} likes ${profile.music_preference || "Frank Sinatra"}.`,
    status: "idle",
  };
}

export function setMusicTrack(profile: PatientProfile) {
  const next = getState();
  next.currentTrack = getMusicTrack(profile);
  return setState(next);
}

export function setPlaybackStatus(status: PlaybackStatus) {
  const next = getState();
  if (!next.currentTrack) return next;
  next.currentTrack = { ...next.currentTrack, status };
  return setState(next);
}

export function setPatientPrompt(prompt: string) {
  const next = getState();
  next.patientPrompt = prompt;
  return setState(next);
}

export function setPatientMode(mode: PatientMode) {
  const next = getState();
  next.currentMode = mode;
  return setState(next);
}

export function updateMemoryPolicy(memoryId: string, policy: MemoryPolicy) {
  const next = getState();
  next.memoryPolicies = {
    ...next.memoryPolicies,
    [memoryId]: policy,
  };
  return setState(next);
}

export function buildPatientView(
  state: AppState,
  prompt = state.patientPrompt,
): PatientViewModel {
  const profile = state.profile;
  const greetingDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date());

  const cards: PatientCard[] = [
    {
      id: "greeting",
      kind: "greeting",
      title: `Hello, ${profile.first_name}`,
      subtitle: greetingDate,
    },
    {
      id: "reassurance",
      kind: "reassurance",
      title: "You are safe. We are nearby.",
      body: "Take one breath. Then choose one small thing.",
    },
  ];

  const question = prompt.toLowerCase();
  const sensitive = /wife|husband|partner|died|dead|passed|loss/.test(question);

  const chosenMemory =
    profile.key_memories.find((memory) =>
      sensitive
        ? /wife|husband|partner/i.test(memory.relationship)
        : true,
    ) ?? profile.key_memories[0];

  if (chosenMemory) {
    const policy = state.memoryPolicies[chosenMemory.id] ?? defaultMemoryPolicy(chosenMemory);
    const safeStory = safeMemoryStory(chosenMemory, policy);

    if (policy !== "hide" || !sensitive) {
      cards.push({
        id: `memory-${chosenMemory.id}`,
        kind: "memory",
        title: chosenMemory.title,
        story: safeStory,
        photoHint: chosenMemory.photoHint,
        relationship: chosenMemory.relationship,
        policy,
        imageUrl: memoryArt(chosenMemory),
      });
    }
  }

  const taskCount = profile.stage === "early" ? 2 : profile.stage === "late" ? 1 : 2;
  cards.push({
    id: "tasks",
    kind: "tasks",
    title: "Today",
    items: profile.daily_tasks.slice(0, taskCount),
  });

  cards.push({
    id: "medication",
    kind: "medication",
    title: "Medication",
    items: profile.medications.map((med, index) => ({
      ...med,
      taken: index === 0,
    })),
  });

  if (/panic|scared|help|lost|afraid/.test(question)) {
    return {
      heading: `Hello, ${profile.first_name}`,
      prompt,
      mode: "panic",
      cards: [
        cards[0],
        cards[1],
        {
          id: "panic",
          kind: "panic",
          title: "You are safe here.",
          body: "Press I am fine!, or choose one gentle option.",
          options: [
            {
              id: "talk",
              label: "Talk to me",
              description: "A calm reply and a simple card.",
              icon: "💬",
            },
            {
              id: "music",
              label: "Play music",
              description: "Use a familiar song that you like.",
              icon: "🎵",
            },
            {
              id: "family",
              label: "See family",
              description: "Bring Sarah or James closer.",
              icon: "👪",
            },
            {
              id: "fine",
              label: "I am fine!",
              description: "Stay calm and return to the main view.",
              icon: "✅",
            },
          ],
        },
      ],
    };
  }

  if (/music|song|sing|sinatra/.test(question)) {
    const track = getMusicTrack(profile);
    cards.push({
      id: "music",
      kind: "music",
      title: track.title,
      artist: track.artist,
      sourceName: track.sourceName,
      sourceUrl: track.sourceUrl,
      streamUrl: track.streamUrl,
      memoryTouch: track.memoryTouch,
    });
  }

  if (sensitive) {
    cards.push({
      id: "talk",
      kind: "talk",
      title: "Let’s keep this gentle.",
      body: "Would you like to see Sarah, a photo, or music?",
      suggestion: "Call Sarah or open a warm memory.",
    });
  }

  return {
    heading: `Hello, ${profile.first_name}`,
    prompt,
    mode: state.currentMode,
    cards,
  };
}

export function createMusicTrack(profile: PatientProfile) {
  return getMusicTrack(profile);
}

export function createMemoryImage(memory: Memory) {
  return memoryArt(memory);
}
