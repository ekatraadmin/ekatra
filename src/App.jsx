import AdUnit from "./AdUnit";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  Home,
  Headphones,
  Target,
  MessageSquare,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  Image,
  Music,
  Quote,
  Maximize,
  Timer,
  RotateCcw,
  SkipForward,
  Play,
  Pause,
  Plus,
  Check,
  X,
  ChevronDown,
  Users,
  ArrowRight,
  Lock,
  Globe,
  Hash,
  Search,
  RefreshCw,
  Copy,
  Sun,
  Moon,
  Upload,
  Save,
  Video,
  Volume2,
  ImagePlus,
  ExternalLink,
  Trash2,
  Palette,
  UserRound,
  Info,
} from "lucide-react";

import "./App.css";
import "./Rooms.css";
import "./SoloStudy.css";

import StudyRoom from "./StudyRoom";
import StudyGoals from "./StudyGoals";
import SettingsPage from "./SettingsPage";
import Dashboard from "./Dashboard";
import ChatRooms from "./ChatRooms";
import NotificationBar from "./NotificationBar";
import StudyStats from "./StudyStats";
import "./StudyTogether.css";
import "./PublicLanding.css";


function getYouTubeId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return /^[A-Za-z0-9_-]{11}$/.test(text) ? text : "";
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        setProfile(null);
        setLoading(false);
      } else {
        loadProfile(newSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSession(session);

    if (session) {
      await loadProfile(session.user.id);
    }

    setLoading(false);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile error:", error);
      return;
    }

    setProfile(data);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">S</div>
        <h2>StudyTogether</h2>
        <p>Loading your study space...</p>
      </div>
    );
  }

  if (!session) {
    return <PublicHome />;
  }

  if (!profile) {
    return (
      <ProfileSetup
        user={session.user}
        onComplete={(newProfile) => setProfile(newProfile)}
      />
    );
  }

  return (
    <>
      <NotificationBar userId={session.user.id} />
      <StudyApp
        profile={profile}
        user={session.user}
      />
    </>
  );
}


/* =========================================================
   PUBLIC OPENING PAGE
========================================================= */

function PublicHome() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setShowAuth(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (showAuth) {
    return (
      <div className="public-auth-shell">
        <button
          type="button"
          className="public-back-button"
          onClick={() => setShowAuth(false)}
        >
          <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
          Back to StudyTogether
        </button>
        <Login initialMode={authMode} />
      </div>
    );
  }

  return (
    <div className="public-page">
      <header className="public-nav">
        <button
          type="button"
          className="public-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="public-brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>StudyTogether</span>
        </button>

        <nav className="public-nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#rooms">Study rooms</a>
        </nav>

        <div className="public-nav-actions">
          <button
            type="button"
            className="public-login-link"
            onClick={() => openAuth("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className="public-nav-cta"
            onClick={() => openAuth("signup")}
          >
            Get started <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <main>
        <section className="public-hero">
          <div className="public-hero-glow public-glow-one" />
          <div className="public-hero-glow public-glow-two" />

          <div className="public-hero-copy">
            <div className="public-eyebrow">
              <span className="public-live-dot" />
              YOUR DIGITAL STUDY SPACE
            </div>

            <h1>
              Study better.
              <br />
              <span>Together.</span>
            </h1>

            <p>
              A focused space for students to study, join live rooms,
              stay accountable, chat with friends and build better study habits.
            </p>

            <div className="public-hero-actions">
              <button
                type="button"
                className="public-primary-button"
                onClick={() => openAuth("signup")}
              >
                Start studying free
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="public-secondary-button"
                onClick={() => openAuth("login")}
              >
                I already have an account
              </button>
            </div>

            <div className="public-trust-row">
              <div className="public-avatar-stack">
                <span>ST</span>
                <span>AK</span>
                <span>RV</span>
              </div>
              <div>
                <strong>Made for students</strong>
                <small>Study solo or with your community.</small>
              </div>
            </div>
          </div>

          <div className="public-hero-visual" aria-label="StudyTogether preview">
            <div className="public-window">
              <div className="public-window-top">
                <div className="public-window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>studytogether</span>
                <div className="public-window-status">
                  <span />
                  Live
                </div>
              </div>

              <div className="public-preview-body">
                <aside className="public-preview-sidebar">
                  <div className="public-preview-logo">
                    <b>S</b>
                    <span>StudyTogether</span>
                  </div>
                  <div className="public-preview-nav active"><Home size={13} /> Dashboard</div>
                  <div className="public-preview-nav"><Headphones size={13} /> Solo Study</div>
                  <div className="public-preview-nav"><Users size={13} /> Study Rooms</div>
                  <div className="public-preview-nav"><MessageSquare size={13} /> Chat</div>
                  <div className="public-preview-nav"><BarChart3 size={13} /> Study Stats</div>
                </aside>

                <div className="public-preview-main">
                  <div className="public-preview-heading">
                    <div>
                      <small>YOUR STUDY SPACE</small>
                      <h3>Good to see you.</h3>
                    </div>
                    <div className="public-preview-avatar">S</div>
                  </div>

                  <div className="public-stat-row">
                    <div>
                      <span>Today's study</span>
                      <strong>2h 45m</strong>
                      <small>+18% this week</small>
                    </div>
                    <div>
                      <span>Study streak</span>
                      <strong>7 days</strong>
                      <small>Keep it going</small>
                    </div>
                  </div>

                  <div className="public-preview-grid">
                    <div className="public-preview-card public-focus-card">
                      <div className="public-card-label">FOCUS SESSION</div>
                      <strong>42:18</strong>
                      <div className="public-progress"><span /></div>
                      <div className="public-card-footer">
                        <span>Deep work</span>
                        <b>Active</b>
                      </div>
                    </div>

                    <div className="public-preview-card">
                      <div className="public-card-label">LIVE ROOM</div>
                      <div className="public-mini-room">
                        <span>Physics — Night Study</span>
                        <b>4 online</b>
                      </div>
                      <div className="public-mini-people">
                        <i>R</i><i>A</i><i>K</i><i>S</i>
                        <span>Join room</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="public-floating-card public-float-room">
              <span className="public-float-icon"><Video size={15} /></span>
              <div>
                <strong>Live study room</strong>
                <small>Camera connected</small>
              </div>
              <span className="public-online-dot" />
            </div>

            <div className="public-floating-card public-float-chat">
              <span className="public-float-icon"><MessageSquare size={15} /></span>
              <div>
                <strong>Room chat</strong>
                <small>“Ready when you are!”</small>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section public-feature-section" id="features">
          <div className="public-section-heading">
            <span>BUILT AROUND FOCUS</span>
            <h2>Everything you need to<br />make study time count.</h2>
          </div>

          <div className="public-feature-grid">
            <article className="public-feature-card">
              <div className="public-feature-icon"><Video size={20} /></div>
              <h3>Live study rooms</h3>
              <p>Join a room with classmates, turn on your camera and study together in real time.</p>
            </article>
            <article className="public-feature-card">
              <div className="public-feature-icon"><Timer size={20} /></div>
              <h3>Focused sessions</h3>
              <p>Use structured focus sessions to protect your attention and make every minute useful.</p>
            </article>
            <article className="public-feature-card">
              <div className="public-feature-icon"><MessageSquare size={20} /></div>
              <h3>Student chat</h3>
              <p>Connect with friends, share messages and keep your study conversations in one place.</p>
            </article>
            <article className="public-feature-card">
              <div className="public-feature-icon"><BarChart3 size={20} /></div>
              <h3>Study statistics</h3>
              <p>See your study time, streaks, goals and progress so you know how your habits are growing.</p>
            </article>
          </div>
        </section>

        <section className="public-section public-how-section" id="how-it-works">
          <div className="public-how-copy">
            <span className="public-section-kicker">SIMPLE FROM DAY ONE</span>
            <h2>Open your space.<br />Find your focus.</h2>
            <p>
              StudyTogether keeps the experience simple: create your account,
              choose how you want to study and get started.
            </p>
          </div>

          <div className="public-steps">
            <div className="public-step">
              <span>01</span>
              <div>
                <h3>Create your account</h3>
                <p>Set up your student profile in a few moments.</p>
              </div>
            </div>
            <div className="public-step">
              <span>02</span>
              <div>
                <h3>Choose your study mode</h3>
                <p>Study solo, join a room or create one for your friends.</p>
              </div>
            </div>
            <div className="public-step">
              <span>03</span>
              <div>
                <h3>Stay consistent</h3>
                <p>Track sessions, goals and progress as you study.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-room-banner" id="rooms">
          <div>
            <span className="public-section-kicker">STUDY TOGETHER</span>
            <h2>Your next productive session<br />can start here.</h2>
            <p>Bring your friends. Open a room. Get focused.</p>
          </div>
          <button
            type="button"
            className="public-primary-button"
            onClick={() => openAuth("signup")}
          >
            Create free account <ArrowRight size={17} />
          </button>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-brand public-footer-brand">
          <span className="public-brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>StudyTogether</span>
        </div>
        <span>© {new Date().getFullYear()} StudyTogether. Built for better study sessions.</span>
      </footer>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */
function Login({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    clearFeedback();
    setPassword("");
    setConfirmPassword("");
  }

  // LOGIN
  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    clearFeedback();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
    }
  }

  // SIGN UP
  async function handleSignup(e) {
    e.preventDefault();

    clearFeedback();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim();

    if (cleanFirstName.length < 2) {
      setError("Please enter your first name.");
      return;
    }

    if (!cleanLastName) {
      setError("Please enter your last name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error: signupError } =
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            display_name: `${cleanFirstName} ${cleanLastName}`,
          },
        },
      });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    // If email confirmation is enabled,
    // Supabase sends the confirmation link.
    if (!data?.session) {
      setMessage(
        "Account created! Please check your email and click the confirmation link."
      );
    }
  }

  // GOOGLE LOGIN
  async function handleGoogleLogin() {
    clearFeedback();
    setLoading(true);

    const { error: googleError } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

    if (googleError) {
      setLoading(false);
      setError(googleError.message);
    }
  }

  // FORGOT PASSWORD
  async function handleForgotPassword(e) {
    e.preventDefault();

    clearFeedback();

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: window.location.origin,
        }
      );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "If an account exists for this email, a password reset email has been sent."
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* LOGO */}
        <div className="auth-logo">
          <div className="auth-logo-icon">S</div>
          <span>StudyTogether</span>
        </div>

        {/* FORGOT PASSWORD */}
        {mode === "forgot" ? (
          <>
            <h1>Reset your password.</h1>

            <p className="subtitle">
              Enter your email and we'll send you a
              password reset email.
            </p>

            <form onSubmit={handleForgotPassword}>

              <label>Email address</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
                required
              />

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Send reset email"}
              </button>

            </form>

            <button
              type="button"
              className="secondary-button"
              onClick={() => switchMode("login")}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <h1>
              {mode === "login"
                ? "Welcome back."
                : "Create your account."}
            </h1>

            <p className="subtitle">
              {mode === "login"
                ? "Sign in to continue studying with your community."
                : "Create your StudyTogether account and start studying."}
            </p>

            <form
              onSubmit={
                mode === "login"
                  ? handleLogin
                  : handleSignup
              }
            >

              {/* FIRST + LAST NAME */}
              {mode === "signup" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label>First name</label>

                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) =>
                        setFirstName(e.target.value)
                      }
                      autoComplete="given-name"
                      required
                    />
                  </div>

                  <div>
                    <label>Last name</label>

                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) =>
                        setLastName(e.target.value)
                      }
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              )}

              {/* EMAIL */}
              <label>Email address</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
                required
              />

              {/* PASSWORD */}
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                required
              />

              {/* CONFIRM PASSWORD */}
              {mode === "signup" && (
                <>
                  <label>Confirm password</label>

                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </>
              )}

              {/* FORGOT PASSWORD */}
              {mode === "login" && (
                <div
                  style={{
                    textAlign: "right",
                    marginTop: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setMode("forgot");
                      clearFeedback();
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>

            </form>

            {/* GOOGLE */}
            <div
              style={{
                textAlign: "center",
                margin: "18px 0",
                opacity: 0.7,
              }}
            >
              or
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <strong>G</strong>
              Continue with Google
            </button>

            {/* SWITCH */}
            <div
              style={{
                textAlign: "center",
                marginTop: "22px",
              }}
            >
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  switchMode(
                    mode === "login"
                      ? "signup"
                      : "login"
                  )
                }
              >
                {mode === "login"
                  ? "Sign up"
                  : "Sign in"}
              </button>
            </div>
          </>
        )}

        {/* ERROR */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* MESSAGE */}
        {message && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(34,197,94,.12)",
              color: "#22c55e",
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        )}

        <p className="login-note">
          Your account is secured by Supabase authentication.
        </p>

      </div>
    </div>
  );
}
/* =========================================================
   PROFILE SETUP
========================================================= */

