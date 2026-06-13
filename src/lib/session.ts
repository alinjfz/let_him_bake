export const SESSION_KEYS = {
  role: "echoes.role",
  patientCode: "echoes.patient.code",
  caretakerPin: "echoes.caretaker.pin",
  caretakerName: "echoes.caretaker.name",
} as const;

export function readSession() {
  if (typeof window === "undefined") {
    return {
      role: "",
      patientCode: "",
      caretakerPin: "",
      caretakerName: "",
    };
  }

  const role = window.localStorage.getItem(SESSION_KEYS.role) ?? "";
  if (role === "family") {
    window.localStorage.setItem(SESSION_KEYS.role, "caretaker");
  }

  return {
    role: role === "family" ? "caretaker" : role,
    patientCode: window.localStorage.getItem(SESSION_KEYS.patientCode) ?? "",
    caretakerPin: window.localStorage.getItem(SESSION_KEYS.caretakerPin) ?? "",
    caretakerName: window.localStorage.getItem(SESSION_KEYS.caretakerName) ?? "",
  };
}

export function writeCaretakerSession(input: {
  accessCode: string;
  pin: string;
  caretakerName: string;
}) {
  window.localStorage.setItem(SESSION_KEYS.role, "caretaker");
  window.localStorage.setItem(SESSION_KEYS.patientCode, input.accessCode);
  window.localStorage.setItem(SESSION_KEYS.caretakerPin, input.pin);
  window.localStorage.setItem(SESSION_KEYS.caretakerName, input.caretakerName);
}

export function writePatientSession(accessCode: string) {
  window.localStorage.setItem(SESSION_KEYS.role, "patient");
  window.localStorage.setItem(SESSION_KEYS.patientCode, accessCode);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEYS.role);
  window.localStorage.removeItem(SESSION_KEYS.patientCode);
  window.localStorage.removeItem(SESSION_KEYS.caretakerPin);
  window.localStorage.removeItem(SESSION_KEYS.caretakerName);
}

export function stateQuery(session: ReturnType<typeof readSession>) {
  const params = new URLSearchParams();
  if (session.patientCode) params.set("accessCode", session.patientCode);
  if (session.caretakerPin) params.set("pin", session.caretakerPin);
  return params.toString();
}

export function stateBody(session: ReturnType<typeof readSession>, payload: Record<string, unknown>) {
  return {
    ...payload,
    accessCode: session.patientCode,
    pin: session.caretakerPin,
  };
}
