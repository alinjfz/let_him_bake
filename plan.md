# MemoryBridge — Complete Implementation Plan

## London A2A + A2UI Hackathon, June 13 2026

---

## Context

**What we're building:** An Alzheimer's daily companion with cognitive-state-adaptive UI. The agent reads a care plan PDF and generates completely different interfaces per patient — complexity, emotional tone, font size, task count, and media all adapt to their Alzheimer's stage. This is the most medically meaningful and emotionally compelling use of A2UI at the hackathon.

**Why it wins:**

- Originality: Generative UI used for _cognitive accessibility_, not cosmetics
- Technical: Multi-agent (patient, research, panic), ElevenLabs TTS, Linkup deep search
- Emotional: Panic button → UI transforms → voice calms patient → music plays. Judges won't forget it.
- Economic: 982k UK dementia patients, £42.5bn cost, £8.8k–£44.9k per delayed care home admission

**Hard requirements:** CopilotKit + AG-UI ✓, A2UI ✓, LinkUp ✓ (A2A is NOT required)

**Judging criteria:** Creative Generative UI + A2UI, Integration depth, Technical difficulty, Originality

**Stack:** Next.js 15 (App Router) frontend + FastAPI (Python, LangGraph) backend — clean architecture from scratch, using the starter only for A2UI/CopilotKit wiring reference

---

## The 5-Minute Demo Script

1. Open `/setup` → upload `margaret-care-plan.pdf` → agent extracts: "Margaret Thompson, 74, mid-stage Alzheimer's, loves Frank Sinatra, daughter Sarah (30), tabby cat Whiskers" → approve
2. Open `/patient` → **Morning Briefing surface renders**: "Good morning Margaret, Tuesday 13 June" + big warm photo + 3 task cards + medication reminder (all from her care plan — a different patient = completely different UI)
3. Type or say: **"Do I have a child?"** → Memory card animates in: "Your daughter Sarah is 30. She loves you very much." with her photo
4. Press **PANIC button** → UI transforms to calming mode → 4 large options appear → press "Play my music" → **ElevenLabs voice**: "Margaret, you're safe at home. Here is your favourite song." → Linkup finds Frank Sinatra → MusicCard renders
5. Open `/research` → Caregiver asks: "What helps with evening agitation in mid-stage Alzheimer's?" → **Linkup deep search fires** → EvidenceCard renders with NHS NICE citation
6. Open `/family` → Activity log shows: "Panic button pressed 2:14pm — resolved", "Asked about daughter", "Morning meds completed ✓"

---

## Pages + Screens

| Route       | Who uses it | What it does                                                         |
| ----------- | ----------- | -------------------------------------------------------------------- |
| `/setup`    | Caregiver   | Upload care plan PDF → review extracted profile → approve            |
| `/patient`  | Patient     | Adaptive A2UI surface: morning briefing, memory explorer, panic mode |
| `/family`   | Family      | Activity log (left) + live status panel (right)                      |
| `/research` | Caregiver   | Linkup-powered clinical Q&A with sourced EvidenceCards               |

---

## Architecture

```
Next.js 15 (App Router)
├── /setup     → uploads PDF → /api/copilotkit-patient (setup agent)
├── /patient   → CopilotKit chat + A2UI canvas → /api/copilotkit-patient (patient agent)
├── /family    → polling /api/activity-log (read-only, no agent)
└── /research  → CopilotKit chat + A2UI canvas → /api/copilotkit-research (research agent)

FastAPI (Python :8123)
├── /patient   ← LangGraph patient agent (morning briefing + memory + panic)
├── /research  ← LangGraph research agent (Linkup deep search)
└── /setup     ← LangGraph setup agent (PDF extraction only)

External APIs
├── Gemini 3.5 Flash  (LangGraph LLM — FROZEN, do not change)
├── Linkup API        (research agent + panic music search)
└── ElevenLabs TTS    (panic calming voice)
```

---

## Project File Structure (clean)

