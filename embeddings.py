"""
Stage 5: Similarity Search ("Have We Seen This Before?")
----------------------------------------------------------
Turns error text into a 384-dim embedding (via sentence-transformers, free
and local -- no API key) and finds the closest past incidents using
pgvector's built-in cosine-distance operator (<=>), so no manual numpy
loop is needed.

Demo-ready extras beyond the bare minimum:
- detect_duplicate()   -> a hard "is this basically the same incident?" check
                          at a high similarity threshold, used to bump
                          times_seen instead of creating noisy duplicate rows
- find_similar_by_text() -> one-call convenience wrapper for the API layer
"""

from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from db import engine

# Loaded once at import time -- model download happens on first run (~90MB),
# then it's cached locally. Do this before the demo, not during it.
_model = SentenceTransformer("all-MiniLM-L6-v2")

# Above this cosine similarity, treat two error reports as "the same incident"
# rather than merely "related." Tune down for stricter matching, up for looser.
DUPLICATE_THRESHOLD = 0.92


def get_embedding(error_text: str) -> list[float]:
    """Convert error text into a 384-dim embedding vector."""
    return _model.encode(error_text).tolist()


def find_similar(new_embedding: list[float], top_n: int = 3) -> list[dict]:
    """
    Return the top_n most similar past incidents to the given embedding,
    each with a 0-1 similarity score (1 = identical meaning).
    """
    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity,
                   1 - (embedding <=> :emb) as similarity
            from incidents
            where embedding is not null
            order by embedding <=> :emb
            limit :top_n
        """), {"emb": str(new_embedding), "top_n": top_n})
        return [dict(row._mapping) for row in result]


def find_similar_by_text(error_text: str, top_n: int = 3) -> list[dict]:
    """Convenience wrapper: embed the text, then find similar incidents."""
    emb = get_embedding(error_text)
    return find_similar(emb, top_n=top_n)


def detect_duplicate(error_text: str) -> dict | None:
    """
    Check if this error is essentially a recurrence of an existing incident
    (similarity above DUPLICATE_THRESHOLD). Returns the matching incident
    dict (with its similarity score) if so, otherwise None.

    Wire this in ahead of save_incident(): if it returns a match, call
    db.bump_recurrence(match['id']) instead of inserting a new row --
    this is what lets the demo show "seen 5 times" climbing live instead
    of the incidents table filling with near-identical rows.
    """
    matches = find_similar_by_text(error_text, top_n=1)
    if matches and matches[0]["similarity"] >= DUPLICATE_THRESHOLD:
        return matches[0]
    return None


def find_incident_clusters(cluster_threshold: float = 0.80) -> list[list[dict]]:
    """
    Group all stored incidents into "problem families" -- clusters of
    incidents that are similar to each other even if never directly
    compared before. This is a step beyond one-to-one similarity search:
    it answers "what are our recurring categories of problems?" rather
    than just "what's similar to this one error?" -- a strong Memory
    Dashboard visual (e.g. "3 clusters, 5 incidents in the payments-timeout
    family").

    Greedy clustering: simple and fast enough for hackathon-scale data
    (dozens to low hundreds of incidents). Returns a list of clusters,
    each a list of incident dicts (without embeddings, for easy printing/JSON).
    """
    import numpy as np

    with engine.connect() as conn:
        result = conn.execute(text("""
            select id, service, error, root_cause, fix, confidence, severity, embedding
            from incidents
            where embedding is not null
        """))
        rows = [dict(r._mapping) for r in result]

    if not rows:
        return []

    # pgvector returns embeddings as strings like '[0.1,0.2,...]' via the
    # driver in some configurations -- normalize to numpy arrays either way.
    def to_vec(e):
        if isinstance(e, str):
            e = [float(x) for x in e.strip("[]").split(",")]
        return np.array(e, dtype=float)

    vectors = {row["id"]: to_vec(row["embedding"]) for row in rows}
    by_id = {row["id"]: row for row in rows}

    def cosine_sim(a, b):
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    unclustered = set(by_id.keys())
    clusters: list[list[dict]] = []

    while unclustered:
        seed_id = unclustered.pop()
        cluster = [seed_id]
        seed_vec = vectors[seed_id]

        for other_id in list(unclustered):
            if cosine_sim(seed_vec, vectors[other_id]) >= cluster_threshold:
                cluster.append(other_id)
                unclustered.discard(other_id)

        clusters.append([
            {k: v for k, v in by_id[cid].items() if k != "embedding"}
            for cid in cluster
        ])

    # Largest / most interesting clusters first
    clusters.sort(key=len, reverse=True)
    return clusters
