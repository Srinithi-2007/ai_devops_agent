"""
FastAPI app wiring together Stage 4 (database) + Stage 5 (similarity search)
into real HTTP endpoints. This is the file Backend Lead (Member 2) owns and
extends -- Stage 2 in the roadmap -- but it's written out here so the whole
pipeline runs end-to-end immediately instead of everyone integrating blind.

Run:
    uvicorn main:app --reload --port 8000

Then open http://localhost:8000/docs for interactive testing.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import (
    save_incident, get_all_incidents, get_incident_by_id,
    get_incidents_by_service, bump_recurrence, update_confidence,
    get_stats, search_incidents, detect_spike, get_time_saved_estimate,
)
from embeddings import (
    get_embedding, find_similar_by_text, detect_duplicate, find_incident_clusters,
)

app = FastAPI(title="AI DevOps Incident Memory")

# Wide open for hackathon purposes -- tighten this before anything real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    service: str
    error: str
    severity: str = "medium"


class FeedbackRequest(BaseModel):
    useful: bool


# ---------------------------------------------------------------------------
# Stage 3 hook -- swap this out for your real Bedrock/Gemini/Claude call.
# Left as a clearly-labeled stub so this file runs standalone before Member 3
# has their AI integration ready, and so it's obvious where to plug it in.
# ---------------------------------------------------------------------------

def analyze_error(error_text: str) -> dict:
    """
    STUB: replace with a real call to Bedrock / Gemini / Claude.
    Must return {"root_cause": str, "fix": str, "confidence": float}.
    """
    return {
        "root_cause": "Not yet analyzed -- plug in Stage 3's analyze_error() here.",
        "fix": "Not yet analyzed -- plug in Stage 3's analyze_error() here.",
        "confidence": 50.0,
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/ping")
def ping():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Incidents (Stage 4)
# ---------------------------------------------------------------------------

@app.get("/incidents")
def list_incidents(service: str | None = None, limit: int = 100):
    """All incidents, optionally filtered by service."""
    if service:
        return get_incidents_by_service(service)
    return get_all_incidents(limit=limit)


@app.get("/incidents/{incident_id}")
def get_incident(incident_id: str):
    incident = get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    # embedding is a large raw vector -- don't ship it to the frontend
    incident.pop("embedding", None)
    return incident


# ---------------------------------------------------------------------------
# Analysis pipeline: AI (Stage 3, stubbed) + duplicate detection (Stage 5)
#                     + save (Stage 4)
# ---------------------------------------------------------------------------

@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    """
    Full pipeline for a new error report:
      1. Check if it's a near-duplicate of something already in memory.
         If so, bump times_seen and return the existing incident + fix.
      2. Otherwise, run AI analysis (stub -- wire in Stage 3), embed it,
         and save it as a new incident.
    """
    duplicate = detect_duplicate(payload.error)
    if duplicate:
        new_count = bump_recurrence(duplicate["id"])
        return {
            "status": "duplicate",
            "matched_incident_id": duplicate["id"],
            "similarity": duplicate["similarity"],
            "times_seen": new_count,
            "recommended_fix": duplicate["fix"],
            "confidence": duplicate["confidence"],
        }

    analysis = analyze_error(payload.error)
    embedding = get_embedding(payload.error)
    incident_id = save_incident(
        service=payload.service,
        error=payload.error,
        root_cause=analysis["root_cause"],
        fix=analysis["fix"],
        confidence=analysis["confidence"],
        embedding=embedding,
        severity=payload.severity,
    )
    return {
        "status": "new_incident",
        "incident_id": incident_id,
        "root_cause": analysis["root_cause"],
        "fix": analysis["fix"],
        "confidence": analysis["confidence"],
    }


# ---------------------------------------------------------------------------
# Similarity search (Stage 5)
# ---------------------------------------------------------------------------

@app.get("/similar/{incident_id}")
def get_similar(incident_id: str, top_n: int = 3):
    """Find incidents similar to an existing one, by its stored error text."""
    incident = get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    matches = find_similar_by_text(incident["error"], top_n=top_n + 1)
    # Drop the incident matching itself (similarity ~1.0 against its own text)
    return [m for m in matches if m["id"] != incident_id][:top_n]


@app.get("/search")
def search(q: str):
    """Plain keyword search across error, root cause, and fix text."""
    return search_incidents(q)


@app.get("/clusters")
def clusters():
    """Incidents auto-grouped into recurring 'problem families'."""
    return find_incident_clusters()


# ---------------------------------------------------------------------------
# Feedback / learning loop (Stage 7)
# ---------------------------------------------------------------------------

@app.post("/feedback/{incident_id}")
def feedback(incident_id: str, payload: FeedbackRequest):
    incident = get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    new_confidence = update_confidence(incident_id, payload.useful)
    return {"incident_id": incident_id, "confidence": new_confidence}


# ---------------------------------------------------------------------------
# Dashboard / metrics (Stage 8 backs onto these)
# ---------------------------------------------------------------------------

@app.get("/stats")
def stats():
    return get_stats()


@app.get("/stats/time-saved")
def time_saved():
    return get_time_saved_estimate()


@app.get("/alerts/{service}")
def spike_check(service: str, window_minutes: int = 60, threshold: int = 3):
    return detect_spike(service, window_minutes=window_minutes, threshold=threshold)
