"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  return (
    <main className="auth-page-wrap">
      <div className="auth-card">
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">R</span>
          <span>roomie<span className="dot">.</span></span>
        </Link>
        <h1 className="auth-heading">Reset your password</h1>
        <p className="auth-sub">Enter your email and we&apos;ll send you a reset link.</p>

        {sent ? (
          <div className="auth-notice success" style={{ marginTop: "24px" }}>
            <span>📬</span>
            <div>
              <strong>Check your inbox</strong>
              <p>A password reset link was sent to <strong>{email}</strong>.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-notice error">{error}</div>}
            <label className="auth-label">
              Email address
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" className="match-button auth-submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"} {!loading && <span>→</span>}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link href="/login" className="link-button">← Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
