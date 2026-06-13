import os
from typing import Any

import httpx

LINKUP_API_KEY = os.getenv("LINKUP_API_KEY", "")


async def linkup_deep_search(query: str) -> dict[str, Any] | None:
    if not LINKUP_API_KEY or os.getenv("OFFLINE") == "1":
        return None

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.linkup.so/v1/search",
            headers={
                "Authorization": f"Bearer {LINKUP_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"q": query, "depth": "deep", "outputType": "sourcedAnswer"},
        )
        if response.status_code != 200:
            return None
        return response.json()


async def linkup_music_search(preference: str) -> dict[str, str]:
    result = await linkup_deep_search(
        f"Best comforting song by {preference} for reminiscence therapy"
    )
    if not result:
        return {
            "artist": preference,
            "songTitle": "You Are My Sunshine",
            "description": "A warm favourite from your life.",
        }
    answer = (result.get("answer") or "").strip()
    first = answer.split(".")[0][:60] if answer else "Your favourite song"
    return {
        "artist": preference,
        "songTitle": first or "Your favourite song",
        "description": first or "Music that feels like home.",
    }
