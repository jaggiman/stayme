"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const searchParams = useSearchParams();
  const [error, setError] = useState(searchParams.get("error") || "");
  const [magicSent, setMagicSent] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const redirectTo = searchParams.get("redirect") || "/dashboard/overview";

  // If already logged in, redirect away
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    setLoading(true);
    setError("");

    if (magicLinkMode) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMagicSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message.includes("Invalid login credentials")
            ? "Incorrect email or password. Please try again."
            : error.message
        );
      } else {
        router.replace(redirectTo);
      }
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return setError("Supabase is not configured.");
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  if (authLoading) {
    return (
      <main className="auth-page-wrap">
        <div className="auth-card">
          <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page-wrap">
      <div className="auth-card">
        {/* Brand */}
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">R</span>
          <span>roomie<span className="dot">.</span></span>
        </Link>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-sub">Sign in to your account to continue.</p>

        {/* Google OAuth */}
        <button
          type="button"
          className="oauth-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        {magicSent ? (
          <div className="auth-notice success">
            <span>📬</span>
            <div>
              <strong>Check your inbox</strong>
              <p>We sent a sign-in link to <strong>{email}</strong>. Click it to sign in.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="auth-form">
            {error && <div className="auth-notice error">{error}</div>}

            <label className="auth-label">
              Email address
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            {!magicLinkMode && (
              <label className="auth-label">
                Password
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="show-pass"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
            )}

            <div className="auth-form-footer">
              <button
                type="button"
                className="link-button"
                onClick={() => { setMagicLinkMode((m) => !m); setError(""); }}
              >
                {magicLinkMode ? "Use password instead" : "Email me a sign-in link"}
              </button>
              {!magicLinkMode && (
                <Link href="/forgot-password" className="link-button">
                  Forgot password?
                </Link>
              )}
            </div>

            <button type="submit" className="match-button auth-submit" disabled={loading}>
              {loading ? "Signing in…" : magicLinkMode ? "Send sign-in link" : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link href="/signup" className="link-button bold">Create one →</Link>
        </p>
      </div>
    </main>
  );
}
