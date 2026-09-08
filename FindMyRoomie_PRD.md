**PRODUCT REQUIREMENTS DOCUMENT**  
**Roommate Matching Platform**  
Compatibility-first MVP for people looking for a room, roommate(s), or both  
| | |  
|-|-|  
| **Status** | MVP specification |   
| **Primary users** | Students and early-career movers |   
| **Delivery stack** | Next.js/React, TypeScript, Tailwind/shadcn, Supabase |   
| **Version** | v1.0 | August 2026 |   
# **1. Product Summary**  
**Problem. **People relocating for work or education often cannot choose roommates. Mismatched food habits, sleep routines, cleanliness, noise, smoking, budgets, and expectations create avoidable conflict. Existing rental listings optimize for availability, not day-to-day compatibility.  
**Proposed MVP. **A two-sided platform where people can post an available room or search for a room, then discover compatible people and listings. Recommendations first satisfy non-negotiable constraints and then rank results by a transparent compatibility score, including semantic understanding of free-text lifestyle preferences.  
# **2. Goals, Non-Goals, and Target Users**  
## **Goals**  
- Help a user find viable room/roommate options that fit stated budget, location, move-in, and lifestyle constraints.  
- Make compatibility understandable: show a score plus concrete reasons, not a black-box recommendation.  
- Validate demand and matching quality with a small, safe MVP before building a marketplace or payments layer.  
- Avoid self-managed infrastructure by using Supabase for backend services and data.  
## **Target users**  
| | | |  
|-|-|-|  
| **Segment** | **Primary need** | **MVP job to be done** |   
| Room seeker | Find a room and people they can live with | Compare verified-looking listings that meet their constraints and feel compatible. |   
| Room poster | Fill an open room and split costs | Find candidates who meet house rules and align with the household. |   
| New mover | Assess an unfamiliar city and co-living setup | Quickly state requirements and start relevant conversations. |   
## **Non-goals for the MVP**  
- Rent collection, escrow, contracts, deposits, or legal tenancy workflows.  
- Guaranteed identity, background, or property verification; the MVP can support reporting and future verification flags.  
- Open-ended social networking, sophisticated recommendation learning, or native mobile apps.  
- Automated decisions on protected traits or discriminatory filtering. Gender preferences, where used, must be narrowly presented as a safety/preference control and reviewed for applicable law.  
# **3. MVP Scope**  
| | |  
|-|-|  
| **In scope** | **Not required at launch** |   
| Email/OAuth sign-in; profile onboarding; room and need listings; image upload; structured filters; ranked matches; match explanations; requests and basic real-time messaging; reporting/admin queue. | Payments; leases; maps/routing; video tours; reviews; push notifications; AI chat assistant; multi-city operational tooling; automatic background checks. |   
# **4. Core User Flows**  
## **A. Room seeker**  
1. Sign up, consent to data use, create a profile, and set search preferences.  
2. Choose “I need a room”; enter location/radius, budget, move-in date, requirements, and a short lifestyle description.  
3. Browse matches that pass hard filters, review score and explanation, and open a listing/profile.  
4. Send a contact request with a short optional note; chat opens only after acceptance.  
## **B. Room poster**  
5. Sign up and create a personal profile.  
6. Choose “I have a room”; add location, rent/deposit, availability, household details, amenities, house rules, photos, and ideal roommate preferences.  
7. Review ranked candidate matches; accept, decline, or hide.  
8. Accept a request to create a conversation and coordinate outside the product if desired.  
## **C. Safety / moderation**  
9. A user can report a listing, profile, or conversation reason (spam, scam, harassment, inaccurate content).  
10. Admin reviews the report and may warn, hide, suspend, or restore the record. Every action is auditable.  
# **5. Product Requirements**  
## **Profile and preferences**  
| | | |  
|-|-|-|  
| **Category** | **Structured fields** | **Free text** |   
| Identity & move | Display name, age band (optional), city, occupation/study status, move-in date range | About me |   
| Lifestyle | Food preference, smoking, alcohol, pets, cleanliness, guest frequency, sleep schedule, noise level, work-from-home frequency | Lifestyle / routines / boundaries |   
| Search | Budget min/max, preferred localities, radius, listing type, desired roommate count | Must-haves and deal-breakers |   
| Privacy | Show profile in discovery, show exact locality, contact permissions | Optional notes |   
**Requirement: **Use controlled vocabularies for comparable fields, with “prefer not to say” and “flexible” where appropriate. Free text is supplementary, never the sole basis for a hard exclusion.  
## **Room listings**  
- Listing type: available room; later support “entire place / looking to form a group” as an extension.  
- Required: city/locality, monthly rent, deposit (optional), available-from date, number of open spots, existing roommates, occupancy type, and at least one photo.  
- Optional: approximate coordinates, amenities (gym nearby, parking, laundry, Wi-Fi, furnished), room details, commute landmarks, house rules, and roommate preference text.  
- Status: draft, published, paused, filled, removed. Never permanently delete public records through the normal UI; hide and retain moderation history.  
## **Hard filters and eligibility**  
| | |  
|-|-|  
| **Filter** | **Rule** |   
| Budget | Listing rent must be within the seeker’s maximum; allow a configurable tolerance only if explicitly chosen. |   
| Location | Same city plus locality match or configured radius using approximate coordinates. |   
| Timing & capacity | Availability overlaps the user’s move-in window and listing has open capacity. |   
| Restrictions | Smoking, pets, food constraints, and house rules must not conflict with explicit non-negotiables. |   
| Visibility & status | Only published, non-reported-hidden listings from eligible users are returned. |   
## **Compatibility scoring**  
**Rank only eligible candidates. **Compatibility is a 0-100 score calculated deterministically from structured fields and semantic similarity. The score is decision support, not a promise of safety or tenancy suitability.  
| | | |  
|-|-|-|  
| **Component** | **Default weight** | **Calculation** |   
| Lifestyle alignment | 35% | Sleep, noise, guests, WFH, smoking/alcohol, pets, and household routines. |   
| Food preferences | 15% | Exact agreement / flexibility / stated conflict. |   
| Sleep & noise | 15% | Structured overlap with explicit conflict penalties. |   
| Cleanliness & habits | 10% | Structured values plus relevant preference text. |   
| Interests & social style | 10% | Semantic similarity of relevant profile text; low impact by design. |   
| Other preferences | 10% | Amenities, commute cues, and optional priorities; never overrides hard filters. |   
| Free-text semantic signal | 5% | Embedding similarity, capped so it cannot mask material conflicts. |   
**Formula: **score = weighted structured alignment + capped semantic signal - explicit conflict penalties. Return component scores and source fields with each result. Weights are configuration values, not frontend constants.  
## **Semantic matching and explanations**  
- Build an embedding input from approved text only: profile lifestyle, deal-breakers, listing rules, and roommate preference text. Exclude direct contact details and sensitive identifiers.  
- An Edge Function generates embeddings when a profile or listing is published/updated. Store model name, embedding version, source hash, and updated timestamp with the vector.  
- Use pgvector cosine similarity to retrieve a bounded candidate set after SQL hard filters. Re-rank in an Edge Function using the deterministic scoring policy.  
- Show 2-4 plain-language reasons, e.g., “Both prefer a quiet late-night routine” and “Budget and move-in date match.” Also show conflicts or unknowns. Never claim psychological certainty or expose hidden data.  
## **Requests and messaging**  
- A requester sends one pending request per target listing/user pair with an optional 300-character note.  
- Recipient can accept, decline, or block. Acceptance creates a conversation; only participants can read or send messages.  
- Use Supabase Realtime for message delivery and request state updates. Persist messages in PostgreSQL; paginate history.  
- Rate-limit requests and messages; provide block/report entry points in every conversation.  
# **6. Data Model (Supabase PostgreSQL)**  
| | |  
|-|-|  
| **Table** | **Key fields / purpose** |   
| profiles | id (auth.users FK), display_name, city, occupation_status, bio, visibility, created_at. |   
| profile_preferences | profile_id, structured lifestyle/search values, budget, localities, dates, deal_breakers, embedding, embedding_version. |   
| listings | id, owner_profile_id, type, status, locality, geo point/approx coordinates, rent, deposit, availability, capacity, details, published_at. |   
| listing_preferences | listing_id, house rules, amenities, roommate requirements, structured household values, embedding, embedding_version. |   
| matches | id, subject_profile_id, target_listing_id/target_profile_id, eligibility snapshot, score, component_scores JSONB, explanation JSONB, computed_at. |   
| requests | id, sender_profile_id, recipient_profile_id, listing_id, status, note, created_at, responded_at. |   
| conversations / messages | conversation participants; message sender, body, created_at, moderation state. |   
| reports / moderation_actions | reporter, subject type/id, reason, evidence, status; admin action and audit metadata. |   
**Indexes: **B-tree indexes for status/city/date/rent and request/message access paths; GIN for JSONB where justified; ivfflat or HNSW pgvector index once corpus size and recall targets justify it. Store exact location separately from public locality and only return allowed precision.  
# **7. Architecture**  
| | |  
|-|-|  
| **Layer** | **Responsibility** |   
| Frontend | Next.js/React + TypeScript. Tailwind/shadcn UI, Supabase client, server-rendered discovery pages where beneficial, form validation, and accessible responsive flows. |   
| Supabase Auth | Email/password or magic link plus OAuth. Profile row created by secure trigger/Edge Function after signup. |   
| PostgreSQL + RLS | Source of truth for profiles, listings, matches, requests, conversations, reports, and policy enforcement. |   
| Storage | Private listing/media buckets. Signed URLs and transform/size limits. Strip metadata where feasible. |   
| Realtime | Conversation messages and request/match status changes only; do not broadcast private profile data. |   
| Edge Functions | Embedding generation, match calculation/re-ranking, request workflow, moderation helpers, rate limits, and privileged operations. |   
| pgvector | Embedding storage and nearest-neighbor retrieval after hard filters. |   
# **8. Security, Privacy, and Trust**  
- Enable Row Level Security on every public schema table. Default deny; add narrow policies for owner access, participant access, and approved discovery fields.  
- Keep Supabase service-role keys only in server-side Edge Function secrets. Never expose them to Next.js clients.  
- Separate public profile/listing fields from private contact, exact-location, moderation, and audit data. Use signed URLs for private media.  
- Require consent before publishing profile/listing discovery data. Support edit, pause, delete/export requests consistent with the launch geography’s privacy requirements.  
- Validate all inputs server-side; moderate image/text uploads; throttle signups, requests, and messages; log security-relevant actions.  
- Do not infer or rank on sensitive traits. Provide transparent explanations, report/block tools, and a visible safety disclaimer.  
# **9. Admin and Reporting Basics**  
- Minimal protected admin view: reports queue, listing/profile status, user suspension/restore, and moderation action history.  
- Operational dashboard: new users, published listings, match views, request sent/accepted, conversations started, reports, and median response time.  
- Analytics events: onboarding_completed, listing_published, match_impression, match_opened, request_sent, request_accepted, conversation_started, report_submitted. Avoid logging message bodies or private free text in product analytics.  
# **10. Functional and Non-Functional Requirements**  
| | |  
|-|-|  
| **Area** | **MVP requirement** |   
| Functional | Users can create/update profiles and listings, receive eligible ranked matches, understand match reasons, request contact, message after acceptance, and report/block. |   
| Performance | Discovery results p95 under 2.5s for a reasonable launch corpus; message delivery typically under 2s; image upload feedback within 10s on normal mobile networks. |   
| Reliability | Use idempotent Edge Function jobs for embeddings/matching; retries with dead-letter/alert handling; preserve last successful match state. |   
| Accessibility | Keyboard-operable flows, semantic forms/labels, contrast-compliant UI, meaningful errors, and mobile-first responsive layouts. |   
| Observability | Structured server logs, error monitoring, request IDs, basic dashboard metrics, and alerts for elevated function failures or moderation backlog. |   
| Quality | Unit tests for scoring and filters; integration tests for RLS and request/messaging permissions; seeded test data for matching scenarios. |   
# **11. Success Metrics**  
| | |  
|-|-|  
| **Metric** | **Initial target / interpretation** |   
| Activation | At least 60% of signed-up users complete a profile and publish a need or listing. |   
| Match engagement | At least 35% of active users open a recommended match; track score/explanation usefulness separately. |   
| Qualified contact | At least 10% of match viewers send a request; at least 30% of requests receive a response. |   
| Safety | Report rate and time-to-review tracked from day one; investigate any serious report immediately. |   
| Match quality | Post-conversation thumbs-up / “relevant match” feedback collected without forcing a rating. |   
# **12. Phased Implementation**  
| | | |  
|-|-|-|  
| **Phase** | **Deliverable** | **Exit criteria** |   
| 0. Foundation | Supabase project, schema/migrations, Auth, RLS policies, Storage bucket, Next.js shell, seed data. | Users can sign in and safely create a private draft profile. |   
| 1. Listings + discovery | Onboarding, profile/preferences, listing creation, hard-filter search, basic result views. | A seeker sees only eligible published listings in test scenarios. |   
| 2. Compatibility | Embedding pipeline, pgvector retrieval, scoring/re-ranking, explanations, feedback signal. | Scoring tests cover agreement, conflict, unknown, and semantic paraphrase cases. |   
| 3. Contact + safety | Requests, Realtime messaging, block/report, basic admin queue, rate limits. | RLS tests prove that non-participants cannot access conversations or hidden data. |   
| 4. Pilot and iterate | Small-city/campus pilot, funnel instrumentation, moderation playbook, scoring calibration. | Evidence of qualified contacts and no unresolved critical trust/safety gaps. |   
# **13. Codex Development Guidance**  
- Start with a Supabase SQL migration and RLS policy review before UI polish. Keep schema, policies, and Edge Functions versioned in the repository.  
- Ask Codex to build in vertical slices: auth/profile; listing; hard-filter discovery; semantic ranking; requests/messages; admin. Verify each slice with seeded test data.  
- Keep matching policy in one typed server-side module/config. Add test fixtures for vegetarian/non-vegetarian, quiet/night-owl, smoker/non-smoker, budget, and paraphrase examples such as “introvert” vs. “quiet person.”  
- Use generated Supabase TypeScript types; validate forms and Edge Function inputs with a shared schema library. Never call privileged operations from the browser.  
- Before release, have Codex test RLS as anonymous, ordinary user, listing owner, request participant, and admin. Treat any cross-user data exposure as a release blocker.  
# **14. MVP Acceptance Checklist**  
- A new user can onboard, publish a profile/listing, and edit or pause it.  
- Discovery applies budget, location, availability, capacity, and explicit restriction filters before ranking.  
- Each result includes score, positive reasons, and conflicts/unknowns without exposing private fields.  
- Embeddings refresh after relevant content changes and never make a non-eligible result appear eligible.  
- Requests and messages obey participant-only RLS; blocking/reporting works from user-facing surfaces.  
- Admin can triage a report and remove a listing/profile from discovery.  
- Core funnels, errors, and moderation events are observable.  