function ProfileSetup({ user, onComplete }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createProfile(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");

    const cleanName = displayName.trim();

    if (cleanName.length < 2) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username must contain at least 3 characters.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: cleanUsername,
        display_name: cleanName,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError(error.message);
      }

      return;
    }

    onComplete(data);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">S</div>
          <span>StudyTogether</span>
        </div>

        <h1>Create your profile.</h1>

        <p className="subtitle">
          Choose how other students will see you.
        </p>

        <form onSubmit={createProfile}>

          <label>Display name</label>

          <input
            type="text"
            placeholder="Srishanth"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            required
          />

          <label>Username</label>

          <input
            type="text"
            placeholder="srishanth01"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase())
            }
            maxLength={30}
            required
          />

          <small className="input-help">
            Other students can use your username to find you.
          </small>

          <button type="submit" disabled={loading}>
            {loading ? "Creating profile..." : "Create Profile"}
          </button>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

      </div>
    </div>
  );
}

/* =========================================================
   MAIN STUDY APP
========================================================= */

function StudyApp({ profile, user }) {
  const [page, setPage] = useState("dashboard");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("studytogether-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("studytogether-theme", theme);
      document.documentElement.dataset.theme = theme;
    } catch {
      // Ignore storage restrictions.
    }
  }, [theme]);

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className={`study-app app-theme-${theme} ${page === "solo" ? "solo-mode" : ""}`}>

      {/* SIDEBAR */}
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        user={user}
        logout={logout}
        theme={theme}
        setTheme={setTheme}
      />

      {/* MAIN CONTENT */}
      <div className="app-main">

        {/* =========================
            STUDY ROOM
        ========================= */}
        {page.startsWith("room:") && (
          <StudyRoom
            roomId={page.replace("room:", "")}
            profile={profile}
            user={user}
            setPage={setPage}
          />
        )}

        
        {/* =========================
            DASHBOARD
        ========================= */}
        {page === "dashboard" && (
          <>
            <Dashboard
              profile={profile}
              user={user}
              setPage={setPage}
            />
            <AdUnit />
          </>
        )}


        {/* =========================
            SOLO STUDY
        ========================= */}
        {page === "solo" && (
          <SoloStudy
            profile={profile}
            user={user}
            setPage={setPage}
          />
        )}


        {/* =========================
            JOIN ROOM
        ========================= */}
        {page === "join-room" && (
          <JoinRoom
            profile={profile}
            setPage={setPage}
          />
        )}


        {/* =========================
            CREATE ROOM
        ========================= */}
        {page === "create-room" && (
          <CreateRoom
            profile={profile}
            setPage={setPage}
          />
        )}


        {/* =========================
            MY ROOMS
        ========================= */}
        {page === "my-rooms" && (
          <MyRooms
            profile={profile}
            setPage={setPage}
          />
        )}


        {/* =========================
            STUDY GOALS
        ========================= */}
        {page === "goals" && (
          <StudyGoals profile={profile} />
        )}


        {/* =========================
            CHAT ROOMS
        ========================= */}
        {page === "chat" && (
          <ChatRooms
            profile={profile}
            user={user}
          />
        )}


        {/* =========================
            STUDY STATS
        ========================= */}
        {page === "stats" && (
          <StudyStats profile={profile} />
        )}


        {/* =========================
            SETTINGS
        ========================= */}
        {page === "settings" && (
          <SettingsPage
            profile={profile}
            theme={theme}
            setTheme={setTheme}
          />
        )}

      </div>

    </div>
  );
}
/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  page,
  setPage,
  profile,
  user,
  logout,
  theme,
  setTheme,
}) {
  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      id: "solo",
      label: "Solo Study",
      icon: Headphones,
    },
    {
      id: "my-rooms",
      label: "My Rooms",
      icon: Users,
    },
    {
      id: "goals",
      label: "Study Goals",
      icon: Target,
    },
    {
      id: "chat",
      label: "Chat Rooms",
      icon: MessageSquare,
    },
    {
      id: "stats",
      label: "Study Stats",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-top">

        <div className="brand">
          <div className="brand-icon">
            <div className="brand-dot brand-dot-1" />
            <div className="brand-dot brand-dot-2" />
            <div className="brand-dot brand-dot-3" />
          </div>

          <span>StudyTogether</span>
        </div>

        <nav className="sidebar-nav">

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-item ${
                  page === item.id ? "active" : ""
                }`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={22} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}

        </nav>

      </div>

      <div className="sidebar-bottom">

        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-toggle-icon">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </span>
          <span className="theme-toggle-label">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
          <span className="theme-toggle-state">
            {theme === "dark" ? "OFF" : "ON"}
          </span>
        </button>

        <button
          className={`nav-item ${
            page === "settings" ? "active" : ""
          }`}
          onClick={() => setPage("settings")}
        >
          <Settings size={22} strokeWidth={1.8} />
          <span>Settings</span>
        </button>

        <button
          className="nav-item logout-nav"
          onClick={logout}
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span>Logout</span>
        </button>

        <div className="sidebar-profile">

          <div className="profile-avatar">
            {(profile.display_name || profile.username || "S")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="profile-info">
            <strong>{profile.display_name || profile.username || "Student"}</strong>
            <span>{user.email}</span>
          </div>

        </div>

      </div>

    </aside>
  );
}


/* =========================================================
   JOIN ROOM
========================================================= */

function JoinRoom({ profile, setPage }) {
  const [mode, setMode] = useState("code");
  const [roomCode, setRoomCode] = useState("");
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPublicRooms() {
    setRoomsLoading(true);
    setError("");

    try {
      const { data, error: roomsError } = await supabase
        .from("rooms")
        .select(`
          id,
          name,
          description,
          room_code,
          type,
          max_members,
          owner_id,
          created_at,
          room_members(count)
        `)
        .eq("type", "public")
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;
      setPublicRooms(data || []);
    } catch (err) {
      console.error("Public rooms error:", err);
      setPublicRooms([]);
      setError(err.message || "Unable to load public rooms.");
    } finally {
      setRoomsLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "public") loadPublicRooms();
  }, [mode]);

  async function joinRoom(room) {
    if (!profile?.id) {
      setError("Please sign in again.");
      return false;
    }

    setLoading(true);
    setError("");

    try {
      const { data: existing, error: existingError } = await supabase
        .from("room_members")
        .select("id")
        .eq("room_id", room.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (!existing) {
        const { count, error: countError } = await supabase
          .from("room_members")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id);

        if (countError) throw countError;

        const maxMembers = Number(room.max_members || 0);
        if (maxMembers > 0 && Number(count || 0) >= maxMembers) {
          throw new Error("This study room is full.");
        }

        const { error: memberError } = await supabase
          .from("room_members")
          .insert({ room_id: room.id, user_id: profile.id });

        if (memberError) throw memberError;
      }

      setPage(`room:${room.id}`);
      return true;
    } catch (err) {
      console.error("Join room error:", err);
      setError(err.message || "Unable to join this room.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function joinByCode(event) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();

    if (code.length !== 6) {
      setError("Enter the 6-character room code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", code)
        .maybeSingle();

      if (roomError) throw roomError;
      if (!room) throw new Error("Room not found. Check the room code.");

      await joinRoom(room);
    } catch (err) {
      console.error("Join by code error:", err);
      setError(err.message || "Unable to join the room.");
      setLoading(false);
    }
  }

  return (
    <div className="join-room-page">
      <div className="join-room-card">
        <div className="join-room-icon">
          <Users size={27} />
        </div>

        <h1>Join a Study Room</h1>
        <p>Join your study partner or discover a public room.</p>

        <div className="join-room-tabs">
          <button
            type="button"
            className={mode === "code" ? "active" : ""}
            onClick={() => { setMode("code"); setError(""); }}
          >
            <Hash size={17} />
            <span>Room Code</span>
          </button>

          <button
            type="button"
            className={mode === "public" ? "active" : ""}
            onClick={() => { setMode("public"); setError(""); }}
          >
            <Globe size={17} />
            <span>Public Rooms</span>
          </button>
        </div>

        {error && <div className="join-room-error">{error}</div>}

        {mode === "code" && (
          <form className="join-code-section" onSubmit={joinByCode}>
            <label htmlFor="room-code">Room code</label>
            <input
              id="room-code"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(
                  e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()
                );
                if (error) setError("");
              }}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="room-code-hint">
              Enter the 6-character code shared by your study partner.
            </div>
            <button
              className="join-primary-button"
              type="submit"
              disabled={loading || roomCode.length !== 6}
            >
              {loading ? "Joining..." : "Join Room"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {mode === "public" && (
          <div className="public-room-section">
            <div className="public-room-heading">
              <div className="public-room-heading-text">
                <strong>Public study rooms</strong>
                <span>Join an available room</span>
              </div>
              <button
                type="button"
                className="refresh-rooms"
                onClick={loadPublicRooms}
                disabled={roomsLoading}
                title="Refresh rooms"
              >
                <RefreshCw size={15} className={roomsLoading ? "spin" : ""} />
              </button>
            </div>

            {roomsLoading && (
              <div className="rooms-empty">
                <RefreshCw size={22} className="spin" />
                <strong>Loading public rooms...</strong>
              </div>
            )}

            {!roomsLoading && publicRooms.length === 0 && (
              <div className="rooms-empty">
                <Globe size={24} />
                <strong>No public rooms yet</strong>
                <span>Create a public room and invite other students.</span>
              </div>
            )}

            {!roomsLoading && publicRooms.length > 0 && (
              <div className="public-room-list">
                {publicRooms.map((room) => {
                  const memberCount = room.room_members?.[0]?.count || 0;
                  return (
                    <div className="public-room-item" key={room.id}>
                      <div className="public-room-info">
                        <div className="public-room-title">{room.name}</div>
                        <div className="public-room-description">
                          {room.description || "Open study room"}
                        </div>
                        <div className="public-room-meta">
                          <span>{memberCount}/{room.max_members || "∞"} members</span>
                          <span>{room.room_code}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="public-join-button"
                        onClick={() => joinRoom(room)}
                        disabled={loading}
                      >
                        {loading ? "..." : "Join"}
                        {!loading && <ArrowRight size={14} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="join-room-divider"><span>or</span></div>

        <button
          className="create-room-link"
          onClick={() => setPage("create-room")}
        >
          Create a new room
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   CREATE ROOM
========================================================= */

function CreateRoom({ profile, setPage }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("private");
  const [maxMembers, setMaxMembers] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  async function createRoom(e) {
    e.preventDefault();

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      setError("Enter a room name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let room = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();

        const { data, error: roomError } = await supabase
          .from("rooms")
          .insert({
            name: cleanName,
            description: description.trim() || null,
            room_code: code,
            type,
            max_members: Number(maxMembers),
            owner_id: profile.id,
          })
          .select()
          .single();

        if (!roomError) {
          room = data;
          break;
        }

        if (roomError.code !== "23505") {
          throw roomError;
        }
      }

      if (!room) {
        throw new Error("Could not generate a unique room code.");
      }

      const { error: memberError } = await supabase
        .from("room_members")
        .insert({
          room_id: room.id,
          user_id: profile.id,
        });

      if (memberError) {
        await supabase
          .from("rooms")
          .delete()
          .eq("id", room.id);

        throw memberError;
      }

      setPage(`room:${room.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to create room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rooms-page">
      <div className="rooms-card rooms-create-card">
        <button
          className="rooms-back-link"
          onClick={() => setPage("my-rooms")}
        >
          ← Back to My Rooms
        </button>

        <h1>Create a Study Room</h1>
        <p>
          Create a private or public space for focused study.
        </p>

        <form onSubmit={createRoom} className="room-form">
          <label>Room name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Late Night Study"
            maxLength={80}
            required
          />

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you studying?"
            maxLength={300}
            rows={4}
          />

          <label>Room type</label>
          <div className="room-type-grid">
            <button
              type="button"
              className={
                type === "private"
                  ? "room-type selected"
                  : "room-type"
              }
              onClick={() => setType("private")}
            >
              <Lock size={17} />
              <strong>Private</strong>
              <span>Share the code with friends.</span>
            </button>

            <button
              type="button"
              className={
                type === "public"
                  ? "room-type selected"
                  : "room-type"
              }
              onClick={() => setType("public")}
            >
              <Globe size={17} />
              <strong>Public</strong>
              <span>Allow others to discover it.</span>
            </button>
          </div>

          <label>Maximum members</label>
          <select
            value={maxMembers}
            onChange={(e) =>
              setMaxMembers(Number(e.target.value))
            }
          >
            <option value={2}>2 members</option>
            <option value={4}>4 members</option>
            <option value={6}>6 members</option>
            <option value={8}>8 members</option>
            <option value={10}>10 members</option>
          </select>

          {error && (
            <div className="room-error">{error}</div>
          )}

          <button
            className="room-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Room"}
            <Plus size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   MY ROOMS
========================================================= */

function MyRooms({ profile, setPage }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    setError("");

    const { data, error: memberError } = await supabase
      .from("room_members")
      .select(`
        id,
        joined_at,
        room_id,
        rooms (
          id,
          name,
          description,
          room_code,
          type,
          max_members,
          owner_id,
          created_at
        )
      `)
      .eq("user_id", profile.id)
      .order("joined_at", { ascending: false });

    if (memberError) {
      console.error(memberError);
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setRooms(
      (data || [])
        .map((item) => item.rooms)
        .filter(Boolean)
    );

    setLoading(false);
  }

  async function deleteRoom(room) {
    if (room.owner_id !== profile.id) {
      alert("Only the room owner can delete this room.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${room.name}"? This will remove the room for everyone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id)
      .eq("owner_id", profile.id);

    if (error) {
      console.error(error);
      alert(error.message || "Unable to delete room.");
      return;
    }

    setRooms((current) => current.filter((item) => item.id !== room.id));
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      alert("Room code copied.");
    } catch {
      alert(`Room code: ${code}`);
    }
  }

  return (
    <div className="rooms-page rooms-list-page">
      <div className="rooms-page-header">
        <div>
          <span className="rooms-eyebrow">
            YOUR STUDY SPACES
          </span>
          <h1>My Rooms</h1>
          <p>
            Continue a session or create a new study room.
          </p>
        </div>

        <div className="my-rooms-header-actions">
          <button
            className="room-secondary-button"
            onClick={() => setPage("join-room")}
          >
            <ArrowRight size={17} />
            Join Room
          </button>

          <button
            className="room-primary-button"
            onClick={() => setPage("create-room")}
          >
            <Plus size={17} />
            Create Room
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rooms-loading">
          Loading your rooms...
        </div>
      ) : error ? (
        <div className="room-error">{error}</div>
      ) : rooms.length === 0 ? (
        <div className="rooms-empty">
          <Users size={34} />
          <h2>No study rooms yet</h2>
          <p>
            Create your first room or join one with a code.
          </p>

          <div className="rooms-empty-actions">
            <button
              className="room-primary-button"
              onClick={() => setPage("create-room")}
            >
              <Plus size={17} />
              Create Room
            </button>

            <button
              className="room-secondary-button"
              onClick={() => setPage("join-room")}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <div className="room-list-card" key={room.id}>
              <div className="room-list-top">
                <div className="room-list-icon">
                  <Users size={19} />
                </div>

                <span
                  className={
                    room.type === "public"
                      ? "room-badge public"
                      : "room-badge"
                  }
                >
                  {room.type === "public"
                    ? "Public"
                    : "Private"}
                </span>
              </div>

              <h2>{room.name}</h2>

              <p>
                {room.description ||
                  "A focused study room."}
              </p>

              <div className="room-code-box">
                <span>CODE</span>
                <strong>{room.room_code}</strong>

                <button
                  onClick={() =>
                    copyCode(room.room_code)
                  }
                  title="Copy room code"
                >
                  <Copy size={15} />
                </button>
              </div>

              <div className="room-card-actions">
                <button
                  className="room-enter-button"
                  onClick={() =>
                    setPage(`room:${room.id}`)
                  }
                >
                  Enter Room
                  <ArrowRight size={17} />
                </button>

                {room.owner_id === profile.id && (
                  <button
                    className="room-delete-button"
                    onClick={() => deleteRoom(room)}
                    title="Delete room"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SOLO STUDY
========================================================= */



const SESSION_GOALS_CSS = `
.solo-session-goals-card{position:relative;z-index:30;width:100%;max-width:315px;box-sizing:border-box;margin:14px 0 0;padding:18px 16px 16px;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:rgba(15,15,18,.88);box-shadow:0 16px 40px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);color:#fff}
.solo-session-goals-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.solo-session-goals-title{display:flex;align-items:center;gap:9px;min-width:0}.solo-session-goals-title h2{margin:0;font-size:16px;line-height:1.2;font-weight:700;letter-spacing:-.02em;white-space:nowrap}.solo-session-goals-actions{display:flex;align-items:center;gap:8px}.solo-session-goals-actions button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:rgba(255,255,255,.9);cursor:pointer}.solo-session-goals-actions button:hover{background:rgba(255,255,255,.08)}
.solo-session-goals-add-row{display:grid;grid-template-columns:minmax(0,1fr) 52px;gap:8px;margin-bottom:12px}.solo-session-goals-add-row input{min-width:0;width:100%;height:52px;box-sizing:border-box;padding:0 13px;border:2px solid rgba(255,255,255,.9);border-radius:16px;outline:none;background:rgba(255,255,255,.025);color:#fff;font:inherit;font-size:14px}.solo-session-goals-add-row input::placeholder{color:rgba(255,255,255,.65)}.solo-session-goals-add-row input:focus{border-color:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.06)}.solo-session-goals-add-row button{width:52px;height:52px;display:grid;place-items:center;border:0;border-radius:16px;background:rgba(255,255,255,.09);color:#fff;cursor:pointer}.solo-session-goals-add-row button:not(:disabled):hover{background:rgba(255,255,255,.15)}.solo-session-goals-add-row button:disabled{opacity:.35;cursor:default}
.solo-session-goals-stats{display:grid;grid-template-columns:minmax(0,1fr) 2px minmax(0,1fr);align-items:center;min-height:112px;margin-bottom:12px;padding:16px 12px;border-radius:18px;background:rgba(5,5,7,.72);box-sizing:border-box}.solo-session-goals-stat{display:flex;flex-direction:column;justify-content:center;gap:5px;min-width:0}.solo-session-goals-stat:first-child{padding-right:10px}.solo-session-goals-stat:last-child{padding-left:18px}.solo-session-goals-stat strong{font-size:40px;line-height:1;font-weight:750;letter-spacing:-.04em;color:#fff}.solo-session-goals-stat span{font-size:13px;line-height:1.2;color:rgba(255,255,255,.9)}.solo-session-goals-stat.completed-stat strong{color:#4f8cff}.solo-session-goals-divider{width:2px;height:52px;border-radius:99px;background:rgba(255,255,255,.32)}
.solo-session-goals-list{display:flex;flex-direction:column;gap:8px;max-height:180px;overflow-y:auto;padding-right:2px}.solo-session-goal-item{width:100%;min-height:48px;display:flex;align-items:center;gap:11px;padding:8px 12px;border:1px solid rgba(255,255,255,.035);border-radius:14px;background:rgba(5,5,7,.64);color:#fff;text-align:left;cursor:pointer;box-sizing:border-box}.solo-session-goal-item:hover{background:rgba(255,255,255,.06)}.solo-session-goal-check{width:30px;height:30px;flex:0 0 30px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(255,255,255,.35);color:#fff}.solo-session-goal-item.completed .solo-session-goal-check{border-color:#4f8cff;background:#4f8cff}.solo-session-goal-text{min-width:0;font-size:14px;line-height:1.25;overflow-wrap:anywhere}.solo-session-goal-item.completed .solo-session-goal-text{color:rgba(255,255,255,.4);text-decoration:line-through}.solo-session-goals-empty{min-height:52px;display:grid;place-items:center;padding:8px;border-radius:14px;border:1px dashed rgba(255,255,255,.12);color:rgba(255,255,255,.42);font-size:12px;text-align:center}
@media(max-width:650px){.solo-session-goals-card{max-width:100%;padding:16px;border-radius:19px}.solo-session-goals-add-row{grid-template-columns:minmax(0,1fr) 48px;gap:8px}.solo-session-goals-add-row input,.solo-session-goals-add-row button{height:48px;border-radius:14px}.solo-session-goals-add-row button{width:48px}.solo-session-goals-stats{min-height:100px;padding:14px 10px}.solo-session-goals-stat strong{font-size:35px}.solo-session-goals-stat span{font-size:12px}.solo-session-goals-stat:last-child{padding-left:14px}}
`;

function SoloSessionGoals({ onClose }) {
  const [goalText, setGoalText] = useState("");
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem("studytogether-solo-session-goals");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "studytogether-solo-session-goals",
        JSON.stringify(goals)
      );
    } catch {
      // Ignore storage restrictions.
    }
  }, [goals]);

  const completed = goals.filter((goal) => goal.completed).length;
  const open = goals.length - completed;

  function addGoal() {
    const clean = goalText.trim();
    if (!clean) return;

    setGoals((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: clean,
        completed: false,
      },
    ]);
    setGoalText("");
  }

  function toggleGoal(id) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id
          ? { ...goal, completed: !goal.completed }
          : goal
      )
    );
  }

  return (
    <>
      <style>{SESSION_GOALS_CSS}</style>
      <section className="solo-session-goals-card" aria-label="Session goals">
      <div className="solo-session-goals-header">
        <div className="solo-session-goals-title">
          <Target size={25} strokeWidth={2.2} />
          <h2>Session goals</h2>
        </div>

        <div className="solo-session-goals-actions">
          <button type="button" className="solo-session-goals-info" title="Session goals are saved for this browser">
            <Info size={20} strokeWidth={2.2} />
          </button>
          <button type="button" className="solo-session-goals-close" onClick={onClose} aria-label="Close session goals">
            <X size={25} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="solo-session-goals-add-row">
        <input
          value={goalText}
          onChange={(event) => setGoalText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addGoal();
          }}
          placeholder="Type a goal..."
          aria-label="Type a goal"
        />
        <button type="button" onClick={addGoal} aria-label="Add goal" disabled={!goalText.trim()}>
          <Plus size={28} strokeWidth={2.3} />
        </button>
      </div>

      <div className="solo-session-goals-stats">
        <div className="solo-session-goals-stat">
          <strong>{open}</strong>
          <span>Open</span>
        </div>
        <div className="solo-session-goals-divider" />
        <div className="solo-session-goals-stat completed-stat">
          <strong>{completed}</strong>
          <span>Completed</span>
        </div>
      </div>

      <div className="solo-session-goals-list">
        {goals.length === 0 ? (
          <div className="solo-session-goals-empty">Your session goals will appear here.</div>
        ) : (
          goals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              className={`solo-session-goal-item ${goal.completed ? "completed" : ""}`}
              onClick={() => toggleGoal(goal.id)}
            >
              <span className="solo-session-goal-check">
                {goal.completed && <Check size={19} strokeWidth={3} />}
              </span>
              <span className="solo-session-goal-text">{goal.text}</span>
            </button>
          ))
        )}
      </div>
      </section>
    </>
  );
}

