-- SkinVersus: skin insights, color palettes and admin editing.
-- Run this once in Supabase SQL Editor on an existing SkinVersus database.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

grant execute on function public.is_admin() to authenticated;

create table if not exists public.skin_colors (
  id uuid primary key default gen_random_uuid(),
  skin_id uuid not null references public.skins(id) on delete cascade,
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  percentage smallint check (percentage between 1 and 100),
  color_name text not null,
  is_primary boolean not null default false,
  source text not null default 'auto' check (source in ('auto', 'manual')),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (skin_id, source, sort_order)
);

create table if not exists public.skin_notes (
  id uuid primary key default gen_random_uuid(),
  skin_id uuid not null references public.skins(id) on delete cascade,
  type text not null check (type in ('float_tip', 'pattern_tip', 'combo_tip', 'rare_variant', 'warning', 'fun_fact')),
  title text not null check (char_length(title) between 2 and 120),
  content text not null check (char_length(content) between 3 and 1200),
  min_float double precision check (min_float is null or (min_float >= 0 and min_float <= 1)),
  max_float double precision check (max_float is null or (max_float >= 0 and max_float <= 1)),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skin_note_float_order check (min_float is null or max_float is null or min_float <= max_float)
);

create index if not exists skin_colors_skin_id_idx on public.skin_colors(skin_id);
create index if not exists skin_notes_skin_id_idx on public.skin_notes(skin_id);
create index if not exists skin_notes_priority_idx on public.skin_notes(skin_id, priority desc);

alter table public.skin_colors enable row level security;
alter table public.skin_notes enable row level security;

drop policy if exists "skin colors readable" on public.skin_colors;
create policy "skin colors readable" on public.skin_colors for select to anon, authenticated using (true);

drop policy if exists "skin notes readable" on public.skin_notes;
create policy "skin notes readable" on public.skin_notes for select to anon, authenticated using (true);

drop policy if exists "admins manage skin colors" on public.skin_colors;
create policy "admins manage skin colors" on public.skin_colors for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage skin notes" on public.skin_notes;
create policy "admins manage skin notes" on public.skin_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- After signing up / signing in with your admin account, run ONE of these examples:
-- update public.profiles set is_admin = true where id = '<your auth user uuid>';
-- or, in Supabase SQL Editor:
-- update public.profiles p set is_admin = true from auth.users u where p.id = u.id and u.email = 'you@example.com';