```
project-root/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # root layout, fonts, providers
│   │   ├── globals.css              # host tokens (surface/text/border)
│   │   ├── setup/
│   │   │   └── page.tsx             # caregiver setup screen
│   │   ├── patient/
│   │   │   └── page.tsx             # patient adaptive screen
│   │   ├── family/
│   │   │   └── page.tsx             # family monitoring view
│   │   ├── research/
│   │   │   └── page.tsx             # caregiver research screen
│   │   └── api/
│   │       ├── copilotkit-patient/[[...slug]]/route.ts
│   │       ├── copilotkit-research/[[...slug]]/route.ts
│   │       └── activity-log/route.ts
│   ├── a2ui/
│   │   ├── theme.css                # A2UI surface tokens (MemoryBridge palette)
│   │   ├── catalog/
│   │   │   ├── definitions.ts       # all component Zod schemas
│   │   │   ├── renderers.tsx        # all React renderers
│   │   │   └── index.ts             # re-export
│   │   └── MirrorRenderer.tsx       # from starter (unchanged)
│   ├── components/
│   │   ├── brand/
│   │   │   └── Brand.tsx            # Logo, Nav, PageHeader
│   │   ├── patient/
│   │   │   ├── PatientShell.tsx     # CopilotKit + SurfaceCanvas wrapper
│   │   │   └── patient.css          # patient shell brand tokens
│   │   ├── family/
│   │   │   ├── ActivityLog.tsx      # left panel
│   │   │   └── LiveStatus.tsx       # right panel
│   │   └── ui/                      # shadcn primitives (button, card, badge)
│   ├── hooks/
│   │   └── use-theme.tsx            # dark/light toggle
│   └── lib/
│       ├── utils.ts
│       └── pdf.ts                   # client-side PDF parsing (pdfjs-dist)
│
├── agent/
│   ├── main.py                      # FastAPI app, mounts all agents
│   ├── pyproject.toml
│   ├── src/
│   │   ├── patient_agent.py         # morning briefing + memory Q&A + panic
│   │   ├── research_agent.py        # Linkup deep search agent
│   │   ├── setup_agent.py           # PDF extraction only
│   │   ├── pdf_tools.py             # care plan extractor (TypedDicts + prompt)
│   │   ├── linkup_tools.py          # Linkup API wrapper
│   │   ├── elevenlabs_tools.py      # ElevenLabs TTS wrapper
│   │   ├── catalog.py               # CATALOG_ID + CATALOG_PROMPT (mirror of definitions.ts)
│   │   └── a2ui/
│   │       └── schemas/
│   │           ├── morning_briefing.json
│   │           └── panic_surface.json
│   └── .env.example
│
├── data/
│   └── margaret-care-plan.pdf       # demo PDF (generated before hackathon)
│
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## A2UI Component Catalog (8 components)

All defined in `src/a2ui/catalog/definitions.ts`, rendered in `renderers.tsx`, mirrored in `agent/src/catalog.py`.

### 1. PatientGreeting

Large warm header for the patient.

```typescript
props: z.object({
  name: z.string(), // "Margaret"
  dayOfWeek: z.string(), // "Tuesday"
  dateString: z.string(), // "13 June 2026"
  weatherEmoji: z.string().optional(),
});
```

### 2. MemoryCard

Reminiscence therapy card — full visual, emotional.

```typescript
props: z.object({
  title: z.string(), // "Your daughter Sarah"
  story: z.string(), // "Sarah is 30. She lives in London and loves you."
  photoHint: z.string(), // rendered as colored placeholder + emoji (🧑‍🦱)
  relationship: z.string().optional(), // "daughter", "son", "pet"
});
```

### 3. DailyTask

One large-text task card.

```typescript
props: z.object({
  time: z.string(), // "8:00 AM"
  icon: z.string(), // emoji "☕"
  description: z.string(),
  completed: z.boolean().default(false),
  complexity: z.enum(["simple", "detailed"]).default("simple"),
  // simple = icon + one line; detailed = icon + description + sub-steps
});
```

### 4. MedicationReminder

Clear pill reminder.

```typescript
props: z.object({
  medications: z.array(
    z.object({
      name: z.string(),
      dose: z.string(),
      time: z.string(),
      taken: z.boolean().default(false),
    }),
  ),
  nextDueIn: z.string(), // "in 2 hours"
});
```

### 5. PanicOptions

The panic mode choice surface — 4 big accessible buttons.

```typescript
props: z.object({
  patientName: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      icon: z.string(), // emoji
      label: z.string(), // "Play my music"
      description: z.string(), // "Frank Sinatra will calm you down"
      color: z.string(), // calming CSS color
    }),
  ),
});
```

### 6. CalmingMessage

Full-screen calming overlay with ElevenLabs audio.

```typescript
props: z.object({
  message: z.string(), // "You're safe at home, Margaret."
  audioText: z.string(), // passed to ElevenLabs TTS
  backgroundEmoji: z.string().optional(), // "🌿"
});
```

### 7. MusicCard

Linkup-found music recommendation.

```typescript
props: z.object({
  artist: z.string(),
  songTitle: z.string(),
  description: z.string(), // "Your favourite. From the 1960s."
  youtubeSearchQuery: z.string(), // frontend opens YouTube search
  coverEmoji: z.string(),
});
```

### 8. EvidenceCard

Linkup-sourced clinical guidance (research screen).

```typescript
props: z.object({
  suggestion: z.string(),
  source: z.string(), // "NHS NICE CG42"
  url: z.string().optional(),
  confidence: z.enum(["high", "medium"]),
  summary: z.string(),
});
```

---

## Theme — `src/a2ui/theme.css` + `src/components/patient/patient.css`

MemoryBridge palette (accessible, warm, not clinical):

- `--primary`: `#2d6a9f` (NHS trust blue)
- `--accent`: `#7ec8a4` (soft green — hope, calm)
- `--background`: `#faf8f5` (warm off-white — not harsh white)
- `--card`: `#ffffff`
- `--border`: `#e8e3dd`
- `--radius`: `20px` (large, friendly, no sharp edges)
- Base font size: `18px` (patient screen: `22px`)
- Panic mode overlay: `--panic-bg: #f0f7ff`, `--panic-accent: #5b9fd4`

