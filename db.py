"""
Stage 4: Incident Memory (Database)
------------------------------------
Owns the connection to Postgres/Supabase and all read/write access to the
`incidents` table. Backend Lead (Member 2) imports this module and calls
these functions from the FastAPI endpoints.

Demo-ready extras beyond the bare minimum:
- get_stats()            -> powers the Memory Dashboard in one call
- get_incidents_by_service() -> lets the dashboard filter/group
- bump_recurrence()       -> increments times_seen when a near-duplicate
                             error comes back in, so the UI can visibly show
                             "seen 4 times" -- a strong, concrete demo beat
"""

import os
import uuid
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in your "
        "Supabase connection string."
    )

# pool_pre_ping avoids stale-connection errors on free-tier DBs that idle out
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def save_incident(service: str, error: str, root_cause: str | None,
                   fix: str | None, confidence: float, embedding: list[float],
                   severity: str = "medium") -> str:
    """Insert a new incident row. Returns the new incident's id (str)."""
    new_id = str(uuid.uuid4())
    with engine.connect() as conn:
        conn.execute(text("""
            insert into incidents (id, service, error, root_cause, fix, confidence, severity, embedding)
            values (:id, :service, :error, :root_cause, :fix, :confidence, :severity, :embedding)
        """), {
            "id": new_id,
            "service": service,
            "error": error,
            "root_cause": root_cause,
            "fix": fix,
            "confidence": confidence,
            "severity": severity,
            "embedding": str(embedding),   # pgvector accepts '[0.1, 0.2, ...]' text form
        })
        conn.commit()
    return new_id


def get_all_incidents(limit: int = 100) -> list[dict]:
    """Return recent incidents, most recent first. Used by GET /incidents."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity, times_seen, created_at
            from incidents
            order by created_at desc
            limit :limit
        """), {"limit": limit})
        return [dict(row._mapping) for row in result]


def get_incidents_by_service(service: str) -> list[dict]:
    """Filter incidents by service name — used for the dashboard's service filter."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity, times_seen, created_at
            from incidents
            where service = :service
            order by created_at desc
        """), {"service": service})
        return [dict(row._mapping) for row in result]


def get_incident_by_id(incident_id: str) -> dict | None:
    """Return one incident by id, or None if not found. Used by GET /similar/{id}."""
    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity, embedding, times_seen, created_at
            from incidents
            where id = :id
        """), {"id": incident_id})
        row = result.fetchone()
        return dict(row._mapping) if row else None


def bump_recurrence(incident_id: str) -> int:
    """
    Increment times_seen when a near-duplicate of this incident recurs.
    Called from Stage 5's duplicate-detection path. Returns the new count.
    """
    with engine.connect() as conn:
        result = conn.execute(text("""
            update incidents
            set times_seen = times_seen + 1
            where id = :id
            returning times_seen
        """), {"id": incident_id})
        conn.commit()
        row = result.fetchone()
        return int(row[0]) if row else 0


def update_confidence(incident_id: str, useful: bool, step: float = 5.0) -> float:
    """
    Stage 7 groundwork: adjust confidence +/- step (default 5%), clamped 0-100,
    and log the raw feedback event so history isn't lost.
    Returns the new confidence value.
    """
    with engine.connect() as conn:
        conn.execute(text("""
            insert into feedback (incident_id, useful) values (:id, :useful)
        """), {"id": incident_id, "useful": useful})

        delta = step if useful else -step
        result = conn.execute(text("""
            update incidents
            set confidence = greatest(0, least(100, confidence + :delta))
            where id = :id
            returning confidence
        """), {"id": incident_id, "delta": delta})
        conn.commit()
        row = result.fetchone()
        return float(row[0]) if row else 0.0


def get_stats() -> dict:
    """
    Powers the Memory Dashboard in a single query, via the `incident_stats`
    view defined in schema.sql — no aggregation logic needed in the backend.
    """
    with engine.connect() as conn:
        result = conn.execute(text("select * from incident_stats"))
        row = result.fetchone()
        return dict(row._mapping) if row else {}


def search_incidents(keyword: str) -> list[dict]:
    """
    Plain keyword search across error text, root cause, and fix -- a fast
    fallback/complement to vector search, and useful when a user knows
    roughly what they're looking for (e.g. "timeout", "auth").
    """
    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity, times_seen, created_at
            from incidents
            where error ilike :pattern
               or root_cause ilike :pattern
               or fix ilike :pattern
            order by created_at desc
        """), {"pattern": f"%{keyword}%"})
        return [dict(row._mapping) for row in result]


def detect_spike(service: str, window_minutes: int = 60, threshold: int = 3) -> dict:
    """
    Simple anomaly detector: has `service` logged more than `threshold`
    incidents in the last `window_minutes`? Useful for a "system health"
    banner on the dashboard, and a good talking point -- the memory isn't
    just passive storage, it can flag when something is actively getting worse.
    """
    with engine.connect() as conn:
        result = conn.execute(text("""
            select count(*) as recent_count
            from incidents
            where service = :service
              and created_at >= now() - (:window_minutes || ' minutes')::interval
        """), {"service": service, "window_minutes": window_minutes})
        row = result.fetchone()
        recent_count = int(row[0]) if row else 0
        return {
            "service": service,
            "window_minutes": window_minutes,
            "recent_count": recent_count,
            "threshold": threshold,
            "is_spike": recent_count >= threshold,
        }


# Rough estimate of engineer investigation time avoided per recognized
# duplicate -- deliberately conservative, tune to taste for the pitch.
MINUTES_SAVED_PER_DUPLICATE = 20


def get_time_saved_estimate() -> dict:
    """
    Turns times_seen into a headline "time saved" number -- one of the
    strongest numbers you can put on a pitch slide, since it translates
    the abstract "similarity search" feature into a concrete business outcome.
    """
    with engine.connect() as conn:
        result = conn.execute(text("""
            select coalesce(sum(times_seen - 1), 0) as recognized_repeats
            from incidents
            where times_seen > 1
        """))
        row = result.fetchone()
        recognized_repeats = int(row[0]) if row else 0
        minutes_saved = recognized_repeats * MINUTES_SAVED_PER_DUPLICATE
        return {
            "recognized_repeats": recognized_repeats,
            "minutes_saved_per_duplicate": MINUTES_SAVED_PER_DUPLICATE,
            "total_minutes_saved": minutes_saved,
            "total_hours_saved": round(minutes_saved / 60, 1),
        }
