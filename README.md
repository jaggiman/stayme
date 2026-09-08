# Find My Roomie

Bright, mobile-first MVP interface for compatibility-first room and roommate matching.

## Run locally

1. Copy `.env.example` to `.env.local` and add Supabase values when ready.
2. In the Supabase SQL editor, run `supabase/schema.sql`, then `supabase/002_mvp_backend.sql`.
3. Run `npm install`.
4. Run `npm run dev`.

Guests see a curated preview. Once signed in, discovery loads the authenticated user’s hard-filtered database matches, and roomie requests are persisted in Supabase. The follow-on migration creates user-profile onboarding, conversations, messages, request handling, Realtime, matching, and RLS policies.
