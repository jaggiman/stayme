"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";

function passwordStrength(pwd: string): { level: number; label: string; color: string } {
  if (pwd.length === 0) return { level: 0, label: "", color: "" };
  if (pwd.length < 6) return { level: 1, label: "Too short", color: "#ef4444" };
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
  if (pwd.length < 8) return { level: 2, label: "Weak", color: "#f97316" };
  if (score <= 2) return { level: 2, label: "Fair", color: "#eab308" };
  if (score === 3) return { level: 3, label: "Good", color: "#84cc16" };
  return { level: 4, label: "Strong", color: "#22c55e" };
}

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard/overview");
  }, [user, authLoading, router]);

  const strength = passwordStrength(password);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return setError("Supabase is not configured.");
    setError("");

    if (!displayName.trim()) return setError("Please enter your display name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
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

  if (emailSent) {
    return (
      <main className="auth-page-wrap">
        <div className="auth-card">
          <Link href="/" className="brand auth-brand">
            <span className="brand-mark">R</span>
            <span>roomie<span className="dot">.</span></span>
          </Link>
          <div className="auth-notice success" style={{ marginTop: "28px" }}>
            <span>📬</span>
            <div>
              <strong>Check your inbox</strong>
              <p>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
            </div>
          </div>
          <p className="auth-switch" style={{ marginTop: "24px" }}>
            Already confirmed? <Link href="/login" className="link-button bold">Sign in →</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page-wrap">
      <div className="auth-card">
        <Link href="/" className="brand auth-brand">
          <span className="brand-mark">R</span>
          <span>roomie<span className="dot">.</span></span>
        </Link>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-sub">Find your ideal shared home in minutes.</p>

        <button
          type="button"
          className="oauth-button"
          onClick={handleGoogleSignup}
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

        <form onSubmit={handleSignup} className="auth-form">
          {error && <div className="auth-notice error">{error}</div>}

          <label className="auth-label">
            Display name
            <input
              type="text"
              className="auth-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={60}
              placeholder="e.g. Ananya Sharma"
              autoComplete="name"
            />
          </label>

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

          <label className="auth-label">
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
            {password.length > 0 && (
              <div className="strength-bar-wrap">
                <div className="strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="strength-segment"
                      style={{ background: i <= strength.level ? strength.color : "var(--line)" }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </label>

          <label className="auth-label">
            Confirm password
            <div className="password-wrap">
              <input
                type={showConfirm ? "text" : "password"}
                className="auth-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
              <button
                type="button"
                className="show-pass"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <span className="field-error">Passwords don&apos;t match</span>
            )}
          </label>

          <button
            type="submit"
            className="match-button auth-submit"
            disabled={loading || (confirm.length > 0 && password !== confirm)}
          >
            {loading ? "Creating account…" : "Create account"}
            {!loading && <span>→</span>}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link href="/login" className="link-button bold">Sign in →</Link>
        </p>
      </div>
    </main>
  );
}
