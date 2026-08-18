# CockroachDB / Database Configuration Guide

## Quick Start

### Option 1: Local PostgreSQL (Recommended for Development)

**1. Install PostgreSQL**
- Download from https://www.postgresql.org/download/
- Or use WSL: `apt-get install postgresql postgresql-contrib`

**2. Start PostgreSQL**
```bash
# Windows (using installed service)
net start postgresql-x64-XX

# Linux/WSL
sudo service postgresql start

# Or with Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

**3. Create Database**
```bash
psql -U postgres -c "CREATE DATABASE ai_devops_agent;"
```

**4. Update .env file**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_devops_agent
```

**5. Run Schema Setup**
```bash
psql -U postgres -d ai_devops_agent -f schema_setup.sql
```

---

### Option 2: CockroachDB Cloud (Recommended for Production)

**1. Sign up at https://www.cockroachlabs.com/get-started**

**2. Create a free cluster**
- Region: Choose closest to you
- Tier: Free (good for testing)

**3. Get Connection String**
- Go to Cluster → Connection info
- Copy the connection string (looks like: `postgresql://[user]:[password]@[cluster].crdb.io:26257/...`)

**4. Update .env file**
```
DATABASE_URL=postgresql://[user]:[password]@[cluster].crdb.io:26257/[database]?sslmode=require
```

**5. Create Database and Schema**
```bash
# Using psql or any PostgreSQL client
psql "[connection_string]" -f schema_setup.sql
```

---

### Option 3: Supabase (Free PostgreSQL with pgvector)

**1. Sign up at https://supabase.com**

**2. Create New Project**
- Choose PostgreSQL
- Region: Closest to you
- Free tier available

**3. Get Connection String**
- Project Settings → Database → Connection string (URI mode)
- Copy the connection string

**4. Update .env file**
```
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

**5. Run Schema Setup**
- Go to SQL Editor in Supabase
- Create new query
- Copy contents of schema_setup.sql
- Run

---

## Testing the Connection

### 1. Test Backend Database Connection
```bash
cd backend
npm install  # if not already done
node index.js
```

You should see:
```
DATABASE_URL loaded: true
Server running on http://localhost:5000
```

### 2. Test Database Test Endpoint
```bash
curl http://localhost:5000/db-test
```

Should return:
```json
{
  "message": "CockroachDB connected successfully!",
  "time": "2026-08-18T11:45:00Z"
}
```

### 3. Test Incidents Endpoint
```bash
curl http://localhost:5000/incidents
```

Should return sample incidents as JSON array.

---

## Troubleshooting

### "Cannot find module 'pg'"
```bash
cd backend
npm install pg
```

### "ECONNREFUSED: Connection refused"
- Database is not running
- Check DATABASE_URL in .env file
- Try test connection from command line with psql

### "password authentication failed"
- Wrong password in DATABASE_URL
- Default PostgreSQL user is `postgres`
- Default password is what you set during install

### "database does not exist"
- Run the database creation command
- For CockroachDB: create database with `CREATE DATABASE ai_devops_agent;`

---

## Data Sample

The schema includes 3 sample incidents for testing:
- Payment Service Database Timeout (critical, resolved)
- API Gateway Elasticsearch Timeout (high, resolved)
- Redis Stream Write Timeout (medium, open)

These are automatically created when schema_setup.sql is run.

---

## Environment Variables (.env)

Required:
```
DATABASE_URL=postgresql://[connection_string]
```

Optional:
```
NODE_ENV=development  # or production
PORT=5000             # defaults to 5000
```

---

## Next Steps

1. **Choose your database** (PostgreSQL, CockroachDB, or Supabase)
2. **Update .env** with connection string
3. **Run schema_setup.sql** to create tables
4. **Test connection** with /db-test endpoint
5. **Start frontend** - incidents will now load from database

---

## Database Schema Overview

### incidents table
- Core table storing all incident analysis
- 15 columns: id, title, description, service, error, severity, status, root_cause, ai_category, ai_recommendation, confidence, feedback, feedback_at, times_seen, created_at, updated_at

### feedback_history table
- Audit trail of all confidence updates
- 5 columns: id, incident_id, useful, old_confidence, new_confidence, created_at

### Indexes
- Fast queries by service, severity, status, date
- Supports sorting and filtering on dashboard

### Views
- incident_stats: Dashboard statistics (total, resolved, critical, avg confidence)

---

## Security Notes

- Keep .env file in .gitignore (don't commit passwords!)
- Use SSL for production CockroachDB connections
- Rotate database passwords regularly
- For Supabase: Use service_role key only on backend, never on frontend

