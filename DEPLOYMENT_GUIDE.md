# Complete Database & Deployment Setup Guide

## Overview

This guide covers setting up the AI DevOps Agent backend database in 3 different ways:
1. **Local PostgreSQL** (Recommended for development)
2. **Docker Compose** (Recommended for testing)
3. **CockroachDB Cloud** (Recommended for production)

---

## Option 1: Local PostgreSQL Setup ⭐ (Easiest for Dev)

### Windows
1. **Download PostgreSQL:** https://www.postgresql.org/download/windows/
2. **Run installer** - use default settings
3. **Remember the password** you set for postgres user
4. **Create database:**
   ```bash
   psql -U postgres
   CREATE DATABASE ai_devops_agent;
   \q
   ```
5. **Setup schema:**
   ```bash
   cd backend
   psql -U postgres -d ai_devops_agent -f schema_setup.sql
   ```
6. **Update .env:**
   ```
   DATABASE_URL=postgresql://postgres:[your-password]@localhost:5432/ai_devops_agent
   ```

### macOS
```bash
# Install using Homebrew
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create database
createdb ai_devops_agent

# Setup schema
cd backend
psql ai_devops_agent -f schema_setup.sql

# Update .env
# DATABASE_URL=postgresql://[your-username]@localhost:5432/ai_devops_agent
```

### Linux/WSL
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Create database
sudo -u postgres createdb ai_devops_agent

# Setup schema
cd backend
sudo -u postgres psql ai_devops_agent -f schema_setup.sql

# Update .env
# DATABASE_URL=postgresql://postgres@localhost:5432/ai_devops_agent
```

**Verify it works:**
```bash
cd backend
npm install
node index.js
# Should show: "DATABASE_URL loaded: true"
# Then: "Server running on http://localhost:5000"
```

---

## Option 2: Docker Compose Setup 🐳 (Best for Testing)

### Prerequisites
- Docker Desktop (https://www.docker.com/products/docker-desktop)

### Setup (5 minutes)

**1. Navigate to project root:**
```bash
cd c:\Users\Srinithi\ai_devops_agent
```

**2. Start services:**
```bash
docker-compose up -d
```

**3. Wait for database to initialize** (first time takes ~30 seconds)
```bash
docker-compose logs postgres
# Look for: "database system is ready to accept connections"
```

**4. Verify connection:**
```bash
curl http://localhost:5000/db-test
```

**Should return:**
```json
{
  "message": "CockroachDB connected successfully!",
  "time": "2026-08-18T..."
}
```

### Common Docker Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View just backend logs
docker-compose logs -f backend

# Connect to database directly
docker-compose exec postgres psql -U postgres -d ai_devops_agent

# Rebuild containers (after code changes)
docker-compose up -d --build
```

### ⚠️ .env Not Needed with Docker
Docker Compose automatically sets:
```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_devops_agent
```

---

## Option 3: CockroachDB Cloud Setup ☁️ (Production)

### Step 1: Create Account
1. Go to https://www.cockroachlabs.com/get-started
2. Sign up with email
3. Verify email

### Step 2: Create Free Cluster
1. Click "Create Cluster"
2. Choose "Free" tier (includes 5 GB storage)
3. Select your region (pick closest to you)
4. Click "Create cluster"

