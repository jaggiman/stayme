-- Run this in your Supabase SQL Editor to enable the matching API.

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
    -- Basic match score simulation for MVP
    95.0::numeric as score,
    array['Location matches your preference', 'Rent is within your budget']::text[] as reasons
  from public.listings l
  join public.profiles p on l.owner_profile_id = p.id
  where l.status = 'published'
  and l.city = p_city
  and (p_max_rent is null or l.rent <= p_max_rent)
  order by l.created_at desc
  limit 10;
end;
$$ language plpgsql security definer;
