function analyzeIncident(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    let category = "General";
    let severity = "MEDIUM";
    let recommendation =
        "Investigate the incident and check application logs.";

    // Database incidents
    if (
        text.includes("database") ||
        text.includes("db") ||
        text.includes("sql") ||
        text.includes("connection")
    ) {
        category = "Database";
        recommendation =
            "Check database connectivity, connection pool and database health.";
    }

    // Infrastructure incidents
    if (
        text.includes("cpu") ||
        text.includes("memory") ||
        text.includes("server") ||
        text.includes("down")
    ) {
        category = "Infrastructure";
        recommendation =
            "Check server health, CPU, memory and running processes.";
    }

    // Severity
    if (
        text.includes("critical") ||
        text.includes("outage") ||
        text.includes("production down")
    ) {
        severity = "CRITICAL";
    } else if (
        text.includes("error") ||
        text.includes("failed") ||
        text.includes("overload")
    ) {
        severity = "HIGH";
    }

    return {
        category,
        severity,
        recommendation
    };
}

module.exports = { analyzeIncident };