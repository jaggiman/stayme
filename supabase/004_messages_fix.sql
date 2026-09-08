-- ============================================================
-- FindMyRoomie Messaging RLS Fix (004)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Allow users to read the profiles of people they are chatting with
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'participants read each others profiles'
  ) then
    create policy "participants read each others profiles" on public.profiles
      for select
      using (
        exists (
          select 1 from public.conversation_participants cp1
          join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
          where cp1.profile_id = profiles.id and cp2.profile_id = auth.uid()
        )
      );
  end if;
end
$$;
