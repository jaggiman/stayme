"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      setDone(true);
      setTimeout(() => router.replace("/dashboard/overview"), 2500);
    }
    setLoading(false);
  };

  return (
    <main className="auth-page-wrap">
      <div className="auth-card">
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">R</span>
          <span>roomie<span className="dot">.</span></span>
        </Link>
        <h1 className="auth-heading">Choose a new password</h1>
        <p className="auth-sub">Make it strong and memorable.</p>

        {done ? (
          <div className="auth-notice success" style={{ marginTop: "24px" }}>
            <span>✅</span>
            <div>
              <strong>Password updated!</strong>
              <p>Taking you to your dashboard…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="auth-form">
            {error && <div className="auth-notice error">{error}</div>}

            <label className="auth-label">
              New password
              <div className="password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="show-pass"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            <label className="auth-label">
              Confirm new password
              <input
                type="password"
                className="auth-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your new password"
                autoComplete="new-password"
              />
              {confirm.length > 0 && password !== confirm && (
                <span className="field-error">Passwords don&apos;t match</span>
              )}
            </label>

            <button
              type="submit"
              className="match-button auth-submit"
              disabled={loading || (confirm.length > 0 && password !== confirm)}
            >
              {loading ? "Updating…" : "Update password"} {!loading && <span>→</span>}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
