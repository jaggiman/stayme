"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

export default function Nav() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const role = profile?.role ?? "both";
  const isSeeker = role === "seeker" || role === "both";
  const isOwner = role === "owner" || role === "both";

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  };

  const signedIn = Boolean(user);

  return (
    <>
      <nav className="nav shell">
        {/* Brand */}
        <Link href="/" className="brand">
          <span className="brand-mark">R</span>
          <span>roomie<span className="dot">.</span></span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links">
          {!loading && signedIn && (
            <>
              <Link href="/matches">Matches</Link>
              <Link href="/messages">Messages</Link>
              {/* Dashboard dropdown */}
              <div
                className="nav-dropdown"
                ref={dropdownRef}
              >
                <button
                  className="ghost-button"
                  style={{ padding: "0 12px" }}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  Dashboard ▾
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu" onClick={() => setDropdownOpen(false)}>
                    <Link href="/dashboard/overview">Overview</Link>
                    <Link href="/dashboard/profile">My Profile</Link>
                    {isSeeker && <Link href="/dashboard/preferences">Stay Preferences</Link>}
                    {isOwner && <Link href="/dashboard/listings">My Listings</Link>}
                    {isOwner && <Link href="/dashboard/requests">Requests</Link>}
                    {isSeeker && <Link href="/dashboard/favorites">Favorites</Link>}
                  </div>
                )}
              </div>
            </>
          )}

          {!loading && !signedIn && (
            <>
              <Link href="/matches">Discover</Link>
              <a href="/#how">How it works</a>
            </>
          )}

          {!loading && (
            signedIn ? (
              <button className="ghost-button" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" className="ghost-button" style={{ fontWeight: 700 }}>
                  Sign in
                </Link>
                <Link href="/signup" className="nav-cta">
                  Get started <span>→</span>
                </Link>
              </>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="hamburger"
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button
              className="mobile-menu-close"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
            <div className="mobile-menu-links">
              {signedIn ? (
                <>
                  <Link href="/matches" onClick={() => setMenuOpen(false)}>Matches</Link>
                  <Link href="/messages" onClick={() => setMenuOpen(false)}>Messages</Link>
                  <Link href="/dashboard/overview" onClick={() => setMenuOpen(false)}>Overview</Link>
                  <Link href="/dashboard/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
                  <Link href="/dashboard/preferences" onClick={() => setMenuOpen(false)}>Stay Preferences</Link>
                  <Link href="/dashboard/listings" onClick={() => setMenuOpen(false)}>My Listings</Link>
                  <Link href="/dashboard/requests" onClick={() => setMenuOpen(false)}>Requests</Link>
                  <Link href="/dashboard/favorites" onClick={() => setMenuOpen(false)}>Favorites</Link>
                  <button
                    className="ghost-button mobile-signout"
                    onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/matches" onClick={() => setMenuOpen(false)}>Discover</Link>
                  <a href="/#how" onClick={() => setMenuOpen(false)}>How it works</a>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
                  <Link href="/signup" className="nav-cta" onClick={() => setMenuOpen(false)}>
                    Get started <span>→</span>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
