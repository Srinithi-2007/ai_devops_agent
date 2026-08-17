"""
Quick isolation test for Stage 4 + 5.
Run this AFTER: (1) schema.sql has been run in Supabase, (2) .env is filled in,
(3) `pip install -r requirements.txt`.

    python test_stage4_5.py

Expected output: the second (differently-worded) incident should come back
as a close match to the first one, with a similarity score well above 0.5,
and get_stats() should report at least 1 incident.

For the full judge-facing walkthrough (seeded data, duplicate detection,
live dashboard stats), run seed_data.py then demo.py instead.
"""

from db import save_incident, get_all_incidents, get_stats
from embeddings import get_embedding, find_similar_by_text


def main():
    print("Saving a test incident...")
    emb1 = get_embedding("Payment gateway timeout after 30 seconds")
    incident_id = save_incident(
        service="payments",
        error="Payment gateway timeout after 30 seconds",
        root_cause="Upstream provider slow to respond under load",
        fix="Increase timeout to 60s and add retry with backoff",
        confidence=50,
        embedding=emb1,
        severity="high",
    )
    print(f"  Saved incident id: {incident_id}")

    print("\nFetching all incidents...")
    for inc in get_all_incidents():
        print(f"  [{inc['id']}] {inc['service']}: {inc['error']} (confidence={inc['confidence']}, severity={inc['severity']})")

    print("\nSearching for similar incidents to a differently-worded error...")
    query = "Gateway timed out during checkout"
    matches = find_similar_by_text(query, top_n=3)
    print(f"  Query: '{query}'")
    for m in matches:
        print(f"  -> similarity={m['similarity']:.3f} | {m['error']} | fix: {m['fix']}")

    print("\nChecking Memory Dashboard stats view...")
    stats = get_stats()
    print(f"  {stats}")

    ok = bool(matches) and matches[0]["similarity"] > 0.5 and stats.get("total_incidents", 0) >= 1
    if ok:
        print("\n✅ Stage 4 + 5 working: similarity search and stats view both confirmed.")
    else:
        print("\n⚠️  Something's off — check that schema.sql ran fully and embeddings are populated.")


if __name__ == "__main__":
    main()
