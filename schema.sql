-- Stage 4: Incident Memory (Database)
-- Run this in the Supabase SQL Editor (or any Postgres instance with pgvector available)

-- 1. Enable the vector extension (one-time, per database)
create extension if not exists vector;

-- 2. Core incidents table
create table if not exists incidents (
    id           uuid primary key default gen_random_uuid(),
    service      text not null,
    error        text not null,
    root_cause   text,
    fix          text,
    confidence   numeric default 50 check (confidence >= 0 and confidence <= 100),
    severity     text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
    embedding    vector(384),           -- 384 = output size of all-MiniLM-L6-v2
    times_seen   integer default 1,     -- bumped when a near-duplicate arrives (Stage 5)
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

-- 3. Speed up similarity search as the table grows (Stage 5)
create index if not exists incidents_embedding_idx
    on incidents using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

create index if not exists incidents_service_idx on incidents (service);
create index if not exists incidents_created_at_idx on incidents (created_at desc);

-- 4. Feedback log (Stage 7 groundwork) — keeps full history instead of just
--    overwriting confidence, so the "learning loop" is auditable in the demo.
create table if not exists feedback (
    id           uuid primary key default gen_random_uuid(),
    incident_id  uuid references incidents(id) on delete cascade,
    useful       boolean not null,
    created_at   timestamptz default now()
);

-- 5. Auto-update `updated_at` on every row change — small touch, makes the
--    "memory that evolves" narrative concrete in the DB itself.
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists incidents_set_updated_at on incidents;
create trigger incidents_set_updated_at
    before update on incidents
    for each row execute function set_updated_at();

-- 6. Memory Dashboard stats view (Stage 8 pulls this directly — zero
--    aggregation logic needed in the backend, which is a nice thing to say
--    out loud during Q&A: "the database itself understands its own memory").
create or replace view incident_stats as
select
    count(*)                                            as total_incidents,
    round(avg(confidence), 1)                            as avg_confidence,
    count(*) filter (where severity = 'critical')         as critical_count,
    count(distinct service)                               as services_covered,
    round(avg(times_seen), 2)                             as avg_recurrence,
    (select service from incidents group by service order by count(*) desc limit 1) as top_service
from incidents;
