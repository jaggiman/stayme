"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth-context";

export default function SelectRolePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"seeker" | "owner" | "both" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!supabase || !user) return;
    if (!role) return setError("Please select a role to continue.");

    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (role === "owner") {
      router.push("/dashboard/listings/new");
    } else {
      router.push("/onboarding/search-setup");
    }
  };

  const roles = [
    {
      id: "seeker" as const,
      icon: "🔍",
      title: "I'm looking for a room",
      desc: "Find shared homes that match your budget, location, and lifestyle.",
    },
    {
      id: "owner" as const,
      icon: "🏠",
      title: "I have a room to offer",
      desc: "Post your listing and find respectful housemates who fit your home.",
    },
  ];

  return (
    <main className="onboard-wrap">
      <div className="onboard-card">
        <p className="onboard-step">STEP 3 OF 5 — YOUR ROLE</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: "60%" }} /></div>
        </div>
        <h1>What brings you here?</h1>
        <p className="lead">
          This helps us personalise your experience. You can always do both later.
        </p>

        {error && <div className="auth-notice error" style={{ marginBottom: "16px" }}>{error}</div>}

        <div className="role-cards">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`role-card${role === r.id ? " selected" : ""}`}
              onClick={() => setRole(r.id)}
              style={{ gridColumn: (r.id as string) === "both" ? "1 / -1" : "auto" }}
            >
              <span className="role-icon">{r.icon}</span>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </button>
          ))}
        </div>

        <div className="onboard-actions">
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={loading || !role}
          >
            {loading ? "Saving…" : "Continue"} {!loading && <span>→</span>}
          </button>
        </div>
      </div>
    </main>
  );
}
