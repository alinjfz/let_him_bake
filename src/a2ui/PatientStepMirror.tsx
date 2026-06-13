"use client";

import { useEffect } from "react";
import { z } from "zod";
import type { ReactActivityMessageRenderer } from "@copilotkit/react-core/v2";
import { patientStepBus } from "@/a2ui/patient-step-bus";
import type { PatientStepPayload } from "@/lib/patient-step-service";

function StepPill({ payload, step }: { payload: PatientStepPayload; step: number }) {
  useEffect(() => {
    patientStepBus.push(payload);
  }, [payload, step]);
  return (
    <div
      className="a2ui-pill"
      title="Generative UI via A2UI + CopilotKit AG-UI"
    >
      ✦ AG-UI · card {payload.step + 1} of {payload.total}
    </div>
  );
}

export function createPatientStepRenderer(
  agentId?: string,
): ReactActivityMessageRenderer<{ step: PatientStepPayload }> {
  return {
    activityType: "echoes-patient-step",
    agentId,
    content: z.object({ step: z.record(z.string(), z.unknown()) }) as never,
    render: ({ content }) => (
      <StepPill payload={content.step as PatientStepPayload} step={(content.step as PatientStepPayload).step} />
    ),
  };
}
