const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { analyzeIncident } = require("./ai/aiService");
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

app.get("/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            message: "CockroachDB connected successfully!",
            time: result.rows[0]
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });
    }
});

// POST - Save incident
app.post("/incidents", async (req, res) => {
    try {
        const { title, description, severity, service, status, error } = req.body;

        const result = await pool.query(
            `INSERT INTO incidents
             (title, description, severity, service, status, error)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, description, severity, service, status, error || title]
        );

        res.status(201).json({
            message: "Incident saved successfully",
            incident: result.rows[0]
        });

    } catch (error) {
        console.error("Error saving incident:", error);

        res.status(500).json({
            message: "Failed to save incident",
            error: error.message
        });
    }
});
// GET - Fetch incidents
app.get("/incidents", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM incidents ORDER BY created_at DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching incidents:", error);

        res.status(500).json({
            message: "Failed to fetch incidents",
            error: error.message
        });
    }
});
// GET - Fetch one incident by ID
app.get("/incidents/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM incidents WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Error fetching incident:", error);

        res.status(500).json({
            message: "Failed to fetch incident",
            error: error.message
        });
    }
});
// PUT - Update incident
app.put("/incidents/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, severity, service, status } = req.body;

        const result = await pool.query(
            `UPDATE incidents
             SET title = $1,
                 description = $2,
                 severity = $3,
                 service = $4,
                 status = $5
             WHERE id = $6
             RETURNING *`,
            [title, description, severity, service, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        res.json({
            message: "Incident updated successfully",
            incident: result.rows[0]
        });

    } catch (error) {
        console.error("Error updating incident:", error);

        res.status(500).json({
            message: "Failed to update incident",
            error: error.message
        });
    }
});
// DELETE - Delete incident
app.delete("/incidents/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM incidents WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        res.json({
            message: "Incident deleted successfully",
            incident: result.rows[0]
        });

    } catch (error) {
        console.error("Error deleting incident:", error);

        res.status(500).json({
            message: "Failed to delete incident",
            error: error.message
        });
    }
});

// SEARCH - Search incidents by keyword
app.get("/search", async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                message: "Search query required"
            });
        }

        const searchQuery = `%${q}%`;

        const result = await pool.query(
            `SELECT * FROM incidents 
             WHERE LOWER(error) LIKE LOWER($1) 
                OR LOWER(title) LIKE LOWER($1)
                OR LOWER(description) LIKE LOWER($1)
             ORDER BY created_at DESC 
             LIMIT 10`,
            [searchQuery]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Error searching incidents:", error);

        res.status(500).json({
            message: "Search failed",
            error: error.message
        });
    }
});

// HEALTH - Ping endpoint for health checks
app.get("/ping", (req, res) => {
    res.json({ status: "online", message: "Backend is healthy" });
});

// SIMILAR - Get similar incidents by ID
app.get("/similar/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Get the incident first
        const incidentResult = await pool.query(
            "SELECT * FROM incidents WHERE id = $1",
            [id]
        );

        if (incidentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        const incident = incidentResult.rows[0];

        // Find similar incidents based on error/category matching
        const similarResult = await pool.query(
            `SELECT * FROM incidents 
             WHERE id != $1 
             AND (LOWER(error) LIKE LOWER($2) 
                  OR LOWER(ai_category) = LOWER($3))
             ORDER BY created_at DESC
             LIMIT 5`,
            [id, `%${incident.error?.split(' ')[0]}%`, incident.ai_category]
        );

        res.json(similarResult.rows);

    } catch (error) {
        console.error("Error fetching similar incidents:", error);

        res.status(500).json({
            message: "Failed to fetch similar incidents",
            error: error.message
        });
    }
});

// FEEDBACK - Submit feedback on incident analysis
app.post("/feedback/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { useful } = req.body;

        if (useful === undefined) {
            return res.status(400).json({
                message: "Feedback value required (true/false)"
            });
        }

        // Get current incident
        const incidentResult = await pool.query(
            "SELECT * FROM incidents WHERE id = $1",
            [id]
        );

        if (incidentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Incident not found"
            });
        }

        const incident = incidentResult.rows[0];
        let newConfidence = incident.confidence || 50;

        // Update confidence based on feedback
        if (useful) {
            newConfidence = Math.min(100, newConfidence + 2);
        } else {
            newConfidence = Math.max(0, newConfidence - 2);
        }

        // Update the incident with new confidence
        const updateResult = await pool.query(
            `UPDATE incidents 
             SET confidence = $1, feedback = $2, feedback_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [newConfidence, useful ? 'positive' : 'negative', id]
        );

        res.json({
            message: "Feedback recorded successfully",
            confidence: newConfidence,
            incident: updateResult.rows[0]
        });

    } catch (error) {
        console.error("Error recording feedback:", error);

        res.status(500).json({
            message: "Failed to record feedback",
            error: error.message
        });
    }
});

// AI - Analyze Incident

    app.post("/ai/analyze", async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                message: "Title and description are required"
            });
        }

        // AI analysis
        const analysis = analyzeIncident(title, description);

        // Save AI analysis to CockroachDB
        const result = await pool.query(
            `INSERT INTO incidents
             (title, description, error, severity, service, status,
              ai_category, ai_recommendation, ai_analyzed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
             RETURNING *`,
            [
                title,
                description,
                description,  // Use description as error if not provided
                analysis.severity,
                analysis.category,
                "open",
                analysis.category,
                analysis.recommendation
            ]
        );

        res.json({
            message: "Incident analyzed and saved successfully",
            analysis: analysis,
            incident: result.rows[0]
        });

    } catch (error) {
        console.error("AI analysis error:", error);

        res.status(500).json({
            message: "AI analysis failed",
            error: error.message
        });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});