"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getListingById, updateListing, readableError } from "../../../../../lib/roomie-api";
import { useAuth } from "../../../../../lib/auth-context";
import DashboardSidebar from "../../../../../components/DashboardSidebar";

const cities = ["Bengaluru", "Hyderabad", "Pune", "Chennai", "Mumbai", "Delhi NCR"];

export default function EditListingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

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

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const data = await getListingById(listingId);
        if (!data) { setNotFound(true); return; }
        // Security check — only owner can edit
        if (data.owner_profile_id !== user?.id) { setNotFound(true); return; }

        setTitle(data.title || "");
        setCity(data.city || "Bengaluru");
        setLocality(data.locality || "");
        setRent(data.rent?.toString() || "");
        setDeposit(data.deposit?.toString() || "");
        setAvailableFrom(data.available_from || "");
        setOpenSpots(data.open_spots?.toString() || "1");
        setRoomType(data.room_type || "Private room");
        setBhk(data.bhk || "");
        setSharingCapacity(data.sharing_capacity?.toString() || "1");
        setAmenities((data.amenities || []).join(", "));
        setDescription(data.description || "");

        const prefs = data.listing_preferences;
        if (prefs) {
          setFood(prefs.food_preference || "flexible");
          setSmoking(prefs.smoking_preference || "no-smoking");
          setNoise(prefs.noise_level || "moderate");
          setSleep(prefs.sleep_schedule || "regular");
          setPets(prefs.pets_preference || "no-pets");
          setCleanliness(prefs.cleanliness_level || "moderate");
          setCoGender(prefs.co_gender_preference || "any");
          setHouseRules(prefs.house_rules || "");
          setRoommateNotes(prefs.roommate_preference_text || "");
        }
      } catch (err) {
        setError(readableError(err));
      } finally {
        setLoading(false);
      }
    };
    if (user && listingId) fetchListing();
  }, [user, listingId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await updateListing(listingId, {
        title: title.trim() || undefined,
        city, locality: locality.trim(),
        rent: Number(rent),
        deposit: deposit ? Number(deposit) : undefined,
        availableFrom, openSpots: Number(openSpots), roomType,
        bhk: bhk || undefined,
        sharingCapacity: Number(sharingCapacity),
        amenities: amenities.split(",").map((a) => a.trim()).filter(Boolean),
        description: description.trim() || undefined,
        foodPreference: food, smokingPreference: smoking,
        noiseLevel: noise, sleepSchedule: sleep, petsPreference: pets,
        cleanlinessLevel: cleanliness, coGenderPreference: coGender,
        houseRules, roommatePreferenceText: roommateNotes,
      });
      router.push("/dashboard/listings");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="auth-label" style={{ display: "grid", gap: "6px" }}>{label}{children}</label>
  );
  const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <select className="auth-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  if (loading) return (
    <div className="dashboard-wrap">
      <main className="dashboard-content"><p style={{ color: "var(--muted)" }}>Loading listing…</p></main>
    </div>
  );

  if (notFound) return (
    <div className="dashboard-wrap">
      <main className="dashboard-content">
        <p>Listing not found or you don&apos;t have permission to edit it.</p>
        <Link href="/dashboard/listings" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", marginTop: "16px" }}>
          ← Back to My Listings
        </Link>
      </main>
    </div>
  );

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <h1>Edit Listing</h1>
        <p className="sub">Update the details of your listing. Changes are saved immediately to Supabase.</p>

        <form onSubmit={handleSubmit} style={{ maxWidth: "680px", display: "grid", gap: "24px" }}>
          {error && <div className="auth-notice error">{error}</div>}

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", display: "grid", gap: "14px" }}>
            <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>BASIC INFORMATION</legend>
            <Field label="Listing title (optional)">
              <input type="text" className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="City *">
                <select className="auth-input" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Locality *">
                <input type="text" className="auth-input" value={locality} onChange={(e) => setLocality(e.target.value)} required />
              </Field>
              <Field label="Monthly rent (₹) *">
                <input type="number" className="auth-input" value={rent} onChange={(e) => setRent(e.target.value)} required min={1000} />
              </Field>
              <Field label="Deposit (₹)">
                <input type="number" className="auth-input" value={deposit} onChange={(e) => setDeposit(e.target.value)} min={0} />
              </Field>
              <Field label="Available from">
                <input type="date" className="auth-input" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} />
              </Field>
              <Field label="Open spots">
                <Select value={openSpots} onChange={setOpenSpots} options={[
                  { value: "1", label: "1 person" }, { value: "2", label: "2 people" }, { value: "3", label: "3 people" },
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
              <input type="text" className="auth-input" value={amenities} onChange={(e) => setAmenities(e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea className="auth-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3} style={{ resize: "vertical", lineHeight: 1.6 }} />
            </Field>
          </fieldset>

          <fieldset style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "22px", display: "grid", gap: "14px" }}>
            <legend style={{ fontWeight: 800, fontSize: "12px", color: "var(--muted)", padding: "0 8px" }}>HOME PREFERENCES</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <Field label="Food preference"><Select value={food} onChange={setFood} options={[
                { value: "vegetarian", label: "Vegetarian" }, { value: "non-vegetarian", label: "Non-vegetarian" }, { value: "flexible", label: "Flexible" },
              ]} /></Field>
              <Field label="Smoking"><Select value={smoking} onChange={setSmoking} options={[
                { value: "no-smoking", label: "No smoking" }, { value: "smoking-ok", label: "Smoking okay" }, { value: "flexible", label: "Flexible" },
              ]} /></Field>
              <Field label="Noise level"><Select value={noise} onChange={setNoise} options={[
                { value: "quiet", label: "Quiet" }, { value: "moderate", label: "Moderate" }, { value: "social", label: "Social" },
              ]} /></Field>
              <Field label="Sleep schedule"><Select value={sleep} onChange={setSleep} options={[
                { value: "early", label: "Early" }, { value: "regular", label: "Regular" }, { value: "late", label: "Late" }, { value: "flexible", label: "Flexible" },
              ]} /></Field>
              <Field label="Pets"><Select value={pets} onChange={setPets} options={[
                { value: "no-pets", label: "No pets" }, { value: "pets-ok", label: "Pets welcome" }, { value: "flexible", label: "Flexible" },
              ]} /></Field>
              <Field label="Cleanliness"><Select value={cleanliness} onChange={setCleanliness} options={[
                { value: "very-clean", label: "Very clean" }, { value: "moderate", label: "Moderate" }, { value: "relaxed", label: "Relaxed" },
              ]} /></Field>
              <Field label="Co-gender preference"><Select value={coGender} onChange={setCoGender} options={[
                { value: "any", label: "Open to all genders" }, { value: "same-gender", label: "Same gender only" },
              ]} /></Field>
            </div>
            <Field label="House rules">
              <textarea className="auth-input" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} maxLength={500} rows={2} style={{ resize: "vertical", lineHeight: 1.6 }} />
            </Field>
            <Field label="Ideal roommate">
              <textarea className="auth-input" value={roommateNotes} onChange={(e) => setRoommateNotes(e.target.value)} maxLength={400} rows={2} style={{ resize: "vertical", lineHeight: 1.6 }} />
            </Field>
          </fieldset>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"} {!submitting && <span>→</span>}
            </button>
            <Link href="/dashboard/listings" className="btn-secondary" style={{ textDecoration: "none" }}>Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
