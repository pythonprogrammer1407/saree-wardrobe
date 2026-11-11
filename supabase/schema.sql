-- Saree Wardrobe — database schema.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Every row belongs to the logged-in user; nobody else (and nobody logged out) can read it.

-- 1. Colour palette (keep in sync with src/lib/colors.ts)
create table if not exists public.colors (
  key   text primary key,
  name  text not null,
  hex   text not null,
  sort  int  not null
);

insert into public.colors (key, name, hex, sort) values
  ('red','Red','#b3202a',1),
  ('maroon','Maroon','#6d1a24',2),
  ('rani','Rani pink','#c2185b',3),
  ('pink','Pink','#e07a9a',4),
  ('orange','Orange','#e0782f',5),
  ('mustard','Mustard','#c9962b',6),
  ('olive','Olive','#6b6b3a',7),
  ('green','Green','#3f7d3a',8),
  ('bottlegreen','Bottle green','#1e4d36',9),
  ('seagreen','Sea green','#5bb8a0',10),
  ('teal','Teal','#1f7a78',11),
  ('peacock','Peacock blue','#0f6283',12),
  ('blue','Blue','#2f5aa8',13),
  ('navy','Navy','#1f2a4d',14),
  ('purple','Purple','#6a3d8f',15),
  ('cream','Cream','#efe4cc',16),
  ('white','White','#ffffff',17),
  ('grey','Grey','#8a8a8a',18),
  ('black','Black','#1a1a1a',19),
  ('gold','Gold','#c8a24a',20),
  ('silver','Silver','#c4c7cc',21),
  ('multi','Multi','#999999',22)
on conflict (key) do update set name = excluded.name, hex = excluded.hex, sort = excluded.sort;

-- 2. Sarees
create table if not exists public.sarees (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  fabric        text,
  weave         text,
  body_color    text references public.colors (key),
  border_color  text references public.colors (key),
  occasions     text[] not null default '{}',
  stored_in     text,
  blouse        text check (blouse in ('stitched', 'unstitched', 'none')),
  last_worn     date,
  source        text,          -- bought from / gifted by, year
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists sarees_owner_idx  on public.sarees (owner);
create index if not exists sarees_body_idx   on public.sarees (body_color);
create index if not exists sarees_border_idx on public.sarees (border_color);

-- 3. Photos (only the Cloudinary public_id is stored, never the image itself)
create table if not exists public.saree_images (
  id          uuid primary key default gen_random_uuid(),
  saree_id    uuid not null references public.sarees (id) on delete cascade,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  public_id   text not null,
  position    int  not null default 0,
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists saree_images_saree_idx on public.saree_images (saree_id, position);
create index if not exists saree_images_owner_idx on public.saree_images (owner);

-- 4. Keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists sarees_touch on public.sarees;
create trigger sarees_touch before update on public.sarees
  for each row execute function public.touch_updated_at();

-- 5. Row Level Security: logged-in owner only
alter table public.colors       enable row level security;
alter table public.sarees       enable row level security;
alter table public.saree_images enable row level security;

drop policy if exists "colors readable when logged in" on public.colors;
create policy "colors readable when logged in" on public.colors
  for select to authenticated using (true);

drop policy if exists "own sarees" on public.sarees;
create policy "own sarees" on public.sarees
  for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists "own images" on public.saree_images;
create policy "own images" on public.saree_images
  for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- Later phase ("Find this saree"): enable the pgvector extension and add an
-- embedding column to saree_images. Not needed yet.
