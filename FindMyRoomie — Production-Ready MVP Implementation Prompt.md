# FindMyRoomie — Production-Ready MVP Implementation Prompt

You are working on an existing Next.js/React + TypeScript application called **FindMyRoomie**, a roommate and room matching platform.

The UI currently exists, but the application logic is incomplete and some flows are implemented incorrectly. **Do not blindly rebuild the application or redesign everything. First inspect the existing repository and understand the current architecture, components, routes, Supabase setup, database schema, authentication implementation, and state management. Then fix the application systematically.**

The goal is to turn the current prototype into a **properly functioning MVP**, not merely a visually convincing mockup.

---

## 1. Core Technology Requirements

Use the existing stack where possible:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
  - Supabase Auth
  - PostgreSQL
  - Row Level Security
  - Storage where required
  - Realtime where required
  - Edge Functions where required
  - pgvector for semantic matching later

Do **not** introduce Django, Express, a custom backend server, MongoDB, Firebase, or another database unless the existing project absolutely requires it.

The application should communicate with Supabase through the appropriate client/server mechanisms.

Never expose Supabase service-role credentials in browser/client code.

---

# 2. FIRST: AUDIT THE EXISTING PROJECT

Before modifying anything:

1. Inspect the complete project structure.
2. Identify:
   - Authentication implementation
   - Supabase client configuration
   - Database schema/migrations
   - RLS policies
   - Existing routes
   - Profile components
   - Stay preference components
   - Room/listing components
   - Dashboard/navigation
   - Matching logic
   - State management
   - LocalStorage usage
   - Any mock/hardcoded data
   - Any console-based authentication or input
3. Identify broken or fake functionality.
4. Identify components that should be reused.
5. Identify duplicated or conflicting state.
6. Identify where data is currently stored only in React state/localStorage instead of Supabase.
7. Fix the architecture before polishing the UI.

Do not delete working functionality simply because it is imperfect.

---

# 3. AUTHENTICATION MUST BE A REAL WEB AUTH FLOW

The current implementation incorrectly asks for email/password through console-style input.

This MUST be completely removed.

There must be a proper browser authentication experience.

## Required routes

Implement a clear authentication flow:

```text
/
├── /login
├── /signup
├── /forgot-password
├── /reset-password
└── authenticated application
```

Depending on the existing project structure, use appropriate Next.js route organization.

## Login

The login page must contain:

- Email field
- Password field
- Show/hide password button
- Remember session behavior through Supabase Auth
- Login button
- Loading state
- Validation errors
- Invalid credentials error
- Link to Sign Up
- Link to Forgot Password

Never use:

- `prompt()`
- `console`
- terminal input
- browser developer console input
- hardcoded credentials

Password input must always use:

```html
<input type="password">
```

and must never visibly display the entered password.

## Signup

Provide:

- Display name
- Email
- Password
- Confirm password

Validate:

- Required fields
- Valid email
- Password strength
- Password confirmation

Create the Supabase Auth user and the corresponding application profile.

Do not trust the client to create arbitrary users' profiles.

---

# 4. AUTH SESSION MUST PERSIST

A user should NOT be forced to log in again every time they refresh the page.

Use Supabase's authentication session correctly.

The application should:

1. Restore the existing session on page load.
2. Listen for authentication state changes.
3. Display a loading state while authentication is being resolved.
4. Redirect unauthenticated users away from protected pages.
5. Redirect authenticated users away from login/signup pages when appropriate.
6. Cleanly sign out using Supabase Auth.

Do not create a fake authentication system using React state.

Authentication state must come from Supabase.

---

# 5. ONBOARDING MUST ONLY HAPPEN ONCE

The current application asks for stay preferences again after signing out and signing back in.

This is incorrect.

Profile and stay preferences are **persistent user data**.

The correct flow is:

```text
Signup
   ↓
Create profile
   ↓
Initial onboarding
   ↓
Save profile + preferences to Supabase
   ↓
Dashboard
```

On subsequent login:

```text
Login
   ↓
Restore Supabase session
   ↓
Fetch existing profile
   ↓
Fetch existing preferences
   ↓
Dashboard
```

Only show onboarding again if:

- The user has never completed it, OR
- The user explicitly chooses to edit their information.

Do NOT use temporary React state as the source of truth.

Do NOT require the user to repeat preferences after every session.

---

# 6. PROFILE MUST BE PERSISTENT

Create a proper persistent profile model.

At minimum support:

### Basic information

- Display name
- Profile photo
- City
- Occupation/study status
- About me