Font: `Nunito` (rounded, approachable) + `Source Code Pro` for mono

---

## Backend — Care Plan Extractor (`agent/src/pdf_tools.py`)

TypedDicts:

```python
class PatientProfile(TypedDict):
    name: str
    first_name: str
    age: int
    stage: Literal["early", "mid", "late"]
    daily_tasks: list[DailyTask]
    medications: list[Medication]
    key_memories: list[Memory]      # max 3
    family_members: list[Person]
    music_preference: str
    other_preferences: list[str]
    location_area: str              # "Leeds", "London" etc.

class DailyTask(TypedDict):
    time: str
    description: str
    icon: str                       # emoji

class Medication(TypedDict):
    name: str
    dose: str
    time: str

class Memory(TypedDict):
    title: str
    story: str
    photo_hint: str
    relationship: str

class Person(TypedDict):
    name: str
    relationship: str
    age: int
    location: str
```

Extraction prompt: "You are reading an Alzheimer's care plan. Extract the patient's full profile. For `stage`: infer from care complexity — 'early' if patient is largely independent with reminders, 'mid' if needs structured support and has confusion episodes, 'late' if requires full care. For `key_memories`: pick the 3 most emotionally significant people/moments mentioned. Return structured JSON."

---

## Backend — Patient Agent (`agent/src/patient_agent.py`)

LangGraph agent with three modes, selected by intent:

**Morning Briefing (fixed):** Triggered by "render my morning" or first load

- Calls `render_morning_briefing(profile)` tool
- Emits `createSurface` → PatientGreeting + MemoryCard (top memory) + DailyTask × N + MedicationReminder
- N depends on stage: early=5 tasks, mid=3 tasks, late=1-2 tasks

**Memory Q&A (dynamic):** Triggered by questions like "do I have a child?", "who is Sarah?"

- Matches question against `profile.family_members` and `profile.key_memories`
- Calls `generate_memory_card(match)` → emits MemoryCard
- System prompt: "You are a gentle memory companion. Answer only from the patient's profile. Always confirm, never confuse. If asked about someone in the profile, show their MemoryCard."

