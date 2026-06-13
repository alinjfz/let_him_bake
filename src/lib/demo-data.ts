import demoJson from "../../demo_data/george-thomas-demo-profile.json";
import type { ActivityEvent, Memory, PatientProfile } from "@/lib/echoes";

type DemoMemory = Memory & { photoPath?: string };

type DemoJson = {
  name: string;
  first_name: string;
  age: number;
  stage: PatientProfile["stage"];
  location_area: string;
  music_preference: string;
  other_preferences: string[];
  daily_tasks: PatientProfile["daily_tasks"];
  medications: PatientProfile["medications"];
  key_memories: DemoMemory[];
  family_members: PatientProfile["family_members"];
  demo_activity_log?: ActivityEvent[];
  music_track?: {
    title: string;
    artist: string;
    memoryTouch: string;
  };
};

export type DemoPackage = {
  id: "george-thomas";
  label: string;
  profile: PatientProfile;
  activity: ActivityEvent[];
  musicTrack?: DemoJson["music_track"];
};

function normalizeDemo(data: DemoJson): DemoPackage {
  return {
    id: "george-thomas",
    label: "George Thomas (Bristol)",
    profile: {
      name: data.name,
      first_name: data.first_name,
      age: data.age,
      stage: data.stage,
      location_area: data.location_area,
      music_preference: data.music_preference,
      other_preferences: data.other_preferences,
      daily_tasks: data.daily_tasks,
      medications: data.medications,
      key_memories: data.key_memories.map(({ photoPath, ...memory }) => ({
        ...memory,
        photoPath,
      })),
      family_members: data.family_members,
    },
    activity: (data.demo_activity_log ?? []).map((event) => ({ ...event })),
    musicTrack: data.music_track,
  };
}

const GEORGE_DEMO = normalizeDemo(demoJson as DemoJson);

export function listDemoPackages(): Array<Pick<DemoPackage, "id" | "label">> {
  return [{ id: GEORGE_DEMO.id, label: GEORGE_DEMO.label }];
}

export function loadDemoPackage(id: string): DemoPackage | null {
  if (id === GEORGE_DEMO.id) return GEORGE_DEMO;
  return null;
}

export function loadDefaultDemoPackage(): DemoPackage {
  return GEORGE_DEMO;
}
