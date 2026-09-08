import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoomieMatch = {
  listing_id: string;
  owner_profile_id: string;
  owner_name: string;
  locality: string;
  city: string;
  rent: number;
  available_from: string;
  open_spots: number;
  room_type: string;
  amenities: string[] | null;
  score: number;
  reasons: string[];
};

// ─── Matching ─────────────────────────────────────────────────────────────────

export async function getMatches(city: string, maxRent?: number): Promise<RoomieMatch[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("find_listing_matches", {
    p_city: city,
    p_max_rent: maxRent ?? null,
  });
  if (error) throw error;
  return (data ?? []).map((item: RoomieMatch) => ({
    ...item,
    score: Number(item.score),
    reasons: Array.isArray(item.reasons)
      ? item.reasons
      : typeof item.reasons === "string"
        ? JSON.parse(item.reasons)
        : [],
  }));
}

export async function getSeekerMatches(listingId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("find_seeker_matches", { p_listing_id: listingId });
  if (error) throw error;
  return data || [];
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  occupation?: string;
  city?: string;
}) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const patch: Record<string, unknown> = {};
  if (updates.displayName !== undefined) patch.display_name = updates.displayName;
  if (updates.bio !== undefined) patch.bio = updates.bio;
  if (updates.occupation !== undefined) patch.occupation_status = updates.occupation;
  if (updates.city !== undefined) patch.city = updates.city;
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function getSeekerProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("city").eq("id", user.id).maybeSingle();
  const { data: prefs } = await supabase.from("profile_preferences").select("*").eq("profile_id", user.id).maybeSingle();
  return { city: profile?.city, budgetMax: prefs?.budget_max, ...prefs };
}

export type SeekerProfileInput = {
  displayName: string;
  city: string;
  locality: string;
  budgetMin?: number;
  budgetMax: number;
  moveInFrom: string;
  foodPreference: string;
  smokingPreference: string;
  sleepSchedule: string;
  noiseLevel: string;
  petsPreference?: string;
  cleanlinessLevel?: string;
  guestFrequency?: string;
  wfhFrequency?: string;
  coGenderPreference?: string;
  lifestyleText: string;
};

export async function saveSeekerProfile(input: SeekerProfileInput) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first, then save your stay preferences.");

  // Update profile fields (city, name)
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: input.displayName,
    city: input.city,
    visibility: true,
  });
  if (profileError) throw profileError;

  // Upsert preferences — only update what is provided, preserve the rest
  const prefPatch: Record<string, unknown> = {
    profile_id: user.id,
    budget_max: input.budgetMax,
    preferred_localities: input.locality ? [input.locality] : [],
    move_in_from: input.moveInFrom,
    food_preference: input.foodPreference,
    smoking_preference: input.smokingPreference,
    sleep_schedule: input.sleepSchedule,
    noise_level: input.noiseLevel,
    lifestyle_text: input.lifestyleText,
    updated_at: new Date().toISOString(),
  };
  if (input.budgetMin !== undefined) prefPatch.budget_min = input.budgetMin;
  if (input.petsPreference !== undefined) prefPatch.pets_preference = input.petsPreference;
  if (input.cleanlinessLevel !== undefined) prefPatch.cleanliness_level = input.cleanlinessLevel;
  if (input.guestFrequency !== undefined) prefPatch.guest_frequency = input.guestFrequency;
  if (input.wfhFrequency !== undefined) prefPatch.wfh_frequency = input.wfhFrequency;
  if (input.coGenderPreference !== undefined) prefPatch.co_gender_preference = input.coGenderPreference;

  const { error: preferencesError } = await supabase.from("profile_preferences").upsert(prefPatch);
  if (preferencesError) throw preferencesError;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export type RoomListingInput = {
  title?: string;
  city: string;
  locality: string;
  rent: number;
  deposit?: number;
  availableFrom: string;
  openSpots: number;
  roomType: string;
  bhk?: string;
  sharingCapacity?: number;
  amenities: string[];
  description?: string;
  foodPreference: string;
  smokingPreference: string;
  noiseLevel: string;
  houseRules: string;
  roommatePreferenceText: string;
  petsPreference?: string;
  cleanlinessLevel?: string;
  sleepSchedule?: string;
  coGenderPreference?: string;
};

