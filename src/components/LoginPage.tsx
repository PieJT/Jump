import { useRef, useState } from "react";
import { useAuth, friendlyAuthError } from "../hooks/AuthContext";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

/** Verifies a Turnstile token with the Worker before letting an auth call proceed. */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

type Mode = "signin" | "signup" | "reset";

const GoogleGIcon = () => (
  <svg viewBox="0 0 48 48" width="18" height="18">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="m6.3 14.7 6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5c-2 1.4-4.6 2.2-7.6 2.2-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.7 16.4 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
    />
  </svg>
);

export function LoginPage() {
  const { signInEmail, signUpEmail, signInGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  // Runs a Turnstile challenge check before any sign-in/sign-up attempt. Tokens
  // are single-use, so the widget is reset (issuing a fresh challenge) whenever
  // verification is missing or fails.
  const passesBotCheck = async (): Promise<boolean> => {
    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return false;
    }
    const ok = await verifyTurnstileToken(turnstileToken);
    if (!ok) {
      setError("Verification failed — please try the challenge again.");
      setTurnstileToken(null);
      turnstileRef.current?.reset();
      return false;
    }
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "reset") {
      setBusy(true);
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch (err) {
        setError(friendlyAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      if (!(await passesBotCheck())) return;
      if (mode === "signin") await signInEmail(email, password);
      else await signUpEmail(email, password, displayName);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!(await passesBotCheck())) return;
      await signInGoogle();
    } catch (err) {
      const message = friendlyAuthError(err);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">Jump</div>

        {mode !== "reset" && (
          <>
            <div className="login-heading">
              <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              {mode === "signin" && <p>Sign in to get back to your library.</p>}
            </div>

            <div className="login-tabs">
              <button
                type="button"
                className={mode === "signin" ? "active" : ""}
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => switchMode("signup")}
              >
                Create account
              </button>
            </div>
          </>
        )}

        {mode === "reset" && (
          <div className="login-heading">
            <h1>Reset your password</h1>
            <p>We'll email you a link to get back in.</p>
          </div>
        )}

        {mode === "reset" && resetSent ? (
          <div className="login-reset-sent">
            <p>Check {email || "your inbox"} for a reset link.</p>
            <button type="button" className="login-link" onClick={() => switchMode("signin")}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleEmailSubmit}>
            {mode === "signup" && (
              <div className="login-field">
                <label htmlFor="displayName">Name</label>
                <input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {mode !== "reset" && (
              <div className="login-field">
                <div className="login-field-label-row">
                  <label htmlFor="password">Password</label>
                  {mode === "signin" && (
                    <button type="button" className="login-link small" onClick={() => switchMode("reset")}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="login-password-row">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="login-show-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            )}

            {mode !== "reset" && (
              <Turnstile
                ref={turnstileRef}
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setError(null);
                }}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            )}

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary login-submit"
              disabled={busy || (mode !== "reset" && !turnstileToken)}
            >
              {busy ? (
                <span className="login-spinner" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Send reset link"
              )}
            </button>

            {mode === "reset" && (
              <button type="button" className="login-link" onClick={() => switchMode("signin")}>
                Back to sign in
              </button>
            )}
          </form>
        )}

        {mode !== "reset" && !resetSent && (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="login-google-btn"
              onClick={handleGoogle}
              disabled={busy || !turnstileToken}
            >
              <GoogleGIcon />
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}