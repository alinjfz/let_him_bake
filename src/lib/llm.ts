import { buildResearchAnswer } from "@/lib/memorybridge";

export type EvidenceCard = {
  suggestion: string;
  source: string;
  url?: string;
  confidence: "high" | "medium";
  summary: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

function parseEvidence(raw: string): EvidenceCard | null {
  try {
    const parsed = JSON.parse(cleanJson(raw)) as Partial<EvidenceCard>;
    if (
      typeof parsed.suggestion === "string" &&
      typeof parsed.source === "string" &&
      typeof parsed.summary === "string" &&
      (parsed.confidence === "high" || parsed.confidence === "medium")
    ) {
      return {
        suggestion: parsed.suggestion,
        source: parsed.source,
        summary: parsed.summary,
        confidence: parsed.confidence,
        url: typeof parsed.url === "string" ? parsed.url : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function callOpenRouter(query: string): Promise<EvidenceCard | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL?.trim() || "http://localhost:3000",
      "X-OpenRouter-Title": "MemoryBridge",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Return only JSON with keys suggestion, source, url, confidence, summary. Keep it short and practical.",
        },
        {
          role: "user",
          content: `Question: ${query}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  return typeof content === "string" ? parseEvidence(content) : null;
}

async function callGemini(query: string): Promise<EvidenceCard | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const response = await fetch(
    `${GEMINI_BASE}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  "Return only JSON with keys suggestion, source, url, confidence, summary. Keep it short and practical.\n\nQuestion: " +
                  query,
              },
            ],
          },
        ],
      }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const content = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  return content ? parseEvidence(content) : null;
}

export async function generateEvidenceCard(query: string): Promise<EvidenceCard> {
  const openrouter = await callOpenRouter(query);
  if (openrouter) return openrouter;

  const gemini = await callGemini(query);
  if (gemini) return gemini;

  return buildResearchAnswer(query);
}

