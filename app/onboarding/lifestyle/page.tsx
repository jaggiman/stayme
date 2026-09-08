"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth-context";

export default function LifestylePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [food, setFood] = useState("flexible");
  const [smoking, setSmoking] = useState("no-smoking");
  const [sleep, setSleep] = useState("regular");
  const [noise, setNoise] = useState("moderate");
  const [pets, setPets] = useState("no-pets");
  const [cleanliness, setCleanliness] = useState("moderate");
  const [guests, setGuests] = useState("occasionally");
  const [wfh, setWfh] = useState("never");
  const [lifestyleText, setLifestyleText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return setError("Not authenticated.");
    setLoading(true);
    setError("");

    const { error: prefError } = await supabase
      .from("profile_preferences")
      .upsert({
        profile_id: user.id,
        food_preference: food,
        smoking_preference: smoking,
        sleep_schedule: sleep,
        noise_level: noise,
        pets_preference: pets,
        cleanliness_level: cleanliness,
        guest_frequency: guests,
        wfh_frequency: wfh,
        lifestyle_text: lifestyleText.trim() || null,
        updated_at: new Date().toISOString(),
      });

    if (prefError) {
      setError(prefError.message);
      setLoading(false);
      return;
    }

    // Mark onboarding as complete
    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    router.push("/matches");
  };

  const SelectField = ({
    label, value, onChange, options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <label className="onboard-label">
      {label}
      <select className="onboard-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <main className="onboard-wrap">
      <div className="onboard-card">
        <p className="onboard-step">STEP 5 OF 5 — LIFESTYLE</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: "100%" }} /></div>
        </div>
        <h1>Your living style</h1>
        <p className="lead">
          These preferences power your compatibility score. The more you share, the better your matches.
        </p>

        <form onSubmit={handleSubmit} className="onboard-form">
          {error && <div className="auth-notice error">{error}</div>}

          <div className="onboard-grid">
            <SelectField label="Food preference" value={food} onChange={setFood} options={[
              { value: "vegetarian", label: "Vegetarian" },
              { value: "non-vegetarian", label: "Non-vegetarian" },
              { value: "vegan", label: "Vegan" },
              { value: "flexible", label: "Flexible" },
            ]} />
            <SelectField label="Smoking" value={smoking} onChange={setSmoking} options={[
              { value: "no-smoking", label: "No smoking" },
              { value: "smoking-ok", label: "Smoking okay" },
              { value: "outdoor-only", label: "Outdoor only" },
              { value: "flexible", label: "Flexible" },
            ]} />
            <SelectField label="Sleep schedule" value={sleep} onChange={setSleep} options={[
              { value: "early", label: "Early (before 10pm)" },
              { value: "regular", label: "Regular (10pm–midnight)" },
              { value: "late", label: "Late (after midnight)" },
              { value: "flexible", label: "Flexible" },
            ]} />
            <SelectField label="Noise level" value={noise} onChange={setNoise} options={[
              { value: "quiet", label: "Quiet / study-friendly" },
              { value: "moderate", label: "Moderate" },
              { value: "social", label: "Social / lively" },
            ]} />
            <SelectField label="Pets" value={pets} onChange={setPets} options={[
              { value: "no-pets", label: "No pets" },
              { value: "pets-ok", label: "Pets welcome" },
              { value: "has-pet", label: "I have a pet" },
              { value: "flexible", label: "Flexible" },
            ]} />
            <SelectField label="Cleanliness" value={cleanliness} onChange={setCleanliness} options={[
              { value: "very-clean", label: "Very clean / tidy" },
              { value: "moderate", label: "Moderate" },
              { value: "relaxed", label: "Relaxed" },
            ]} />
            <SelectField label="Guests" value={guests} onChange={setGuests} options={[
              { value: "no-guests", label: "No overnight guests" },
              { value: "occasionally", label: "Occasionally" },
              { value: "frequently", label: "Frequently" },
            ]} />
            <SelectField label="Work from home" value={wfh} onChange={setWfh} options={[
              { value: "never", label: "Never / rarely" },
              { value: "sometimes", label: "A few days a week" },
              { value: "always", label: "Full-time WFH" },
            ]} />
          </div>

          <label className="onboard-label" style={{ marginTop: "4px" }}>
            Anything else to share? <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span>
            <textarea
              className="onboard-input onboard-textarea"
              value={lifestyleText}
              onChange={(e) => setLifestyleText(e.target.value)}
              maxLength={400}
              placeholder="e.g. I'm an introvert who enjoys quiet evenings. I keep common spaces clean and value a respectful shared home."
            />
          </label>

          <div className="onboard-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Finishing up…" : "Find my matches"} {!loading && <span>→</span>}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
