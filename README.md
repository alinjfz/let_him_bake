# Echoes

Alzheimer's daily companion for the **London A2A + Generative UI** hackathon. Caregivers shape memories and daily rhythm; patients see **one personalised A2UI card at a time** — powered by **CopilotKit + AG-UI**, **Linkup**, and **ElevenLabs**.

## Stack

| Sponsor | Role |
|---|---|
| **CopilotKit + AG-UI** | Patient agent stream (`useAgent` → FastAPI SSE) |
| **A2UI** | 8 declarative components in `src/a2ui/catalog/` |
| **Linkup** | Research EvidenceCards + panic music discovery |
| **ElevenLabs** | Panic calming TTS |
| **Gemini / OpenRouter** | Card copy from caretaker plan + activity history |
| **Redis** (optional) | Sessions + activity persistence |

See [HACKATHON.md](./HACKATHON.md) for the demo script and judging checklist.

## Quick start

```bash
pnpm install
cp .env.example .env.local
# GEMINI_API_KEY or OPENROUTER_API_KEY; optional LINKUP + ELEVENLABS; OFFLINE=1 for dev

pnpm doctor
pnpm dev    # Next.js :3000 + FastAPI :8123
```

## Key paths

```
src/lib/patient-step-service.ts   # Step plan + LLM enrichment (single source of truth)
src/components/patient/             # CopilotKit v2 patient shell
src/app/api/copilotkit-patient/     # AG-UI runtime (v2)
src/app/api/patient-a2ui/           # Step resolver (also called by Python agent)
agent/src/patient_router.py         # AG-UI SSE → proxies to patient-a2ui
src/a2ui/catalog/                   # 8 A2UI components (definitions + renderers + Python mirror)
```

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js + FastAPI agent |
| `pnpm doctor` | Preflight env check |
| `pnpm smoke` | Typecheck + agent route + A2UI ops |
| `pnpm typecheck` | TypeScript |
| `OFFLINE=1 pnpm dev` | Skip LLM / external APIs |

## Environment

`AGENT_BASE_URL`, `NEXT_APP_URL` (Python → Next proxy), LLM keys, `LINKUP_API_KEY`, `ELEVENLABS_API_KEY`, optional `REDIS_URL`. See `.env.example`.
