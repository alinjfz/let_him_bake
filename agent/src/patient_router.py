"""Patient AG-UI agent — proxies step logic to Next.js, streams A2UI surfaces."""

import json
import os
import uuid
from typing import Any, AsyncIterator

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()

NEXT_APP_URL = os.getenv("NEXT_APP_URL", "http://127.0.0.1:3000").rstrip("/")


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _parse_action(body: dict[str, Any]) -> dict[str, Any]:
    forwarded = body.get("forwardedProps") or {}
    if isinstance(forwarded, dict) and forwarded.get("patientAction"):
        action = forwarded["patientAction"]
        if isinstance(action, dict):
            return action

    messages = body.get("messages") or []
    if not messages:
        return {"action": "wake", "step": 0}

    last = messages[-1].get("content", "")
    if isinstance(last, dict):
        return last

    if isinstance(last, str):
        try:
            parsed = json.loads(last)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        lowered = last.lower()
        if "__panic__" in last or "need help" in lowered:
            return {"action": "panic", "message": "__PANIC__", "step": 0}
        if "__music__" in last or last.strip().lower() == "music":
            return {"action": "music", "message": "__MUSIC__", "step": 0}
        if last.strip():
            return {"action": "ask", "message": last, "step": 0}

    return {"action": "wake", "step": 0}


async def _fetch_step(action: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(
            f"{NEXT_APP_URL}/api/patient-a2ui",
            json=action,
        )
        response.raise_for_status()
        return response.json()


async def _stream_step(action: dict[str, Any]) -> AsyncIterator[str]:
    step_data = await _fetch_step(action)
    speak = step_data.get("speakText") or "One moment."
    ops = step_data.get("a2ui_operations") or []

    run_id = str(uuid.uuid4())
    message_id = str(uuid.uuid4())
    activity_id = str(uuid.uuid4())

    yield _sse({"type": "RunStarted", "runId": run_id})
    yield _sse({"type": "TextMessageStart", "messageId": message_id, "role": "assistant"})
    yield _sse({"type": "TextMessageContent", "messageId": message_id, "delta": speak})

    yield _sse(
        {
            "type": "ActivitySnapshot",
            "activityType": "echoes-patient-step",
            "activityId": activity_id,
            "content": {"step": step_data},
        }
    )

    if ops:
        yield _sse(
            {
                "type": "Custom",
                "name": "a2ui-surface",
                "value": {"a2ui_operations": ops},
            }
        )

    yield _sse(
        {
            "type": "Custom",
            "name": "echoes-patient-step",
            "value": step_data,
        }
    )

    yield _sse({"type": "TextMessageEnd", "messageId": message_id})
    yield _sse({"type": "RunFinished", "runId": run_id})


@router.post("")
async def patient_agent(request: Request):
    body = await request.json()
    action = _parse_action(body)
    return StreamingResponse(
        _stream_step(action),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
