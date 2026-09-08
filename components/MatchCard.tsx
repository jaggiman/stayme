"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleFavorite, sendRoomieRequest } from "../lib/roomie-api";

export type Listing = {
  id: string;
  recipientId?: string;
  name: string;
  initials: string;
  neighborhood: string;
  city: string;
  rent: number;
  score: number;
  tags: string[];
  image: string;
  available: string;
  room: string;
  reasons: string[];
  isSeeker?: boolean;
  sharingCapacity?: number;
};

// ─── Reason → display mapping ─────────────────────────────────────────────────

type ReasonRow = { icon: string; label: string; positive: boolean };

function parseReason(reason: string): ReasonRow {
  const r = reason.toLowerCase();
  const isNegative =
    r.includes("mismatch") ||
    r.includes("above") ||
    r.includes("below") ||
    r.includes("gender preference mismatch");

  const icon =
    r.includes("budget") || r.includes("rent") || r.includes("afford")
      ? "💰"
      : r.includes("food")
      ? "🍽️"
      : r.includes("sleep")
      ? "🌙"
      : r.includes("noise")
      ? "🔊"
      : r.includes("cleanliness")
      ? "✨"
      : r.includes("pet")
      ? "🐾"
      : r.includes("gender")
      ? "👥"
      : r.includes("localit") || r.includes("prefer")
      ? "📍"
      : "⚡";

  return { icon, label: reason, positive: !isNegative };
}

// ─── Score ring (CSS-only SVG) ────────────────────────────────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      <svg width={90} height={90} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={45} cy={45} r={r} fill="none" stroke="var(--line)" strokeWidth={7} />
        <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .5s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontFamily: "Fraunces,serif", fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--muted)", letterSpacing: ".04em" }}>
          %
        </span>
      </div>
    </div>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

