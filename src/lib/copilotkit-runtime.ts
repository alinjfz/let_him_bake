import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

function agentUrl(path: string) {
  const base = process.env.AGENT_BASE_URL?.trim() || "http://localhost:8123";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function createCopilotV2Handler(
  basePath: string,
  agentPath: string,
  agentKey: string,
) {
  const httpAgent = new HttpAgent({ url: agentUrl(agentPath) });
  const runtime = new CopilotRuntime({
    agents: {
      default: httpAgent,
      [agentKey]: httpAgent,
    },
    a2ui: { injectA2UITool: false },
  });

  return createCopilotRuntimeHandler({
    runtime,
    basePath,
    mode: "multi-route",
  });
}