const SOLO_STUDY_LAYOUT_CSS = `
.solo-page.solo-reference{position:relative!important;isolation:isolate!important;min-height:100vh!important;height:100vh!important;overflow:hidden!important;background:#08090b!important}
.solo-reference-image-bg,.solo-reference-video-bg,.solo-reference-youtube-bg{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:0!important;overflow:hidden!important;pointer-events:none!important}
.solo-reference-image-bg{background-position:center!important;background-size:cover!important;background-repeat:no-repeat!important}
.solo-reference-video-bg video{width:100%!important;height:100%!important;object-fit:cover!important}
.solo-reference-youtube-bg{display:block!important;visibility:visible!important;opacity:1!important;background:#08090b!important}
.solo-reference-youtube-bg iframe{position:absolute!important;left:50%!important;top:50%!important;width:100vw!important;height:56.25vw!important;min-width:177.78vh!important;min-height:100vh!important;transform:translate(-50%,-50%) scale(1.08)!important;border:0!important;pointer-events:none!important}
.solo-reference-youtube-overlay{position:absolute!important;inset:0!important;z-index:1!important;pointer-events:none!important;background:linear-gradient(90deg,rgba(5,7,10,.48),rgba(5,7,10,.12) 58%,rgba(5,7,10,.36)),linear-gradient(180deg,rgba(5,7,10,.10),rgba(5,7,10,.32))!important}
.solo-reference> :not(.solo-reference-image-bg):not(.solo-reference-video-bg):not(.solo-reference-youtube-bg){position:relative;z-index:2}
.solo-reference-topbar{position:relative!important;z-index:1000!important}.solo-reference-menu-wrap{position:relative!important;z-index:1100!important}.solo-reference-dropdown{position:absolute!important;top:calc(100% + 10px)!important;right:0!important;left:auto!important;bottom:auto!important;z-index:99999!important;min-width:290px!important;max-width:min(340px,calc(100vw - 28px))!important;max-height:calc(100vh - 100px)!important;overflow:auto!important;box-sizing:border-box!important;padding:8px!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:17px!important;background:rgba(13,13,16,.97)!important;box-shadow:0 24px 70px rgba(0,0,0,.5)!important;backdrop-filter:blur(22px)!important;-webkit-backdrop-filter:blur(22px)!important;pointer-events:auto!important}
.solo-background-menu>button,.solo-background-menu .solo-reference-upload{width:100%;box-sizing:border-box;pointer-events:auto!important}.solo-background-menu input{max-width:100%;box-sizing:border-box}.solo-reference-sidebar{position:relative!important;z-index:10!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:0!important}.solo-reference-sidebar .solo-session-goals-card{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:100%!important;max-width:315px!important;margin:14px 0 0!important}
.solo-sounds-overlay{z-index:99999!important}
@media(max-width:650px){.solo-reference-sidebar .solo-session-goals-card{max-width:100%!important}.solo-reference-dropdown{min-width:0!important;width:min(320px,calc(100vw - 28px))!important}}
/* FINAL FIX: keep the entire top bar and dropdown above every page layer. */
.solo-reference > header.solo-reference-topbar{position:relative!important;z-index:2147483000!important;isolation:isolate!important;overflow:visible!important}
.solo-reference > header.solo-reference-topbar .solo-reference-actions{position:relative!important;z-index:2147483001!important;overflow:visible!important}
.solo-reference > header.solo-reference-topbar .solo-reference-menu-wrap{position:relative!important;z-index:2147483002!important;overflow:visible!important;pointer-events:auto!important}
.solo-reference > header.solo-reference-topbar .solo-background-menu{position:absolute!important;z-index:2147483003!important;pointer-events:auto!important;touch-action:manipulation!important}
.solo-reference > header.solo-reference-topbar .solo-background-menu *{pointer-events:auto!important}
`;

