"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getListingById, sendRoomieRequest, toggleFavorite, getFavorites, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";

const gradients = ["linear-gradient(135deg,#fbc7a9,#ef8d77)", "linear-gradient(135deg,#d6eee3,#8fcdbb)", "linear-gradient(135deg,#e9ddfc,#b5ace8)", "linear-gradient(135deg,#ffe5bd,#efa377)"];

export default function ListingDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotice(msg); setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getListingById(listingId);
        setListing(data);
        if (user) {
          const favs = await getFavorites();
          setIsFavorite(favs.includes(listingId));
        }
      } catch (err) {
        notify(readableError(err), "error");
      } finally {
        setLoading(false);
      }
    };
    if (listingId) fetch();
  }, [listingId, user]);

  const handleSendRequest = async () => {
    if (!user) { router.push("/login?redirect=/listings/" + listingId); return; }
    setRequesting(true);
    try {
      await sendRoomieRequest(listing.id, listing.owner_profile_id, requestNote.trim() || undefined);
      notify("Request sent! The owner will review it shortly.");
      setShowRequestForm(false);
      setRequestNote("");
    } catch (err) {
      notify(readableError(err), "error");
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) { router.push("/login?redirect=/listings/" + listingId); return; }
    await toggleFavorite(listingId);
    setIsFavorite((v) => !v);
  };

  if (loading) return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <p style={{ color: "var(--muted)" }}>Loading listing…</p>
    </main>
  );

  if (!listing) return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <p style={{ fontSize: "40px" }}>🏠</p>
        <h1 style={{ fontFamily: "Fraunces,serif", fontSize: "24px", margin: "12px 0 8px" }}>Listing not found</h1>
        <p style={{ color: "var(--muted)", marginBottom: "20px" }}>This listing may have been removed or filled.</p>
        <Link href="/matches" className="btn-primary" style={{ textDecoration: "none" }}>Browse matches →</Link>
      </div>
    </main>
  );

  const prefs = listing.listing_preferences;
  const ownerName = listing.profiles?.display_name || "Host";
  const gradientBg = gradients[parseInt(listingId.slice(-4), 16) % 4];
  const isOwn = user?.id === listing.owner_profile_id;

  return (
    <main className="shell listing-detail-wrap">
      {/* Hero */}
      <div className="listing-detail-hero" style={{ background: gradientBg, position: "relative" }}>
        <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "10px" }}>
          <button
            onClick={handleToggleFavorite}
            style={{ background: "white", border: "none", borderRadius: "50%", width: "40px", height: "40px", fontSize: "20px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}
            aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
        </div>
        <div style={{ position: "absolute", bottom: "16px", left: "20px", background: "rgba(22,50,53,.78)", color: "white", borderRadius: "14px", padding: "8px 14px" }}>
          <span style={{ fontWeight: 800, fontSize: "14px" }}>{listing.room_type}</span>
          <span style={{ fontSize: "11px", opacity: .8, marginLeft: "8px" }}>· {listing.open_spots} spot{listing.open_spots !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="listing-detail-grid">
        {/* Main */}
        <div className="listing-detail-main">
          <p style={{ margin: "0 0 6px", fontSize: "12px", color: "var(--muted)", fontWeight: 700 }}>
            📍 {listing.locality}, {listing.city}
          </p>
          <h1>{listing.title || `${listing.room_type} in ${listing.locality}`}</h1>
          <p className="listing-detail-meta">
            Hosted by <strong>{ownerName}</strong>
            {listing.available_from && ` · Available from ${new Date(listing.available_from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
          </p>

          {listing.description && (
            <>
              <p className="detail-section-title">About this place</p>
              <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--ink)" }}>{listing.description}</p>
            </>
          )}

          {listing.amenities?.length > 0 && (
            <>
              <p className="detail-section-title">Amenities</p>
              <div className="amenity-list">
                {listing.amenities.map((a: string) => <span key={a} className="amenity-chip">{a}</span>)}
              </div>
            </>
          )}

          {prefs && (
            <>
              <p className="detail-section-title">Home preferences</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  ["🍽️", "Food", prefs.food_preference],
                  ["🚬", "Smoking", prefs.smoking_preference],
                  ["🔇", "Noise", prefs.noise_level],
                  ["😴", "Sleep", prefs.sleep_schedule],
                  ["🐾", "Pets", prefs.pets_preference],
                  ["🧹", "Cleanliness", prefs.cleanliness_level],
                ].filter(([,, v]) => v).map(([icon, label, value]) => (
                  <div key={label as string} style={{ display: "flex", gap: "8px", padding: "10px 12px", background: "var(--cream)", borderRadius: "10px" }}>
                    <span>{icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>{(value as string).replace(/-/g, " ")}</p>
                    </div>
                  </div>
                ))}
              </div>

              {prefs.house_rules && (
                <>
                  <p className="detail-section-title">House rules</p>
                  <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--ink)", background: "#fafdf8", border: "1px solid var(--line)", borderRadius: "12px", padding: "14px 16px" }}>
                    {prefs.house_rules}
                  </p>
                </>
              )}

              {prefs.roommate_preference_text && (
                <>
                  <p className="detail-section-title">Ideal roommate</p>
                  <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--ink)" }}>{prefs.roommate_preference_text}</p>
                </>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="request-sidebar">
          <div className="rent-display">
            ₹{listing.rent?.toLocaleString("en-IN")} <span>/ month</span>
          </div>
          {listing.deposit && (
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 0" }}>
              Deposit: ₹{listing.deposit?.toLocaleString("en-IN")}
            </p>
          )}

          {!isOwn && (
            <>
              {!showRequestForm ? (
                <button
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", marginTop: "18px" }}
                  onClick={() => user ? setShowRequestForm(true) : router.push("/login?redirect=/listings/" + listingId)}
                >
                  Send Request <span>→</span>
                </button>
              ) : (
                <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
                  <label className="auth-label">
                    Message to host <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span>
                    <textarea
                      className="auth-input"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      maxLength={300}
                      rows={3}
                      style={{ resize: "none", lineHeight: 1.6 }}
                      placeholder="Tell them a little about yourself and why this place suits you…"
                    />
                  </label>
                  <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSendRequest} disabled={requesting}>
                    {requesting ? "Sending…" : "Confirm Request"} {!requesting && <span>→</span>}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowRequestForm(false)} style={{ width: "100%" }}>Cancel</button>
                </div>
              )}
              <button
                onClick={handleToggleFavorite}
                style={{ width: "100%", marginTop: "10px", background: "none", border: "1px solid var(--line)", borderRadius: "100px", padding: "11px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
              >
                {isFavorite ? "❤️ Saved" : "🤍 Save to favorites"}
              </button>
            </>
          )}

          {isOwn && (
            <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>This is your listing.</p>
              <Link href={`/dashboard/listings/${listing.id}/edit`} className="btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
                ✏️ Edit listing
              </Link>
            </div>
          )}

          {notice && (
            <div className={`auth-notice ${noticeType}`} style={{ marginTop: "14px" }}>{notice}</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "32px" }}>
        <Link href="/matches" style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none", fontWeight: 700 }}>
          ← Back to matches
        </Link>
      </div>
    </main>
  );
}
