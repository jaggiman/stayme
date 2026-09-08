"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMessages,
  sendMessage,
  getConversationWithPartner,
  readableError,
} from "../../../lib/roomie-api";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";

// ─── Date separator helpers ────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [partnerName, setPartnerName] = useState("Loading…");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (_) {}
  }, [conversationId]);

  // Initial load: partner info + messages
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const partner = await getConversationWithPartner(conversationId, user.id);
        if (partner) {
          const p = partner as any;
          const profile = p.profiles;
          const name = profile?.display_name || null;
          const pid = profile?.id || p.profile_id || null;
          if (name) setPartnerName(name);
          else setPartnerName("Roommate");
          if (pid) setPartnerId(pid);
        } else {
          setPartnerName("Roommate");
        }
        await fetchMessages();
      } finally {
        setLoading(false);
      }
    };
    if (conversationId) init();
  }, [conversationId, user, fetchMessages]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime subscription — skip own messages (sender already has optimistic state)
  useEffect(() => {
    if (!supabase || !conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as any;
          // Skip own messages — sender already has up-to-date state from fetchMessages()
          if (incoming.sender_profile_id === user?.id) return;
          setMessages((prev) => {
            // Deduplicate by id just in case
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();
    const client = supabase;
    return () => {
      client.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);

    const text = body.trim();

    // Optimistic: add temp bubble immediately
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_profile_id: user?.id,
      body: text,
      created_at: new Date().toISOString(),
      _temp: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setBody("");

    try {
      await sendMessage(conversationId, text);
      // Refetch to replace optimistic state with real server data (also deduplicates)
      await fetchMessages();
    } catch (err) {
      alert(readableError(err));
      // Roll back optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBody(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  // Build message list with date separators
  const renderMessages = () => {
    if (loading)
      return (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>
          Loading messages…
        </p>
      );
    if (messages.length === 0)
      return (
        <div style={{ textAlign: "center", margin: "auto", color: "var(--muted)" }}>
          <p style={{ fontSize: "28px" }}>👋</p>
          <p style={{ fontSize: "13px" }}>
            Say hello! This conversation just started.
          </p>
        </div>
      );

    const items: React.ReactNode[] = [];
    let lastDateKey = "";

    messages.forEach((msg) => {
      const dateKey = getDateKey(msg.created_at);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push(
          <div key={`sep-${dateKey}`} className="date-separator">
            {formatDateLabel(msg.created_at)}
          </div>
        );
      }
      const isMine = msg.sender_profile_id === user?.id;
      items.push(
        <div
          key={msg.id}
          className={`message-bubble ${isMine ? "mine" : "theirs"}`}
        >
          <p style={{ margin: 0 }}>{msg.body}</p>
          <time>
            {new Date(msg.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      );
    });

    return items;
  };

  const partnerInitial = partnerName.charAt(0).toUpperCase();

  return (
    <div className="messages-layout">
      {/* Sidebar — desktop only */}
      <div className="conversations-list">
        <div className="convo-list-back">
          <Link
            href="/messages"
            style={{
              fontSize: "13px",
              color: "var(--muted)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← All conversations
          </Link>
        </div>
      </div>

      {/* Thread */}
      <div className="message-thread">
        {/* Header */}
        <div className="thread-header">
          {/* Mobile: back button */}
          <button
            className="thread-back-mobile"
            onClick={() => router.push("/messages")}
            aria-label="Back to conversations"
          >
            ←
          </button>

          {/* Partner avatar + name — clickable to view profile */}
          {partnerId ? (
            <Link href={`/profile/${partnerId}`} className="partner-link">
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "var(--lime)",
                  fontFamily: "Fraunces,serif",
                  fontSize: "16px",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {partnerInitial}
              </div>
              <div>
                <span style={{ fontWeight: 700 }}>{partnerName}</span>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "var(--muted)",
                    fontWeight: 500,
                  }}
                >
                  View profile →
                </span>
              </div>
            </Link>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "var(--lime)",
                  fontFamily: "Fraunces,serif",
                  fontSize: "16px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {partnerInitial}
              </div>
              <span>{partnerName}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="thread-messages">
          {renderMessages()}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="thread-input">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            disabled={sending}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={sending || !body.trim()}
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
