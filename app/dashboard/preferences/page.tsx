"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSeekerProfile, saveSeekerProfile, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import DashboardSidebar from "../../../components/DashboardSidebar";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];


export default function PreferencesDashboard() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [locality, setLocality] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInFrom, setMoveInFrom] = useState("");
  const [food, setFood] = useState("flexible");
  const [smoking, setSmoking] = useState("no-smoking");
  const [sleep, setSleep] = useState("regular");
  const [noise, setNoise] = useState("moderate");
  const [pets, setPets] = useState("no-pets");
  const [cleanliness, setCleanliness] = useState("moderate");
  const [guests, setGuests] = useState("occasionally");
  const [wfh, setWfh] = useState("never");
  const [coGender, setCoGender] = useState("any");
  const [lifestyleText, setLifestyleText] = useState("");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 3000);
  };

  // Fetch & populate existing preferences on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const prefs = await getSeekerProfile();
        if (prefs) {
          setCity(prefs.city || "Bengaluru");
          setLocality(prefs.preferred_localities?.[0] || "");
          setBudgetMin(prefs.budget_min?.toString() || "");
          setBudgetMax(prefs.budget_max?.toString() || "");
          setMoveInFrom(prefs.move_in_from || "");
          setFood(prefs.food_preference || "flexible");
          setSmoking(prefs.smoking_preference || "no-smoking");
          setSleep(prefs.sleep_schedule || "regular");
          setNoise(prefs.noise_level || "moderate");
          setPets(prefs.pets_preference || "no-pets");
          setCleanliness(prefs.cleanliness_level || "moderate");
          setGuests(prefs.guest_frequency || "occasionally");
          setWfh(prefs.wfh_frequency || "never");
          setCoGender(prefs.co_gender_preference || "any");
          setLifestyleText(prefs.lifestyle_text || "");
          // Display name from profile
          if (prefs.display_name) setDisplayName(prefs.display_name);
          // Auto-start editing if no preferences saved yet
          if (!prefs.budget_max) setEditing(true);
        }
      } catch (err) {
        notify(readableError(err), "error");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchPrefs();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!budgetMax) return notify("Maximum budget is required.", "error");
    if (budgetMin && Number(budgetMin) > Number(budgetMax)) {
      return notify("Minimum budget cannot exceed maximum budget.", "error");
    }
    setSubmitting(true);
    try {
      await saveSeekerProfile({
        displayName: displayName || user?.email?.split("@")[0] || "",
        city,
        locality,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: Number(budgetMax),
        moveInFrom,
        foodPreference: food,
        smokingPreference: smoking,
        sleepSchedule: sleep,
        noiseLevel: noise,
        petsPreference: pets,
        cleanlinessLevel: cleanliness,
        guestFrequency: guests,
        wfhFrequency: wfh,
        lifestyleText,
        coGenderPreference: coGender,
      });
      notify("Stay preferences saved successfully.");
      setEditing(false);
    } catch (err) {
      notify(readableError(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const SelectField = ({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <label className="auth-label">
      {label}
      <select className="auth-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <div>
            <h1>Stay Preferences</h1>
            <p className="sub">Your lifestyle & budget preferences used for matching.</p>
          </div>
          {!loading && !editing && (
            <button className="btn-primary" onClick={() => setEditing(true)} style={{ marginTop: "4px" }}>
              ✏️ Edit Preferences
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading your preferences…</p>
        ) : !editing ? (
          // ── Read-only summary view ──
          <div style={{ maxWidth: "680px" }}>
            <div style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", marginBottom: "16px", display: "grid", gap: "12px" }}>
              <p style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", margin: 0 }}>LOCATION &amp; BUDGET</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: "13px" }}>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>City</span><br /><strong>{city}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Locality</span><br /><strong>{locality || "—"}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Budget</span><br /><strong>₹{budgetMin || "—"} – ₹{budgetMax || "—"}/mo</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Move-in from</span><br /><strong>{moveInFrom ? new Date(moveInFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</strong></div>
              </div>
            </div>
            <div style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", display: "grid", gap: "12px" }}>
              <p style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", margin: 0 }}>LIFESTYLE</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", fontSize: "13px" }}>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Food</span><br /><strong style={{ textTransform: "capitalize" }}>{food}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Smoking</span><br /><strong style={{ textTransform: "capitalize" }}>{smoking}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Sleep schedule</span><br /><strong style={{ textTransform: "capitalize" }}>{sleep}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Noise level</span><br /><strong style={{ textTransform: "capitalize" }}>{noise}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Pets</span><br /><strong style={{ textTransform: "capitalize" }}>{pets}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Cleanliness</span><br /><strong style={{ textTransform: "capitalize" }}>{cleanliness}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Guests</span><br /><strong style={{ textTransform: "capitalize" }}>{guests}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Work from home</span><br /><strong style={{ textTransform: "capitalize" }}>{wfh}</strong></div>
                <div><span style={{ color: "var(--muted)", fontSize: "11px" }}>Co-gender preference</span><br /><strong>{coGender === "same-gender" ? "Same gender only" : "Open to all genders"}</strong></div>
              </div>
              {lifestyleText && <p style={{ fontSize: "13px", color: "var(--ink)", margin: 0, borderTop: "1px solid var(--line)", paddingTop: "10px" }}>{lifestyleText}</p>}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: "680px", display: "grid", gap: "18px" }}>
            {notice && <div className={`auth-notice ${noticeType}`}>{notice}</div>}

            <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px" }}>
              <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>LOCATION & BUDGET</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label className="auth-label">
                  Target city *
                  <select className="auth-input" value={city} onChange={(e) => setCity(e.target.value)}>
                    {cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="auth-label">
                  Preferred locality
                  <input type="text" className="auth-input" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g. Indiranagar" />
                </label>
                <label className="auth-label">
                  Min budget (₹/month)
                  <input type="number" className="auth-input" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} min={1000} placeholder="5000" />
                </label>
                <label className="auth-label">
                  Max budget (₹/month) *
                  <input type="number" className="auth-input" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required min={1000} placeholder="15000" />
                </label>
                <label className="auth-label">
                  Move-in from
                  <input type="date" className="auth-input" value={moveInFrom} onChange={(e) => setMoveInFrom(e.target.value)} />
                </label>
              </div>
            </fieldset>

            <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px" }}>
              <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>LIFESTYLE</legend>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <SelectField label="Food preference" value={food} onChange={setFood} options={[
                  { value: "vegetarian", label: "Vegetarian" }, { value: "non-vegetarian", label: "Non-vegetarian" },
                  { value: "vegan", label: "Vegan" }, { value: "flexible", label: "Flexible" },
                ]} />
                <SelectField label="Smoking" value={smoking} onChange={setSmoking} options={[
                  { value: "no-smoking", label: "No smoking" }, { value: "smoking-ok", label: "Smoking okay" },
                  { value: "outdoor-only", label: "Outdoor only" }, { value: "flexible", label: "Flexible" },
                ]} />
                <SelectField label="Sleep schedule" value={sleep} onChange={setSleep} options={[
                  { value: "early", label: "Early (before 10pm)" }, { value: "regular", label: "Regular" },
                  { value: "late", label: "Late (after midnight)" }, { value: "flexible", label: "Flexible" },
                ]} />
                <SelectField label="Noise level" value={noise} onChange={setNoise} options={[
                  { value: "quiet", label: "Quiet / study-friendly" }, { value: "moderate", label: "Moderate" }, { value: "social", label: "Social" },
                ]} />
                <SelectField label="Pets" value={pets} onChange={setPets} options={[
                  { value: "no-pets", label: "No pets" }, { value: "pets-ok", label: "Pets welcome" },
                  { value: "has-pet", label: "I have a pet" }, { value: "flexible", label: "Flexible" },
                ]} />
                <SelectField label="Cleanliness" value={cleanliness} onChange={setCleanliness} options={[
                  { value: "very-clean", label: "Very clean" }, { value: "moderate", label: "Moderate" }, { value: "relaxed", label: "Relaxed" },
                ]} />
                <SelectField label="Guests" value={guests} onChange={setGuests} options={[
                  { value: "no-guests", label: "No overnight guests" }, { value: "occasionally", label: "Occasionally" }, { value: "frequently", label: "Frequently" },
                ]} />
                <SelectField label="Work from home" value={wfh} onChange={setWfh} options={[
                  { value: "never", label: "Never / rarely" }, { value: "sometimes", label: "A few days a week" }, { value: "always", label: "Full-time WFH" },
                ]} />
                <SelectField label="Co-gender preference" value={coGender} onChange={setCoGender} options={[
                  { value: "any", label: "Open to all genders" },
                  { value: "same-gender", label: "Same gender only" },
                ]} />
              </div>
              <label className="auth-label" style={{ marginTop: "14px", display: "grid" }}>
                About your lifestyle <span style={{ color: "var(--muted)", fontWeight: 600 }}>(optional)</span>
                <textarea className="auth-input" value={lifestyleText} onChange={(e) => setLifestyleText(e.target.value)}
                  maxLength={400} rows={3} style={{ resize: "vertical", lineHeight: 1.6 }}
                  placeholder="e.g. I prefer a quiet, clean shared home and enjoy evenings to myself." />
              </label>
            </fieldset>

            <button type="submit" className="btn-primary" disabled={submitting} style={{ justifySelf: "start" }}>
              {submitting ? "Saving…" : "Save preferences"} {!submitting && <span>→</span>}
            </button>
            <button type="button" className="btn-secondary" style={{ justifySelf: "start" }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        )}
      </main>

      {/* Fixed toast notification */}
      {notice && <div className={`auth-notice ${noticeType}`} style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 400, boxShadow: "0 4px 20px rgba(0,0,0,.15)", minWidth: "300px", maxWidth: "480px" }}>{notice}</div>}
    </div>
  );
}
