"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth-context";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];

export default function SearchSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState("Bengaluru");
  const [locality, setLocality] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInFrom, setMoveInFrom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return setError("Not authenticated.");

    const min = budgetMin ? Number(budgetMin) : null;
    const max = budgetMax ? Number(budgetMax) : null;
    if (min && max && min > max) return setError("Minimum budget cannot exceed maximum budget.");

    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("profile_preferences")
      .upsert({
        profile_id: user.id,
        preferred_localities: locality.trim() ? [locality.trim()] : [],
        budget_min: min,
        budget_max: max,
        move_in_from: moveInFrom || null,
        updated_at: new Date().toISOString(),
      });

    // Also update profile city
    await supabase
      .from("profiles")
      .update({ city })
      .eq("id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding/lifestyle");
  };

  return (
    <main className="onboard-wrap">
      <div className="onboard-card">
        <p className="onboard-step">STEP 4 OF 5 — SEARCH SETUP</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: "80%" }} /></div>
        </div>
        <h1>Where and when?</h1>
        <p className="lead">
          Set your city, preferred area, budget range, and target move-in date.
          These become your hard filters — listings that don&apos;t fit won&apos;t appear.
        </p>

        <form onSubmit={handleSubmit} className="onboard-form">
          {error && <div className="auth-notice error">{error}</div>}

          <div className="onboard-grid">
            <label className="onboard-label">
              Target city *
              <select className="onboard-input" value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>

            <label className="onboard-label">
              Preferred locality
              <input
                type="text"
                className="onboard-input"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Indiranagar, Koramangala"
              />
            </label>
          </div>

          <div className="onboard-grid">
            <label className="onboard-label">
              Min budget (₹/month)
              <input
                type="number"
                className="onboard-input"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                min={1000}
                placeholder="5000"
              />
            </label>

            <label className="onboard-label">
              Max budget (₹/month) *
              <input
                type="number"
                className="onboard-input"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                required
                min={1000}
                placeholder="15000"
              />
            </label>
          </div>

          <label className="onboard-label">
            Move-in date (from)
            <input
              type="date"
              className="onboard-input"
              value={moveInFrom}
              onChange={(e) => setMoveInFrom(e.target.value)}
            />
          </label>

          <div className="onboard-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Continue"} {!loading && <span>→</span>}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push("/onboarding/lifestyle")}>
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
