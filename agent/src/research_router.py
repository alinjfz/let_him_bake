import json
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from src.catalog import CATALOG_ID
from src.linkup_tools import linkup_deep_search

router = APIRouter()


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def _stream_a2ui_reply(surface: dict[str, Any], text: str) -> AsyncIterator[str]:
    run_id = str(uuid.uuid4())
    message_id = str(uuid.uuid4())
    yield _sse({"type": "RunStarted", "runId": run_id})
    yield _sse({"type": "TextMessageStart", "messageId": message_id, "role": "assistant"})
    yield _sse({"type": "TextMessageContent", "messageId": message_id, "delta": text})
    yield _sse({"type": "Custom", "name": "a2ui-surface", "value": surface})
    yield _sse({"type": "TextMessageEnd", "messageId": message_id})
    yield _sse({"type": "RunFinished", "runId": run_id})


@router.post("")
async def research_agent(request: Request):
    body = await request.json()
    messages = body.get("messages") or []
    query = messages[-1]["content"] if messages else "What helps with evening agitation?"

    linkup = await linkup_deep_search(query)
    if linkup:
        source = (linkup.get("results") or [{}])[0]
        evidence = {
            "suggestion": (linkup.get("answer") or "Try a calm evening routine.").split(".")[0],
            "source": source.get("name") or "Linkup clinical search",
            "url": source.get("url"),
            "confidence": "high",
            "summary": linkup.get("answer") or "Evidence-based guidance for caregivers.",
        }
    else:
        evidence = {
            "suggestion": "Keep evenings calm and familiar",
            "source": "NHS · NICE CG42",
            "url": "https://www.nice.org.uk/guidance/cg42",
            "confidence": "medium",
            "summary": "Soft light, quiet music, and a steady routine can ease evening restlessness.",
        }

    surface = {"catalogId": CATALOG_ID, "components": [{"id": "evidence", "component": "EvidenceCard", "props": evidence}]}
    return StreamingResponse(
        _stream_a2ui_reply(surface, evidence["summary"]),
        media_type="text/event-stream",
    )
