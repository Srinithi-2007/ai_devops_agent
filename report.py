"""
Export a snapshot report of the incident memory -- stats, time-saved
estimate, and problem-family clusters -- as both Markdown and JSON.

Handy for: pasting straight into the pitch deck, leaving a printed copy at
the demo table, or attaching to a judging submission.

Run:
    python report.py
Outputs:
    incident_report.md
    incident_report.json
"""

import json
from datetime import datetime

from db import get_stats, get_time_saved_estimate, get_all_incidents
from embeddings import find_incident_clusters


def build_report() -> dict:
    stats = get_stats()
    time_saved = get_time_saved_estimate()
    clusters = find_incident_clusters()
    incidents = get_all_incidents(limit=1000)

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "stats": stats,
        "time_saved": time_saved,
        "problem_families": [
            {
                "family_size": len(cluster),
                "services_involved": sorted({i["service"] for i in cluster}),
                "sample_error": cluster[0]["error"],
                "incident_ids": [i["id"] for i in cluster],
            }
            for cluster in clusters
        ],
        "total_incidents_listed": len(incidents),
    }


def to_markdown(report: dict) -> str:
    lines = []
    lines.append("# Incident Memory — Snapshot Report")
    lines.append(f"_Generated {report['generated_at']}_\n")

    s = report["stats"]
    lines.append("## Overview")
    lines.append(f"- **Total incidents:** {s.get('total_incidents')}")
    lines.append(f"- **Average fix confidence:** {s.get('avg_confidence')}%")
    lines.append(f"- **Critical incidents open:** {s.get('critical_count')}")
    lines.append(f"- **Services covered:** {s.get('services_covered')}")
    lines.append(f"- **Most active service:** {s.get('top_service')}\n")

    ts = report["time_saved"]
    lines.append("## Impact: Time Saved by Recognizing Repeat Incidents")
    lines.append(f"- **Repeat incidents recognized:** {ts['recognized_repeats']}")
    lines.append(f"- **Estimated minutes saved per repeat:** {ts['minutes_saved_per_duplicate']}")
    lines.append(f"- **Total estimated time saved:** {ts['total_minutes_saved']} minutes "
                  f"(~{ts['total_hours_saved']} hours)\n")

    lines.append("## Problem Families (clustered by similarity)")
    if not report["problem_families"]:
        lines.append("_No clusters yet — seed some incidents first._\n")
    else:
        for i, fam in enumerate(report["problem_families"], start=1):
            lines.append(f"### Family {i} — {fam['family_size']} incident(s)")
            lines.append(f"- Services: {', '.join(fam['services_involved'])}")
            lines.append(f"- Representative error: \"{fam['sample_error']}\"\n")

    return "\n".join(lines)


def main():
    report = build_report()

    with open("incident_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)

    md = to_markdown(report)
    with open("incident_report.md", "w") as f:
        f.write(md)

    print("Report written to incident_report.md and incident_report.json")
    print("\n" + md)


if __name__ == "__main__":
    main()
