import { NextResponse } from "next/server";
import { generateEvidenceCard } from "@/lib/llm";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { query?: string }
    | null;
  const query =
    typeof body?.query === "string" && body.query.trim()
      ? body.query.trim()
      : "What helps with evening agitation in mid-stage support?";

  const evidence = await generateEvidenceCard(query);
  return NextResponse.json({ query, evidence });
}

