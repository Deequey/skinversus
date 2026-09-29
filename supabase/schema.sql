create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(coalesce(new.email, 'player'), '@', 1)) || '-' || substr(new.id::text, 1, 6)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.skins (
  id uuid primary key default gen_random_uuid(),
  api_id text unique,
  slug text not null unique,
  name text not null,
  weapon_name text,
  finish_name text,
  category text,
  rarity_name text,
  rarity_color text,
  min_float double precision,
  max_float double precision,
  stattrak boolean not null default false,
  souvenir boolean not null default false,
  image_url text,
  market_hash_name text,
  price_usd numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skins_name_idx on public.skins using gin (to_tsvector('simple', name));
create index if not exists skins_weapon_idx on public.skins (weapon_name);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null unique,
  skin_a_id uuid not null references public.skins(id) on delete cascade,
  skin_b_id uuid not null references public.skins(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comparison_different_skins check (skin_a_id <> skin_b_id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparisons(id) on delete cascade,
  voter_token uuid not null,
  winner_skin_id uuid not null references public.skins(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comparison_id, voter_token)
);

create table if not exists public.skin_reactions (
  id uuid primary key default gen_random_uuid(),
  skin_id uuid not null references public.skins(id) on delete cascade,
  voter_token uuid not null,
  reaction smallint not null check (reaction in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (skin_id, voter_token)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  skin_id uuid not null references public.skins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 10),
  body text not null check (char_length(body) between 3 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (skin_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.skins enable row level security;
alter table public.comparisons enable row level security;
alter table public.votes enable row level security;
alter table public.skin_reactions enable row level security;
alter table public.reviews enable row level security;

create policy "profiles readable" on public.profiles for select to anon, authenticated using (true);
create policy "skins readable" on public.skins for select to anon, authenticated using (true);
create policy "comparisons readable" on public.comparisons for select to anon, authenticated using (true);
create policy "votes readable" on public.votes for select to anon, authenticated using (true);
create policy "reactions readable" on public.skin_reactions for select to anon, authenticated using (true);
create policy "reviews readable" on public.reviews for select to anon, authenticated using (true);
create policy "users insert own review" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own review" on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own review" on public.reviews for delete to authenticated using (auth.uid() = user_id);

create or replace function public.ensure_comparison(left_skin uuid, right_skin uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  a uuid;
  b uuid;
  key text;
  result_id uuid;
begin
  if left_skin = right_skin then
    raise exception 'A skin cannot be compared with itself';
  end if;

  if not exists(select 1 from public.skins where id = left_skin)
     or not exists(select 1 from public.skins where id = right_skin) then
    raise exception 'Skin not found';
  end if;

  a := least(left_skin, right_skin);
  b := greatest(left_skin, right_skin);
  key := a::text || ':' || b::text;

  insert into public.comparisons(pair_key, skin_a_id, skin_b_id)
  values (key, a, b)
  on conflict (pair_key) do update set pair_key = excluded.pair_key
  returning id into result_id;

  return result_id;
end;
$$;

grant execute on function public.ensure_comparison(uuid, uuid) to anon, authenticated;

create or replace function public.cast_vote(p_comparison_id uuid, p_winner_skin_id uuid, p_voter_token uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  c public.comparisons%rowtype;
begin
  select * into c from public.comparisons where id = p_comparison_id;
  if c.id is null then raise exception 'Comparison not found'; end if;
  if p_winner_skin_id <> c.skin_a_id and p_winner_skin_id <> c.skin_b_id then
    raise exception 'Winner is not part of this comparison';
  end if;

  insert into public.votes(comparison_id, voter_token, winner_skin_id)
  values (p_comparison_id, p_voter_token, p_winner_skin_id)
  on conflict (comparison_id, voter_token)
  do update set winner_skin_id = excluded.winner_skin_id, updated_at = now();
end;
$$;

grant execute on function public.cast_vote(uuid, uuid, uuid) to anon, authenticated;

create or replace function public.react_to_skin(p_skin_id uuid, p_reaction smallint, p_voter_token uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_reaction not in (-1, 1) then raise exception 'Invalid reaction'; end if;
  if not exists(select 1 from public.skins where id = p_skin_id) then raise exception 'Skin not found'; end if;

  insert into public.skin_reactions(skin_id, voter_token, reaction)
  values (p_skin_id, p_voter_token, p_reaction)
  on conflict (skin_id, voter_token)
  do update set reaction = excluded.reaction, updated_at = now();
end;
$$;

grant execute on function public.react_to_skin(uuid, smallint, uuid) to anon, authenticated;

create or replace view public.comparison_stats as
select
  c.id as comparison_id,
  c.skin_a_id,
  c.skin_b_id,
  count(v.id)::bigint as total_votes,
  count(v.id) filter (where v.winner_skin_id = c.skin_a_id)::bigint as a_votes,
  count(v.id) filter (where v.winner_skin_id = c.skin_b_id)::bigint as b_votes
from public.comparisons c
left join public.votes v on v.comparison_id = c.id
group by c.id, c.skin_a_id, c.skin_b_id;

grant select on public.comparison_stats to anon, authenticated;

create or replace view public.skin_reaction_stats as
select
  s.id as skin_id,
  count(r.id) filter (where r.reaction = 1)::bigint as likes,
  count(r.id) filter (where r.reaction = -1)::bigint as dislikes
from public.skins s
left join public.skin_reactions r on r.skin_id = s.id
group by s.id;

grant select on public.skin_reaction_stats to anon, authenticated;

create or replace view public.skin_review_stats as
select
  s.id as skin_id,
  count(r.id)::bigint as review_count,
  round(avg(r.rating)::numeric, 1) as average_rating
from public.skins s
left join public.reviews r on r.skin_id = s.id
group by s.id;

grant select on public.skin_review_stats to anon, authenticated;

create or replace view public.skin_rankings as
with battle_votes as (
  select c.skin_a_id as skin_id, count(v.id)::bigint as battle_votes
  from public.comparisons c left join public.votes v on v.comparison_id = c.id group by c.skin_a_id
  union all
  select c.skin_b_id as skin_id, count(v.id)::bigint as battle_votes
  from public.comparisons c left join public.votes v on v.comparison_id = c.id group by c.skin_b_id
),
battle_totals as (
  select skin_id, sum(battle_votes)::bigint as battle_votes from battle_votes group by skin_id
),
wins as (
  select winner_skin_id as skin_id, count(*)::bigint as battle_wins from public.votes group by winner_skin_id
),
reactions as (
  select skin_id,
    count(*) filter (where reaction = 1)::bigint as likes,
    count(*) filter (where reaction = -1)::bigint as dislikes
  from public.skin_reactions group by skin_id
)
select
  s.*,
  coalesce(w.battle_wins, 0)::bigint as battle_wins,
  coalesce(bt.battle_votes, 0)::bigint as battle_votes,
  coalesce(r.likes, 0)::bigint as likes,
  coalesce(r.dislikes, 0)::bigint as dislikes,
  round((
    0.65 * case when coalesce(bt.battle_votes,0) = 0 then 0.5 else coalesce(w.battle_wins,0)::numeric / bt.battle_votes end
    + 0.35 * case when coalesce(r.likes,0) + coalesce(r.dislikes,0) = 0 then 0.5 else coalesce(r.likes,0)::numeric / (r.likes + r.dislikes) end
  ) * 100, 1) as community_score
from public.skins s
left join battle_totals bt on bt.skin_id = s.id
left join wins w on w.skin_id = s.id
left join reactions r on r.skin_id = s.id;

grant select on public.skin_rankings to anon, authenticated;
