import type { PatientStepPayload } from "@/lib/patient-step-service";

type Listener = (payload: PatientStepPayload) => void;

const listeners = new Set<Listener>();
let latest: PatientStepPayload | null = null;

export const patientStepBus = {
  push(payload: PatientStepPayload) {
    latest = payload;
    listeners.forEach((fn) => fn(payload));
  },
  latest() {
    return latest;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    if (latest) fn(latest);
    return () => {
      listeners.delete(fn);
    };
  },
  reset() {
    latest = null;
  },
};
