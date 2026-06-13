# Echoes — Hackathon guide

London A2A + Generative UI · Track 2 · June 2026

## What judges should see

1. **CopilotKit + AG-UI** — `/patient` runs `useAgent` → FastAPI `:8123/patient` → SSE stream
2. **A2UI** — one generative card per step (`PatientGreeting`, `MemoryCard`, …) + v0.9 ops in stream
3. **Linkup** — `/research` EvidenceCards + panic music
4. **ElevenLabs** — panic `CalmingMessage` TTS
5. **Gemini / OpenRouter** — LLM rewrites card copy from caretaker plan + recent activity
6. **Redis** (optional) — caretaker sessions + activity log

## 5-minute demo

1. Caretaker → sign up → **Load demo (George Thomas)** → finish onboarding
2. Patient → home code → **one A2UI card at a time** (Okay between steps)
3. Ask **"Do I have a child?"** → single memory card
4. **I need help** → calming voice → **Play my music** → Linkup MusicCard
5. **Research** → evening agitation question → EvidenceCard
6. **Family** → activity log with panic event

## Before judging

```bash
pnpm doctor
pnpm smoke
OFFLINE=1 pnpm dev   # no API keys needed (LLM enrichment skipped)
```

Rehearse the panic sequence 3× — it is the anchor moment.

## Architecture (one line)

```
Patient UI → CopilotKit v2 → AG-UI HttpAgent → Python agent → /api/patient-a2ui (LLM + plan) → A2UI surface
```

## Sponsor footer

Credit: **Google DeepMind (Gemini)**, **CopilotKit + AG-UI**, **A2UI**, **Linkup**, **ElevenLabs**, **Redis**.

## Submission samples

In DevTools → Network → `copilotkit-patient` run, copy a `createSurface` / `updateComponents` pair from the AG-UI stream.