### Lifestyle

- Food preference
- Smoking
- Alcohol
- Pets
- Cleanliness
- Guest frequency
- Sleep schedule
- Noise preference
- Work-from-home frequency

### Privacy

- Profile discoverability
- Locality visibility
- Contact permissions

The exact fields should follow the existing PRD/schema where applicable.

All changes must be saved to Supabase.

When the user returns later:

```text
Supabase → existing values → UI
```

not:

```text
default values → UI
```

---

# 7. STAY PREFERENCES MUST BE PERSISTENT

The user's stay preferences should be stored separately from temporary UI state.

Include things such as:

- Looking for a room / have a room
- Minimum budget
- Maximum budget
- Preferred city
- Preferred localities
- Radius
- Move-in date
- Desired roommate count
- Amenities
- Must-haves
- Deal-breakers
- Lifestyle requirements

When the user clicks Save:

```text
UI form
   ↓
Validation
   ↓
Supabase
   ↓
Success
   ↓
Updated local UI state
```

When the page loads:

```text
Supabase
   ↓
Fetch preferences
   ↓
Populate form
```

If the user changes only one field, the other existing values must remain intact.

Do not overwrite the entire preference object with defaults.

---

# 8. NAVIGATION MUST REFLECT THE ACTUAL APPLICATION

The current navigation is visually messy and contains items that are not logically organized.

Create a clean authenticated application navigation.

Suggested structure:

```text
FindMyRoomie

Home / Matches

Dashboard
  ├── Overview
  ├── My Profile
  ├── Stay Preferences
  ├── My Listings
  ├── Requests
  └── Favorites

Messages

Sign Out
```

On desktop:

- Clean horizontal/top navigation or sidebar
- Proper spacing
- Clear active state
- No text collisions
- No overlapping dropdowns

On mobile:

- Responsive navigation
- Hamburger/menu or bottom navigation
- No overflowing text
- No desktop navigation squeezed into mobile width

Navigation should be generated from actual routes, not decorative text.

Every navigation item must lead to a real functioning page.

---

# 9. RENAME "MY ROOMS"

The current label "My Rooms" is misleading.

Use:

**My Listings**

This page should show rooms/listings created by the currently authenticated user.

Example:

```text
My Listings

+ Create Listing

Your listings

[Listing Card]
₹12,000 / month
2BHK • Chennai
2 spots available
Status: Published

Edit | Pause | View
```

If the user has no listings:

```text
You haven't created any listings yet.

[Create your first listing]
```

Never display another user's listings under "My Listings".

Filter by the authenticated user's ID.

---

# 10. ROOM/LISTING CREATION MUST ACTUALLY WORK

Create a proper listing form.

Required fields should include:

- Listing title
- City
- Locality
- Monthly rent
- Deposit
- Available from
- Number of available spots
- Existing roommates
- Occupancy type
- Amenities
- House rules
- Roommate preferences
- Description
- Photos

Validate the form.

When submitted:

```text
Form
 ↓
Validation
 ↓
Supabase insert
 ↓
Listing ID returned
 ↓
Success
 ↓
My Listings updated
```

Do not merely add the listing to React state.

The listing must survive:

- Refresh
- Logout
- Login
- Browser restart

---

# 11. LISTING EDITING

A user must be able to:

- Edit their listing
- Pause their listing
- Publish it
- Mark it filled
- Remove it from discovery

Only the listing owner may modify it.

Use Supabase RLS to enforce this.

Do not rely only on frontend checks.

---

# 12. DISCOVERY / MATCHES

The Matches page should show actual listings that satisfy the user's requirements.

First apply hard constraints:

### Hard filters

- Budget
- Location
- Availability
- Capacity
- Explicit restrictions
- Listing status
- Visibility

Only after those constraints pass should compatibility ranking happen.

Do NOT allow a high compatibility score to override a hard requirement.

For example:

```text
User budget: ₹12,000

Listing: ₹18,000

Compatibility: 96%

Result: DO NOT SHOW
```

Compatibility does not override eligibility.

---

# 13. COMPATIBILITY SCORE

Implement the matching logic as a dedicated server-side module rather than scattering calculations throughout React components.

Initial score:

```text
Lifestyle alignment     35%
Food preferences        15%
Sleep & noise           15%
Cleanliness & habits    10%
Interests/social style  10%
Other preferences       10%
Semantic similarity      5%
```

The score must be deterministic and testable.

Return:

```text
score
component scores
positive reasons
conflicts
unknowns
```

Example:

