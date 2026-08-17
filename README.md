# Stage 4 + 5 — Incident Memory & Similarity Search

Owned by: Database Engineer (Member 4)

This is the "memory" half of the pipeline — the part that turns a one-off
error log into something the system actually remembers, recognizes, and
learns from. It's also the part with the strongest live-demo moment: type
in a differently-worded version of a past error and watch the system say
"I've seen this before" with a real similarity score.

## What's in this folder

| File | Purpose |
|---|---|
| `schema.sql` | `incidents` table, `feedback` log, indexes, an auto-updating `updated_at` trigger, and an `incident_stats` view that powers the Memory Dashboard with zero backend aggregation logic |
| `db.py` | Connection + CRUD: `save_incident`, `get_all_incidents`, `get_incidents_by_service`, `get_incident_by_id`, `bump_recurrence`, `update_confidence`, `get_stats` |
| `embeddings.py` | `get_embedding` (local, free, no API key) + `find_similar` / `find_similar_by_text` (pgvector cosine search) + `detect_duplicate` |
| `seed_data.py` | 12 realistic incidents across 5 services, so the dashboard isn't empty for the demo |
| `demo.py` | A scripted, judge-facing walkthrough: new error → similarity match → duplicate detection → live dashboard stats |
| `report.py` | Exports a snapshot report (`incident_report.md` + `.json`) — stats, time-saved, problem families. Good pitch-deck appendix or judge takeaway. |
| `main.py` | A working FastAPI app wiring every endpoint (`/incidents`, `/analyze`, `/similar/{id}`, `/search`, `/clusters`, `/feedback/{id}`, `/stats`, `/stats/time-saved`, `/alerts/{service}`) straight to `db.py` and `embeddings.py`. Runnable standalone — Stage 3's AI call is a clearly-labeled stub until Member 3 plugs in the real one. |
| `test_stage4_5.py` | Fast isolation check — confirms the module works before handing off to Backend Lead |
| `.env.example` | Template for your DB connection string |

## Why this is more than "a database with a table"

- **Duplicate detection, not duplicate rows.** `detect_duplicate()` catches
  when an incoming error is essentially the same incident recurring (≥92%
  similarity) and bumps a `times_seen` counter instead of cluttering memory
  with near-identical rows. In the demo, this is the moment you can say
  "the system just recognized this happened before — 5 times now."
- **The dashboard's stats come from the database, not the backend.** The
  `incident_stats` SQL view means Member 5 (Frontend) can hit one field for
  total incidents, average confidence, critical count, and the most
  incident-prone service — genuinely useful when someone in Q&A asks "how
  does the Memory Dashboard actually compute that?"
- **Severity and recurrence give the UI something to visualize.** Beyond
  raw text, each incident now carries `severity` and `times_seen`, so the
  frontend can sort/color by urgency and show recurrence trends instead of
  a flat list of strings.
- **A headline "time saved" number.** `get_time_saved_estimate()` turns
  recognized repeats into a concrete business metric — minutes/hours of
  engineer investigation avoided. This is the number to put on a pitch
  slide; it's the difference between "we built a search feature" and "we
  save engineers X hours a week."
- **Incidents auto-group into "problem families."** `find_incident_clusters()`
  goes beyond one-to-one similarity search and answers "what are our
  recurring categories of problems?" — e.g. "3 clusters, 5 incidents in the
  payments-timeout family" is a much stronger dashboard visual than a flat
  incident list.
- **Anomaly detection.** `detect_spike()` flags when a service is logging
  incidents faster than normal, so the memory isn't just passive storage —
  it can proactively surface "something's actively getting worse."
- **Keyword search.** `search_incidents()` is a fast fallback alongside
  vector search, for when someone just wants to type "timeout" and see
  everything related.

## Setup (10–15 min)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run all of `schema.sql`.
3. Go to Project Settings → Database → Connection string (URI), copy it.
4. `cp .env.example .env` and paste your connection string as `DATABASE_URL`.
5. `pip install -r requirements.txt` — first run downloads the ~90MB
   embedding model, so do this **before** the demo, not during it.
6. `python seed_data.py` — populates 12 realistic incidents.
7. `python demo.py` — run the full walkthrough once to make sure it's
   demo-ready, then again live in front of judges.
8. `uvicorn main:app --reload --port 8000` — starts the real API. Open
   `http://localhost:8000/docs` for an interactive Swagger UI you can
   click through live, or point the frontend at it directly.

### Endpoint map (`main.py`)

| Endpoint | Function called |
|---|---|
| `GET /incidents?service=` | `get_all_incidents` / `get_incidents_by_service` |
| `GET /incidents/{id}` | `get_incident_by_id` |
| `POST /analyze` | `detect_duplicate` → `bump_recurrence`, or `analyze_error` (stub) → `save_incident` |
| `GET /similar/{id}` | `find_similar_by_text` |
| `GET /search?q=` | `search_incidents` |
| `GET /clusters` | `find_incident_clusters` |
| `POST /feedback/{id}` | `update_confidence` |
| `GET /stats` | `get_stats` |
| `GET /stats/time-saved` | `get_time_saved_estimate` |
| `GET /alerts/{service}` | `detect_spike` |

`analyze_error()` in `main.py` is a clearly-labeled stub — swap it for
Stage 3's real Bedrock/Gemini/Claude call once Member 3 has it ready. Until
then, `POST /analyze` still works end-to-end (it just returns a placeholder
root cause/fix), so nothing blocks on Stage 3 being finished first.

`test_stage4_5.py` is the fast sanity check for development; `demo.py` is
the polished version for presenting.

## Suggested demo script (30 seconds)

1. "Here's our incident memory — it already has real incidents across five
   services." *(run `demo.py`, let Step 1–2 print)*
2. "Notice the error text I typed is worded completely differently from
   what's stored — the system still finds it at high similarity and
   recommends the fix that worked last time."
3. "Now watch what happens when the *same* incident happens again."
   *(Step 3 — duplicate detected, counter increments)*
4. "And the dashboard stats you'd see on screen are computed live from the
   database itself." *(Step 4)*
5. "We can also search memory directly, get alerted if a service starts
   spiking, and — here's the number that matters — the system estimates
   how much engineer time it's already saved by catching repeats."
   *(Steps 5–7)*
6. "Finally, it doesn't just match one-to-one — it clusters incidents into
   recurring problem families automatically." *(Step 8)*

## Handoff to teammates

- **Backend Lead (Member 2):** import everything from `db.py` and
  `embeddings.py` — the function signatures map directly onto
  `GET /incidents`, `GET /similar/{id}`, `POST /feedback/{id}`, and a new
  `GET /stats` you can add trivially with `get_stats()`.
- **AI Integration Engineer (Member 3):** call `detect_duplicate()` before
  `save_incident()` in the `/analyze` flow — if it returns a match, call
  `bump_recurrence()` instead of inserting. Otherwise proceed as before.
  For Stage 6, `find_similar_by_text()` already returns `fix` fields ready
  to drop into the recommendation prompt.
- **Frontend Developer (Member 5):** `get_stats()` gives you every number
  the Memory Dashboard needs in one call — no client-side aggregation.
- **Integration & Feedback Lead (Member 6):** `update_confidence()` already
  implements the ±5% capped rule and logs to `feedback` for history.

## If your team is on CockroachDB instead of Supabase

The table logic carries over, but CockroachDB's vector support is newer —
the safer fallback is storing embeddings as a JSON/array column and doing
cosine similarity in Python with numpy (the Stage 5 "alternative" path in
the roadmap). Ask if you want that version written out too.
