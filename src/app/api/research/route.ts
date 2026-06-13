import { NextResponse } from "next/server";
import { buildEvidenceSurface } from "@/lib/a2ui-builder";
import { generateEvidenceCard } from "@/lib/llm";
import { linkupDeepSearch } from "@/lib/linkup";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query =
    typeof body?.query === "string" && body.query.trim()
      ? body.query.trim()
      : "What helps with evening agitation in mid-stage support?";

  const linkup = await linkupDeepSearch(query);
  if (linkup?.answer) {
    const source = linkup.sources[0];
    const evidence = {
      suggestion: linkup.answer.split(".").slice(0, 1).join(".").trim() || "Calm evening guidance",
      source: source?.name ? `${source.name} · Linkup` : "Linkup deep search",
      url: source?.url,
      confidence: "high" as const,
      summary: linkup.answer,
    };
    return NextResponse.json({ query, evidence, surface: buildEvidenceSurface(evidence) });
  }

  const evidence = await generateEvidenceCard(query);
  return NextResponse.json({ query, evidence, surface: buildEvidenceSurface(evidence) });
}
