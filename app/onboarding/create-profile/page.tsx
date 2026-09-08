"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth-context";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];
const occupations = ["Working Professional", "Student", "Freelancer", "Intern", "Other"];

export default function CreateProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [occupation, setOccupation] = useState("Working Professional");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill display name from Google OAuth metadata
  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name);
    } else if (user?.user_metadata?.full_name) {
      setDisplayName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return setError("Not authenticated.");
    if (!displayName.trim()) return setError("Please enter your display name.");

    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName.trim(),
        city,
        occupation_status: occupation,
        bio: bio.trim() || null,
        visibility: true,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/select-role");
  };

  return (
    <main className="onboard-wrap">
      <div className="onboard-card">
        <p className="onboard-step">STEP 2 OF 5 — YOUR PROFILE</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: "40%" }} /></div>
        </div>
        <h1>Create your profile</h1>
        <p className="lead">
          Let&apos;s set up your basic profile. Other users see this when you match.
        </p>

        <form onSubmit={handleSubmit} className="onboard-form">
          {error && <div className="auth-notice error">{error}</div>}

          <label className="onboard-label">
            Display name *
            <input
              type="text"
              className="onboard-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={60}
              placeholder="e.g. Ananya Sharma"
            />
          </label>

          <div className="onboard-grid">
            <label className="onboard-label">
              City *
              <select
                className="onboard-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>

            <label className="onboard-label">
              Occupation *
              <select
                className="onboard-input"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              >
                {occupations.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          </div>

          <label className="onboard-label">
            About you <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span>
            <textarea
              className={`onboard-input onboard-textarea`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              placeholder="A little about yourself — where you're from, what you do, what kind of home you like…"
            />
          </label>

          <div className="onboard-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Continue"} {!loading && <span>→</span>}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
