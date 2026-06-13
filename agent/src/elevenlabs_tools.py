import base64
import os

import httpx

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")


async def speak_calming_message(text: str) -> str | None:
    if not ELEVENLABS_API_KEY or os.getenv("OFFLINE") == "1":
        return None

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={"text": text, "model_id": "eleven_multilingual_v2"},
        )
        if response.status_code != 200:
            return None
        encoded = base64.b64encode(response.content).decode()
        return f"data:audio/mpeg;base64,{encoded}"
