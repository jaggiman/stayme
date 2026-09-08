"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishRoomListing, readableError } from "../../../../lib/roomie-api";
import { useAuth } from "../../../../lib/auth-context";
import DashboardSidebar from "../../../../components/DashboardSidebar";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];

// Defined at module level so React never sees them as new component types on re-render
// (defining inside the component body causes inputs to lose focus on every keystroke)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="auth-label" style={{ display: "grid", gap: "6px" }}>
      {label}
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select className="auth-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function NewListingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [locality, setLocality] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [openSpots, setOpenSpots] = useState("1");
  const [roomType, setRoomType] = useState("Private room");
  const [bhk, setBhk] = useState("");
  const [sharingCapacity, setSharingCapacity] = useState("1");
  const [amenities, setAmenities] = useState("");
  const [description, setDescription] = useState("");
  const [food, setFood] = useState("flexible");
  const [smoking, setSmoking] = useState("no-smoking");
  const [noise, setNoise] = useState("moderate");
  const [sleep, setSleep] = useState("regular");
  const [pets, setPets] = useState("no-pets");
  const [cleanliness, setCleanliness] = useState("moderate");
  const [coGender, setCoGender] = useState("any");
  const [houseRules, setHouseRules] = useState("");
  const [roommateNotes, setRoommateNotes] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return setError("Please sign in first.");
    if (!locality.trim()) return setError("Locality is required.");
    if (!rent || Number(rent) < 1000) return setError("Please enter a valid monthly rent.");

    setSubmitting(true);
    setError("");
    try {
      const listingId = await publishRoomListing({
        title: title.trim() || undefined,
        city,
        locality: locality.trim(),
        rent: Number(rent),
        deposit: deposit ? Number(deposit) : undefined,
        availableFrom,
        openSpots: Number(openSpots),
        roomType,
        bhk: bhk || undefined,
        sharingCapacity: Number(sharingCapacity),
        amenities: amenities.split(",").map((a) => a.trim()).filter(Boolean),
        description: description.trim() || undefined,
        foodPreference: food,
        smokingPreference: smoking,
        noiseLevel: noise,
        sleepSchedule: sleep,
        petsPreference: pets,
        cleanlinessLevel: cleanliness,
        coGenderPreference: coGender,
        houseRules: houseRules.trim(),
        roommatePreferenceText: roommateNotes.trim(),
      });
      router.push("/dashboard/listings");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <h1>Create New Listing</h1>
        <p className="sub">Fill in the details about your room to attract compatible roommates.</p>

        <form onSubmit={handleSubmit} style={{ maxWidth: "680px", display: "grid", gap: "24px" }}>
          {error && <div className="auth-notice error">{error}</div>}

          {/* Basic Info */}
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", display: "grid", gap: "14px" }}>
            <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>BASIC INFORMATION</legend>
            <Field label="Listing title (optional)">
              <input type="text" className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Spacious private room near MG Road" />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="City *">
                <select className="auth-input" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Locality *">
                <input type="text" className="auth-input" value={locality} onChange={(e) => setLocality(e.target.value)} required placeholder="e.g. Koramangala" />
              </Field>
              <Field label="Monthly rent (₹) *">
                <input type="number" className="auth-input" value={rent} onChange={(e) => setRent(e.target.value)} required min={1000} placeholder="15000" />
              </Field>
              <Field label="Deposit (₹)">
                <input type="number" className="auth-input" value={deposit} onChange={(e) => setDeposit(e.target.value)} min={0} placeholder="30000" />
              </Field>
              <Field label="Available from">
                <input type="date" className="auth-input" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </Field>
              <Field label="Open spots">
                <Select value={openSpots} onChange={setOpenSpots} options={[
                  { value: "1", label: "1 person" }, { value: "2", label: "2 people" }, { value: "3", label: "3 people" },
                ]} />
              </Field>
              <Field label="Room type">
                <Select value={roomType} onChange={setRoomType} options={[
                  { value: "Private room", label: "Private room" }, { value: "Shared room", label: "Shared room" },
                  { value: "Entire flat", label: "Entire flat" },
                ]} />
              </Field>
              <Field label="BHK">
                <Select value={bhk} onChange={setBhk} options={[
                  { value: "", label: "Not specified" },
                  { value: "Studio", label: "Studio" },
                  { value: "1 BHK", label: "1 BHK" },
                  { value: "2 BHK", label: "2 BHK" },
                  { value: "3 BHK", label: "3 BHK" },
                  { value: "4+ BHK", label: "4+ BHK" },
                ]} />
              </Field>
              <Field label="Room-sharing capacity">
                <Select value={sharingCapacity} onChange={setSharingCapacity} options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-sharing` }))} />
              </Field>
            </div>
            <Field label="Amenities (comma-separated)">
              <input type="text" className="auth-input" value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Wi-Fi, AC, Washing machine, Furnished, Parking" />
            </Field>
            <Field label="Description (optional)">
              <textarea className="auth-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3}
                style={{ resize: "vertical", lineHeight: 1.6 }} placeholder="Describe the home, neighbourhood, and what makes it a great place to live…" />
            </Field>
          </fieldset>

          {/* Roommate Preferences */}
          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", display: "grid", gap: "14px" }}>
            <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>HOME PREFERENCES</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Food preference">
                <Select value={food} onChange={setFood} options={[
                  { value: "vegetarian", label: "Vegetarian" }, { value: "non-vegetarian", label: "Non-vegetarian" },
                  { value: "vegan", label: "Vegan" }, { value: "flexible", label: "Flexible" },
                ]} />
              </Field>
              <Field label="Smoking">
                <Select value={smoking} onChange={setSmoking} options={[
                  { value: "no-smoking", label: "No smoking" }, { value: "smoking-ok", label: "Smoking okay" },
                  { value: "outdoor-only", label: "Outdoor only" }, { value: "flexible", label: "Flexible" },
                ]} />
              </Field>
              <Field label="Noise level">
                <Select value={noise} onChange={setNoise} options={[
                  { value: "quiet", label: "Quiet / study-friendly" }, { value: "moderate", label: "Moderate" }, { value: "social", label: "Social" },
                ]} />
              </Field>
              <Field label="Sleep schedule">
                <Select value={sleep} onChange={setSleep} options={[
                  { value: "early", label: "Early (before 10pm)" }, { value: "regular", label: "Regular" },
                  { value: "late", label: "Late (after midnight)" }, { value: "flexible", label: "Flexible" },
                ]} />
              </Field>
              <Field label="Pets">
                <Select value={pets} onChange={setPets} options={[
                  { value: "no-pets", label: "No pets" }, { value: "pets-ok", label: "Pets welcome" }, { value: "flexible", label: "Flexible" },
                ]} />
              </Field>
              <Field label="Cleanliness">
                <Select value={cleanliness} onChange={setCleanliness} options={[
                  { value: "very-clean", label: "Very clean" }, { value: "moderate", label: "Moderate" }, { value: "relaxed", label: "Relaxed" },
                ]} />
              </Field>
              <Field label="Co-gender preference">
                <Select value={coGender} onChange={setCoGender} options={[
                  { value: "any", label: "Open to all genders" },
                  { value: "same-gender", label: "Same gender only" },
                ]} />
              </Field>
            </div>
            <Field label="House rules">
              <textarea className="auth-input" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} maxLength={500} rows={3}
                style={{ resize: "vertical", lineHeight: 1.6 }} placeholder="e.g. Quiet after 10:30pm, shared cleaning rota, no indoor smoking…" />
            </Field>
            <Field label="Ideal roommate (optional)">
              <textarea className="auth-input" value={roommateNotes} onChange={(e) => setRoommateNotes(e.target.value)} maxLength={400} rows={2}
                style={{ resize: "vertical", lineHeight: 1.6 }} placeholder="e.g. A working professional or student who values a calm, respectful home…" />
            </Field>
          </fieldset>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish listing"} {!submitting && <span>→</span>}
            </button>
            <Link href="/dashboard/listings" className="btn-secondary" style={{ textDecoration: "none" }}>Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