export async function publishRoomListing(input: RoomListingInput) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first, then publish your room.");

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      owner_profile_id: user.id,
      status: "published",
      title: input.title || `${input.roomType} in ${input.locality}`,
      city: input.city,
      locality: input.locality,
      rent: input.rent,
      deposit: input.deposit ?? null,
      available_from: input.availableFrom,
      open_spots: input.openSpots,
      room_type: input.roomType,
      bhk: input.bhk ?? null,
      sharing_capacity: input.sharingCapacity ?? 1,
      amenities: input.amenities,
      description: input.description ?? null,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (listingError) throw listingError;

  const { error: preferenceError } = await supabase.from("listing_preferences").upsert({
    listing_id: listing.id,
    food_preference: input.foodPreference,
    smoking_preference: input.smokingPreference,
    noise_level: input.noiseLevel,
    house_rules: input.houseRules,
    roommate_preference_text: input.roommatePreferenceText,
    pets_preference: input.petsPreference ?? null,
    cleanliness_level: input.cleanlinessLevel ?? null,
    sleep_schedule: input.sleepSchedule ?? null,
    co_gender_preference: input.coGenderPreference ?? null,
    updated_at: new Date().toISOString(),
  });
  if (preferenceError) throw preferenceError;
  return listing.id as string;
}

export async function getUserListings() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("listings")
    .select("*, listing_preferences(*)")
    .eq("owner_profile_id", user.id)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getListingById(id: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("listings")
    .select("*, listing_preferences(*), profiles!listings_owner_profile_id_fkey(display_name, city)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function updateListing(id: string, input: Partial<RoomListingInput>) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const listingPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) listingPatch.title = input.title;
  if (input.city !== undefined) listingPatch.city = input.city;
  if (input.locality !== undefined) listingPatch.locality = input.locality;
  if (input.rent !== undefined) listingPatch.rent = input.rent;
  if (input.deposit !== undefined) listingPatch.deposit = input.deposit;
  if (input.availableFrom !== undefined) listingPatch.available_from = input.availableFrom;
  if (input.openSpots !== undefined) listingPatch.open_spots = input.openSpots;
  if (input.roomType !== undefined) listingPatch.room_type = input.roomType;
  if (input.bhk !== undefined) listingPatch.bhk = input.bhk;
  if (input.sharingCapacity !== undefined) listingPatch.sharing_capacity = input.sharingCapacity;
  if (input.amenities !== undefined) listingPatch.amenities = input.amenities;
  if (input.description !== undefined) listingPatch.description = input.description;

  const { error } = await supabase.from("listings").update(listingPatch).eq("id", id).eq("owner_profile_id", user.id);
  if (error) throw error;

  // Update preferences if any provided
  const prefPatch: Record<string, unknown> = { listing_id: id, updated_at: new Date().toISOString() };
  if (input.foodPreference !== undefined) prefPatch.food_preference = input.foodPreference;
  if (input.smokingPreference !== undefined) prefPatch.smoking_preference = input.smokingPreference;
  if (input.noiseLevel !== undefined) prefPatch.noise_level = input.noiseLevel;
  if (input.houseRules !== undefined) prefPatch.house_rules = input.houseRules;
  if (input.roommatePreferenceText !== undefined) prefPatch.roommate_preference_text = input.roommatePreferenceText;
  if (input.petsPreference !== undefined) prefPatch.pets_preference = input.petsPreference;
  if (input.cleanlinessLevel !== undefined) prefPatch.cleanliness_level = input.cleanlinessLevel;
  if (input.sleepSchedule !== undefined) prefPatch.sleep_schedule = input.sleepSchedule;
  if (input.coGenderPreference !== undefined) prefPatch.co_gender_preference = input.coGenderPreference;

  if (Object.keys(prefPatch).length > 2) {
    await supabase.from("listing_preferences").upsert(prefPatch);
  }
}

export async function updateListingStatus(id: string, status: "published" | "paused" | "filled") {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase
    .from("listings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_profile_id", user.id);
  if (error) throw error;
}

export async function deleteListing(id: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("listings").delete().eq("id", id).eq("owner_profile_id", user.id);
  if (error) throw error;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function sendRoomieRequest(listingId: string, recipientId: string, note?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in before sending a request.");

  // Check for duplicate pending request
  const { data: existing } = await supabase
    .from("requests")
    .select("id, status")
    .eq("sender_profile_id", user.id)
    .eq("listing_id", listingId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) throw new Error("You already have a pending request for this listing.");

  const { error } = await supabase.from("requests").insert({
    sender_profile_id: user.id,
    recipient_profile_id: recipientId,
    listing_id: listingId,
    note: note?.trim() || null,
  });
  if (error) throw error;
}

export async function getRequests() {
  if (!supabase) return { incoming: [], outgoing: [] };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { incoming: [], outgoing: [] };

  const { data: incoming } = await supabase
    .from("requests")
    .select("*, sender:profiles!requests_sender_profile_id_fkey(display_name, city), listing:listings(id, locality, city, rent)")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: false });

  const { data: outgoing } = await supabase
    .from("requests")
    .select("*, recipient:profiles!requests_recipient_profile_id_fkey(display_name, city), listing:listings(id, locality, city, rent)")
    .eq("sender_profile_id", user.id)
    .order("created_at", { ascending: false });

  return { incoming: incoming || [], outgoing: outgoing || [] };
}

