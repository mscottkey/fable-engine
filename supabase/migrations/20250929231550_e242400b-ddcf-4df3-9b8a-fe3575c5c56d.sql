-- Create enums for genre and difficulty
create type genre as enum (
  'Fantasy','Sci-Fi','Modern','Horror','Historical','Post-Apocalyptic','Space Opera','Urban Fantasy'
);

create type difficulty_label as enum ('Easy','Standard','Hard');

-- Create profiles table (linked to auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_pronouns text,
  default_voice_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create campaign_seeds table
create table if not exists public.campaign_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  genre genre not null,
  scenario_title text not null,
  scenario_description text not null,
  seed bigint not null, -- deterministic builder seed
  name text not null,   -- generated title
  setting text not null,
  notable_locations jsonb not null,  -- string[]
  tone_vibe text not null,
  tone_levers jsonb not null,        -- {pace,danger,morality,scale}
  difficulty_label difficulty_label not null,
  difficulty_desc text not null,
  hooks jsonb not null,              -- string[]
  created_at timestamptz not null default now()
);

-- Create games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_id uuid not null references public.campaign_seeds(id) on delete cascade,
  name text not null,           -- duplicate for convenience
  status text not null default 'setup', -- future: 'play','archived'
  created_at timestamptz not null default now()
);

-- Create indexes for common lookups
create index on public.profiles (created_at);
create index on public.campaign_seeds (user_id, created_at desc);
create index on public.games (user_id, created_at desc);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.campaign_seeds enable row level security;
alter table public.games enable row level security;

-- PROFILES policies
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- CAMPAIGN_SEEDS policies
create policy "seeds_select_own" on public.campaign_seeds
  for select using (auth.uid() = user_id);
create policy "seeds_insert_own" on public.campaign_seeds
  for insert with check (auth.uid() = user_id);
create policy "seeds_update_own" on public.campaign_seeds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "seeds_delete_own" on public.campaign_seeds
  for delete using (auth.uid() = user_id);

-- GAMES policies
create policy "games_select_own" on public.games
  for select using (auth.uid() = user_id);
create policy "games_insert_own" on public.games
  for insert with check (auth.uid() = user_id);
create policy "games_update_own" on public.games
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "games_delete_own" on public.games
  for delete using (auth.uid() = user_id);

-- Create trigger function for updating updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for profiles updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at_column();