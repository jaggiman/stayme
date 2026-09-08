-- Roomie V2 Schema Patch
-- Adds favorites table, avatar_url, and dynamic scoring RPCs

-- 1. Profiles update
alter table public.profiles add column if not exists avatar_url text;

-- 2. Favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(profile_id, listing_id)
);
alter table public.favorites enable row level security;
create policy "users manage own favorites" on public.favorites for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- 3. Match finding RPC for Seekers (Finds Listings)
create or replace function public.find_listing_matches(p_city text, p_max_rent integer default null)
returns table (
  listing_id uuid, owner_profile_id uuid, owner_name text, locality text, city text,
  rent integer, available_from date, open_spots smallint, room_type text, amenities text[],
  score numeric, reasons text[]
) as $$
begin
  return query
  select 
    l.id as listing_id, l.owner_profile_id, p.display_name as owner_name, l.locality, l.city, l.rent, l.available_from,
    l.open_spots, l.room_type, l.amenities,
    -- Calculate Score
    (
      100 
      - case when lp.food_preference != pp.food_preference and lp.food_preference != 'flexible' and pp.food_preference != 'flexible' then 15 else 0 end
      - case when lp.smoking_preference != pp.smoking_preference and lp.smoking_preference != 'flexible' and pp.smoking_preference != 'flexible' then 20 else 0 end
      - case when lp.noise_level != pp.noise_level then 10 else 0 end
    )::numeric as score,
    -- Construct Reasons array
    array_remove(array[
      'Matches your location and budget',
      case when lp.food_preference = pp.food_preference and pp.food_preference != 'flexible' then 'Food preferences align' else null end,
      case when lp.smoking_preference = pp.smoking_preference and pp.smoking_preference != 'flexible' then 'Smoking preferences align' else null end,
      case when lp.food_preference != pp.food_preference and lp.food_preference != 'flexible' and pp.food_preference != 'flexible' then 'Mismatched food preferences' else null end,
      case when lp.smoking_preference != pp.smoking_preference and lp.smoking_preference != 'flexible' and pp.smoking_preference != 'flexible' then 'Mismatched smoking preferences' else null end,
      case when lp.noise_level != pp.noise_level then 'Mismatched noise level expectations' else null end
    ], null)::text[] as reasons
  from public.listings l
  join public.profiles p on l.owner_profile_id = p.id
  join public.listing_preferences lp on l.id = lp.listing_id
  join public.profile_preferences pp on pp.profile_id = auth.uid()
  where l.status = 'published'
  and l.city = p_city
  and (p_max_rent is null or l.rent <= p_max_rent)
  order by score desc, l.created_at desc
  limit 10;
end;
$$ language plpgsql security definer;


-- 4. Match finding RPC for Owners (Finds Seekers)
create or replace function public.find_seeker_matches(p_listing_id uuid)
returns table (
  seeker_profile_id uuid, seeker_name text, city text,
  budget_max integer, move_in_from date,
  score numeric, reasons text[]
) as $$
declare
  l_rent integer;
  l_city text;
  lp_food text;
  lp_smoking text;
  lp_noise text;
begin
  -- Get the listing details
  select rent, city into l_rent, l_city from public.listings where id = p_listing_id;
  select food_preference, smoking_preference, noise_level into lp_food, lp_smoking, lp_noise from public.listing_preferences where listing_id = p_listing_id;

  return query
  select 
    p.id as seeker_profile_id, p.display_name as seeker_name, p.city,
    pp.budget_max, pp.move_in_from,
    -- Calculate Score
    (
      100 
      - case when lp_food != pp.food_preference and lp_food != 'flexible' and pp.food_preference != 'flexible' then 15 else 0 end
      - case when lp_smoking != pp.smoking_preference and lp_smoking != 'flexible' and pp.smoking_preference != 'flexible' then 20 else 0 end
      - case when lp_noise != pp.noise_level then 10 else 0 end
    )::numeric as score,
    -- Construct Reasons array
    array_remove(array[
      'Budget and location align',
      case when lp_food = pp.food_preference and pp.food_preference != 'flexible' then 'Food preferences align' else null end,
      case when lp_smoking = pp.smoking_preference and pp.smoking_preference != 'flexible' then 'Smoking preferences align' else null end,
      case when lp_food != pp.food_preference and lp_food != 'flexible' and pp.food_preference != 'flexible' then 'Mismatched food preferences' else null end,
      case when lp_smoking != pp.smoking_preference and lp_smoking != 'flexible' and pp.smoking_preference != 'flexible' then 'Mismatched smoking preferences' else null end,
      case when lp_noise != pp.noise_level then 'Mismatched noise level expectations' else null end
    ], null)::text[] as reasons
  from public.profile_preferences pp
  join public.profiles p on pp.profile_id = p.id
  where pp.budget_max >= l_rent
  and p.city = l_city
  and p.visibility = true
  order by score desc
  limit 10;
end;
$$ language plpgsql security definer;
