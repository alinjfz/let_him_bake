import { createEmptyProfile, type ActivityEvent, type PatientProfile } from "@/lib/echoes";
import type { AppState } from "@/lib/app-state";
import type { MemoryPolicy, MusicTrack, PatientMode } from "@/lib/app-state-helpers";
import { buildMemoryPoliciesFromProfile } from "@/lib/app-state-helpers";
import { loadPatientStore, savePatientStore, type PersistedPatientStore } from "@/lib/patient-persistence";

export interface PatientRecord {
  accessCode: string;
  caretakerName: string;
  profile: PatientProfile;
  activity: ActivityEvent[];
  memoryPolicies: Record<string, MemoryPolicy>;
  caregiverPin: string;
  onboardingComplete: boolean;
  currentMode: PatientMode;
  currentTrack: MusicTrack | null;
  patientPrompt: string;
}

type RootStore = {
  patients: Record<string, PatientRecord>;
  activeCode: string | null;
};

type Holder = typeof globalThis & {
  __echoesPatients?: RootStore;
};

function getRoot(): RootStore {
  const holder = globalThis as Holder;
  if (!holder.__echoesPatients) {
    const loaded = loadPatientStore();
    holder.__echoesPatients = loaded
      ? {
          patients: loaded.patients as unknown as RootStore["patients"],
          activeCode: loaded.activeCode,
        }
      : { patients: {}, activeCode: null };
  }
  return holder.__echoesPatients;
}

function persistRoot(root: RootStore) {
  if (typeof window !== "undefined") return;
  try {
    savePatientStore(root as unknown as PersistedPatientStore);
  } catch (error) {
    console.error("[echoes] Failed to save patient store:", error);
  }
}

function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ECHO-${suffix}`;
}

function emptyRecord(accessCode: string, caretakerName: string, pin: string): PatientRecord {
  return {
    accessCode,
    caretakerName,
    profile: createEmptyProfile(),
    activity: [],
    memoryPolicies: {},
    caregiverPin: pin,
    onboardingComplete: false,
    currentMode: "home",
    currentTrack: null,
    patientPrompt: "",
  };
}

export function recordToAppState(record: PatientRecord): AppState {
  return {
    accessCode: record.accessCode,
    caretakerName: record.caretakerName,
    profile: record.profile,
    activity: record.activity,
    memoryPolicies: record.memoryPolicies,
    caregiverPin: record.caregiverPin,
    onboardingComplete: record.onboardingComplete,
    currentMode: record.currentMode,
    currentTrack: record.currentTrack,
    patientPrompt: record.patientPrompt,
  };
}

export function createEmptyAppState(): AppState {
  return {
    accessCode: "",
    caretakerName: "",
    profile: createEmptyProfile(),
    activity: [],
    memoryPolicies: {},
    caregiverPin: "",
    onboardingComplete: false,
    currentMode: "home",
    currentTrack: null,
    patientPrompt: "",
  };
}

export function getActiveRecord(): PatientRecord | null {
  const root = getRoot();
  if (!root.activeCode) return null;
  return root.patients[root.activeCode] ?? null;
}

export function getRecord(accessCode: string): PatientRecord | null {
  return getRoot().patients[accessCode.toUpperCase()] ?? null;
}

export function setActiveRecord(record: PatientRecord) {
  const root = getRoot();
  root.patients[record.accessCode] = record;
  root.activeCode = record.accessCode;
  persistRoot(root);
  return record;
}

export function createPatient(caretakerName: string, pin: string) {
  const accessCode = generateAccessCode();
  const record = emptyRecord(accessCode, caretakerName.trim(), pin.trim());
  setActiveRecord(record);
  return record;
}

export function connectPatient(accessCode: string, pin: string) {
  const normalizedCode = accessCode.trim().toUpperCase();
  const record = getRecord(normalizedCode);
  if (!record || record.caregiverPin !== pin.trim()) return null;
  const root = getRoot();
  root.activeCode = normalizedCode;
  persistRoot(root);
  return record;
}

export function activatePatient(accessCode: string) {
  const normalizedCode = accessCode.trim().toUpperCase();
  const record = getRecord(normalizedCode);
  if (!record || !record.onboardingComplete) return null;
  const root = getRoot();
  root.activeCode = normalizedCode;
  persistRoot(root);
  return record;
}

export function updateActiveRecord(updater: (record: PatientRecord) => PatientRecord) {
  const current = getActiveRecord();
  if (!current) return null;
  const next = updater(current);
  return setActiveRecord(next);
}

export function verifyCaregiverPin(accessCode: string, pin: string) {
  const record = getRecord(accessCode.trim().toUpperCase());
  if (!record) return false;
  return record.caregiverPin === pin.trim();
}

export function applyDemoToActive(demo: {
  profile: PatientProfile;
  activity: ActivityEvent[];
}) {
  const current = getActiveRecord();
  if (!current) return null;
  const next: PatientRecord = {
    ...current,
    profile: demo.profile,
    activity: demo.activity.map((event) => ({ ...event })),
    memoryPolicies: buildMemoryPoliciesFromProfile(demo.profile),
    onboardingComplete: false,
  };
  return setActiveRecord(next);
}
