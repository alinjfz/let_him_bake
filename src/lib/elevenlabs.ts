export async function speakCalmingMessage(text: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "EXAVITQu4vr4xnSDxMaL";
  if (!apiKey || process.env.OFFLINE === "1") return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
