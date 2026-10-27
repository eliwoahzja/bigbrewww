-- Branchwork live workspace schema (Postgres / Neon).
-- One row per branch workspace. The application validates the JSON payload
-- before writing, and every update is guarded by the revision it read.

create table if not exists branchwork_workspace (
  id          text primary key,
  revision    integer not null default 1 check (revision > 0),
  data        jsonb   not null,
  updated_at  timestamptz not null default now()
);

-- The API only ever selects by primary key; this index is for operators
-- inspecting recency directly in SQL.
create index if not exists branchwork_workspace_updated_at
  on branchwork_workspace (updated_at desc);
