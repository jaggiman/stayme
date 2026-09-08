"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConversations, getConversationWithPartner } from "../../lib/roomie-api";
import { useAuth } from "../../lib/auth-context";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const data = await getConversations();
        // Enrich each conversation with partner profile info
        const enriched = await Promise.all(
          data.map(async (c: any) => {
            const partner = await getConversationWithPartner(c.conversation_id, user.id);
            if (!partner) return { ...c, partnerName: "Roommate", partnerId: null };
            const profile = (partner as any).profiles;
            const name = profile?.display_name || "Roommate";
            const pid = profile?.id || (partner as any).profile_id || null;
            return { ...c, partnerName: name, partnerId: pid };
          })
        );
        setConversations(enriched);
      } catch (_) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  return (
    <main style={{ minHeight: "calc(100vh - 92px)" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "40px 20px" }}>
        <h1
          style={{
            fontFamily: "Fraunces,serif",
            fontSize: "30px",
            fontWeight: "600",
            letterSpacing: "-.04em",
            margin: "0 0 6px",
          }}
        >
          Messages
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted)", margin: "0 0 32px" }}>
          Conversations created after accepted requests.
        </p>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              border: "1px dashed var(--line)",
              borderRadius: "18px",
              background: "#fafdf8",
            }}
          >
            <span style={{ fontSize: "40px" }}>💬</span>
            <p
              style={{
                fontFamily: "Fraunces,serif",
                fontSize: "20px",
                fontWeight: 600,
                margin: "12px 0 6px",
              }}
            >
              No conversations yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "20px",
              }}
            >
              Accept a request or have your request accepted to start a conversation.
            </p>
            <Link
              href="/dashboard/requests"
              className="btn-primary"
              style={{ textDecoration: "none", display: "inline-flex" }}
            >
              View Requests <span>→</span>
            </Link>
          </div>
        ) : (
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "18px",
              overflow: "hidden",
            }}
          >
            {conversations.map((c, i) => {
              const { partnerName, partnerId, conversation_id } = c;
              const initial = partnerName.charAt(0).toUpperCase();

              return (
                <div
                  key={conversation_id}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--line)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "0",
                  }}
                >
                  {/* Main conversation link */}
                  <Link
                    href={`/messages/${conversation_id}`}
                    style={{
                      flex: 1,
                      display: "block",
                      textDecoration: "none",
                    }}
                  >
                    <div className="convo-item">
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "var(--ink)",
                            color: "var(--lime)",
                            fontFamily: "Fraunces,serif",
                            fontSize: "18px",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initial}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h4>{partnerName}</h4>
                          <p>Tap to open conversation</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* View profile shortcut */}
                  {partnerId && (
                    <Link
                      href={`/profile/${partnerId}`}
                      style={{
                        padding: "16px 18px 16px 4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--muted)",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      title={`View ${partnerName}'s profile`}
                    >
                      Profile →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}