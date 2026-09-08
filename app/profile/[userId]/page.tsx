"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";



export default function PublicProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPublicProfile(userId);
        if (!data) setNotFound(true);
        else setProfile(data);
      } catch (_) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 92px)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <p style={{ color: "var(--muted)" }}>Loading profile…</p>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 92px)",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <div>
          <p style={{ fontSize: "40px", margin: "0 0 12px" }}>🔍</p>
          <h1
            style={{
              fontFamily: "Fraunces,serif",
              fontSize: "26px",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Profile not found
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 20px" }}>
            This profile may be private or doesn't exist.
          </p>
          <button onClick={() => router.back()} className="btn-secondary">
            ← Go back
          </button>
        </div>
      </main>
    );
  }

  const initial = (profile.display_name || "?").charAt(0).toUpperCase();

  return (
    <main style={{ minHeight: "calc(100vh - 92px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "580px", margin: "0 auto" }}>
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "var(--muted)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            padding: "0 0 24px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          ← Back
        </button>

        {/* Avatar + name card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            padding: "24px",
            background: "var(--cream)",
            borderRadius: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "var(--ink)",
              color: "var(--lime)",
              display: "grid",
              placeItems: "center",
              fontFamily: "Fraunces,serif",
              fontSize: "32px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "Fraunces,serif",
                fontSize: "24px",
                fontWeight: 600,
                margin: "0 0 4px",
                letterSpacing: "-.03em",
              }}
            >
              {profile.display_name}
            </h1>
            {(profile.city || profile.occupation_status) && (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                {[profile.city, profile.occupation_status]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>

          {/* "This is you" badge */}
          {isOwnProfile && (
            <Link
              href="/dashboard/profile"
              className="btn-secondary"
              style={{
                textDecoration: "none",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              Edit profile
            </Link>
          )}
        </div>

        {/* Profile details */}
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: "18px",
            padding: "20px 24px",
            display: "grid",
            gap: "16px",
          }}
        >
          {/* Gender */}
          {profile.gender && (
            <div
              style={{
                paddingBottom: "16px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "4px",
                }}
              >
                Gender
              </span>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
                {profile.gender}
              </p>
            </div>
          )}


          {/* Bio */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 800,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              About
            </span>
            {profile.bio ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "var(--ink)",
                }}
              >
                {profile.bio}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", fontStyle: "italic" }}>
                No bio provided.
              </p>
            )}
          </div>
        </div>

        {/* Own profile hint */}
        {isOwnProfile && (
          <p
            style={{
              marginTop: "16px",
              fontSize: "12px",
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            This is how other users see your profile.{" "}
            <Link
              href="/dashboard/profile"
              style={{ color: "var(--ink)", fontWeight: 700 }}
            >
              Edit profile →
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
