import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type PersistedPatientStore = {
  patients: Record<string, unknown>;
  activeCode: string | null;
};

const STORE_DIR = path.join(process.cwd(), ".echoes");
const STORE_FILE = path.join(STORE_DIR, "patients.json");

export function loadPatientStore(): PersistedPatientStore | null {
  try {
    const raw = readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedPatientStore;
    if (!parsed || typeof parsed !== "object" || !parsed.patients) return null;
    return {
      patients: parsed.patients,
      activeCode: parsed.activeCode ?? null,
    };
  } catch {
    return null;
  }
}

export function savePatientStore(store: PersistedPatientStore) {
  mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}
