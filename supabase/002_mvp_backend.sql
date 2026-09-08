-- Apply after schema.sql in the Supabase SQL editor.
-- Adds onboarding defaults, matching, requests, and private messaging.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  component_scores jsonb not null default '{}'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now(),
  unique(subject_profile_id, listing_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('profile','listing','message')),
  subject_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- Create the minimal profile that all row-level policies depend on.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'New roomie')
  )
  on conflict (id) do nothing;
  insert into public.profile_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Covers any accounts created before this migration was applied.
insert into public.profiles (id, display_name)
select id, coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'New roomie')
from auth.users
on conflict (id) do nothing;
insert into public.profile_preferences (profile_id)
select id from auth.users
on conflict (profile_id) do nothing;

-- The recipient is the listing owner; accepted requests open exactly one private conversation.
create or replace function public.respond_to_roomie_request(p_request_id uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_request public.requests; v_conversation uuid;
begin
  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.recipient_profile_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if v_request.status <> 'pending' then raise exception 'Request was already handled'; end if;
  update public.requests set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = p_request_id;
  if not p_accept then return null; end if;
  insert into public.conversations (request_id) values (p_request_id) returning id into v_conversation;
  insert into public.conversation_participants (conversation_id, profile_id)
  values (v_conversation, v_request.sender_profile_id), (v_conversation, v_request.recipient_profile_id);
  return v_conversation;
end;
$$;

-- Lightweight deterministic MVP ranking. Hard filters run before compatibility scoring.
create or replace function public.find_listing_matches(p_city text, p_max_rent integer default null)
returns table (
  listing_id uuid, owner_profile_id uuid, owner_name text, locality text, city text, rent integer, available_from date,
  open_spots smallint, room_type text, amenities text[], score numeric, reasons jsonb
) language sql stable security invoker set search_path = public as $$
  with mine as (
    select pp.* from public.profile_preferences pp where pp.profile_id = auth.uid()
  ), eligible as (
    select l.*, p.display_name, lp.food_preference, lp.smoking_preference, lp.pets_preference,
           lp.sleep_schedule, lp.noise_level, lp.cleanliness_level
    from public.listings l
    join public.profiles p on p.id = l.owner_profile_id
    left join public.listing_preferences lp on lp.listing_id = l.id
    cross join mine m
    where l.status = 'published'
      and l.city = p_city
      and (p_max_rent is null or l.rent <= p_max_rent)
      and (m.move_in_to is null or l.available_from <= m.move_in_to)
      and (m.move_in_from is null or l.available_from >= m.move_in_from - interval '45 days')
      and (m.smoking_preference is null or m.smoking_preference = 'flexible' or lp.smoking_preference is null or lp.smoking_preference = m.smoking_preference)
  )
  select e.id, e.owner_profile_id, e.display_name, e.locality, e.city, e.rent, e.available_from, e.open_spots, e.room_type, e.amenities,
    least(100, 60
      + case when m.food_preference is not null and m.food_preference = e.food_preference then 12 else 0 end
      + case when m.sleep_schedule is not null and m.sleep_schedule = e.sleep_schedule then 10 else 0 end
      + case when m.noise_level is not null and m.noise_level = e.noise_level then 8 else 0 end
      + case when m.cleanliness_level is not null and m.cleanliness_level = e.cleanliness_level then 6 else 0 end
      + case when m.pets_preference is not null and m.pets_preference = e.pets_preference then 4 else 0 end
    )::numeric,
    jsonb_strip_nulls(jsonb_build_array(
      case when m.food_preference is not null and m.food_preference = e.food_preference then 'Food preferences align' end,
      case when m.sleep_schedule is not null and m.sleep_schedule = e.sleep_schedule then 'Your routines are similar' end,
      case when m.noise_level is not null and m.noise_level = e.noise_level then 'Noise preferences match' end,
      case when e.rent <= coalesce(m.budget_max, e.rent) then 'Within your budget' end
    ))
  from eligible e cross join mine m
  order by 10 desc, e.available_from asc;
$$;

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists matches_subject_score_idx on public.matches(subject_profile_id, score desc);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.matches enable row level security;
alter table public.reports enable row level security;

create policy "participants read conversations" on public.conversations for select using (exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversations.id and cp.profile_id = auth.uid()));
create policy "participants read membership" on public.conversation_participants for select using (exists (select 1 from public.conversation_participants mine where mine.conversation_id = conversation_participants.conversation_id and mine.profile_id = auth.uid()));
create policy "participants read messages" on public.messages for select using (exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid()));
create policy "participants send messages" on public.messages for insert with check (auth.uid() = sender_profile_id and exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid()));
create policy "users read their matches" on public.matches for select using (auth.uid() = subject_profile_id);
create policy "users report content" on public.reports for insert with check (auth.uid() = reporter_profile_id);

grant execute on function public.respond_to_roomie_request(uuid, boolean) to authenticated;
grant execute on function public.find_listing_matches(text, integer) to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
