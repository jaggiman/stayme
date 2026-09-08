"use client";

import Link from "next/link";
import { useAuth } from "../../../lib/auth-context";
import DashboardSidebar from "../../../components/DashboardSidebar";


const navItems = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/preferences", label: "Stay Preferences" },
  { href: "/dashboard/listings", label: "My Listings" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/favorites", label: "Favorites" },
];

export default function DashboardOverviewPage() {
  const { user, profile } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  const role = profile?.role ?? "";
  const isSeeker = role === "seeker" || role === "";
  const isOwner = role === "owner" || role === "";

  const quickLinks = [
    { href: "/matches", emoji: "🎯", title: "View Matches", desc: "See your best-fit rooms and roommates.", show: true },
    { href: "/dashboard/preferences", emoji: "⚙️", title: "Stay Preferences", desc: "Update budget, location, and lifestyle.", show: isSeeker },
    { href: "/dashboard/listings", emoji: "🏠", title: "My Listings", desc: "Manage your posted rooms.", show: isOwner },
    { href: "/dashboard/requests", emoji: "📬", title: "Requests", desc: "Review incoming and outgoing requests.", show: true },
    { href: "/messages", emoji: "💬", title: "Messages", desc: "Continue conversations with matches.", show: true },
    { href: "/dashboard/favorites", emoji: "❤️", title: "Favorites", desc: "Rooms you've saved for later.", show: true },
  ].filter((l) => l.show);

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      {/* Content */}
      <main className="dashboard-content">
        <h1>Welcome back, {displayName}! 👋</h1>
        <p className="sub">Here&apos;s a quick look at your FindMyRoomie dashboard.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                border: "1px solid var(--line)",
                borderRadius: "16px",
                padding: "22px",
                background: "#fff",
                transition: "all .18s",
                cursor: "pointer",
                height: "100%",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(22,50,53,.1)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                }}
              >
                <span style={{ fontSize: "28px", display: "block", marginBottom: "10px" }}>{link.emoji}</span>
                <strong style={{ fontSize: "14px", display: "block", marginBottom: "5px", color: "var(--ink)" }}>{link.title}</strong>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
