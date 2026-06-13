import { createCopilotV2Handler } from "@/lib/copilotkit-runtime";

const handler = createCopilotV2Handler(
  "/api/copilotkit-patient",
  "/patient",
  "patient_agent",
);

export async function POST(req: Request) {
  return handler(req);
}

export async function GET(req: Request) {
  return handler(req);
}
