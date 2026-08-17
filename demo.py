"""
Live demo script for Stage 4 + 5 -- run this in front of judges.

Shows, in order:
  1. A brand new (differently-worded) error coming in
  2. The system recognizing it's similar to past incidents -- with scores
  3. A near-exact repeat being caught as a DUPLICATE and bumping times_seen
  4. The Memory Dashboard stats updating live
  5. A keyword search across memory
  6. An anomaly / spike check on a service
  7. The time-saved headline number
  8. Incidents auto-grouped into "problem families"

Run:
    python demo.py

Requires seed_data.py to have been run first.
"""

from db import (
    save_incident, bump_recurrence, get_stats,
    search_incidents, detect_spike, get_time_saved_estimate,
)
from embeddings import (
    get_embedding, find_similar_by_text, detect_duplicate, find_incident_clusters,
)

DIVIDER = "-" * 60


def header(title: str):
    print(f"\n{DIVIDER}\n{title}\n{DIVIDER}")


def show_stats(label: str):
    stats = get_stats()
    print(f"\n[{label}] Memory Dashboard snapshot:")
    print(f"  Total incidents   : {stats.get('total_incidents')}")
    print(f"  Avg confidence    : {stats.get('avg_confidence')}%")
    print(f"  Critical open     : {stats.get('critical_count')}")
    print(f"  Services covered  : {stats.get('services_covered')}")
    print(f"  Most active service: {stats.get('top_service')}")


def main():
    header("STEP 1 -- New incident comes in (differently worded)")
    new_error = "Checkout is timing out when talking to the payment provider"
    print(f"Incoming error: \"{new_error}\"")

    header("STEP 2 -- Searching incident memory for similar past cases")
    matches = find_similar_by_text(new_error, top_n=3)
    for m in matches:
        pct = round(m["similarity"] * 100, 1)
        print(f"  {pct:5}% match | [{m['service']}] {m['error']}")
        print(f"          -> known fix: {m['fix']}")

    if matches:
        best = matches[0]
        print(f"\n>>> System recommendation: reuse fix from incident {best['id']}")
        print(f">>> Confidence in that fix: {best['confidence']}%")

    header("STEP 3 -- A near-exact repeat of a known issue arrives")
    repeat_error = "Payment gateway timeout after 30 seconds"  # matches seed data closely
    dup = detect_duplicate(repeat_error)
    if dup:
        new_count = bump_recurrence(dup["id"])
        pct = round(dup["similarity"] * 100, 1)
        print(f"Incoming error: \"{repeat_error}\"")
        print(f"  Matched existing incident at {pct}% similarity -> treated as DUPLICATE")
        print(f"  times_seen incremented to: {new_count}")
        print("  (No noisy duplicate row created -- memory stays clean.)")
    else:
        print("No duplicate found above threshold -- would be saved as a new incident.")

    header("STEP 4 -- Memory Dashboard updates live")
    show_stats("after demo")

    header("STEP 5 -- Keyword search across memory")
    keyword = "timeout"
    results = search_incidents(keyword)
    print(f"Searching for \"{keyword}\" -> {len(results)} match(es):")
    for r in results[:5]:
        print(f"  [{r['service']}] {r['error']}")

    header("STEP 6 -- Anomaly check: is 'payments' spiking?")
    spike = detect_spike("payments", window_minutes=60, threshold=3)
    flag = "🚨 SPIKE DETECTED" if spike["is_spike"] else "normal"
    print(f"  payments: {spike['recent_count']} incidents in last "
          f"{spike['window_minutes']} min (threshold {spike['threshold']}) -> {flag}")

    header("STEP 7 -- Headline metric: time saved by recognizing repeats")
    ts = get_time_saved_estimate()
    print(f"  Repeat incidents recognized: {ts['recognized_repeats']}")
    print(f"  Estimated time saved: {ts['total_minutes_saved']} minutes "
          f"(~{ts['total_hours_saved']} hours)")

    header("STEP 8 -- Auto-clustering incidents into problem families")
    clusters = find_incident_clusters()
    print(f"Found {len(clusters)} problem families across all incidents:")
    for i, cluster in enumerate(clusters[:5], start=1):
        services = sorted({c["service"] for c in cluster})
        print(f"  Family {i}: {len(cluster)} incident(s) | services: {', '.join(services)}")
        print(f"    e.g. \"{cluster[0]['error']}\"")

    print(f"\n{DIVIDER}\nDemo complete. Full loop:")
    print("embed -> search -> recommend -> detect repeat -> update memory")
    print("-> search/alert/cluster on top of that memory.")
    print(DIVIDER)


if __name__ == "__main__":
    main()
