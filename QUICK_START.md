# Quick Setup Guide - CockroachDB / PostgreSQL Configuration

## ⚡ 5-Minute Quick Start (Local PostgreSQL)

### Step 1: Install PostgreSQL (if not already installed)
**Windows:** https://www.postgresql.org/download/windows/  
**Mac:** `brew install postgresql`  
**Linux/WSL:** `apt-get install postgresql postgresql-contrib`

### Step 2: Create Database
```bash
# Start PostgreSQL service first, then:
psql -U postgres -c "CREATE DATABASE ai_devops_agent;"
```

### Step 3: Setup Schema
```bash
cd backend
psql -U postgres -d ai_devops_agent -f schema_setup.sql
```

### Step 4: Configure .env
```bash
# Edit backend/.env and set:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_devops_agent
```

### Step 5: Start Backend
```bash
cd backend
npm install  # if first time
node index.js
```

**You should see:**
```
DATABASE_URL loaded: true
Server running on http://localhost:5000
```

### Step 6: Test Database
```bash
curl http://localhost:5000/db-test
```

**Expected response:**
```json
{
  "message": "CockroachDB connected successfully!",
  "time": "2026-08-18T..."
}
```

---

## 🚀 Using CockroachDB Cloud (Production Ready)

### Step 1: Sign Up
Visit https://www.cockroachlabs.com/get-started and create free account

### Step 2: Create Cluster
1. Click "Create Cluster"
2. Choose "Free" tier
3. Select region (pick closest to you)
4. Click "Create cluster"

### Step 3: Get Connection String
1. Go to "Connection info"
2. Select "Connection string"
3. Copy the connection URL

### Step 4: Update .env
```bash
# Edit backend/.env:
DATABASE_URL=postgresql://[user]:[password]@[cluster-name].crdb.io:26257/[database]?sslmode=require
```

### Step 5: Setup Schema
```bash
# Download and install CockroachDB client or use any PostgreSQL client
psql "[connection_string_from_step_3]" -f schema_setup.sql
```

### Step 6: Start Backend
```bash
cd backend
node index.js
```

---

## 🆓 Using Supabase (Free PostgreSQL + pgvector)

### Step 1: Sign Up
Visit https://supabase.com and sign up

### Step 2: Create Project
1. Click "New project"
2. Enter project name
3. Generate password (copy it!)
4. Click "Create new project"

### Step 3: Get Connection String
1. Go to "Project Settings" → "Database"
2. Click "Connection pooling"
3. Copy the "Connection string (URI mode)"
4. Replace `[YOUR-PASSWORD]` with your actual password

### Step 4: Update .env
```bash
# Edit backend/.env:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Step 5: Run Schema
1. Go back to Supabase Dashboard
2. Click "SQL Editor"
3. Click "New query"
4. Copy contents of `schema_setup.sql` from backend folder
5. Paste and click "Run"

### Step 6: Start Backend
```bash
cd backend
node index.js
```

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] **Backend Running**
  ```bash
  curl http://localhost:5000/
  # Should return: "Backend is running 🚀"
  ```

- [ ] **Database Connected**
  ```bash
  curl http://localhost:5000/db-test
  # Should return JSON with timestamp
  ```

- [ ] **Sample Data Loaded**
  ```bash
  curl http://localhost:5000/incidents
  # Should return array with 3 sample incidents
  ```

- [ ] **Frontend Can See Data**
  - Open http://localhost:8443
  - Navigate to Dashboard
  - Should see 3 incidents in the table

- [ ] **Search Works**
  ```bash
  curl "http://localhost:5000/search?q=database"
  # Should return matching incidents
  ```

- [ ] **Feedback Works**
  ```bash
  curl -X POST http://localhost:5000/feedback/1 \
    -H "Content-Type: application/json" \
    -d '{"useful": true}'
  # Should return updated incident with confidence +2
  ```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'pg'"
**Fix:** Install pg dependency
```bash
cd backend
npm install pg
```

### Error: "Connection refused"
**Fix:** Database not running
- Check .env DATABASE_URL is correct
- For local: `sudo service postgresql start`
- For Docker: `docker start postgres`

### Error: "password authentication failed"
**Fix:** Wrong password in .env
- Default PostgreSQL user: `postgres`
- Default password: what you set during install
- For local dev, use: `postgresql://postgres:postgres@localhost:5432/ai_devops_agent`

