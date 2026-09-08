"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role ?? ""; // default to showing all if role unknown

  const isSeeker = role === "seeker" || role === "";
  const isOwner = role === "owner" || role === "";

  const links = [
    { href: "/dashboard/profile", label: "My Profile", show: true },
    { href: "/dashboard/preferences", label: "Stay Preferences", show: isSeeker },
    { href: "/dashboard/listings", label: "My Listings", show: isOwner },
    { href: "/dashboard/requests", label: "Requests", show: true },
  ].filter((l) => l.show);

  return (
    <aside className="dashboard-sidebar">
      <p className="sidebar-section">Dashboard</p>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`sidebar-link${pathname === l.href ? " active" : ""}`}
        >
          {l.label}
        </Link>
      ))}
      <p className="sidebar-section">Discover</p>
      <Link href="/matches" className={`sidebar-link${pathname === "/matches" ? " active" : ""}`}>
        Matches
      </Link>
      <Link href="/messages" className={`sidebar-link${pathname === "/messages" ? " active" : ""}`}>
        Messages
      </Link>
    </aside>
  );
}
