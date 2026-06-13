"""Echoes FastAPI agent — AG-UI endpoints for CopilotKit HttpAgent."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.patient_router import router as patient_router
from src.research_router import router as research_router

app = FastAPI(title="Echoes Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patient_router, prefix="/patient", tags=["patient"])
app.include_router(research_router, prefix="/research", tags=["research"])


@app.get("/health")
def health():
    return {"ok": True, "service": "echoes-agent"}
