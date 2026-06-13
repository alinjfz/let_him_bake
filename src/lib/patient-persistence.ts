export type PersistedPatientStore = {
  patients: Record<string, unknown>;
  activeCode: string | null;
};

const STORE_DIR = ".echoes";
const STORE_FILE = ".echoes/patients.json";

type NodeFs = {
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  readFileSync: (path: string, options: "utf8") => string;
  writeFileSync: (path: string, data: string, options: "utf8") => void;
};

function getNodeFs(): NodeFs | null {
  if (typeof window !== "undefined") return null;
  try {
    const requireFn = Function("return require")() as (id: string) => unknown;
    return requireFn("node:fs") as NodeFs;
  } catch {
    return null;
  }
}

export function loadPatientStore(): PersistedPatientStore | null {
  const fs = getNodeFs();
  if (!fs) return null;
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
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
  const fs = getNodeFs();
  if (!fs) return;
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}