### Step 3: Create SQL User
1. Go to "SQL Users" tab
2. Click "Create"
3. Enter username (e.g., `admin`)
4. Generate password
5. **Copy and save the password** (won't be shown again)

### Step 4: Get Connection String
1. Click "Connect" button
2. Select "Connection string"
3. Choose "General connection string"
4. Copy the full connection string

### Step 5: Create Database
1. Download CockroachDB client: https://www.cockroachlabs.com/get-started
   OR use any PostgreSQL client (psql, DBeaver, etc.)
2. Connect using the connection string from Step 4
3. Run schema setup:
   ```sql
   -- Copy contents of schema_setup.sql and run
   ```

### Step 6: Configure .env
```bash
# Edit backend/.env
DATABASE_URL=postgresql://[username]:[password]@[cluster].crdb.io:26257/defaultdb?sslmode=require
```

### Advantages
- ✅ Free tier (up to 5GB)
- ✅ Managed - no maintenance needed
- ✅ Automatic backups
- ✅ High availability
- ✅ Can scale easily

---

## Option 4: Supabase Setup (PostgreSQL + pgvector)

### Step 1: Sign Up
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with email or GitHub

### Step 2: Create Project
1. Click "New project"
2. Enter project name
3. Generate password
4. Choose free tier
5. Choose region
6. Click "Create new project"

### Step 3: Get Connection String
1. Go to "Project Settings"
2. Click "Database"
3. Copy "Connection string (URI mode)"
4. Replace `[YOUR-PASSWORD]` with your actual password

### Step 4: Setup Schema
1. In Supabase dashboard, go to "SQL Editor"
2. Click "New query"
3. Copy contents of schema_setup.sql
4. Paste and click "Run"

### Step 5: Update .env
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### Advantages
- ✅ Free tier included
- ✅ Includes pgvector extension (for embeddings)
- ✅ Good UI for database management
- ✅ Realtime features available

---

## Testing All Setup Options

After setting up, run these tests to verify:

### Test 1: Backend Responds
```bash
curl http://localhost:5000/
# Expected: "Backend is running 🚀"
```

### Test 2: Database Connected
```bash
curl http://localhost:5000/db-test
# Expected: JSON with current timestamp
```

### Test 3: Sample Data Loaded
```bash
curl http://localhost:5000/incidents
# Expected: Array with 3 sample incidents
```

### Test 4: Create New Incident
```bash
curl -X POST http://localhost:5000/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test incident","service":"test-svc","error":"Test error","severity":"low","status":"open"}'
# Expected: Newly created incident object
```

### Test 5: Search Works
```bash
curl "http://localhost:5000/search?q=Database"
# Expected: Array of matching incidents
```

---

## Comparison Table

| Feature | Local | Docker | CockroachDB | Supabase |
|---------|-------|--------|-------------|----------|
| Setup Time | 10 min | 5 min | 15 min | 10 min |
| Cost | Free | Free | Free (5GB) | Free (10GB) |
| Maintenance | Manual | Docker | None | None |
| Best For | Dev | Testing | Prod | Prod+ML |
| Requires Install | Yes | Docker only | No | No |
| Data Persistence | Local disk | Docker volume | Cloud | Cloud |

---

## Troubleshooting

### "Database connection refused"
**Local PostgreSQL:**
- Ensure PostgreSQL service is running
- Check .env DATABASE_URL
- Try: `psql -U postgres` to verify

**Docker:**
- Check docker-compose logs: `docker-compose logs postgres`
- Ensure database is ready: `docker-compose ps`
- Rebuild: `docker-compose down && docker-compose up -d`

**CockroachDB Cloud:**
- Verify connection string has correct password
- Check cluster is running in console
- Ensure firewall allows connections

### "Table does not exist"
- Schema setup didn't run successfully
- Run schema_setup.sql again
- For Docker: `docker-compose down && docker-compose up -d` (will re-run schema)

### "Connection pooling issues"
- Reduce connection pool size in .env if needed
- Check database resource limits
- For Supabase: Enable connection pooling in settings

### Node won't connect
1. Verify .env exists: `cat backend/.env`
2. Verify DATABASE_URL set: `echo $DATABASE_URL`
3. Restart backend: `node index.js`
4. Check for errors: `npm install pg`

---

## Production Checklist

Before deploying to production:

- [ ] Use CockroachDB Cloud or similar managed service
- [ ] Set strong database password
- [ ] Enable SSL (required for CockroachDB)
- [ ] Set NODE_ENV=production
- [ ] Configure database backups
- [ ] Set up monitoring
- [ ] Configure connection pooling
- [ ] Test failover/recovery
- [ ] Keep .env in .gitignore
- [ ] Use secrets manager for passwords

---

## Quick Reference

### Local PostgreSQL
```bash
# Start
brew services start postgresql@15  # macOS
sudo service postgresql start      # Linux

# Verify
psql -U postgres -c "SELECT version();"

# Create DB
psql -U postgres -c "CREATE DATABASE ai_devops_agent;"

# Setup schema
psql -U postgres -d ai_devops_agent -f schema_setup.sql
```

### Docker
```bash
# Start everything
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

### Backend
```bash
# Install deps
npm install

# Start server
node index.js

# Test
curl http://localhost:5000/db-test
```

---

## Next Steps

1. ✅ Choose your database option
2. ✅ Follow setup instructions
3. ✅ Update backend/.env
4. ✅ Run schema_setup.sql
5. ✅ Start backend: `node index.js`
6. ✅ Test with /db-test
7. ✅ Start frontend: `npm run dev`
8. ✅ Access http://localhost:8443
9. ✅ Create and analyze incidents!

---

**Questions?** Check the QUICK_START.md or DATABASE_SETUP.md for more details.

