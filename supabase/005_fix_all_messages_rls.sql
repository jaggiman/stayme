-- ============================================================
-- FindMyRoomie RLS Fix for Conversations and Profiles (005)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create a helper function to check if the current user is in a conversation.
-- Using SECURITY DEFINER bypasses RLS for this specific check, preventing infinite recursion.
create or replace function public.is_conversation_participant(convo_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from conversation_participants 
    where conversation_id = convo_id 
    and profile_id = auth.uid()
  );
$$;

-- 2. Fix policies on conversation_participants
drop policy if exists "users read own membership" on public.conversation_participants;
drop policy if exists "participants read membership" on public.conversation_participants;

create policy "participants read membership" on public.conversation_participants
for select using (
  public.is_conversation_participant(conversation_id)
);

-- 3. Fix policies on profiles to allow reading other participants' profiles
drop policy if exists "participants read each others profiles" on public.profiles;

create policy "participants read each others profiles" on public.profiles
for select using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.profile_id = profiles.id
    and public.is_conversation_participant(cp.conversation_id)
  )
);