**Panic Mode:** Triggered by PANIC button (special message `__PANIC__`) or distress words

- Emits `CalmingMessage` immediately
- Fires ElevenLabs TTS in parallel (server-side, returns audio URL)
- Then emits `PanicOptions` with 4 choices: Play music / Talk to agent / See my family / Breathe with me
- "Play music" → calls `linkup_music_search(patient.music_preference)` → emits `MusicCard`

System prompt: "You are a compassionate companion for {first_name} who has {stage}-stage Alzheimer's. Use only their first name. Keep all language under 10 words per sentence. Never say 'dementia' or 'Alzheimer's'. Be warm, concrete, reassuring."

---

## Backend — Research Agent (`agent/src/research_agent.py`)

LangGraph agent, single tool: `linkup_search`.

```python
# agent/src/linkup_tools.py
async def linkup_deep_search(query: str) -> LinkupResult:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.linkup.so/v1/search",
            headers={"Authorization": f"Bearer {LINKUP_API_KEY}"},
            json={
                "q": query,
                "depth": "deep",
                "outputType": "sourcedAnswer"
            }
        )
        return r.json()
```

System prompt: "You are a clinical research assistant for Alzheimer's caregivers in the UK. Use Linkup to find evidence-based guidance from NHS, Alzheimer's Society, NICE, and peer-reviewed sources. Always cite the source. Format your response as EvidenceCards."

**Linkup use cases:**

1. Clinical guidance: "What helps with evening agitation?" → NHS NICE CG42
2. Local resources: "Support groups near Leeds" → local dementia cafés
3. Personalized content: "Famous Frank Sinatra concerts in the 1960s" → for reminiscence enrichment
4. Family care tips: "How to talk to someone with mid-stage Alzheimer's" → Alzheimer's Society guide

---

## Backend — ElevenLabs Integration (`agent/src/elevenlabs_tools.py`)

```python
async def speak_calming_message(text: str, voice_id: str = "EXAVITQu4vr4xnSDxMaL") -> str:
    """Returns a data URL or hosted audio URL for the TTS message."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            json={"text": text, "model_id": "eleven_multilingual_v2"}
        )
        # Return base64 data URL → frontend plays via <audio>
        audio_b64 = base64.b64encode(r.content).decode()
        return f"data:audio/mpeg;base64,{audio_b64}"
```

The `CalmingMessage` component receives `audioUrl` as a prop and auto-plays it via a React `<audio>` element with a subtle play indicator. No user interaction needed — it plays on render.

---

## Family View (`/family`)

**No agent.** Pure React + polling.

`/api/activity-log/route.ts` — simple in-memory (or Redis if time) event log:

```typescript
// Events written by patient agent via shared state
interface ActivityEvent {
  timestamp: string;
  type:
    | "task_completed"
    | "memory_viewed"
    | "panic"
    | "panic_resolved"
    | "medication_taken";
  description: string;
  severity: "normal" | "alert";
}
```

**Left panel — ActivityLog:**

- Timeline of today's events (newest first)
- Alert events (panic) highlighted in amber

**Right panel — LiveStatus:**

- Current status: "Active", "In Memory Explorer", "Panic Mode", "Panic Resolved"
- Last seen: "2 minutes ago"
- Today's stats: tasks completed, meds taken, memories viewed

No live WebSocket needed for demo — 5s polling is fine.

---

## Demo PDF — `data/margaret-care-plan.pdf`

Generate this before the hackathon. Use any PDF creator (Notion → PDF, Google Docs → PDF).

**Content:**

