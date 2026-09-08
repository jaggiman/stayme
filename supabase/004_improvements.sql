-- ============================================================
-- FindMyRoomie Schema Improvements (004)
-- Run in Supabase SQL Editor after all previous migrations
-- ============================================================

-- 1. profiles — add gender column
alter table public.profiles add column if not exists gender text check (gender in ('Male','Female','Other'));

-- 2. profile_preferences — add co-gender preference
alter table public.profile_preferences add column if not exists co_gender_preference text check (co_gender_preference in ('same-gender','any'));

-- 3. listings — add BHK and sharing_capacity columns
alter table public.listings add column if not exists bhk text;
alter table public.listings add column if not exists sharing_capacity integer default 1 check (sharing_capacity between 1 and 10);

-- 4. listing_preferences — add co-gender preference
alter table public.listing_preferences add column if not exists co_gender_preference text check (co_gender_preference in ('same-gender','any'));

-- 4b. profiles — cascade delete when auth.users is deleted
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;

-- 5. Fix respond_to_roomie_request — cast status to enum type
create or replace function public.respond_to_roomie_request(p_request_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request public.requests;
  v_conversation uuid;
begin
  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.recipient_profile_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if v_request.status <> 'pending' then raise exception 'Request was already handled'; end if;

  update public.requests
    set status = (case when p_accept then 'accepted' else 'declined' end)::public.request_status,
        responded_at = now()
    where id = p_request_id;

  if not p_accept then return null; end if;

  insert into public.conversations (request_id) values (p_request_id) returning id into v_conversation;
  insert into public.conversation_participants (conversation_id, profile_id)
    values (v_conversation, v_request.sender_profile_id), (v_conversation, v_request.recipient_profile_id);

  return v_conversation;
end;
$$;

grant execute on function public.respond_to_roomie_request(uuid, boolean) to authenticated;

-- 6. Update find_listing_matches — budget top priority, locality filtering, gender matching
drop function if exists public.find_listing_matches(text, integer);

create or replace function public.find_listing_matches(
  p_city text,
  p_max_rent integer default null
)
returns table (
  listing_id uuid, owner_profile_id uuid, owner_name text, locality text, city text,
  rent integer, available_from date, open_spots smallint, room_type text, amenities text[],
  sharing_capacity integer, bhk text, score numeric, reasons text[]
) language plpgsql stable security definer set search_path = public as $$
declare
  my_prefs public.profile_preferences%rowtype;
  my_gender text;
begin
  select pp.* into my_prefs from public.profile_preferences pp where pp.profile_id = auth.uid();
  select p.gender into my_gender from public.profiles p where p.id = auth.uid();

  return query
  select
    l.id,
    l.owner_profile_id,
    p.display_name,
    l.locality,
    l.city,
    l.rent,
    l.available_from,
    l.open_spots,
    l.room_type,
    l.amenities,
    coalesce(l.sharing_capacity, 1),
    l.bhk,
    least(100, (
      -- Budget match: TOP PRIORITY (30 pts)
      case when my_prefs.budget_max is not null and l.rent <= my_prefs.budget_max then 30
           when my_prefs.budget_max is not null and l.rent <= my_prefs.budget_max * 1.1 then 15
           else 0 end
      -- Locality match (20 pts)
      + case when my_prefs.preferred_localities is not null
               and array_length(my_prefs.preferred_localities, 1) > 0
               and l.locality ilike any(my_prefs.preferred_localities)
             then 20 else 0 end
      -- Food preference (12 pts)
      + case when my_prefs.food_preference is not null
               and lp.food_preference is not null
               and my_prefs.food_preference = lp.food_preference then 12 else 0 end
      -- Sleep schedule (10 pts)
      + case when my_prefs.sleep_schedule is not null
               and lp.sleep_schedule is not null
               and my_prefs.sleep_schedule = lp.sleep_schedule then 10 else 0 end
      -- Noise level (8 pts)
      + case when my_prefs.noise_level is not null
               and lp.noise_level is not null
               and my_prefs.noise_level = lp.noise_level then 8 else 0 end
      -- Gender compatibility (10 pts)
      + case when lp.co_gender_preference = 'any' then 10
             when lp.co_gender_preference = 'same-gender' and my_gender is not null
               and p.gender = my_gender then 10
             when lp.co_gender_preference is null then 5
             else 0 end
      -- Cleanliness (5 pts)
      + case when my_prefs.cleanliness_level is not null
               and lp.cleanliness_level is not null
               and my_prefs.cleanliness_level = lp.cleanliness_level then 5 else 0 end
      -- Pets (5 pts)
      + case when my_prefs.pets_preference is not null
               and lp.pets_preference is not null
               and my_prefs.pets_preference = lp.pets_preference then 5 else 0 end
    ))::numeric,
    array_remove(array[
      case when my_prefs.budget_max is not null and l.rent <= my_prefs.budget_max then 'Within your budget' else null end,
      case when my_prefs.budget_max is not null and l.rent > my_prefs.budget_max then 'Above your budget' else null end,
      case when my_prefs.preferred_localities is not null
             and array_length(my_prefs.preferred_localities, 1) > 0
             and l.locality ilike any(my_prefs.preferred_localities)
           then 'In your preferred locality' else null end,
      case when my_prefs.food_preference is not null and lp.food_preference = my_prefs.food_preference then 'Food preferences align' else null end,
      case when my_prefs.sleep_schedule is not null and lp.sleep_schedule = my_prefs.sleep_schedule then 'Sleep schedules match' else null end,
      case when my_prefs.noise_level is not null and lp.noise_level = my_prefs.noise_level then 'Noise level matches' else null end,
      case when lp.co_gender_preference = 'same-gender' and (my_gender is null or p.gender <> my_gender) then 'Gender preference mismatch' else null end,
      case when my_prefs.cleanliness_level is not null and lp.cleanliness_level = my_prefs.cleanliness_level then 'Cleanliness levels match' else null end
    ], null)::text[]
  from public.listings l
  join public.profiles p on l.owner_profile_id = p.id
  left join public.listing_preferences lp on lp.listing_id = l.id
  where l.status = 'published'
    and l.city = p_city
    and l.owner_profile_id != auth.uid()
    and (p_max_rent is null or l.rent <= p_max_rent)
    and (my_prefs.move_in_to is null or l.available_from <= my_prefs.move_in_to)
    and (my_prefs.move_in_from is null or l.available_from >= my_prefs.move_in_from - interval '45 days')
    and (lp.co_gender_preference is null
         or lp.co_gender_preference = 'any'
         or (lp.co_gender_preference = 'same-gender' and (my_gender is null or p.gender = my_gender)))
  order by 13 desc, l.available_from asc
  limit 20;
end;
$$;

grant execute on function public.find_listing_matches(text, integer) to authenticated;

-- 7. Update find_seeker_matches — budget top priority, locality, gender
drop function if exists public.find_seeker_matches(uuid);

create or replace function public.find_seeker_matches(
  p_listing_id uuid
)
returns table (
  seeker_profile_id uuid, seeker_name text, seeker_gender text, city text,
  budget_max integer, move_in_from date, preferred_localities text[],
  co_gender_preference text,
  score numeric, reasons text[]
) language plpgsql stable security definer set search_path = public as $$
declare
  l_rent integer;
  l_city text;
  l_locality text;
  l_owner_gender text;
  lp_food text;
  lp_smoking text;
  lp_noise text;
  lp_sleep text;
  lp_cleanliness text;
  lp_co_gender text;
begin
  select l.rent, l.city, l.locality into l_rent, l_city, l_locality from public.listings l where l.id = p_listing_id;
  select p.gender into l_owner_gender from public.profiles p join public.listings l on l.owner_profile_id = p.id where l.id = p_listing_id;
  select lp.food_preference, lp.smoking_preference, lp.noise_level, lp.sleep_schedule, lp.cleanliness_level, lp.co_gender_preference
    into lp_food, lp_smoking, lp_noise, lp_sleep, lp_cleanliness, lp_co_gender
    from public.listing_preferences lp where lp.listing_id = p_listing_id;

  return query
  select
    p.id,
    p.display_name,
    p.gender,
    p.city,
    pp.budget_max,
    pp.move_in_from,
    pp.preferred_localities,
    pp.co_gender_preference,
    least(100, (
      -- Budget can afford rent (30 pts top priority)
      case when pp.budget_max >= l_rent then 30
           when pp.budget_max >= l_rent * 0.9 then 15
           else 0 end
      -- Locality preference alignment (20 pts)
      + case when pp.preferred_localities is not null
               and array_length(pp.preferred_localities, 1) > 0
               and l_locality ilike any(pp.preferred_localities)
             then 20 else 0 end
      -- Food (12 pts)
      + case when lp_food is not null and pp.food_preference = lp_food then 12 else 0 end
      -- Sleep (10 pts)
      + case when lp_sleep is not null and pp.sleep_schedule = lp_sleep then 10 else 0 end
      -- Noise (8 pts)
      + case when lp_noise is not null and pp.noise_level = lp_noise then 8 else 0 end
      -- Gender compatibility (10 pts)
      + case when pp.co_gender_preference = 'any' then 10
             when pp.co_gender_preference = 'same-gender' and l_owner_gender is not null and p.gender = l_owner_gender then 10
             when pp.co_gender_preference is null then 5
             else 0 end
      -- Cleanliness (5 pts)
      + case when lp_cleanliness is not null and pp.cleanliness_level = lp_cleanliness then 5 else 0 end
    ))::numeric,
    array_remove(array[
      case when pp.budget_max >= l_rent then 'Budget covers the rent' else null end,
      case when pp.budget_max < l_rent then 'Budget is below the rent' else null end,
      case when pp.preferred_localities is not null
             and array_length(pp.preferred_localities, 1) > 0
             and l_locality ilike any(pp.preferred_localities)
           then 'Prefers your listing''s locality' else null end,
      case when lp_food is not null and pp.food_preference = lp_food then 'Food preferences align' else null end,
      case when lp_sleep is not null and pp.sleep_schedule = lp_sleep then 'Sleep schedules match' else null end,
      case when lp_noise is not null and pp.noise_level = lp_noise then 'Noise levels match' else null end,
      case when pp.co_gender_preference = 'same-gender' and (l_owner_gender is null or p.gender <> l_owner_gender) then 'Gender preference mismatch' else null end
    ], null)::text[]
  from public.profile_preferences pp
  join public.profiles p on pp.profile_id = p.id
  where pp.budget_max >= l_rent * 0.85
    and p.city = l_city
    and p.visibility = true
    and p.id <> (select owner_profile_id from public.listings where id = p_listing_id)
    and (pp.co_gender_preference is null
         or pp.co_gender_preference = 'any'
         or (pp.co_gender_preference = 'same-gender' and (l_owner_gender is null or p.gender = l_owner_gender)))
  order by 9 desc
  limit 20;
end;
$$;

grant execute on function public.find_seeker_matches(uuid) to authenticated;

-- Done
