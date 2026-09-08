-- Run in the Supabase SQL editor. This is the initial MVP data shape.
create extension if not exists vector;
create type public.listing_status as enum ('draft','published','paused','filled','removed');
create type public.request_status as enum ('pending','accepted','declined','blocked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  city text, occupation_status text, bio text, visibility boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  budget_min integer, budget_max integer, preferred_localities text[] default '{}',
  move_in_from date, move_in_to date, food_preference text, smoking_preference text,
  pets_preference text, sleep_schedule text, noise_level text, cleanliness_level text,
  lifestyle_text text, deal_breakers text, embedding vector(1536), embedding_version text,
  updated_at timestamptz not null default now()
);
create table public.listings (
  id uuid primary key default gen_random_uuid(), owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.listing_status not null default 'draft', locality text not null, city text not null,
  rent integer not null check (rent > 0), deposit integer, available_from date not null,
  open_spots smallint not null check (open_spots > 0), existing_roommates smallint not null default 0,
  room_type text not null default 'private room', details text, amenities text[] default '{}',
  created_at timestamptz not null default now(), published_at timestamptz
);
create table public.listing_preferences (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  food_preference text, smoking_preference text, pets_preference text, sleep_schedule text,
  noise_level text, cleanliness_level text, house_rules text, roommate_preference_text text,
  embedding vector(1536), embedding_version text, updated_at timestamptz not null default now()
);
create table public.requests (
  id uuid primary key default gen_random_uuid(), sender_profile_id uuid not null references public.profiles(id),
  recipient_profile_id uuid not null references public.profiles(id), listing_id uuid references public.listings(id),
  status public.request_status not null default 'pending', note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(), responded_at timestamptz,
  unique(sender_profile_id, recipient_profile_id, listing_id)
);
create index listings_discovery_idx on public.listings(status, city, available_from, rent);
alter table public.profiles enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.listings enable row level security;
alter table public.listing_preferences enable row level security;
alter table public.requests enable row level security;
create policy "public profiles are discoverable" on public.profiles for select using (visibility or auth.uid() = id);
create policy "owners manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "owners manage own preferences" on public.profile_preferences for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "published listings are discoverable" on public.listings for select using (status = 'published' or auth.uid() = owner_profile_id);
create policy "owners manage own listings" on public.listings for all using (auth.uid() = owner_profile_id) with check (auth.uid() = owner_profile_id);
create policy "listing preferences follow listing visibility" on public.listing_preferences for select using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'published' or l.owner_profile_id = auth.uid())));
create policy "listing owners manage preferences" on public.listing_preferences for all using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_profile_id = auth.uid())));
create policy "request participants may read" on public.requests for select using (auth.uid() in (sender_profile_id, recipient_profile_id));
create policy "senders create requests" on public.requests for insert with check (auth.uid() = sender_profile_id);
create policy "recipients update requests" on public.requests for update using (auth.uid() = recipient_profile_id);
