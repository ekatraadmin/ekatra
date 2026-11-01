import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import "./Auth.css";

const STEPS = ["Create", "Verify", "Welcome"];

function getErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";
  const message = String(error.message || error);
  if (/invalid login credentials/i.test(message)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(message)) return "Please verify your email before logging in.";
  if (/user already registered/i.test(message)) return "An account with this email already exists. Try logging in.";
  if (/password should be at least/i.test(message)) return "Password must be at least 6 characters.";
  return message;
}

function PasswordField({ label, value, onChange, placeholder, autoComplete, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="auth-field">
      <label>{label}</label>
      <div className={`auth-input-wrap ${error ? "has-error" : ""}`}>
        <LockKeyhole size={17} />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        <button type="button" className="password-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function GoogleButton({ loading, onClick }) {
  return (
    <button type="button" className="google-button" onClick={onClick} disabled={loading}>
      <span className="google-mark">G</span>
      {loading ? "Connecting..." : "Continue with Google"}
    </button>
  );
}

export default function Auth({ initialMode = "login", recovery = false, onRecoveryComplete }) {
  const [mode, setMode] = useState(recovery ? "reset" : initialMode);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const stepIndex = useMemo(() => {
    if (mode === "signup" && sent) return 1;
    if (mode === "welcome") return 2;
    return mode === "signup" ? 0 : 0;
  }, [mode, sent]);

  useEffect(() => {
    if (!recovery) return;
    setMode("reset");
  }, [recovery]);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function switchMode(next) {
    clearFeedback();
    setSent(false);
    setOtp("");
    setForgotSent(false);
    setMode(next);
  }

  async function login(e) {
    e.preventDefault();
    clearFeedback();
    setBusy(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);
    if (loginError) setError(getErrorMessage(loginError));
  }

  async function signup(e) {
    e.preventDefault();
    clearFeedback();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    setBusy(true);

    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
        },
      },
    });

    setBusy(false);

    if (signupError) {
      setError(getErrorMessage(signupError));
      return;
    }

    // If email confirmation is enabled, Supabase sends the configured
    // confirmation email. With the Ekatra 8-digit template,
    // verifyOtp({ type: "signup" }) completes the signup.
    if (data.user) {
      localStorage.setItem(
        "studytogether-pending-signup",
        JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        })
      );
    }

    setSent(true);
    setMessage(`We sent an 8-digit verification code to ${email.trim()}.`);
  }

  async function verifySignup(e) {
    e.preventDefault();
    clearFeedback();

    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 8) {
      setError("Please enter the 8-digit verification code.");
      return;
    }

    setBusy(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: cleanOtp,
      type: "signup",
    });

    setBusy(false);

    if (verifyError) {
      setError(getErrorMessage(verifyError));
      return;
    }

    localStorage.removeItem("studytogether-pending-signup");
    setMode("welcome");
  }

  async function resendSignupOtp() {
    clearFeedback();
    setBusy(true);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });

    setBusy(false);
    if (resendError) setError(getErrorMessage(resendError));
    else setMessage("A new verification code has been sent.");
  }

  async function googleLogin() {
    clearFeedback();
    setGoogleBusy(true);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (googleError) {
      setGoogleBusy(false);
      setError(getErrorMessage(googleError));
    }
  }

  async function forgotPassword(e) {
    e.preventDefault();
    clearFeedback();

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);

    if (resetError) {
      setError(getErrorMessage(resetError));
      return;
    }

    setForgotSent(true);
    setMessage("Password reset instructions have been sent to your email.");
  }

  async function updatePassword(e) {
    e.preventDefault();
    clearFeedback();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(getErrorMessage(updateError));
      return;
    }

    setMessage("Your password has been updated. You can continue to Ekatra.");
    if (onRecoveryComplete) onRecoveryComplete();
  }

  function startFromWelcome() {
    // The App auth listener will normally move to ProfileSetup after verification.
    setMode("login");
  }

  return (
    <div className="auth-page">
      <div className="auth-background-glow auth-glow-one" />
      <div className="auth-background-glow auth-glow-two" />

      <div className="auth-shell">
        <section className="auth-visual-panel">
          <div className="auth-brand">
            <div className="auth-brand-mark">
              <span />
              <span />
              <span />
            </div>
            <span>Ekatra</span>
          </div>

          <div className="auth-visual-content">
            <span className="auth-kicker"><Sparkles size={14} /> YOUR STUDY SPACE</span>
            <h1>Study smarter.<br /><em>Together.</em></h1>
            <p>Focus, connect and make every study session count.</p>

            <div className="auth-feature-stack">
              <div className="auth-feature-card">
                <div className="auth-feature-icon"><TimerIcon /></div>
                <div><strong>Focused sessions</strong><span>Build a study habit that lasts.</span></div>
              </div>
              <div className="auth-feature-card">
                <div className="auth-feature-icon"><UsersIcon /></div>
                <div><strong>Study with friends</strong><span>Find people who are learning too.</span></div>
              </div>
              <div className="auth-feature-card">
                <div className="auth-feature-icon"><ShieldCheck size={18} /></div>
                <div><strong>Private & secure</strong><span>Your account stays protected.</span></div>
              </div>
            </div>
          </div>

          <div className="auth-visual-footer">
            <span>Learn</span><i /> <span>Focus</span><i /> <span>Connect</span>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-top-switch">
            {mode === "login" && <><span>Don't have an account?</span><button onClick={() => switchMode("signup")}>Sign up</button></>}
            {mode === "signup" && !sent && <><span>Already have an account?</span><button onClick={() => switchMode("login")}>Log in</button></>}
            {mode === "signup" && sent && <button onClick={() => switchMode("login")}>Back to login</button>}
          </div>

          {mode !== "reset" && mode !== "welcome" && (
            <div className="auth-tabs">
              <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Log in</button>
              <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>Sign up</button>
            </div>
          )}

          {mode === "login" && (
            <>
              <div className="auth-heading">
                <span>WELCOME BACK</span>
                <h2>Log in to continue</h2>
                <p>Pick up where you left off and get back to studying.</p>
              </div>

              <form className="auth-form" onSubmit={login}>
                <div className="auth-field">
                  <label>Email address</label>
                  <div className="auth-input-wrap">
                    <Mail size={17} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                  </div>
                </div>

                <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" />

                <div className="auth-forgot-row">
                  <button type="button" onClick={() => { clearFeedback(); setMode("forgot"); }}>Forgot password?</button>
                </div>

                <button className="auth-primary" type="submit" disabled={busy}>
                  {busy ? "Logging in..." : "Log in"}<ArrowRight size={18} />
                </button>
              </form>

              <Divider />
              <GoogleButton loading={googleBusy} onClick={googleLogin} />
            </>
          )}

          {mode === "signup" && !sent && (
            <>
              <div className="auth-heading">
                <span>GET STARTED</span>
                <h2>Create your account</h2>
                <p>Set up your Ekatra account in a few seconds.</p>
              </div>

              <form className="auth-form" onSubmit={signup}>
                <div className="auth-name-grid">
                  <div className="auth-field"><label>First name</label><input className="plain-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" required /></div>
                  <div className="auth-field"><label>Last name</label><input className="plain-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" required /></div>
                </div>

                <div className="auth-field">
                  <label>Email address</label>
                  <div className="auth-input-wrap"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
                </div>

                <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Create a password" autoComplete="new-password" />
                <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" autoComplete="new-password" />

                <button className="auth-primary" type="submit" disabled={busy}>
                  {busy ? "Creating account..." : "Create account"}<ArrowRight size={18} />
                </button>
              </form>

              <Divider />
              <GoogleButton loading={googleBusy} onClick={googleLogin} />
              <p className="auth-terms">By continuing, you agree to the Ekatra terms and privacy policy.</p>
            </>
          )}

          {mode === "signup" && sent && (
            <>
              <div className="auth-heading auth-otp-heading">
                <div className="auth-mail-circle"><Mail size={24} /></div>
                <span>EMAIL VERIFICATION</span>
                <h2>Verify your email</h2>
                <p>Enter the 8-digit code we sent to <strong>{email}</strong>.</p>
              </div>

              <form className="auth-form" onSubmit={verifySignup}>
                <div className="auth-field">
                  <label>8-digit verification code</label>
                  <input className="otp-input" inputMode="numeric" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" autoComplete="one-time-code" autoFocus required />
                </div>
                <button className="auth-primary" type="submit" disabled={busy || otp.length !== 8}>
                  {busy ? "Verifying..." : "Verify & continue"}<Check size={18} />
                </button>
              </form>

              <div className="auth-resend-row"><span>Didn't receive the code?</span><button onClick={resendSignupOtp} disabled={busy}>Resend code</button></div>
              {message && <div className="auth-success">{message}</div>}
            </>
          )}

          {mode === "forgot" && (
            <>
              <div className="auth-heading">
                <span>ACCOUNT RECOVERY</span>
                <h2>Reset your password</h2>
                <p>Enter your email and we'll send you a secure reset link.</p>
              </div>
              <form className="auth-form" onSubmit={forgotPassword}>
                <div className="auth-field"><label>Email address</label><div className="auth-input-wrap"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div></div>
                <button className="auth-primary" type="submit" disabled={busy}>{busy ? "Sending..." : "Send reset email"}<ArrowRight size={18} /></button>
              </form>
              {forgotSent && <div className="auth-success">{message}</div>}
              <button className="auth-text-button" onClick={() => switchMode("login")}>← Back to login</button>
            </>
          )}

          {mode === "reset" && (
            <>
              <div className="auth-heading">
                <span>ACCOUNT RECOVERY</span>
                <h2>Choose a new password</h2>
                <p>Create a new password for your Ekatra account.</p>
              </div>
              <form className="auth-form" onSubmit={updatePassword}>
                <PasswordField label="New password" value={password} onChange={setPassword} placeholder="New password" autoComplete="new-password" />
                <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" autoComplete="new-password" />
                <button className="auth-primary" type="submit" disabled={busy}>{busy ? "Updating..." : "Update password"}<Check size={18} /></button>
              </form>
              {message && <div className="auth-success">{message}</div>}
            </>
          )}

          {mode === "welcome" && (
            <div className="auth-welcome-state">
              <div className="auth-welcome-icon"><Check size={30} /></div>
              <span>ALL SET</span>
              <h2>Welcome to Ekatra!</h2>
              <p>Your email has been verified. Let's finish setting up your study profile.</p>
              <button className="auth-primary" onClick={startFromWelcome}>Continue <ArrowRight size={18} /></button>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {message && mode !== "signup" && mode !== "forgot" && mode !== "reset" && <div className="auth-success">{message}</div>}
        </section>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="auth-divider"><span>or</span></div>;
}

function TimerIcon() { return <span className="mini-icon">50</span>; }
function UsersIcon() { return <span className="mini-users">•••</span>; }