function SoloStudy({ profile, setPage }) {
  const [mode, setMode] = useState("pomodoro");
  const [seconds, setSeconds] = useState(50 * 60);
  const [running, setRunning] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  const [background, setBackground] = useState(() =>
    localStorage.getItem("studytogether-solo-background") ||
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2400&q=85"
  );
  const [localVideoBackgroundUrl, setLocalVideoBackgroundUrl] = useState("");
  const [localVideoBackgroundName, setLocalVideoBackgroundName] = useState("");

  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState(() =>
    localStorage.getItem("studytogether-youtube-url") || ""
  );
  const [youtubeMusicUrl, setYoutubeMusicUrl] = useState(() =>
    localStorage.getItem("studytogether-youtube-music-url") || ""
  );
  const [youtubeBackgroundEnabled, setYoutubeBackgroundEnabled] = useState(() =>
    localStorage.getItem("studytogether-youtube-background") === "true"
  );

  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [youtubeAudioId, setYoutubeAudioId] = useState("");
  const [soundVolume, setSoundVolume] = useState(50);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showYouTubeInput, setShowYouTubeInput] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [youtubeSource, setYoutubeSource] = useState("video");
  const [activeSound, setActiveSound] = useState("off");

  const audioContextRef = useRef(null);
  const soundNodesRef = useRef([]);
  const youtubePlayerRef = useRef(null);
  const studySessionRef = useRef(null);
  const studyStartedAtRef = useRef(null);
  const studyAccumulatedRef = useRef(0);

  const backgrounds = [
    { name: "Rainy Window", url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2400&q=85" },
    { name: "Cozy Study", url: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=2400&q=85" },
    { name: "Night City", url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2400&q=85" },
    { name: "Library", url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=2400&q=85" },
    { name: "Desk Setup", url: "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=2400&q=85" },
    { name: "Mountain", url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2400&q=85" },
    { name: "Ocean", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85" },
    { name: "Forest", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85" },
  ];

  const quotes = [
    "Discipline today, a better tomorrow.",
    "A little progress each day adds up to big results.",
    "Focus on the work, not the clock.",
    "Small steps create big results.",
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showTimerPanel, setShowTimerPanel] = useState(true);
  const [showGoalsPanel, setShowGoalsPanel] = useState(true);

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function toggleSoloFullscreen() {
    const target = document.querySelector(".solo-page");
    if (!target) return;

    if (!document.fullscreenElement) {
      // Fullscreen the actual Solo Study surface so the normal app sidebar
      // cannot remain visible beside it.
      target.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function toggleYouTubeFullscreen() {
    const target = youtubePlayerRef.current;
    if (!target) return;
    if (document.fullscreenElement === target) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    target.requestFullscreen?.().catch(() => {});
  }

  async function beginStudyRecord() {
    if (!profile?.id) {
      setTrackingError("Your profile is not loaded yet.");
      return false;
    }
    if (studySessionRef.current) return true;

    setTrackingError("");
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: profile.id,
        room_id: null,
        session_type: "solo",
        duration_seconds: 0,
        started_at: now,
        ended_at: null,
      })
      .select("id,started_at")
      .single();

    if (error || !data) {
      console.error("Study session insert failed:", error);
      setTrackingError(
        error?.message ||
        "Study-time tracking is not available. Run DASHBOARD_SETUP.sql in Supabase."
      );
      return false;
    }

    studySessionRef.current = data.id;
    studyStartedAtRef.current = Date.now();
    studyAccumulatedRef.current = 0;
    return true;
  }

  async function finishStudyRecord() {
    const id = studySessionRef.current;
    if (!id) return;

    const liveSeconds = studyStartedAtRef.current
      ? Math.max(0, Math.floor((Date.now() - studyStartedAtRef.current) / 1000))
      : 0;
    const total = Math.max(0, studyAccumulatedRef.current + liveSeconds);

    const { error } = await supabase
      .from("study_sessions")
      .update({
        duration_seconds: total,
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", profile.id);

    if (error) console.warn("Could not save study session:", error);

    studySessionRef.current = null;
    studyStartedAtRef.current = null;
    studyAccumulatedRef.current = 0;
  }

  function saveBackground(url) {
    setBackground(url);
    setLocalVideoBackgroundUrl("");
    setLocalVideoBackgroundName("");
    localStorage.setItem("studytogether-solo-background", url);
    setYoutubeBackgroundEnabled(false);
    localStorage.setItem("studytogether-youtube-background", "false");
    setShowBackgrounds(false);
  }

  function uploadBackground(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const max = 1800;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        saveBackground(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function uploadVideoBackground(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;

    const url = URL.createObjectURL(file);
    setLocalVideoBackgroundUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return url;
    });
    setLocalVideoBackgroundName(file.name);
    setYoutubeBackgroundEnabled(false);
    localStorage.setItem("studytogether-youtube-background", "false");
    setShowBackgrounds(false);
    event.target.value = "";
  }

  function enableYouTubeBackground() {
    const id = getYouTubeId(youtubeVideoUrl);
    if (!id) {
      window.alert("Paste a valid YouTube video link before applying the background.");
      return;
    }
    localStorage.setItem("studytogether-youtube-url", youtubeVideoUrl.trim());
    localStorage.setItem("studytogether-youtube-background", "true");
    setLocalVideoBackgroundUrl("");
    setLocalVideoBackgroundName("");
    setYoutubeBackgroundEnabled(true);
    setShowYouTubeInput(false);
    setShowBackgrounds(false);
  }

  function disableYouTubeBackground() {
    localStorage.setItem("studytogether-youtube-background", "false");
    setYoutubeBackgroundEnabled(false);
  }

  function stopSound() {
    soundNodesRef.current.forEach((node) => {
      try { node.stop?.(); } catch {}
      try { node.disconnect?.(); } catch {}
    });
    soundNodesRef.current = [];
    setActiveSound("off");
  }

  function stopYouTubeAudio() {
    setYoutubeAudioId("");
    setYoutubeSource("video");
  }

  function playYouTubeAudio() {
    const id = getYouTubeId(youtubeMusicUrl);
    if (!id) return;
    localStorage.setItem("studytogether-youtube-music-url", youtubeMusicUrl.trim());
    stopSound();
    setYoutubeAudioId(id);
  }

  function stopAllSounds() {
    stopSound();
    stopYouTubeAudio();
  }

  function startSound(type) {
    stopSound();
    if (type === "off") return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, soundVolume / 100)) * 0.11;
    master.connect(ctx.destination);

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type =
      type === "brown" ? "lowpass" :
      type === "ocean" ? "bandpass" :
      "highpass";
    filter.frequency.value =
      type === "brown" ? 650 :
      type === "ocean" ? 850 :
      type === "rain" ? 3200 : 1800;
    filter.Q.value = type === "ocean" ? 0.7 : 0.35;

    source.connect(filter);
    filter.connect(master);
    source.start();

    soundNodesRef.current = [source, filter, master];
    setActiveSound(type);
  }

  useEffect(() => {
    if (activeSound !== "off") {
      startSound(activeSound);
    }
  }, [soundVolume]);

  useEffect(() => () => {
    if (localVideoBackgroundUrl) URL.revokeObjectURL(localVideoBackgroundUrl);
  }, [localVideoBackgroundUrl]);

  useEffect(() => () => {
    stopSound();
    audioContextRef.current?.close?.();
  }, []);

  useEffect(() => {
    if (!running) return undefined;

    const timer = setInterval(() => {
      setSeconds((current) => {
        if (mode === "stopwatch") return current + 1;

        if (current <= 1) {
          setRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, mode]);

  useEffect(() => {
    if (!running || !studySessionRef.current || !studyStartedAtRef.current) {
      return undefined;
    }

    const syncStudyHeartbeat = async () => {
      const liveSeconds = Math.max(
        0,
        Math.floor((Date.now() - studyStartedAtRef.current) / 1000)
      );
      const total = Math.max(0, studyAccumulatedRef.current + liveSeconds);

      await supabase
        .from("study_sessions")
        .update({ duration_seconds: total })
        .eq("id", studySessionRef.current)
        .eq("user_id", profile.id);
    };

    syncStudyHeartbeat();
    const heartbeat = setInterval(syncStudyHeartbeat, 10000);
    return () => clearInterval(heartbeat);
  }, [running, profile?.id]);

  useEffect(() => {
    if (!running && seconds === 0 && studySessionRef.current) {
      finishStudyRecord();
    }
  }, [running, seconds]);

  useEffect(() => () => {
    if (studySessionRef.current) {
      const id = studySessionRef.current;
      const started = studyStartedAtRef.current;
      const total =
        studyAccumulatedRef.current +
        (started ? Math.floor((Date.now() - started) / 1000) : 0);

      supabase
        .from("study_sessions")
        .update({
          duration_seconds: total,
          ended_at: new Date().toISOString(),
        })
        .eq("id", id)
        .then(() => {});
    }
  }, []);

  async function toggleStudyTimer() {
    if (running) {
      await finishStudyRecord();
      setRunning(false);
      return;
    }

    const started = await beginStudyRecord();
    if (!started) {
      setRunning(false);
      return;
    }

    setRunning(true);
  }

  async function changeMode(newMode) {
    if (running) await finishStudyRecord();

    setMode(newMode);
    setRunning(false);

    if (newMode === "pomodoro") setSeconds(50 * 60);
    if (newMode === "custom") setSeconds(30 * 60);
    if (newMode === "stopwatch") setSeconds(0);
  }

  async function resetTimer() {
    if (running) await finishStudyRecord();

    setRunning(false);

    if (mode === "pomodoro") setSeconds(50 * 60);
    else if (mode === "custom") setSeconds(30 * 60);
    else setSeconds(0);
  }

  async function skipTimer() {
    if (running) await finishStudyRecord();

    setRunning(false);

    if (mode === "pomodoro") setSeconds(10 * 60);
    else setSeconds(0);
  }

  function openBackgroundMenu() {
    setShowBackgrounds((value) => !value);
    setShowMusic(false);
    setShowYouTubeInput(false);
    setShowQuotes(false);
  }

  const youtubeBackgroundId = getYouTubeId(youtubeVideoUrl);
  const activeYouTubeId =
    youtubeSource === "video"
      ? getYouTubeId(youtubeVideoUrl)
      : getYouTubeId(youtubeMusicUrl);

  return (
    <>
    <style>{SOLO_STUDY_LAYOUT_CSS}</style>
    <div
      className="solo-page solo-reference"
      style={{
        "--solo-bg-image":
          !youtubeBackgroundEnabled && !localVideoBackgroundUrl && background
            ? `url("${background}")`
            : "none",
      }}
    >
      {!youtubeBackgroundEnabled && !localVideoBackgroundUrl && background && (
        <div
          className="solo-reference-image-bg"
          style={{
            backgroundImage: `url("${background}")`,
          }}
        />
      )}

      {!youtubeBackgroundEnabled && localVideoBackgroundUrl && (
        <div className="solo-reference-video-bg">
          <video
            src={localVideoBackgroundUrl}
            autoPlay
            muted
            loop
            playsInline
            aria-label={localVideoBackgroundName || "Uploaded video background"}
          />
        </div>
      )}

      {youtubeBackgroundEnabled && youtubeBackgroundId && (
        <div className="solo-reference-youtube-bg">
          <iframe
            title="YouTube background"
            src={`https://www.youtube.com/embed/${youtubeBackgroundId}?autoplay=1&controls=0&loop=1&playlist=${youtubeBackgroundId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&mute=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="solo-reference-youtube-overlay" />
        </div>
      )}

      <header className="solo-reference-topbar">
        <div className="solo-reference-brand">
          <button
            className="solo-back-button"
            type="button"
            onClick={() => setPage?.("dashboard")}
            title="Back"
          >
            ← <span>Back</span>
          </button>

          <div className="solo-brand-card">
            <strong>StudyTogether</strong>
            <span>Solo Study Room</span>
          </div>
        </div>

        <div className="solo-reference-actions">
          <button
            className={`solo-icon-action ${showTimerPanel ? "active" : ""}`}
            type="button"
            onClick={() => setShowTimerPanel((value) => !value)}
            title={showTimerPanel ? "Hide timer" : "Show timer"}
            aria-label={showTimerPanel ? "Hide timer" : "Show timer"}
          >
            <Timer size={16} />
          </button>

          <button
            className={`solo-icon-action ${showGoalsPanel ? "active" : ""}`}
            type="button"
            onClick={() => setShowGoalsPanel((value) => !value)}
            title={showGoalsPanel ? "Hide goals" : "Show goals"}
            aria-label={showGoalsPanel ? "Hide goals" : "Show goals"}
          >
            <Check size={16} />
          </button>

          <div className="solo-reference-menu-wrap">
            <button
              className="solo-icon-action"
              type="button"
              onClick={() => {
                setShowQuotes((value) => !value);
                setShowBackgrounds(false);
                setShowMusic(false);
                setShowYouTubeInput(false);
              }}
              title="Quotes"
            >
              <Quote size={16} />
            </button>

            {showQuotes && (
              <div className="solo-reference-dropdown solo-reference-quote-menu">
                <button
                  type="button"
                  onClick={() => setQuoteIndex((quoteIndex + 1) % quotes.length)}
                >
                  Next quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteIndex(() => 0);
                    setShowQuotes(false);
                  }}
                >
                  Reset quote
                </button>
              </div>
            )}
          </div>

          <div className="solo-reference-menu-wrap">
            <button
              className="solo-background-button"
              type="button"
              onClick={openBackgroundMenu}
            >
              <Image size={15} />
              Background
            </button>

            {showBackgrounds && (
              <div className="solo-reference-dropdown solo-background-menu">
                {backgrounds.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className="solo-background-choice"
                    onPointerDown={(event) => {
                      // Handle the selection at pointer-down so no overlay or
                      // competing click handler can swallow the interaction.
                      event.preventDefault();
                      event.stopPropagation();
                      saveBackground(item.url);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // Keep click support for keyboard and assistive input.
                      saveBackground(item.url);
                    }}
                  >
                    <span
                      className="solo-background-thumb"
                      style={{ backgroundImage: `url("${item.url}")` }}
                    />
                    <span>{item.name}</span>
                  </button>
                ))}

                <label className="solo-reference-upload">
                  <ImagePlus size={14} />
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadBackground}
                  />
                </label>

                <label className="solo-reference-upload">
                  <Video size={14} />
                  Upload video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={uploadVideoBackground}
                  />
                </label>

                {localVideoBackgroundUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalVideoBackgroundUrl("");
                      setLocalVideoBackgroundName("");
                      setShowBackgrounds(false);
                    }}
                  >
                    Use image background
                  </button>
                )}

                <div className="solo-reference-menu-divider" />

                <input
                  className="solo-reference-youtube-input"
                  value={youtubeVideoUrl}
                  onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                  placeholder="YouTube background URL"
                />

                <button
                  type="button"
                  onClick={enableYouTubeBackground}
                >
                  Use YouTube as background
                </button>

                {youtubeBackgroundEnabled && youtubeBackgroundId && (
                  <button
                    type="button"
                    onClick={disableYouTubeBackground}
                  >
                    Use image background
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      <div className="solo-reference-main">
        <aside className="solo-reference-sidebar">
          {showTimerPanel && (
          <section className="solo-reference-card solo-reference-timer">
            <div className="solo-reference-card-top">
              <div>
                <span className="solo-reference-label">FOCUS</span>
                <span className="solo-reference-subtitle">Personal session</span>
              </div>
              <span className={`solo-reference-status-dot ${running ? "running" : ""}`} />
            </div>

            <div className="solo-reference-time">
              {formatTime(seconds)}
            </div>

            <div className="solo-reference-ready">
              {running ? "Stay focused." : "Ready when you are."}
            </div>

            <button
              className="solo-reference-start"
              type="button"
              onClick={toggleStudyTimer}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
              {running ? "Pause" : "Start"}
            </button>

            <button
              className="solo-reference-reset"
              type="button"
              onClick={resetTimer}
              title="Reset timer"
            >
              <RotateCcw size={15} />
            </button>

            <div className="solo-reference-modes">
              <button
                className={mode === "pomodoro" ? "active" : ""}
                type="button"
                onClick={() => changeMode("pomodoro")}
              >
                Pomodoro
              </button>
              <button
                className={mode === "custom" ? "active" : ""}
                type="button"
                onClick={() => changeMode("custom")}
              >
                Custom
              </button>
              <button
                className={mode === "stopwatch" ? "active" : ""}
                type="button"
                onClick={() => changeMode("stopwatch")}
              >
                Stopwatch
              </button>
            </div>

            {trackingError && (
              <div className="solo-reference-error">
                {trackingError}
              </div>
            )}
          </section>
          )}

          {showGoalsPanel && (
            <SoloSessionGoals onClose={() => setShowGoalsPanel(false)} />
          )}
        </aside>

        <main className="solo-reference-center">
          <div className="solo-reference-quote-mark">“</div>

          <h1>
            {quotes[quoteIndex]}
          </h1>

          <span className="solo-reference-author">StudyTogether</span>
        </main>
      </div>

      <div className="solo-reference-bottom-left">
        <span className="solo-reference-status-small">
          <i className={running ? "running" : ""} />
          Solo study room
        </span>
      </div>

      <div className="solo-reference-bottom-right">
        <button
          className="solo-bottom-button"
          type="button"
          onClick={() => {
            setShowMusic(true);
            setShowBackgrounds(false);
            setShowQuotes(false);
            setShowYouTubeInput(false);
          }}
        >
          <Music size={14} />
          Sounds
        </button>

        <button
          className="solo-bottom-button"
          type="button"
          onClick={openBackgroundMenu}
        >
          <Image size={14} />
          Background
        </button>
      </div>

      {showMusic && (
        <div
          className="solo-sounds-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Study Sounds"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowMusic(false);
          }}
        >
          <div className="solo-sounds-modal">
            <div className="solo-sounds-header">
              <div>
                <h2>Study Sounds</h2>
                <p>Choose a sound for your session.</p>
              </div>
              <button
                className="solo-sounds-close"
                type="button"
                onClick={() => setShowMusic(false)}
                aria-label="Close sounds"
              >
                ×
              </button>
            </div>

            <div className="solo-sounds-current">
              <div className="solo-sounds-current-icon">
                {youtubeAudioId || activeSound !== "off" ? "🔊" : "🔇"}
              </div>
              <div className="solo-sounds-current-copy">
                <strong>
                  {youtubeAudioId
                    ? "YouTube audio"
                    : activeSound === "off"
                      ? "No sound selected"
                      : activeSound.charAt(0).toUpperCase() + activeSound.slice(1)}
                </strong>
                <span>
                  {youtubeAudioId || activeSound !== "off" ? "Playing" : "Paused"}
                </span>
              </div>
            </div>

            <div className="solo-sounds-volume">
              <div>
                <span>Volume</span>
                <span>{soundVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={soundVolume}
                onChange={(event) => setSoundVolume(Number(event.target.value))}
                aria-label="Sound volume"
              />
            </div>

            <div className="solo-sounds-grid">
              {[
                ["rain", "🌧️", "Rain"],
                ["cafe", "☕", "Café"],
                ["ocean", "🌊", "Ocean"],
                ["fireplace", "🔥", "Fireplace"],
                ["forest", "🌲", "Forest"],
                ["lofi", "🎹", "Lo-fi"],
              ].map(([value, icon, label]) => (
                <button
                  key={value}
                  className={`solo-sound-choice ${activeSound === value && !youtubeAudioId ? "selected" : ""}`}
                  type="button"
                  onClick={() => {
                    stopYouTubeAudio();
                    startSound(value);
                  }}
                >
                  <span className="solo-sound-choice-icon">{icon}</span>
                  <span>
                    <strong>{label}</strong>
                    <small>{activeSound === value && !youtubeAudioId ? "Playing" : "Play"}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="solo-sounds-youtube">
              <div className="solo-sounds-youtube-title">
                <Video size={17} />
                <span>YouTube Audio</span>
              </div>
              <div className="solo-sounds-youtube-row">
                <input
                  value={youtubeMusicUrl}
                  onChange={(event) => setYoutubeMusicUrl(event.target.value)}
                  placeholder="Paste YouTube link"
                />
                <button type="button" onClick={playYouTubeAudio}>
                  Play
                </button>
              </div>
              <button
                className="solo-sounds-stop"
                type="button"
                onClick={stopAllSounds}
                disabled={!youtubeAudioId && activeSound === "off"}
              >
                <Volume2 size={15} />
                Stop all sound
              </button>
            </div>

            <p className="solo-sounds-footnote">
              Add your audio files to public/sounds/ for local sounds.
            </p>
          </div>
        </div>
      )}

      {youtubeAudioId && (
        <div className="solo-youtube-audio-only" aria-hidden="true">
          <iframe
            key={youtubeAudioId}
            title="YouTube audio"
            src={`https://www.youtube.com/embed/${youtubeAudioId}?autoplay=1&controls=0&loop=1&playlist=${youtubeAudioId}&playsinline=1&rel=0&modestbranding=1`}
            allow="autoplay; encrypted-media"
          />
        </div>
      )}


      {showYouTube && youtubeSource === "video" && activeYouTubeId && (
        <div className="solo-youtube-player" ref={youtubePlayerRef}>
          <div className="solo-youtube-head">
            <span>
              {youtubeSource === "video" ? "YouTube Study Video" : "YouTube Music"}
            </span>
            <div className="solo-youtube-actions">
              <button onClick={toggleYouTubeFullscreen} title="Fullscreen">
                <Maximize size={15} />
              </button>
              <button onClick={() => setShowYouTube(false)} title="Close">
                ×
              </button>
            </div>
          </div>

          <iframe
            title="YouTube study media"
            src={`https://www.youtube.com/embed/${activeYouTubeId}?playsinline=1&autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
    </div>
    </>
  );
}

/* =========================================================
   PLACEHOLDER
========================================================= */

function PlaceholderPage({ title, icon }) {
  return (
    <div className="placeholder-page">

      <div className="placeholder-icon">
        {icon}
      </div>

      <h1>{title}</h1>

      <p>
        This section is coming next.
      </p>

    </div>
  );
}

export default App;