### Error: "FATAL: database 'ai_devops_agent' does not exist"
**Fix:** Create database first
```bash
psql -U postgres -c "CREATE DATABASE ai_devops_agent;"
```

### Error: "relation 'incidents' does not exist"
**Fix:** Run schema setup
```bash
psql -U postgres -d ai_devops_agent -f schema_setup.sql
```

### Error: "relation 'feedback' does not exist" when trying to insert
**Fix:** Make sure schema_setup.sql completed successfully
```bash
# Verify tables exist:
psql -U postgres -d ai_devops_agent -c "\dt"
# Should show: incidents, feedback_history
```

---

## 📊 Database Schema Overview

The schema includes:

### `incidents` Table (Main)
- id, title, description, service, error
- severity (low/medium/high/critical)
- status (open/analyzing/resolved/failed)
- AI fields: root_cause, ai_category, ai_recommendation, confidence
- Feedback: feedback, feedback_at
- Tracking: times_seen, created_at, updated_at

**Sample Data:** 3 test incidents already included

### `feedback_history` Table
- Audit trail of all feedback submissions
- Tracks confidence changes over time
- Used for analytics and ML training

### Indexes
- Fast lookups by service, severity, status, date
- Supports dashboard filtering and sorting

### Views
- `incident_stats`: Dashboard statistics aggregation

---

## 🔐 Environment Variables

**Required:**
```
DATABASE_URL=postgresql://[connection-string]
```

**Optional:**
```
NODE_ENV=development          # or 'production'
PORT=5000                     # backend port
LOG_LEVEL=debug               # or 'info', 'error'
```

---

## 🚦 Common Operations

### Create New Incident
```bash
curl -X POST http://localhost:5000/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Service Down",
    "description": "Payment service not responding",
    "service": "payment-service",
    "error": "Connection timeout",
    "severity": "critical",
    "status": "open"
  }'
```

### Get All Incidents
```bash
curl http://localhost:5000/incidents
```

### Get Specific Incident
```bash
curl http://localhost:5000/incidents/1
```

### Update Incident
```bash
curl -X PUT http://localhost:5000/incidents/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "status": "resolved"
  }'
```

### Delete Incident
```bash
curl -X DELETE http://localhost:5000/incidents/1
```

### Analyze Incident (AI)
```bash
curl -X POST http://localhost:5000/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database Connection Pool Exhausted",
    "description": "Payment service failing with connection pool errors during peak traffic"
  }'
```

### Search Incidents
```bash
curl "http://localhost:5000/search?q=database"
```

### Find Similar Incidents
```bash
curl http://localhost:5000/similar/1
```

### Submit Feedback
```bash
curl -X POST http://localhost:5000/feedback/1 \
  -H "Content-Type: application/json" \
  -d '{"useful": true}'
```

---

## 🔄 Workflow

1. **Start Backend**: `npm start` in backend folder
2. **Start Frontend**: `npm run dev` in frontend folder
3. **Access App**: http://localhost:8443
4. **Dashboard**: Shows incidents from database
5. **Analyze**: Click "Analyze Latest Incident" to add new data
6. **View Details**: Click incident row to see full details
7. **Give Feedback**: Thumbs up/down updates confidence
8. **Search**: Chat agent searches database for similar issues

---

## 📝 Next Steps

- [ ] Choose your database (PostgreSQL/CockroachDB/Supabase)
- [ ] Configure .env with connection string
- [ ] Run schema_setup.sql
- [ ] Test /db-test endpoint
- [ ] Start backend and frontend
- [ ] Create and analyze incidents
- [ ] Monitor system health

**You're all set!** 🎉

