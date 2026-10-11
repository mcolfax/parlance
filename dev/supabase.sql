-- The web version's database (Supabase project "Parlance", applied as migration parlance_documents).
-- One document store with the same paths and access rules as the Claude artifact:
--   content/<id>              read: anyone           write: owner
--   proposals/<id>            read: owner            write: owner
--   feedback/<id>             read: owner            write: owner
--   feedback/<self>           read/write: that signed-in person
--   data/users/<self>/<slice> read/write: that signed-in person only
-- Clients never touch the tables directly: every read and write goes through the functions below (js/core/host.js).
-- To make someone an owner (Studio, live content), after they have signed in once:
--   insert into public.owners (user_id) select id from auth.users where email = '<their email>';

create table public.docs (
  path text primary key
    check (path ~ '^[A-Za-z0-9_.~:@+-]{1,200}(/[A-Za-z0-9_.~:@+-]{1,200}){1,14}$'
           and array_length(string_to_array(path, '/'), 1) % 2 = 0),
  coll text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
create index docs_coll_idx on public.docs (coll);

create table public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.docs enable row level security;
alter table public.owners enable row level security;
alter table public.profiles enable row level security;
revoke all on public.docs, public.owners, public.profiles from anon, authenticated;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.owners o where o.user_id = auth.uid());
$$;

create function public.can_read(p text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare s text[] := string_to_array(p, '/'); me text := auth.uid()::text; n int := array_length(s, 1);
begin
  if s[1] = 'content' and n = 2 then return true; end if;
  if s[1] = 'data' and s[2] = 'users' and n = 4 and me is not null and s[3] = me then return true; end if;
  if s[1] = 'feedback' and n = 2 and me is not null and s[2] = me then return true; end if;
  if s[1] in ('proposals', 'feedback') and n = 2 then return public.is_owner(); end if;
  return false;
end $$;

create function public.can_write(p text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare s text[] := string_to_array(p, '/'); me text := auth.uid()::text; n int := array_length(s, 1);
begin
  if me is null then return false; end if;
  if s[1] = 'data' and s[2] = 'users' and n = 4 and s[3] = me then return true; end if;
  if s[1] = 'feedback' and n = 2 and s[2] = me then return true; end if;
  if s[1] in ('content', 'proposals', 'feedback') and n = 2 then return public.is_owner(); end if;
  return false;
end $$;

create function public.doc_get(p text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_read(p) then raise exception 'not allowed to read %', p using errcode = '42501'; end if;
  return (select d.data from public.docs d where d.path = p);
end $$;

create function public.doc_list(c text) returns table (path text, data jsonb)
language sql stable security definer set search_path = '' as $$
  select d.path, d.data from public.docs d where d.coll = c and public.can_read(d.path) order by d.path;
$$;

create function public.doc_set(p text, d jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_write(p) then raise exception 'not allowed to write %', p using errcode = '42501'; end if;
  if octet_length(d::text) > 1000000 then raise exception 'document too large' using errcode = '54000'; end if;
  insert into public.docs (path, coll, data, updated_at)
  values (p, regexp_replace(p, '/[^/]+$', ''), d, now())
  on conflict on constraint docs_pkey do update set data = excluded.data, updated_at = now();
end $$;

create function public.doc_update(p text, d jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_write(p) then raise exception 'not allowed to write %', p using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'update must be an object' using errcode = '22023'; end if;
  update public.docs x set data = x.data || d, updated_at = now() where x.path = p;
  if not found then raise exception 'no document at %', p using errcode = 'P0002'; end if;
end $$;

create function public.profile_set(n text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  insert into public.profiles (id, name, updated_at) values (auth.uid(), left(coalesce(n, ''), 80), now())
  on conflict on constraint profiles_pkey do update set name = excluded.name, updated_at = now();
end $$;

create function public.profile_names(ids text[]) returns table (id text, name text)
language sql stable security definer set search_path = '' as $$
  select p.id::text, p.name from public.profiles p where public.is_owner() and p.id::text = any (ids);
$$;

revoke all on function public.is_owner(), public.can_read(text), public.can_write(text), public.doc_get(text), public.doc_list(text),
  public.doc_set(text, jsonb), public.doc_update(text, jsonb), public.profile_set(text), public.profile_names(text[]) from public, anon, authenticated;
grant execute on function public.doc_get(text), public.doc_list(text) to anon, authenticated;
grant execute on function public.doc_set(text, jsonb), public.doc_update(text, jsonb), public.is_owner(),
  public.profile_set(text), public.profile_names(text[]) to authenticated;
