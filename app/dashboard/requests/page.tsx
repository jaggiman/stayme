"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRequests, respondToRequest, readableError } from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";
import DashboardSidebar from "../../../components/DashboardSidebar";


const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e" },
  accepted: { label: "Accepted", bg: "#dcfce7", color: "#166534" },
  declined: { label: "Declined", bg: "#fef2f2", color: "#dc2626" },
};

export default function RequestsDashboard() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotice(msg); setNoticeType(type);
    setTimeout(() => setNotice(""), 3500);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { incoming: inc, outgoing: out } = await getRequests();
      setIncoming(inc);
      setOutgoing(out);
    } catch (err) {
      notify(readableError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  // Realtime subscription — update badge when new requests arrive
  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    const channel = client
      .channel("requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => fetchRequests())
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [user]);

  const handleRespond = async (requestId: string, accept: boolean) => {
    try {
      const conversationId = await respondToRequest(requestId, accept);
      if (accept && conversationId) {
        notify("Request accepted! A conversation has been started.");
        setTimeout(() => window.location.href = `/messages/${conversationId}`, 1500);
      } else {
        notify(accept ? "Request accepted." : "Request declined.");
        fetchRequests();
      }
    } catch (err) {
      notify(readableError(err), "error");
    }
  };

  const pendingIncoming = incoming.filter((r) => r.status === "pending").length;

  return (
    <div className="dashboard-wrap">
      <DashboardSidebar />

      <main className="dashboard-content">
        <h1>Requests</h1>
        <p className="sub">Manage roommate connection requests you&apos;ve sent and received.</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "var(--cream)", borderRadius: "12px", padding: "4px", width: "fit-content", marginBottom: "28px" }}>
          <button
            onClick={() => setTab("incoming")}
            style={{ border: "none", borderRadius: "9px", padding: "9px 18px", fontWeight: 800, fontSize: "13px", cursor: "pointer", background: tab === "incoming" ? "var(--ink)" : "transparent", color: tab === "incoming" ? "#fff" : "var(--muted)" }}
          >
            Incoming {pendingIncoming > 0 && <span style={{ background: "var(--lime)", color: "var(--ink)", borderRadius: "100px", fontSize: "10px", padding: "2px 7px", marginLeft: "6px" }}>{pendingIncoming}</span>}
          </button>
          <button
            onClick={() => setTab("outgoing")}
            style={{ border: "none", borderRadius: "9px", padding: "9px 18px", fontWeight: 800, fontSize: "13px", cursor: "pointer", background: tab === "outgoing" ? "var(--ink)" : "transparent", color: tab === "outgoing" ? "#fff" : "var(--muted)" }}
          >
            Sent
          </button>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading requests…</p>
        ) : tab === "incoming" ? (
          incoming.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <span style={{ fontSize: "36px" }}>📬</span>
              <p style={{ marginTop: "12px", fontSize: "14px" }}>No incoming requests yet.</p>
            </div>
          ) : (
            <div>
              {incoming.map((req) => {
                const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                return (
                  <div key={req.id} className="request-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ fontSize: "15px" }}>{req.sender?.display_name || "Unknown"}</strong>
                        <p className="request-meta">
                          Wants to join your room in <strong>{req.listing?.locality}, {req.listing?.city}</strong>
                          &nbsp;·&nbsp; ₹{req.listing?.rent?.toLocaleString("en-IN")}/mo
                          &nbsp;·&nbsp; {new Date(req.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 800, background: status.bg, color: status.color, flexShrink: 0 }}>
                        {status.label}
                      </span>
                    </div>

                    {req.note && <div className="request-note">💬 &quot;{req.note}&quot;</div>}

                    {req.status === "pending" && (
                      <div className="request-actions">
                        <button className="btn-accept" onClick={() => handleRespond(req.id, true)}>✓ Accept</button>
                        <button className="btn-decline" onClick={() => handleRespond(req.id, false)}>✕ Decline</button>
                      </div>
                    )}

                    {req.status === "accepted" && (
                      <Link href="/messages" className="btn-sm" style={{ textDecoration: "none", display: "inline-block", width: "fit-content" }}>
                        💬 Open conversation
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          outgoing.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <span style={{ fontSize: "36px" }}>📤</span>
              <p style={{ marginTop: "12px", fontSize: "14px" }}>You haven&apos;t sent any requests yet.</p>
              <Link href="/matches" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", marginTop: "16px" }}>
                Browse matches <span>→</span>
              </Link>
            </div>
          ) : (
            <div>
              {outgoing.map((req) => {
                const status = STATUS_LABELS[req.status] || STATUS_LABELS.pending;
                return (
                  <div key={req.id} className="request-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ fontSize: "15px" }}>Room in {req.listing?.locality}, {req.listing?.city}</strong>
                        <p className="request-meta">
                          Hosted by <strong>{req.recipient?.display_name || "Host"}</strong>
                          &nbsp;·&nbsp; ₹{req.listing?.rent?.toLocaleString("en-IN")}/mo
                          &nbsp;·&nbsp; {new Date(req.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 800, background: status.bg, color: status.color, flexShrink: 0 }}>
                        {status.label}
                      </span>
                    </div>
                    {req.note && <div className="request-note">Your note: &quot;{req.note}&quot;</div>}
                    {req.status === "accepted" && (
                      <Link href="/messages" className="btn-sm" style={{ textDecoration: "none", display: "inline-block", width: "fit-content" }}>
                        💬 Open conversation
                      </Link>
                    )}
                    <Link href={`/listings/${req.listing?.id}`} className="btn-sm" style={{ textDecoration: "none", display: "inline-block", width: "fit-content" }}>
                      👁 View listing
                    </Link>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {notice && <div className={`auth-notice ${noticeType}`} style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 300, boxShadow: "0 4px 20px rgba(0,0,0,.1)", minWidth: "280px" }}>{notice}</div>}
    </div>
  );
}
