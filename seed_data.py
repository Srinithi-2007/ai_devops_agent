"""
Seed the database with realistic, varied incidents across multiple services
so the dashboard looks alive and the similarity search has real signal to
work with, instead of demoing against an empty table.

Run once after schema.sql, before your live demo:

    python seed_data.py
"""

from db import save_incident
from embeddings import get_embedding

SEED_INCIDENTS = [
    dict(service="payments", severity="high",
         error="Payment gateway timeout after 30 seconds",
         root_cause="Upstream payment provider slow to respond under peak load",
         fix="Increase client timeout to 60s and add exponential-backoff retry",
         confidence=72),
    dict(service="payments", severity="critical",
         error="Card authorization failed: invalid CVV format",
         root_cause="Frontend not stripping whitespace before submitting CVV field",
         fix="Add input sanitization and client-side validation on the CVV field",
         confidence=88),
    dict(service="auth", severity="high",
         error="JWT token validation failed: signature mismatch",
         root_cause="Auth service and API gateway were using different signing keys after rotation",
         fix="Sync signing key rotation across all services via shared secrets manager",
         confidence=65),
    dict(service="auth", severity="medium",
         error="User session expired unexpectedly after 5 minutes",
         root_cause="Redis session store TTL misconfigured to 300s instead of 3600s",
         fix="Correct SESSION_TTL environment variable and redeploy auth service",
         confidence=90),
    dict(service="database", severity="critical",
         error="Connection pool exhausted: too many clients already",
         root_cause="Leaked connections from a background job not closing sessions",
         fix="Add connection context managers and lower pool max to force earlier failures in dev",
         confidence=55),
    dict(service="database", severity="high",
         error="Query timeout on incidents table after 30s",
         root_cause="Missing index on frequently filtered service column",
         fix="Add btree index on incidents.service",
         confidence=80),
    dict(service="api-gateway", severity="medium",
         error="Rate limit exceeded: 429 too many requests",
         root_cause="A single client bypassing per-user throttling via IP rotation",
         fix="Switch rate limiting key from IP to authenticated user id",
         confidence=60),
    dict(service="api-gateway", severity="low",
         error="CORS error: origin not allowed",
         root_cause="New staging frontend domain not added to allowed origins list",
         fix="Add staging.yourapp.com to CORS_ALLOWED_ORIGINS config",
         confidence=95),
    dict(service="notifications", severity="medium",
         error="Email delivery failed: SMTP connection refused",
         root_cause="Outbound SMTP provider rotated their IP allowlist requirements",
         fix="Switch to API-based email provider instead of raw SMTP to avoid IP allowlisting",
         confidence=58),
    dict(service="notifications", severity="low",
         error="Push notification not delivered: invalid device token",
         root_cause="Stale device tokens not being pruned after app reinstall",
         fix="Add token-invalid webhook handler to prune dead tokens from the database",
         confidence=77),
    dict(service="payments", severity="high",
         error="Gateway timed out during checkout",
         root_cause="Same upstream provider latency issue as prior payment timeout incident",
         fix="Increase client timeout to 60s and add exponential-backoff retry",
         confidence=72),
    dict(service="database", severity="medium",
         error="Deadlock detected on incidents table update",
         root_cause="Concurrent confidence-score updates from feedback endpoint racing on same row",
         fix="Wrap confidence update in a single atomic UPDATE ... RETURNING statement",
         confidence=68),
]


def main():
    print(f"Seeding {len(SEED_INCIDENTS)} incidents...")
    for i, inc in enumerate(SEED_INCIDENTS, start=1):
        embedding = get_embedding(inc["error"])
        incident_id = save_incident(
            service=inc["service"],
            error=inc["error"],
            root_cause=inc["root_cause"],
            fix=inc["fix"],
            confidence=inc["confidence"],
            embedding=embedding,
            severity=inc["severity"],
        )
        print(f"  [{i:2}/{len(SEED_INCIDENTS)}] {inc['service']:14} -> {incident_id}")
    print("\nDone. Run `python demo.py` for the live similarity-search walkthrough.")


if __name__ == "__main__":
    main()
