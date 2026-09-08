"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { getUserProfile, updateProfile, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import DashboardSidebar from "../../../components/DashboardSidebar";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];
const occupations = ["Working Professional", "Student", "Freelancer", "Intern", "Other"];


export default function ProfileDashboard() {
  const { user, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [occupation, setOccupation] = useState("Working Professional");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setDisplayName(profile.display_name || "");
          setCity(profile.city || "Bengaluru");
          setOccupation(profile.occupation_status || "Working Professional");
          setBio(profile.bio || "");
          setGender(profile.gender || "Male");
          setRole(profile.role || "seeker");
        }
      } catch (err) {
        notify(readableError(err), "error");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return notify("Display name is required.", "error");
    if (!supabase || !user) return notify("Not authenticated.", "error");
    setSubmitting(true);
    try {
      await updateProfile({ displayName, bio, occupation, city });
      // Save gender and role directly (not in roomie-api yet)
      await supabase.from("profiles").update({ gender: gender || null, role: role || null }).eq("id", user.id);
      await refreshProfile();
      notify("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      notify(readableError(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <h1>My Profile</h1>
        <p className="sub">This information is visible to potential roommates.</p>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading your profile…</p>
        ) : !isEditing ? (
          <div style={{ maxWidth: "580px" }}>
            {/* Avatar banner */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "var(--cream)", borderRadius: "16px", marginBottom: "20px" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--ink)", color: "var(--lime)", display: "grid", placeItems: "center", fontFamily: "Fraunces,serif", fontSize: "28px", fontWeight: 600, flexShrink: 0 }}>
                {displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "R"}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "17px" }}>{displayName || "Your name"}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  {[city, occupation].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {/* All profile fields */}
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "20px 24px", display: "grid", gap: "16px", marginBottom: "20px" }}>
              {/* Row 1: Name + City */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Display Name</span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{displayName || "—"}</p>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>City</span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{city || "—"}</p>
                </div>
              </div>

              {/* Row 2: Occupation + Gender */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Occupation</span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{occupation || "—"}</p>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Gender</span>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>{gender || "—"}</p>
                </div>
              </div>

              {/* Row 3: Role */}
              <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>My Role on FindMyRoomie</span>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                  {role === "seeker" ? "Finding a stay" : role === "owner" ? "Offering a stay" : "—"}
                </p>
              </div>

              {/* Row 4: About */}
              <div>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>About</span>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.65, color: "var(--ink)" }}>
                  {bio || <em style={{ color: "var(--muted)", fontWeight: 400 }}>No bio provided.</em>}
                </p>
              </div>
            </div>

            <button onClick={() => setIsEditing(true)} className="btn-secondary">
              Edit Profile
            </button>
          </div>

        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: "580px", display: "grid", gap: "18px" }}>            {/* Avatar placeholder */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "18px", background: "var(--cream)", borderRadius: "14px" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "var(--ink)", color: "var(--lime)",
                display: "grid", placeItems: "center",
                fontFamily: "Fraunces,serif", fontSize: "28px", fontWeight: 600,
                flexShrink: 0,
              }}>
                {displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "R"}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{displayName || "Your name"}</p>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Avatar upload available via Supabase Storage — coming soon
                </p>
              </div>
            </div>

            <label className="auth-label">
              Display name *
              <input type="text" className="auth-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={60} placeholder="e.g. Ananya Sharma" />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label className="auth-label">
                City
                <select className="auth-input" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="auth-label">
                Occupation
                <select className="auth-input" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                  {occupations.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <label className="auth-label">
                Gender
                <select className="auth-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Trans">Trans</option>
                </select>
              </label>
            </div>

            <label className="auth-label">
              About you <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span>
              <textarea
                className="auth-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                rows={4}
                style={{ resize: "vertical", lineHeight: 1.6 }}
                placeholder="A little about yourself — interests, routine, what kind of home you value…"
              />
            </label>

            <div style={{ padding: "16px", border: "1px solid #ffcdd2", borderRadius: "12px", backgroundColor: "#fff5f5" }}>
              <label className="auth-label" style={{ color: "#d32f2f", marginBottom: "8px", display: "block" }}>
                My role on FindMyRoomie
                <select className="auth-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ borderColor: "#ef9a9a", marginTop: "6px" }}>
                  <option value="seeker">Finding a stay</option>
                  <option value="owner">Offering a stay</option>
                </select>
              </label>
              <p style={{ fontSize: "12px", color: "#c62828", margin: 0, lineHeight: 1.4 }}>
                <strong>Warning:</strong> Changing this option alters your entire dashboard experience and how the app works for you. Do not change this unless absolutely needed.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving…" : "Save profile"} {!submitting && <span>→</span>}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setIsEditing(false); setNotice(""); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Fixed toast notification */}
      {notice && <div className={`auth-notice ${noticeType}`} style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 400, boxShadow: "0 4px 20px rgba(0,0,0,.15)", minWidth: "300px", maxWidth: "480px" }}>{notice}</div>}
    </div>
  );
}