export default function MatchCard({
  listing,
  isFavorite,
  onToggleFavorite,
  notify,
  ownerListingId,
}: {
  listing: Listing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  notify: (msg: string) => void;
  ownerListingId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const { push } = useRouter();

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    onToggleFavorite(listing.id);
    try {
      await toggleFavorite(listing.id);
    } catch {
      onToggleFavorite(listing.id); // Revert on error
    } finally {
      setToggling(false);
    }
  };

  const handleCardClick = () => {
    if (listing.isSeeker) {
      setShowModal(true);
    } else {
      push(`/listings/${listing.id}`);
    }
  };

  const handleSendRequest = async () => {
    if (!ownerListingId) return;
    setRequesting(true);
    try {
      await sendRoomieRequest(ownerListingId, listing.id, requestNote.trim() || undefined);
      setRequestSent(true);
      notify("Request sent to " + listing.name + "!");
      setTimeout(() => setShowModal(false), 1500);
    } catch (err: any) {
      notify(err?.message || "Failed to send request.");
    } finally {
      setRequesting(false);
    }
  };

  const scoreColor =
    listing.score >= 80 ? "#10b981" : listing.score >= 60 ? "#f59e0b" : "#ef4444";

  const parsedReasons = listing.reasons.map(parseReason);
  const modalTitle = listing.isSeeker ? "SEEKER FIT" : "HOME FIT";
  const matchLabel = listing.isSeeker ? "seeker-fit score" : "home-fit score";
  const whyLabel = listing.isSeeker
    ? "Why this seeker could be a good fit"
    : "Why this stay could work";

  return (
    <>
      <article className="listing-card">
        <div className={`listing-image ${listing.image}`}>
          <div className="image-pattern" />
          <span className="listing-type">{listing.room}</span>

          {/* Heart button — hidden for seeker cards (favorites are listing-scoped) */}
          {!listing.isSeeker && (
            <button
              className={`save-button ${isFavorite ? "saved" : ""}`}
              aria-label={isFavorite ? "Remove from favorites" : "Save listing"}
              onClick={handleFavorite}
              disabled={toggling}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          )}

          <div className="initials">{listing.initials}</div>
        </div>

        <div className="card-body" onClick={handleCardClick} style={{ cursor: "pointer" }}>
          <div className="score-row">
            <span className="score" style={{ color: scoreColor }}>
              <b>{listing.score}%</b> match
            </span>
            <span className="available">{listing.available}</span>
          </div>
          <h3>{listing.name}</h3>
          <p className="location">⌖ {listing.neighborhood}, {listing.city}</p>
          <p className="rent">
            ₹{listing.rent.toLocaleString("en-IN")}
            {listing.sharingCapacity && listing.sharingCapacity > 1 ? (
              <span style={{ fontSize: "12px" }}>
                /mo (₹{Math.round(listing.rent / listing.sharingCapacity).toLocaleString("en-IN")} per person)
              </span>
            ) : (
              <span>/month</span>
            )}
          </p>
          <div className="tags">
            {listing.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "13px", flexWrap: "wrap" }}>
            <button
              className="view-button"
              onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
            >
              Why you match <span>↗</span>
            </button>
            {!listing.isSeeker && (
              <button
                className="view-button"
                style={{ color: "var(--ink)", opacity: 0.7 }}
              >
                View listing <span>→</span>
              </button>
            )}
            {listing.isSeeker && (
              <button
                className="view-button"
                style={{ color: "#166534", fontWeight: 800 }}
                onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              >
                Send request <span>→</span>
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Why-you-match modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <section
            className="match-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <button className="close" onClick={() => setShowModal(false)}>×</button>

            {/* Score ring + title */}
            <p className="eyebrow" style={{ marginBottom: 12 }}>
              {modalTitle} — {listing.name.toUpperCase()}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <ScoreRing score={listing.score} color={scoreColor} />
              <div>
                <div className="modal-score" style={{ margin: 0 }}>
                  <b style={{ color: scoreColor, fontSize: 38 }}>{listing.score}%</b>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                  {matchLabel}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                  {listing.score >= 80
                    ? "Excellent compatibility"
                    : listing.score >= 60
                    ? "Good compatibility"
                    : "Partial compatibility"}
                </p>
              </div>
            </div>

            <h2 style={{ marginBottom: 14 }}>{whyLabel}</h2>

            {/* Reason rows */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 8 }}>
              {parsedReasons.map((r, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: r.positive ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${r.positive ? "#86efac" : "#fca5a5"}`,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                  <span
                    style={{
                      flex: 1,
                      color: r.positive ? "#166534" : "#991b1b",
                      fontWeight: 600,
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: r.positive ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {r.positive ? "✓" : "✕"}
                  </span>
                </li>
              ))}
            </ul>

            {/* Score breakdown legend */}
            <div
              style={{
                background: "var(--cream)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: 11,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--ink)", display: "block", marginBottom: 2 }}>
                How the score is calculated
              </strong>
              Budget fit · 30 pts &nbsp;|&nbsp; Locality · 20 pts &nbsp;|&nbsp; Food · 12 pts &nbsp;|&nbsp;
              Sleep · 10 pts &nbsp;|&nbsp; Gender · 10 pts &nbsp;|&nbsp; Noise · 8 pts &nbsp;|&nbsp;
              Cleanliness · 5 pts &nbsp;|&nbsp; Pets · 5 pts
            </div>

            <div className="modal-note" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", background: "var(--cream)", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: 16 }}>
              Scores are a practical guide, not a guarantee. Discuss expectations and house rules before deciding to live together.
            </div>

            {/* CTA */}
            {!listing.isSeeker ? (
              <Link
                href={`/listings/${listing.id}`}
                className="match-button"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", width: "100%" }}
                onClick={(e) => e.stopPropagation()}
              >
                View listing & send request <span>→</span>
              </Link>
            ) : requestSent ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "14px",
                  background: "#dcfce7",
                  borderRadius: 12,
                  color: "#166534",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                ✓ Request sent!
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {/* Optional note */}
                {!showNote ? (
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textAlign: "left",
                      padding: 0,
                    }}
                    onClick={() => setShowNote(true)}
                  >
                    + Add a personal note (optional)
                  </button>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                      Personal note
                    </label>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Introduce yourself — your lifestyle, why you think you'd be a great fit…"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        font: "13px/1.5 Manrope,sans-serif",
                        resize: "vertical",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "right" }}>
                      {requestNote.length}/300
                    </span>
                  </div>
                )}

                <button
                  className="match-button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    border: "none",
                    cursor: requesting ? "wait" : "pointer",
                    opacity: requesting ? 0.7 : 1,
                  }}
                  disabled={requesting || !ownerListingId}
                  onClick={handleSendRequest}
                >
                  {requesting ? "Sending…" : "Send request"} {!requesting && <span>→</span>}
                </button>

                {!ownerListingId && (
                  <p style={{ fontSize: 11, color: "#dc2626", textAlign: "center", margin: 0 }}>
                    Select a listing above to send a request.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