export async function respondToRequest(requestId: string, accept: boolean) {
  if (!supabase) throw new Error("Supabase is not configured.");
  // Use the server-side RPC which atomically creates the conversation
  const { data, error } = await supabase.rpc("respond_to_roomie_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as string | null; // returns conversation_id if accepted
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export async function getConversations() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversations(id, created_at, request_id)")
    .eq("profile_id", user.id);

  if (error) throw error;
  return data || [];
}

export async function getConversationWithPartner(conversationId: string, myUserId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("conversation_participants")
    .select("profile_id, profiles(id, display_name, city, occupation_status)")
    .eq("conversation_id", conversationId)
    .neq("profile_id", myUserId);
  const row = data?.[0] ?? null;
  if (!row) return null;
  // Normalise: Supabase returns profiles as an object (not array) for a FK join
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return { ...row, profiles: profile };
}

// Read-only public profile (profiles table only — no lifestyle prefs)
export async function getPublicProfile(userId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, city, occupation_status, bio, gender, role")
    .eq("id", userId)
    .eq("visibility", true)
    .maybeSingle();
  return data;
}

export async function getMessages(conversationId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId: string, body: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: user.id,
    body: body.trim(),
  });
  if (error) throw error;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function toggleFavorite(listingId: string) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("id", existing.id);
  } else {
    await supabase.from("favorites").insert({ profile_id: user.id, listing_id: listingId });
  }
}

export async function getFavorites() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("favorites").select("listing_id").eq("profile_id", user.id);
  return data?.map((d) => d.listing_id) || [];
}

export async function getFavoriteListings() {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select(`listing_id, listings(
      id, owner_profile_id, locality, city, rent, available_from,
      open_spots, room_type, amenities,
      profiles!listings_owner_profile_id_fkey(display_name)
    )`)
    .eq("profile_id", user.id);
  if (error) throw error;

  return data.map((fav: any) => {
    const match = fav.listings;
    return {
      listing_id: match.id,
      owner_profile_id: match.owner_profile_id,
      owner_name: match.profiles?.display_name || "Unknown",
      locality: match.locality,
      city: match.city,
      rent: match.rent,
      available_from: match.available_from,
      open_spots: match.open_spots,
      room_type: match.room_type,
      amenities: match.amenities,
      score: 100,
      reasons: ["Saved to your favorites"],
    };
  });
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (message.includes("find_listing_matches"))
    return "Your matching setup is not ready yet. Run the latest Supabase migration, then refresh.";
  if (message.includes("JWT") || message.includes("Auth session"))
    return "Your sign-in session expired. Please sign in again.";
  if (message.includes("already have a pending request"))
    return message;
  return message;
}
