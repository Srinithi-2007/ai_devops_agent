-- AI DevOps Agent - Database Schema
-- Compatible with PostgreSQL, CockroachDB, and Supabase
-- Run this script to set up the database

-- 1. Incidents table - Core data structure for storing incident analysis
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    service TEXT NOT NULL,
    error TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'analyzing', 'resolved', 'failed')),
    
    -- AI Analysis fields
    root_cause TEXT,
    ai_category TEXT,
    ai_recommendation TEXT,
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    ai_analyzed_at TIMESTAMP,
    
    -- Feedback fields
    feedback TEXT,
    feedback_at TIMESTAMP,
    
    -- Tracking
    times_seen INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_error ON incidents(error);

-- 3. Feedback history table - audit trail for confidence updates
CREATE TABLE IF NOT EXISTS feedback_history (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    useful BOOLEAN NOT NULL,
    old_confidence INTEGER,
    new_confidence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_incident ON feedback_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_history(created_at DESC);

-- 5. Statistics view for dashboard
CREATE OR REPLACE VIEW incident_stats AS
SELECT
    COUNT(*) as total_incidents,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
    COUNT(*) FILTER (WHERE status = 'open') as open_count,
    COUNT(*) FILTER (WHERE status = 'analyzing') as analyzing_count,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high') as high_count,
    ROUND(AVG(confidence)::numeric, 1) as avg_confidence,
    COUNT(DISTINCT service) as unique_services,
    MAX(created_at) as last_incident_at
FROM incidents;

-- 6. Insert sample data for testing (optional - comment out for production)
INSERT INTO incidents (title, description, service, error, severity, status, root_cause, ai_category, ai_recommendation, confidence, created_at)
VALUES 
(
    'Payment Service Database Timeout',
    'Payment service experiencing database connection timeouts during peak hours',
    'payment-service',
    'ConnectionPoolExhaustedException: Unable to acquire connection from pool after 30000ms',
    'critical',
    'resolved',
    'Gradual connection leak in transaction handling code combined with traffic spike',
    'Database',
    'Increase connection pool to 200, add timeout handler, implement circuit breaker',
    94,
    NOW() - INTERVAL '2 hours'
),
(
    'API Gateway Elasticsearch Timeout',
    'API Gateway routing timeouts to catalog search service',
    'api-gateway',
    'RequestTimeoutException: Upstream service /catalog/search exceeded 10s SLA',
    'high',
    'resolved',
    'Elasticsearch index fragmentation after large product import batch job',
    'Search',
    'Force merge ES indices, redistribute shards, increase gateway timeout to 15s',
    87,
    NOW() - INTERVAL '1 hour'
),
(
    'Redis Stream Write Timeout',
    'Notification worker stream writes failing due to Redis memory pressure',
    'notification-worker',
    'RedisCommandTimeoutException: Command XADD timed out after 3000ms',
    'medium',
    'open',
    'Redis maxmemory policy evicting stream entries prematurely',
    'Cache',
    'Set maxmemory-policy to noeviction for stream keys, add XLEN monitoring',
    79,
    NOW() - INTERVAL '30 minutes'
);

-- Verify tables were created
SELECT 'Schema setup complete!' as status;