```text
92% Home Fit

Why you match:
✓ Both prefer a quiet environment
✓ Similar sleep schedules
✓ Vegetarian-compatible
✓ Similar cleanliness expectations

Potential difference:
! They occasionally have guests
```

Never display a score without explaining it.

---

# 14. SEMANTIC MATCHING

The PRD specifies semantic matching using embeddings and pgvector.

Do not fake semantic matching with simple keyword matching.

For example:

```text
"I'm an introvert and enjoy peaceful evenings."

and

"I usually keep to myself and prefer a quiet home."

```

should have meaningful semantic similarity.

Use:

```text
Supabase Edge Function
        ↓
Embedding generation
        ↓
PostgreSQL pgvector
        ↓
Similarity retrieval
        ↓
Deterministic compatibility scoring
```

However, semantic matching must NOT be allowed to override hard filters.

Keep the semantic contribution intentionally small.

If embedding infrastructure is not yet configured, implement the matching architecture cleanly so that semantic matching can be enabled without rewriting the entire application.

Do not fabricate embedding scores.

---

# 15. REQUEST FLOW

Implement:

```text
User sees listing
       ↓
Send Request
       ↓
Optional message
       ↓
Pending
       ↓
Listing owner receives request
       ↓
Accept / Decline / Block
```

Only accepted requests should create a conversation.

Prevent duplicate pending requests for the same user/listing combination.

---

# 16. MESSAGING

After request acceptance:

```text
Request accepted
       ↓
Conversation created
       ↓
Both users can message
```

Use Supabase Realtime for live messages if the project is configured for it.

Messages must persist in PostgreSQL.

Users who are not participants must not be able to read the conversation.

RLS must enforce this.

---

# 17. DATABASE + RLS

Use Supabase PostgreSQL as the source of truth.

At minimum, structure the data around:

```text
profiles
profile_preferences
listings
listing_preferences
requests
conversations
messages
favorites
reports
moderation_actions
```

Use the authenticated user's Supabase ID as the relationship to their profile.

Enable RLS on all application tables.

Examples:

```text
User A can:
✓ Read/edit own profile
✓ Read/edit own preferences
✓ Create listings
✓ Edit own listings
✓ Read their own requests
✓ Read conversations they participate in

User A cannot:
✗ Edit User B's profile
✗ Edit User B's listing
✗ Read User B's private information
✗ Read User B's conversations
✗ Modify another user's requests
```

Do not depend solely on frontend authorization.

---

# 18. REMOVE FAKE / HARDCODED DATA

Search the codebase for:

- Hardcoded users
- Fake listings
- Fake match percentages
- Static profile data
- Mock request data
- Mock conversations
- Temporary preference objects
- Console authentication
- `prompt()`
- fake loading delays
- fake success states

Replace them with real Supabase operations.

If seed/demo data is useful for development, isolate it clearly as development seed data.

The production UI must use real authenticated user data.

---

# 19. STATE MANAGEMENT

Avoid having multiple competing sources of truth.

For persistent application data:

```text
Supabase = source of truth
```

React state should only represent:

- Current form values
- Loading state
- UI state
- Temporary selections
- Optimistic updates where appropriate

Do not store the user's complete profile/preferences only in React context.

If caching is used, it must be invalidated/refreshed correctly after mutations.

---

# 20. ERROR HANDLING

Every Supabase operation must handle:

- Loading
- Success
- Empty state
- Authentication failure
- Permission failure
- Network failure
- Validation errors
- Database errors

Do not silently swallow errors.

Show useful user-facing messages.

Never expose raw database errors or sensitive implementation details.

---

# 21. LOADING AND EMPTY STATES

Every data-driven page must have proper states.

Examples:

```text
Loading profile...

No listings yet.

No matches found.

No pending requests.

No messages yet.
```

Avoid blank screens.

---

# 22. SECURITY

Verify:

- Supabase anon/public key is safe for client usage.
- Service-role key is NEVER exposed to the browser.
- RLS is enabled.
- Users cannot manipulate another user's records by changing IDs in requests.
- Private profile fields are not returned unnecessarily.
- Conversations are participant-only.
- Listing modifications are owner-only.
- Request creation is protected against abuse.
- Input is validated server-side.

Treat any cross-user data access as a critical bug.

---

# 23. UI/UX

Keep the existing visual direction if it is good, but fix the usability issues.

The site should feel like a real product rather than an AI-generated landing page.

Prioritize:

