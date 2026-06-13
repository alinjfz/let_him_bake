export type LinkupResult = {
  answer: string;
  sources: Array<{ name: string; url: string; snippet?: string }>;
};

export async function linkupDeepSearch(query: string): Promise<LinkupResult | null> {
  const apiKey = process.env.LINKUP_API_KEY?.trim();
  if (!apiKey || process.env.OFFLINE === "1") return null;

  try {
    const response = await fetch("https://api.linkup.so/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        depth: "deep",
        outputType: "sourcedAnswer",
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      answer?: string;
      results?: Array<{ name?: string; url?: string; snippet?: string }>;
    };

    return {
      answer: data.answer ?? "",
      sources: (data.results ?? []).map((item) => ({
        name: item.name ?? "Source",
        url: item.url ?? "",
        snippet: item.snippet,
      })),
    };
  } catch {
    return null;
  }
}

export async function linkupMusicSearch(preference: string) {
  const result = await linkupDeepSearch(
    `Best comforting song by ${preference} for reminiscence therapy`,
  );
  if (!result?.answer) {
    return {
      artist: preference,
      songTitle: "You Are My Sunshine",
      description: "A warm favourite from your life.",
    };
  }

  const firstLine = result.answer.split(".").slice(0, 1).join(".").trim();
  return {
    artist: preference,
    songTitle: firstLine.slice(0, 60) || "Your favourite song",
    description: firstLine || "Music that feels like home.",
  };
}
