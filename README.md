# MemoryBridge

MemoryBridge is a simplified, self-contained demo app for the London A2A + A2UI hackathon.

The root repo now contains the lightweight version:
- `/setup` for PDF upload and profile review
- `/patient` for the adaptive patient surface
- `/family` for activity and status
- `/research` for quick caregiver guidance

The ignored `mydocs/starter-repo` folder is kept as a reference implementation for the full CopilotKit + A2UI + FastAPI stack. When we need the correct integration pattern, we can compare against that starter.

## Quick Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
pnpm dev
```

4. Open:

```text
http://localhost:3000
```

## Environment

The simplified app runs without API keys.

`.env.example` includes optional placeholders for future integrations:
- `GEMINI_API_KEY`
- `LINKUP_API_KEY`
- `ELEVENLABS_API_KEY`

If you later wire in the full agent stack, those keys are the first ones to fill.

## What to edit

- `src/lib/memorybridge.ts` for demo data and helper logic
- `src/app/setup/page.tsx` for upload and profile parsing
- `src/app/patient/page.tsx` for the adaptive patient view
- `src/app/family/page.tsx` for the activity/status screen
- `src/app/research/page.tsx` for the caregiver guidance screen