```
Patient: Margaret Thompson, 74 years old, Leeds
Diagnosis: Alzheimer's Disease (moderate/mid-stage)
GP: Dr. Patel, Leeds General

Daily Routine:
- 8:00 AM: Breakfast with morning medication
- 10:00 AM: Walk in the garden (15 minutes)
- 12:00 PM: Lunch
- 3:00 PM: Video call with daughter Sarah
- 6:00 PM: Dinner + evening medication

Medications:
- Donepezil 10mg — morning with breakfast
- Memantine 10mg — evening with dinner

Important People:
- Sarah (daughter, 30, London) — primary contact
- James (son, 34, Leeds) — secondary contact
- Whiskers — tabby cat, lives at home

Meaningful Memories:
- Met husband Robert at Blackpool Ballroom, 1972
- Sarah's wedding at York Minster, June 1998
- Worked as a nurse at Leeds General Infirmary for 25 years

Personal Preferences:
- Music: Frank Sinatra, Dean Martin, The Beatles
- Food: Yorkshire tea, scones, roast dinner
- Activities: Gardening, jigsaws, BBC Radio 2

Location: Leeds, LS1
```

---

## Hour-by-Hour Build Schedule

| Time      | Priority | Work                                                                                                                     |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:30 | P0       | Boot starter, verify A2UI works (drop any PDF, see MirrorRenderer fire). Then set up clean project structure.            |
| 0:30–1:00 | P0       | Theme (patient.css + theme.css) + Brand.tsx rebrand → MemoryBridge shell looks right                                     |
| 1:00–2:00 | P0       | `pdf_tools.py` care plan extractor + `setup_agent.py` → upload margaret PDF → see structured JSON                        |
| 2:00–3:00 | P0       | 8 A2UI component definitions + renderers (start with PatientGreeting, MemoryCard, DailyTask — the morning briefing trio) |
| 3:00–3:30 | P0       | `patient_agent.py` morning briefing mode → `/patient` renders Margaret's surface from her care plan                      |
| 3:30–4:00 | P1       | Panic mode: PanicOptions + CalmingMessage components + agent panic handler + ElevenLabs TTS                              |
| 4:00–4:15 | P1       | Linkup research agent → `/research` → EvidenceCard renders with NHS citation                                             |
| 4:15–4:30 | P2       | Memory Q&A → "do I have a child?" → MemoryCard                                                                           |
| 4:30–4:45 | P2       | `/family` activity log + live status (can mock with static data if short on time)                                        |
| 4:45–5:00 | P0       | Rehearse demo 3× with margaret PDF. Fix anything broken.                                                                 |

**If behind at 3:30:** Drop /family and Memory Q&A. Demo = setup → morning briefing → panic mode → one research query. That's enough to win.

---

## Credit Conservation

- Dev: Use `OFFLINE=1` from the starter — paints canned morning briefing, no LLM calls
- Linkup: Cache responses in memory during dev. Only call live for demo
- ElevenLabs: Use a single pre-generated audio file during dev (swap to live for demo)
- Gemini: Set `temperature=0` for extraction (deterministic, cheaper)
- Don't call extraction on every page reload — cache extracted profile in `sessionStorage`

---

## Environment Variables

```bash
# .env
GEMINI_API_KEY=...
LINKUP_API_KEY=...
ELEVENLABS_API_KEY=...

# Agent URLs (Next.js reads these)
PATIENT_AGENT_URL=http://localhost:8123/patient
RESEARCH_AGENT_URL=http://localhost:8123/research
SETUP_AGENT_URL=http://localhost:8123/setup
```

---

## Sponsor Credits (visible in app footer)

"Powered by Google Gemini 3.5 Flash · CopilotKit AG-UI · A2UI · Linkup · ElevenLabs"

Show this prominently — judges will notice, HACKATHON.md says so.

---

## Verification Checklist

- [ ] `pnpm run doctor` passes
- [ ] `pnpm smoke` passes
- [ ] Upload margaret PDF → PatientGreeting + MemoryCard + 3 DailyTasks + MedicationReminder render on `/patient`
- [ ] Ask "Do I have a child?" → MemoryCard for Sarah appears
- [ ] PANIC button → CalmingMessage renders → ElevenLabs audio plays → PanicOptions appear → "Play music" → MusicCard renders
- [ ] `/research` → "evening agitation" → EvidenceCard with source
- [ ] `/family` → activity log shows events
- [ ] Run full demo 3× straight, same PDF, no surprises
