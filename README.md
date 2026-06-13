# Echoes

Echoes is a simplified, self-contained demo app for the London A2A + A2UI hackathon.

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

3. Add your API key:

```bash
# OpenRouter is preferred when available.
OPENROUTER_API_KEY=your_openrouter_key_here

# If you do not have OpenRouter, set Gemini instead.
GEMINI_API_KEY=your_gemini_key_here
```

4. Start the app:

```bash
pnpm dev
```

5. Open:

```text
http://localhost:3000
```

## Environment

The simplified app runs without API keys, but the research screen becomes more helpful when one provider is configured.

`.env.example` includes optional placeholders for future integrations:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `LINKUP_API_KEY`
- `ELEVENLABS_API_KEY`

Provider order:
1. If `OPENROUTER_API_KEY` is set, the app uses OpenRouter first.
2. If OpenRouter is missing, it falls back to `GEMINI_API_KEY`.
3. If neither key is present, the app uses the local deterministic fallback.

If you later wire in the full agent stack, those keys are the first ones to fill.

## What to edit

- `src/lib/echoes.ts` for demo data and helper logic
- `src/app/setup/page.tsx` for upload and profile parsing
- `src/app/patient/page.tsx` for the adaptive patient view
- `src/app/family/page.tsx` for the activity/status screen
- `src/app/research/page.tsx` for the caregiver guidance screen
