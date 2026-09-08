"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ConsentPage() {
  const router = useRouter();

  return (
    <main className="onboard-wrap">
      <div className="onboard-card">
        <p className="onboard-step">STEP 1 OF 5 — GETTING STARTED</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: "20%" }} /></div>
        </div>
        <h1>A few things before we begin</h1>
        <p className="lead">
          FindMyRoomie helps students and working professionals find compatible shared homes.
          We collect your lifestyle preferences and stay requirements to match you with the right people.
        </p>

        <div style={{ background: "var(--cream)", borderRadius: "14px", padding: "20px 22px", display: "grid", gap: "12px", marginBottom: "28px" }}>
          {[
            ["🔒", "Your data stays private", "Only relevant match details are shared with potential roommates."],
            ["🎯", "Used only for matching", "Your preferences power compatibility scores — nothing else."],
            ["✏️", "Editable anytime", "Update or delete your profile from your dashboard at any time."],
          ].map(([icon, title, desc]) => (
            <div key={title as string} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px", flexShrink: 0 }}>{icon}</span>
              <div>
                <strong style={{ fontSize: "13px", display: "block", marginBottom: "3px" }}>{title}</strong>
                <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="onboard-actions">
          <button
            className="btn-primary"
            onClick={() => router.push("/onboarding/create-profile")}
          >
            I understand, let&apos;s go <span>→</span>
          </button>
          <Link href="/" className="btn-secondary">Not now</Link>
        </div>
      </div>
    </main>
  );
}
