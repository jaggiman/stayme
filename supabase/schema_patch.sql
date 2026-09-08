-- Fix trailing parenthesis syntax error and refine policies

-- 1. Drop the broken policy if it miraculously existed, and replace it
drop policy if exists "listing owners manage preferences" on public.listing_preferences;
create policy "listing owners manage preferences" on public.listing_preferences for all using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_profile_id = auth.uid()));

-- 2. Drop the overly broad 'all' policy on profile_preferences and replace with explicit ones
drop policy if exists "owners manage own preferences" on public.profile_preferences;
create policy "owners read own preferences" on public.profile_preferences for select using (auth.uid() = profile_id);
create policy "owners insert own preferences" on public.profile_preferences for insert with check (auth.uid() = profile_id);
create policy "owners update own preferences" on public.profile_preferences for update using (auth.uid() = profile_id);

-- 3. Just to be safe, recreate the requests policies in case they were skipped during the original error
drop policy if exists "request participants may read" on public.requests;
drop policy if exists "senders create requests" on public.requests;
drop policy if exists "recipients update requests" on public.requests;
create policy "request participants may read" on public.requests for select using (auth.uid() in (sender_profile_id, recipient_profile_id));
create policy "senders create requests" on public.requests for insert with check (auth.uid() = sender_profile_id);
create policy "recipients update requests" on public.requests for update using (auth.uid() = recipient_profile_id);
