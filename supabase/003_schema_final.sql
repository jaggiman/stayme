-- ============================================================
-- FindMyRoomie Schema Final Migration (003)
-- Run this after schema.sql, schema_patch.sql, schema_v2.sql,
-- and 002_mvp_backend.sql
-- ============================================================

-- 1. profiles — add missing columns
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists occupation_status text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text check (role in ('seeker','owner','both'));
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- 2. profile_preferences — add missing lifestyle fields
alter table public.profile_preferences add column if not exists budget_min integer;
alter table public.profile_preferences add column if not exists move_in_to date;
alter table public.profile_preferences add column if not exists pets_preference text;
alter table public.profile_preferences add column if not exists cleanliness_level text;
alter table public.profile_preferences add column if not exists guest_frequency text;
alter table public.profile_preferences add column if not exists wfh_frequency text;
alter table public.profile_preferences add column if not exists alcohol_preference text;

-- 3. listings — add missing fields
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists deposit integer;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists photos text[];
alter table public.listings add column if not exists existing_roommates integer default 0;
alter table public.listings add column if not exists occupancy_type text;
alter table public.listings add column if not exists updated_at timestamptz;

-- 4. listing_preferences — add missing fields
alter table public.listing_preferences add column if not exists pets_preference text;
alter table public.listing_preferences add column if not exists cleanliness_level text;
alter table public.listing_preferences add column if not exists sleep_schedule text;
alter table public.listing_preferences add column if not exists alcohol_preference text;
alter table public.listing_preferences add column if not exists must_haves text[];
alter table public.listing_preferences add column if not exists deal_breakers text[];

-- 5. requests — add note and blocked status
alter table public.requests add column if not exists note text;
alter table public.requests add column if not exists blocked boolean default false;

-- 6. Update handle_new_user trigger to preserve role/onboarding fields
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, onboarding_complete)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1),
      'New roomie'
    ),
    false
  )
  on conflict (id) do nothing;

  insert into public.profile_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. RLS Policies for profiles (if missing)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'users read own profile'
  ) then
    create policy "users read own profile" on public.profiles for select using (auth.uid() = id);
    create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end
$$;

-- Public profile reads for matches (only visible profiles)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'public read visible profiles'
  ) then
    create policy "public read visible profiles" on public.profiles for select using (visibility = true);
  end if;
end
$$;

-- 8. RLS for listing updates (owner only)
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'listings' and policyname = 'owner update listing'
  ) then
    create policy "owner update listing" on public.listings
      for update using (auth.uid() = owner_profile_id)
      with check (auth.uid() = owner_profile_id);
    create policy "owner delete listing" on public.listings
      for delete using (auth.uid() = owner_profile_id);
  end if;
end
$$;

-- 9. Storage bucket for avatars (run in Supabase dashboard if not done)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('listings', 'listings', true) on conflict do nothing;

-- Done
