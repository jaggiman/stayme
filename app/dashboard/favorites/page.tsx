"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getFavoriteListings, toggleFavorite, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import DashboardSidebar from "../../../components/DashboardSidebar";

const gradients = [
  "linear-gradient(135deg,#fbc7a9,#ef8d77)",
  "linear-gradient(135deg,#d6eee3,#8fcdbb)",
  "linear-gradient(135deg,#e9ddfc,#b5ace8)",
  "linear-gradient(135deg,#ffe5bd,#efa377)",
];

export default function FavoritesDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await getFavoriteListings();
      setListings(data);
    } catch (err) {
      setNotice(readableError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const handleRemove = async (listingId: string) => {
    await toggleFavorite(listingId);
    setListings((prev) => prev.filter((l) => l.listing_id !== listingId));
  };

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <h1>Favorites</h1>
        <p className="sub">Listings you&apos;ve saved. Come back to them anytime.</p>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading your favorites…</p>
        ) : listings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              border: "1px dashed var(--line)",
              borderRadius: "18px",
              background: "#fafdf8",
            }}
          >
            <span style={{ fontSize: "40px" }}>❤️</span>
            <p
              style={{
                fontFamily: "Fraunces,serif",
                fontSize: "20px",
                fontWeight: 600,
                margin: "12px 0 6px",
              }}
            >
              Nothing saved yet
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
              Tap the heart on any listing to save it here.
            </p>
            <Link
              href="/matches"
              className="btn-primary"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              Browse matches <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="listing-grid">
            {listings.map((listing, idx) => (
              <div key={listing.listing_id} className="listing-card">
                <div
                  className="listing-image"
                  style={{ background: gradients[idx % 4] }}
                >
                  <div className="image-pattern" />
                  <button
                    className="save-button saved"
                    onClick={() => handleRemove(listing.listing_id)}
                    aria-label="Remove from favorites"
                  >
                    ❤️
                  </button>
                  <div className="listing-type">{listing.room_type}</div>
                  <div
                    className="initials"
                    style={{ background: "rgba(22,50,53,.78)" }}
                  >
                    {listing.owner_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="card-body">
                  <h3>{listing.locality}</h3>
                  <p className="location">📍 {listing.city}</p>
                  <p className="rent">
                    ₹{listing.rent?.toLocaleString("en-IN")}
                    <span>/ month</span>
                  </p>
                  {listing.amenities?.slice(0, 3).length > 0 && (
                    <div className="tags">
                      {listing.amenities
                        .slice(0, 3)
                        .map((a: string) => (
                          <span key={a}>{a}</span>
                        ))}
                    </div>
                  )}
                  <Link
                    href={`/listings/${listing.listing_id}`}
                    className="view-button"
                  >
                    View listing <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {notice && <div className="toast">⚠️ {notice}</div>}
    </div>
  );
}