1. Clear navigation
2. Consistent spacing
3. Proper forms
4. Clear buttons
5. Meaningful feedback
6. Responsive design
7. Accessibility
8. Functional states

Do NOT spend the majority of the effort generating decorative hero sections.

The authenticated application is more important than the landing page.

---

# 24. RESPONSIVE DESIGN

The entire application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Especially test:

- Login
- Signup
- Profile
- Preferences
- Listing creation
- Listing cards
- Matches
- Requests
- Messages
- Navigation

No horizontal overflow.

No overlapping navigation.

No clipped buttons.

No tiny form controls.

---

# 25. TESTING REQUIREMENTS

Create tests for the most important business logic.

At minimum test:

### Authentication

- Signup
- Login
- Logout
- Session restoration
- Protected routes

### Persistence

- Profile survives logout/login
- Preferences survive logout/login
- Listing survives logout/login
- Edited preference does not erase unrelated preferences

### Authorization

- User cannot edit another user's listing
- User cannot read another user's private data
- Non-participants cannot read conversations

### Matching

Test scenarios such as:

```text
Vegetarian ↔ Vegetarian
Vegetarian ↔ Non-vegetarian
Quiet ↔ Quiet
Introvert ↔ "Prefer keeping to myself"
Early sleeper ↔ Night owl
₹10k budget ↔ ₹9k listing
₹10k budget ↔ ₹15k listing
```

The ₹15k listing must fail the hard budget filter regardless of compatibility score.

---

# 26. DEVELOPMENT ORDER

Do not implement everything simultaneously.

Work in this order:

## Phase 1 — Foundation

- Audit existing code
- Supabase configuration
- Database schema
- RLS
- Auth
- Protected routes
- Session restoration

## Phase 2 — User data

- Profile
- Preferences
- Persistence
- Edit functionality

## Phase 3 — Listings

- Create listing
- My Listings
- Edit listing
- Pause/publish/fill listing
- Listing details

## Phase 4 — Discovery

- Hard filters
- Matches
- Compatibility score
- Explanations

## Phase 5 — Semantic matching

- Embeddings
- pgvector
- Edge Function
- Semantic similarity
- Re-ranking

## Phase 6 — Communication

- Requests
- Accept/decline
- Conversations
- Realtime messaging

## Phase 7 — Safety

- Block
- Report
- Basic admin moderation

## Phase 8 — UI polish

Only after the above functionality works:

- Navigation refinement
- Responsive improvements
- Empty states
- Animations
- Visual polish

---

# 27. IMPORTANT CODING RULE

Do NOT generate a large amount of code without verifying it.

After completing each phase:

1. Run the application.
2. Check TypeScript errors.
3. Check build errors.
4. Check Supabase queries.
5. Check RLS policies.
6. Test the relevant user flow.
7. Fix errors.
8. Then move to the next phase.

Do not tell me that something is "implemented" if it is only visually implemented.

---

# 28. FINAL ACCEPTANCE CRITERIA

The MVP should satisfy all of these:

- A new user can create an account through a proper web UI.
- Passwords are never displayed in plain text.
- Supabase maintains the authentication session.
- Refreshing the page does not log the user out.
- Signing out and signing back in restores the user's existing profile.
- Stay preferences remain saved across sessions.
- Users can edit only the fields they want to change.
- Existing preference values are not accidentally overwritten.
- Users can create real room listings.
- Listings are stored in Supabase.
- "My Listings" displays only listings belonging to the current user.
- Listings remain available after logout/login.
- Users can edit, pause, publish, and mark their listings as filled.
- Discovery uses real database data.
- Hard filters are applied before compatibility scoring.
- Compatibility scores are calculated from actual profile/listing data.
- Match explanations correspond to actual matching fields.
- Semantic matching does not override hard constraints.
- Requests are persisted.
- Conversations are created only after accepted requests.
- Messages persist.
- Unauthorized users cannot access other users' private data.
- RLS protects all important database operations.
- Mobile navigation works correctly.
- There are no console-based authentication flows.
- There is no fake/mock production data.
- There are no major TypeScript/build errors.
- Refreshing any authenticated page does not destroy application state.

---

## Most Important Instruction

**Treat this as a real application, not a UI prototype.**

The current application already has a visual foundation. Your job is to make the existing product's **authentication, persistence, database interaction, authorization, navigation, listing ownership, matching, and user flows logically correct and actually functional.**

When you encounter an existing implementation that is close to correct, fix it rather than replacing it unnecessarily.

Start by auditing the repository and report the current architecture and the major issues you found. Then implement the fixes in the development order above.