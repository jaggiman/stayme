# FindMyRoomie — MVP Implementation Plan

## UI Flow Reference

![UI Flow Diagram](C:\Users\Jagadish\.gemini\antigravity-ide\brain\29efd481-afec-4286-baa6-31707eb298b7\ui_flow.jpg)

The flow diagram defines two primary user journeys after authentication:

```
Start → Sign Up / Login
       ↓
  Consent & Data Use
       ↓
  Create Profile
       ↓
  Select Role ─────────────────────────────────────────────────────────────────┐
       │                                                                        │
  [SEEKER - Need Room]                                                  [OWNER - Have Room]
       │                                                                        │
  Search Setup                                                         Create Listing
       ↓                                                                        ↓
  Lifestyle Input                                                      Owner Dashboard
       ↓                                                                        ↓
  Candidate Feed (maybe save)                                      ← View Candidates ←┐
       ↓                                                          Review Request        │
  Results Feed ──→ open listing ──→ Listing Detail                 Accept / Decline     │
       ↓                                                                ↓                │
  Send Request ──→ Request Pending ──────────────────────────────→ Accepted?             │
                                                                    │         │          │
                                                                   YES        NO ─────────
                                                                    ↓
                                                              Select Chat ──→ In-App Messaging
                                                                    ↓
                                                            Exchange Contact Info
                                                                    ↓
                                                                  Finish → End
```

---

## Answers to Open Questions

- **pgvector / Semantic Matching:** Deferred. Build Phase 4 (Discovery) with clean, deterministic scoring that is architected to accept semantic scores without a rewrite. Phase 5 will be a separate implementation later.
- **Auth Providers:** Email/Password **+ Google OAuth** are both required.

---

## User Review Required

> [!WARNING]
> `components/Nav.tsx` currently uses `window.prompt()` for sign-in. This entire authentication mechanism will be deleted and replaced with proper pages.

> [!IMPORTANT]
> The route `/dashboard/room` will be removed and replaced with `/dashboard/listings`. Any bookmarked URLs to `/dashboard/room` will break and should redirect.

> [!IMPORTANT]
> The existing `supabase` client in `lib/supabase.ts` returns `null` when env vars are missing. Every component currently null-checks it defensively. We'll keep this pattern but centralise the session via a React context so not every leaf component has to repeat the auth check.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Next.js App                       │
│                                                          │
│  Public routes          Authenticated routes             │
│  /                      /matches                         │
│  /login                 /dashboard/overview              │
│  /signup                /dashboard/profile               │
│  /auth/callback         /dashboard/preferences           │
│                         /dashboard/listings              │
│                         /dashboard/listings/new          │
│                         /dashboard/listings/[id]/edit    │
│                         /dashboard/requests              │
│                         /dashboard/favorites             │
│                         /messages                        │
│                         /messages/[conversationId]       │
└────────────────┬────────────────────────────────────────┘
                 │ Supabase JS Client (anon key, browser-safe)
                 │ Supabase Server Client (service role — Edge Functions only)
