"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUserListings, updateListingStatus, deleteListing, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import DashboardSidebar from "../../../components/DashboardSidebar";




export default function MyListingsPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const notify = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const data = await getUserListings();
      setListings(data);
    } catch (err) {
      notify(readableError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchListings();
  }, [user]);

  const handleStatusChange = async (id: string, status: "published" | "paused" | "filled") => {
    try {
      await updateListingStatus(id, status);
      notify(`Listing ${status}.`);
      fetchListings();
    } catch (err) { notify(readableError(err)); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this listing? This cannot be undone.")) return;
    try {
      await deleteListing(id);
      notify("Listing deleted.");
      fetchListings();
    } catch (err) { notify(readableError(err)); }
  };

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <h1>My Listings</h1>
          <Link href="/dashboard/listings/new" className="btn-primary" style={{ textDecoration: "none", marginTop: "4px" }}>
            + Create Listing
          </Link>
        </div>
        <p className="sub">Rooms you&apos;ve posted for potential roommates.</p>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading your listings…</p>
        ) : listings.length === 0 ? (
          <div style={{ border: "1px dashed var(--line)", borderRadius: "18px", padding: "48px 32px", textAlign: "center", background: "#fafdf8" }}>
            <span style={{ fontSize: "40px" }}>🏠</span>
            <p style={{ fontFamily: "Fraunces,serif", fontSize: "20px", fontWeight: 600, margin: "12px 0 6px" }}>No listings yet</p>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>Post your first room to start finding compatible roommates.</p>
            <Link href="/dashboard/listings/new" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              Create your first listing <span>→</span>
            </Link>
          </div>
        ) : (
          <div>
            {listings.map((listing) => (
              <div key={listing.id} className="listing-manage-card">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "16px" }}>
                      {listing.title || `${listing.room_type} in ${listing.locality}`}
                    </strong>
                    <span className={`status-badge ${listing.status}`}>{listing.status}</span>
                  </div>
                  <p className="listing-manage-meta">
                    📍 {listing.locality}, {listing.city} &nbsp;·&nbsp; <b>₹{listing.rent?.toLocaleString("en-IN")}</b>/month
                    &nbsp;·&nbsp; {listing.open_spots} spot{listing.open_spots !== 1 ? "s" : ""} available
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
                    Available from: {listing.available_from
                      ? new Date(listing.available_from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                  <div className="listing-actions" style={{ marginTop: "14px" }}>
                    <button className="btn-sm" onClick={() => router.push(`/dashboard/listings/${listing.id}/edit`)}>
                      ✏️ Edit
                    </button>
                    {listing.status !== "published" && (
                      <button className="btn-sm" onClick={() => handleStatusChange(listing.id, "published")}>
                        ✅ Publish
                      </button>
                    )}
                    {listing.status === "published" && (
                      <button className="btn-sm" onClick={() => handleStatusChange(listing.id, "paused")}>
                        ⏸ Pause
                      </button>
                    )}
                    {listing.status !== "filled" && (
                      <button className="btn-sm" onClick={() => handleStatusChange(listing.id, "filled")}>
                        🏷 Mark Filled
                      </button>
                    )}
                    <Link href={`/listings/${listing.id}`} className="btn-sm" style={{ textDecoration: "none" }}>
                      👁 View
                    </Link>
                    <button className="btn-sm danger" onClick={() => handleDelete(listing.id)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {notice && <div className="toast">✓ {notice}</div>}
    </div>
  );
}
