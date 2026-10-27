-- Isolated BigBrew workspace. Requires pgcrypto in the extensions schema.
-- Intentionally omits any shared key or key hash.
create schema if not exists bigbrew_private;
revoke all on schema bigbrew_private from public, anon, authenticated;
create table if not exists bigbrew_private.access_config (
 id smallint primary key check (id=1),
 key_sha256 text not null check (length(key_sha256)=64),
 updated_at timestamptz not null default now()
);
revoke all on bigbrew_private.access_config from public, anon, authenticated;
create or replace function bigbrew_private.authorized()
returns boolean language plpgsql stable security definer set search_path=''
as $$
declare headers jsonb; supplied text; expected text;
begin
 headers := nullif(pg_catalog.current_setting('request.headers',true),'')::jsonb;
 supplied := headers ->> 'x-bigbrew-key';
 if supplied is null or length(supplied)<24 or length(supplied)>256 then return false; end if;
 select key_sha256 into expected from bigbrew_private.access_config where id=1;
 return expected is not null and expected =
   pg_catalog.encode(extensions.digest(pg_catalog.convert_to(supplied,'UTF8'),'sha256'),'hex');
end;
$$;
revoke all on function bigbrew_private.authorized() from public, anon, authenticated;
grant usage on schema bigbrew_private to anon;
grant execute on function bigbrew_private.authorized() to anon;
create table if not exists public.bigbrew_workspace (
 id text primary key,
 revision integer not null default 1 check (revision>0),
 data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.bigbrew_workspace enable row level security;
revoke all on public.bigbrew_workspace from public, anon, authenticated;
grant select, insert, update on public.bigbrew_workspace to anon;
drop policy if exists bigbrew_read on public.bigbrew_workspace;
drop policy if exists bigbrew_create on public.bigbrew_workspace;
drop policy if exists bigbrew_update on public.bigbrew_workspace;
create policy bigbrew_read on public.bigbrew_workspace for select to anon
 using ((select bigbrew_private.authorized()));
create policy bigbrew_create on public.bigbrew_workspace for insert to anon
 with check ((select bigbrew_private.authorized()));
create policy bigbrew_update on public.bigbrew_workspace for update to anon
 using ((select bigbrew_private.authorized()))
 with check ((select bigbrew_private.authorized()));
