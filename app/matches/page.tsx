"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMatches, getSeekerProfile, readableError, getFavorites, getUserListings, getSeekerMatches } from "../../lib/roomie-api";
import MatchCard, { Listing } from "../../components/MatchCard";
import { useAuth } from "../../lib/auth-context";
import Link from "next/link";

const asListing = (match: any, index: number, isSeeker: boolean = false): Listing => ({
  id: match.listing_id || match.seeker_profile_id, 
  recipientId: match.owner_profile_id || match.seeker_profile_id, 
  name: match.owner_name || match.seeker_name,
  initials: (match.owner_name || match.seeker_name || "U").split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
  neighborhood: match.locality || match.preferred_localities?.[0] || "Anywhere", 
  city: match.city, 
  rent: match.rent || match.budget_max, 
  score: match.score,
  tags: (match.amenities ?? []).slice(0, 3), 
  image: ["sunset", "mint", "lilac", "peach"][index % 4],
  available: `Available ${new Date(match.available_from || match.move_in_from || new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
  room: match.room_type ? `${match.room_type} · ${match.open_spots} spot${match.open_spots === 1 ? "" : "s"}` : "Seeker Profile",
  reasons: match.reasons && match.reasons.length ? match.reasons : ["Matches your basic criteria"],
  isSeeker,
  sharingCapacity: match.sharing_capacity || 1,
});

export default function MatchesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeListings, setActiveListings] = useState<Listing[]>([]);
  const [notice, setNotice] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mode, setMode] = useState<"find" | "post">("find");
  const [myListings, setMyListings] = useState<any[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };
  const toggleSave = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const fetchMatches = async (currentMode: "find" | "post", targetListingId?: string) => {
    setLoading(true);
    try {
      const favs = await getFavorites();
      setFavorites(favs);

      if (currentMode === "find") {
        const prefs = await getSeekerProfile();
        if (!prefs?.city) {
          notify("Set your stay preferences to see matches.");
          setActiveListings([]);
          setLoading(false);
          return;
        }
        const matches = await getMatches(prefs.city, prefs.budgetMax || undefined);
        setActiveListings(matches.map((m, i) => asListing(m, i, false)));
      } else {
        if (!targetListingId) {
          setActiveListings([]);
          setLoading(false);
          return;
        }
        const seekers = await getSeekerMatches(targetListingId);
        setActiveListings(seekers.map((m: any, i: number) => asListing(m, i, true)));
      }
    } catch (error) {
      notify(readableError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const listings = await getUserListings();
      setMyListings(listings);
      if (listings.length > 0) setSelectedListingId(listings[0].id);
      
      const enforcedMode = profile?.role === "owner" ? "post" : "find";
      setMode(enforcedMode);
      fetchMatches(enforcedMode, listings.length > 0 ? listings[0].id : undefined);
    };
    if (!authLoading && user && profile) init();
    else if (!authLoading && !user) router.push("/login?redirect=/matches");
  }, [authLoading, user, profile]);

  useEffect(() => {
    // Re-fetch when owner selects a different listing
    if (mode === "post" && selectedListingId) {
      fetchMatches(mode, selectedListingId);
    }
  }, [selectedListingId]);

  return (
    <main>
      <section className="matches-section shell" id="matches" style={{ marginTop: "40px" }}>
        <div className="section-top" style={{ flexWrap: "wrap", gap: "20px" }}>
          <div>
            <p className="eyebrow">A BETTER WAY TO SHARE A HOME</p>
            <h2>{mode === "post" ? "Seekers matching your home" : "Your best-fit matches"}</h2>
            <p>Based on your profile preferences and compatibility score.</p>
          </div>
        </div>
        
        {mode === "post" && myListings.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px", color: "#64748b" }}>Select your listing to find matches: </label>
            <select value={selectedListingId} onChange={(e) => setSelectedListingId(e.target.value)} style={{ marginLeft: "8px", padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              {myListings.map(l => <option key={l.id} value={l.id}>{l.locality}, {l.city} (₹{l.rent})</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <p>Finding your best matches...</p>
        ) : (
          <>
            <div className="listing-grid">
              {activeListings.map((listing) => (
                <MatchCard
                  key={listing.id}
                  listing={listing}
                  isFavorite={favorites.includes(listing.id)}
                  onToggleFavorite={toggleSave}
                  notify={notify}
                  ownerListingId={mode === "post" ? selectedListingId : undefined}
                />
              ))}
            </div>
            {activeListings.length === 0 && (
              <div className="empty-matches">
                <b>No eligible matches found.</b>
                <span>Try broadening your preferences or check back later.</span>
                <br /><br />
                {mode === "find" && <button className="ghost-button" onClick={() => router.push("/dashboard/preferences")}>Update Preferences</button>}
                {mode === "post" && myListings.length === 0 && <button className="ghost-button" onClick={() => router.push("/dashboard/listings/new")}>Post a Listing</button>}
              </div>
            )}
          </>
        )}
      </section>
      {notice && <div className="toast">✓ {notice}</div>}
    </main>
  );
}