┌────────────────▼────────────────────────────────────────┐
│                    Supabase                              │
│  Auth (email+password, Google OAuth, Magic Link)         │
│  PostgreSQL (profiles, listings, requests, messages …)   │
│  Row Level Security (all tables)                         │
│  Realtime (messages, requests)                           │
│  Storage (avatar photos, listing photos)                 │
│  Edge Functions (compatibility scoring — Phase 5)        │
└─────────────────────────────────────────────────────────┘
```

---

## Proposed Changes (by Phase)

---

### Phase 1 — Foundation: Authentication & Session

All `window.prompt()` flows will be completely removed and replaced with real pages.

#### [MODIFY] [`lib/supabase.ts`](file:///c:/FindMyRoomie/lib/supabase.ts)
- Create a proper typed Supabase client using `createBrowserClient` from `@supabase/ssr`.
- Add a separate `createServerClient` helper for server components and middleware.
- Keep the anon key client for the browser; never expose service-role keys here.

#### [NEW] `lib/auth-context.tsx`
- A React context that wraps the entire app in `app/layout.tsx`.
- On mount: call `supabase.auth.getSession()` to restore the existing session.
- Subscribe to `onAuthStateChange` to keep session state live.
- Exposes `{ user, session, loading }` — consumed by Nav, protected pages, and forms.
- Eliminates every component making its own `getSession()` call.

#### [NEW] `middleware.ts` (Next.js Edge Middleware)
- Use `@supabase/ssr` to read the session cookie on every request.
- Redirect unauthenticated users from protected routes → `/login`.
- Redirect authenticated users away from `/login` and `/signup` → `/dashboard/overview`.

#### [NEW] [`app/login/page.tsx`](file:///c:/FindMyRoomie/app/login/page.tsx)
- Email + Password fields with show/hide toggle.
- Google OAuth button ("Continue with Google").
- Magic Link option ("Send me a sign-in link").
- Loading states, validation errors, credential errors.
- Links to `/signup` and `/forgot-password`.

#### [NEW] [`app/signup/page.tsx`](file:///c:/FindMyRoomie/app/signup/page.tsx)
- Display Name, Email, Password, Confirm Password fields.
- Google OAuth button.
- Client-side validation (email format, password strength, match confirmation).
- On success: calls `supabase.auth.signUp()` with `display_name` in `user_metadata`.
- The existing Supabase trigger `handle_new_user` automatically creates the `profiles` and `profile_preferences` rows — no extra client call needed.
- Redirects → `/onboarding/consent` after email confirmation or directly after Google OAuth.

#### [NEW] `app/forgot-password/page.tsx` + `app/reset-password/page.tsx`
- Standard password reset flow using `supabase.auth.resetPasswordForEmail()`.

#### [MODIFY] [`app/auth/callback/page.tsx`](file:///c:/FindMyRoomie/app/auth/callback/page.tsx)
- Currently redirects to `/?signed_in=1`. Update to redirect to `/dashboard/overview` for authenticated users, or `/onboarding/consent` for brand-new accounts.
- Handle Google OAuth callback correctly (it also lands here).

#### [MODIFY] [`components/Nav.tsx`](file:///c:/FindMyRoomie/components/Nav.tsx)
- Remove `requestMagicLink()` and all `window.prompt()` calls.
- Read auth state from the new `AuthContext` — no separate `useEffect` needed.
- "Sign in" → links to `/login`.
- "Get started" → links to `/signup`.
- Rename "My Rooms" → "My Listings" in the dropdown (links to `/dashboard/listings`).
- Add "Messages" link.
- Mobile: convert dropdown to a slide-out hamburger menu.

#### [MODIFY] [`app/layout.tsx`](file:///c:/FindMyRoomie/app/layout.tsx)
- Wrap `children` in `<AuthProvider>` from `lib/auth-context.tsx`.

---

### Phase 2 — Onboarding (One-Time, as per UI Flow)

The UI flow shows: `Create Profile → Select Role → Search Setup / Lifestyle Input` as a first-time onboarding sequence.

#### [NEW] `app/onboarding/consent/page.tsx`
- Display data use consent.
- "Continue" → `/onboarding/create-profile`.

#### [NEW] `app/onboarding/create-profile/page.tsx`
- Pre-filled with `display_name` from Google/signup.
- Fields: Display Name, Avatar upload, City, Occupation/Study status, About Me.
- Saves to `profiles` table via upsert.
- On completion → `/onboarding/select-role`.

#### [NEW] `app/onboarding/select-role/page.tsx`
- **Select Role** decision (from the flow diagram).
- Two cards: "I'm looking for a room" (Seeker) and "I have a room to offer" (Owner).
- Sets a `role` or `onboarding_complete` flag in the user's profile.
- Seeker → `/onboarding/search-setup`.
- Owner → `/dashboard/listings/new`.

#### [NEW] `app/onboarding/search-setup/page.tsx`
- **Search Setup** (from the flow diagram): city, budget, locality, move-in date.

#### [NEW] `app/onboarding/lifestyle/page.tsx`
- **Lifestyle Input** (from the flow diagram): food preference, smoking, sleep schedule, noise level, pets, cleanliness, about-me text.
- On save → redirect to `/matches`.

> [!NOTE]
> After onboarding is complete, `profiles.onboarding_complete = true`. On subsequent logins, the user is sent directly to `/dashboard/overview` — the onboarding flow is skipped.

---

### Phase 3 — User Data: Profile & Preferences (Persistent)

#### [MODIFY] [`components/SeekerProfileForm.tsx`](file:///c:/FindMyRoomie/components/SeekerProfileForm.tsx)
- On mount: fetch existing profile + preferences from Supabase.
- Populate all form fields with **existing values** (not defaults).
- On submit: `upsert` only the fields provided; do not overwrite others.
- Add loading skeleton while fetching.

#### [MODIFY] Dashboard pages:
- [`app/dashboard/profile/page.tsx`](file:///c:/FindMyRoomie/app/dashboard/profile/) — Fetch + edit basic profile (name, avatar, city, bio, occupation).
- [`app/dashboard/preferences/page.tsx`](file:///c:/FindMyRoomie/app/dashboard/preferences/) — Full lifestyle preferences editor backed by `profile_preferences`.

---

### Phase 4 — Listings (My Listings / Create / Edit)

#### [NEW] `app/dashboard/listings/page.tsx`
- Replaces the old `/dashboard/room` route.
- Fetches listings where `owner_profile_id = auth.uid()`.
- Shows listing cards with status badges: `Published`, `Paused`, `Filled`.
- Action buttons: **Edit**, **Pause/Publish**, **Mark Filled**, **View**, **Delete**.
- Empty state: "You haven't created any listings yet. [Create your first listing]"

#### [NEW] `app/dashboard/listings/new/page.tsx`
- Full listing creation form (all fields from the PRD):
  - Title, City, Locality, Rent, Deposit, Available From, Spots, Occupancy Type.
  - Amenities multi-select, House Rules textarea, Roommate preferences.
  - Description, Photo upload (Supabase Storage).
- On submit: insert into `listings` + `listing_preferences` → redirect to `/dashboard/listings`.

#### [NEW] `app/dashboard/listings/[id]/edit/page.tsx`
- Same form as above, pre-populated from Supabase.
- Uses `update` (not `insert`).
- Only accessible if `owner_profile_id = auth.uid()` (enforced by RLS + client check).

#### [MODIFY] [`components/RoomListingForm.tsx`](file:///c:/FindMyRoomie/components/RoomListingForm.tsx)
- Refactor into a reusable form component.
- Accept `listingId?: string` prop — when provided, fetch existing data and render in edit mode.

#### [MODIFY] [`lib/roomie-api.ts`](file:///c:/FindMyRoomie/lib/roomie-api.ts)
- Add `updateListing(id, input)`.
- Add `updateListingStatus(id, status: 'published' | 'paused' | 'filled')`.
- Add `deleteListing(id)`.
- Ensure `getUserListings()` only returns listings for the authenticated user.

---

### Phase 5 — Discovery: Matches Page

#### [MODIFY] [`app/matches/page.tsx`](file:///c:/FindMyRoomie/app/matches/page.tsx)
- Redirect unauthenticated users to `/login` (middleware will handle this, but add a guard here too).
- Use `AuthContext` for the session instead of a raw `getSession()` call.
- The mode toggle (Find Room / Find Roommates) remains.
- Display match `reasons` array in a "Why you match" section on each card.
- Show "Potential differences" for negative reasons.
- Empty state: "No matches found. Update your preferences to see more options."

#### [NEW] `app/listings/[id]/page.tsx` — **Listing Detail Page**
- Corresponds to the **Listing Detail** node in the UI flow.
- Shows all listing details, photos, amenities, house rules, compatibility score.
- **"Send Request"** button → opens a modal with optional note → calls `sendRoomieRequest()`.
- Prevents sending a duplicate pending request (the DB has a unique constraint; surface the error gracefully: "You already have a pending request for this listing.").

#### [MODIFY] [`components/MatchCard.tsx`](file:///c:/FindMyRoomie/components/MatchCard.tsx)
- "Open listing" link routes to `/listings/[id]`.

---

### Phase 6 — Requests Flow

#### [MODIFY] [`app/dashboard/requests/page.tsx`](file:///c:/FindMyRoomie/app/dashboard/requests/)
- **Incoming tab (Owner view):** Show sender name, their city, the listing, date, note. Buttons: **Accept** / **Decline**.
  - Accept → calls `respond_to_roomie_request(id, true)` → creates conversation → routes to `/messages/[conversationId]`.
  - Decline → calls `respond_to_roomie_request(id, false)`.
- **Outgoing tab (Seeker view):** Show listing, status badge (Pending / Accepted / Declined).
- Real-time badge for new incoming requests using Supabase Realtime subscription on the `requests` table.

#### [MODIFY] [`lib/roomie-api.ts`](file:///c:/FindMyRoomie/lib/roomie-api.ts)
- Replace `updateRequestStatus()` with a call to the `respond_to_roomie_request` RPC (which already handles conversation creation atomically).

---

### Phase 7 — Messaging

#### [NEW] `app/messages/page.tsx`
- List all conversations the user participates in.
- Shows conversation partner name + last message preview + timestamp.

#### [NEW] `app/messages/[conversationId]/page.tsx`
- Message thread view.
- Load messages from `public.messages` where `conversation_id = [id]`.
- Real-time subscription via `supabase.channel()` on the messages table for live updates.
- Send message → `supabase.from('messages').insert(...)`.
- Empty state: "Say hello! This conversation just started."

#### [MODIFY] [`lib/roomie-api.ts`](file:///c:/FindMyRoomie/lib/roomie-api.ts)
- Add `getConversations()` — fetches all conversations the user participates in.
- Add `getMessages(conversationId)` — fetches all messages in a conversation.
- Add `sendMessage(conversationId, body)`.

---

### Phase 8 — Database Schema Alignment

The existing SQL files have accumulated across multiple iterations. The following SQL must be applied to Supabase (in order) to bring the schema to the required state:

#### [NEW] `supabase/003_schema_final.sql`
- Add `onboarding_complete boolean default false` to `profiles`.
- Add `role text check (role in ('seeker', 'owner', 'both'))` to `profiles`.
- Add `bio text`, `occupation_status text`, `avatar_url text` (already in `schema_v2`) to `profiles`.
- Confirm `profile_preferences` has: `budget_min`, `budget_max`, `preferred_localities text[]`, `move_in_from date`, `move_in_to date`, `pets_preference`, `cleanliness_level`, `sleep_schedule`, `noise_level`, `food_preference`, `smoking_preference`, `lifestyle_text`, `wfh_frequency`, `guest_frequency`.
- Confirm `listings` has: `title text`, `deposit integer`, `description text`, `photos text[]`, `status text`.
- Ensure RLS policies exist and are correct for all tables listed.
- Add Google OAuth to Supabase Auth providers (configuration step, not SQL).

---

### Phase 9 — Security Audit

- Verify `service_role` key is only used in Edge Functions / server-side code.
- Confirm RLS blocks cross-user reads on: `profile_preferences`, `listings` (editing), `requests`, `conversations`, `messages`.
- Confirm `find_listing_matches` uses `security invoker` and filters by `auth.uid()` for preferences.

---

### Phase 10 — UI Polish & Responsive Design

- Mobile hamburger navigation.
- Consistent loading skeletons across all data pages.
- Toast notifications for all CRUD operations.
- Proper empty states with actionable CTAs.
- No horizontal overflow on any viewport.

---

## Development Order (Confirmed from PRD §26)

| Phase | Focus | Key Deliverables |
|---|---|---|
| 1 | Foundation | Auth pages, Nav fix, Middleware, AuthContext |
| 2 | Onboarding | Consent, Create Profile, Select Role, Lifestyle |
| 3 | User Data | Persistent Profile & Preferences edit pages |
| 4 | Listings | My Listings, Create, Edit, Status management |
| 5 | Discovery | Matches page, Listing Detail, Compatibility reasons |
| 6 | Requests | Accept/Decline, Conversation creation |
| 7 | Messaging | Conversation list, Thread view, Realtime |
| 8 | Schema | Final SQL migration |
| 9 | Security | RLS audit |
| 10 | Polish | Responsive UI, animations, empty states |

> [!NOTE]
> pgvector / Semantic Matching (original Phase 5) is deferred. The matching architecture in `002_mvp_backend.sql` is already clean enough to add a semantic score component later without restructuring.

---

## Files to Create (New)

| File | Purpose |
|---|---|
| `middleware.ts` | Route protection + session refresh |
| `lib/auth-context.tsx` | Global auth state |
| `app/login/page.tsx` | Login (email+password + Google) |
| `app/signup/page.tsx` | Signup (email+password + Google) |
| `app/forgot-password/page.tsx` | Password reset request |
| `app/reset-password/page.tsx` | Password reset handler |
| `app/onboarding/consent/page.tsx` | Data consent step |
| `app/onboarding/create-profile/page.tsx` | Profile creation step |
| `app/onboarding/select-role/page.tsx` | Role selection (Seeker/Owner) |
| `app/onboarding/search-setup/page.tsx` | Budget/location setup |
| `app/onboarding/lifestyle/page.tsx` | Lifestyle preferences setup |
| `app/dashboard/overview/page.tsx` | Post-login dashboard home |
| `app/dashboard/listings/page.tsx` | My Listings (replaces `/dashboard/room`) |
| `app/dashboard/listings/new/page.tsx` | Create new listing |
| `app/dashboard/listings/[id]/edit/page.tsx` | Edit existing listing |
| `app/listings/[id]/page.tsx` | Public listing detail view + Send Request |
| `app/messages/page.tsx` | Conversation list |
| `app/messages/[conversationId]/page.tsx` | Message thread |
| `supabase/003_schema_final.sql` | Final schema migration |

## Files to Modify (Existing)

| File | Change |
|---|---|
| `lib/supabase.ts` | Migrate to `@supabase/ssr` browser + server clients |
| `lib/roomie-api.ts` | Add update/delete listing, respond_to_request RPC, messaging functions |
| `app/layout.tsx` | Wrap in `<AuthProvider>` |
| `app/auth/callback/page.tsx` | Redirect new users to onboarding; existing users to overview |
| `components/Nav.tsx` | Remove prompt(), use AuthContext, rename My Rooms, add Messages |
| `components/SeekerProfileForm.tsx` | Fetch & populate existing data on mount |
| `components/RoomListingForm.tsx` | Add edit mode with `listingId` prop |
| `components/MatchCard.tsx` | Link to `/listings/[id]` |
| `app/matches/page.tsx` | Use AuthContext, show match reasons clearly |
| `app/dashboard/requests/page.tsx` | Full Accept/Decline UI, use respond_to_request RPC |

## Files to Delete

| File | Reason |
|---|---|
| `app/dashboard/room/page.tsx` | Replaced by `/dashboard/listings` |

---

## Verification Plan

### Per-Phase Verification
After each phase: run `npm run build`, check TypeScript errors, verify the flow manually.

### Key Manual Test Scenarios

| Scenario | Expected |
|---|---|
| New user signs up via Google | Profile created, routed to onboarding/consent |
| Returning user refreshes any page | Session restored, no logout |
| User edits budget only | All other preferences remain intact |
| User A tries to edit User B's listing URL | 403 / redirect |
| Seeker with ₹10k budget sees ₹15k listing | Listing does NOT appear in results |
| Seeker sends request → Owner accepts | Conversation created, both see it in /messages |
| Owner's "My Listings" | Only shows owner's own listings |
