import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "./supabase";
import "./Dashboard.css";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name) {
  return String(name || "S")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Dashboard({ profile, user, setPage }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [rooms, setRooms] = useState([]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!profile?.id) return;

    isRefresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const [sessionResult, goalResult, roomResult] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id,room_id,session_type,duration_seconds,started_at,ended_at")
          .eq("user_id", profile.id)
          .order("started_at", { ascending: false })
          .limit(500),
        supabase
          .from("study_goals")
          .select("id,title,description,category,priority,target_date,progress,completed,created_at,completed_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("room_members")
          .select(`
            id,
            room_id,
            joined_at,
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
          .order("joined_at", { ascending: false })
          .limit(20),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (goalResult.error) throw goalResult.error;
      if (roomResult.error) throw roomResult.error;

      setSessions(sessionResult.data || []);
      setGoals(goalResult.data || []);
      setRooms(
        (roomResult.data || [])
          .map((item) => item.rooms)
          .filter(Boolean)
      );
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadDashboard();

    if (!profile?.id) return undefined;

    const channel = supabase
      .channel(`dashboard-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${profile.id}` },
        () => loadDashboard(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "study_goals", filter: `user_id=eq.${profile.id}` },
        () => loadDashboard(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `user_id=eq.${profile.id}` },
        () => loadDashboard(true)
      )
      .subscribe();

    const liveRefresh = setInterval(() => loadDashboard(true), 10000);

    return () => {
      clearInterval(liveRefresh);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadDashboard]);

  const stats = useMemo(() => {
    const todayStart = startOfDay();
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const now = Date.now();
    const effectiveSeconds = (session) => {
      const saved = Math.max(0, Number(session.duration_seconds || 0));
      if (session.ended_at || !session.started_at) return saved;
      const live = Math.max(0, Math.floor((now - new Date(session.started_at).getTime()) / 1000));
      return Math.max(saved, live);
    };

    const validSessions = sessions.filter((session) => effectiveSeconds(session) > 0);

    const totalSeconds = validSessions.reduce(
      (sum, session) => sum + effectiveSeconds(session),
      0
    );

    const todaySeconds = validSessions
      .filter((session) => new Date(session.started_at) >= todayStart)
      .reduce((sum, session) => sum + effectiveSeconds(session), 0);

    const monthSeconds = validSessions
      .filter((session) => new Date(session.started_at) >= monthStart)
      .reduce((sum, session) => sum + effectiveSeconds(session), 0);

    const completedGoals = goals.filter((goal) => goal.completed).length;
    const dueToday = goals.filter((goal) => {
      if (goal.completed || !goal.target_date) return false;
      return goal.target_date === todayStart.toISOString().slice(0, 10);
    });

    const activeGoals = goals.filter((goal) => !goal.completed);

    const dateSet = new Set(
      validSessions.map((session) =>
        startOfDay(session.started_at).getTime()
      )
    );

    let streak = 0;
    let cursor = startOfDay();

    while (dateSet.has(cursor.getTime())) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY);
    }

    const dayBuckets = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(todayStart.getTime() - i * DAY);
      const next = new Date(day.getTime() + DAY);
      const seconds = validSessions
        .filter((session) => {
          const date = new Date(session.started_at);
          return date >= day && date < next;
        })
        .reduce((sum, session) => sum + effectiveSeconds(session), 0);

      dayBuckets.push({
        label: day.toLocaleDateString([], { weekday: "short" }),
        seconds,
      });
    }

    const recentSessions = [...validSessions]
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, 4)
      .map((session) => ({ ...session, effective_duration_seconds: effectiveSeconds(session) }));

    return {
      totalSeconds,
      todaySeconds,
      monthSeconds,
      completedGoals,
      activeGoals,
      dueToday,
      streak,
      dayBuckets,
      recentSessions,
    };
  }, [sessions, goals]);

  const maxChart = Math.max(...stats.dayBuckets.map((day) => day.seconds), 1);

  const goalProgress = goals.length
    ? Math.round((stats.completedGoals / goals.length) * 100)
    : 0;

  const todayDate = new Date().toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const dailyNudges = [
    "Start with the smallest task on your list. Momentum can come after.",
    "A short, focused session still counts as real progress.",
    "Choose one thing to finish, then give it your full attention.",
    "Take a breath, clear your desk, and begin where you are.",
    "You do not need a perfect plan to make a useful start.",
    "Small study sessions add up. Pick a topic and ease into it.",
    "Make today a little easier for tomorrow-you.",
  ];
  const dailyNudge = dailyNudges[Math.floor(Date.now() / DAY) % dailyNudges.length];

  if (loading) {
    return (
      <div className="dashboard-page dashboard-loading-page">
        <div className="dashboard-loader">
          <RefreshCw size={24} className="dashboard-spin" />
          <span>Loading your study dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">YOUR STUDY SPACE</span>
          <h1>
            Hello, <span>{profile?.display_name || "Student"}!</span>
          </h1>
          <p>Consistency today creates a better tomorrow.</p>
          <div className="dashboard-daily-nudge">
            <span className="dashboard-nudge-icon"><Sparkles size={16} /></span>
            <div>
              <span className="dashboard-nudge-label">A LITTLE NOTE FOR TODAY</span>
              <strong>{dailyNudge}</strong>
            </div>
            <button onClick={() => setPage("solo")}>
              Start a session <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-date-card">
            <CalendarDays size={18} />
            <div>
              <strong>{todayDate}</strong>
              <span>One step at a time</span>
            </div>
          </div>

          <button
            className="dashboard-refresh"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw size={17} className={refreshing ? "dashboard-spin" : ""} />
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-error">{error}</div>
      )}

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card accent-gold">
          <div className="dashboard-stat-icon"><Clock3 size={20} /></div>
          <div>
            <span>Today's Study Time</span>
            <strong>{formatDuration(stats.todaySeconds)}</strong>
            <small>Total focused time today</small>
          </div>
        </article>

        <article className="dashboard-stat-card accent-purple">
          <div className="dashboard-stat-icon"><BarChart3 size={20} /></div>
          <div>
            <span>This Month</span>
            <strong>{formatDuration(stats.monthSeconds)}</strong>
            <small>{formatDuration(stats.totalSeconds)} all time</small>
          </div>
        </article>

        <article className="dashboard-stat-card accent-orange">
          <div className="dashboard-stat-icon"><Flame size={20} /></div>
          <div>
            <span>Study Streak</span>
            <strong>{stats.streak} {stats.streak === 1 ? "day" : "days"}</strong>
            <small>Consecutive study days</small>
          </div>
        </article>

        <article className="dashboard-stat-card accent-blue">
          <div className="dashboard-stat-icon"><Target size={20} /></div>
          <div>
            <span>Goals Completed</span>
            <strong>{stats.completedGoals}/{goals.length}</strong>
            <small>{goalProgress}% complete</small>
          </div>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel goals-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Today's Goals</h2>
              <span>{stats.completedGoals}/{goals.length} completed</span>
            </div>
            <button onClick={() => setPage("goals")} className="dashboard-text-button">
              See all
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="dashboard-goal-list">
            {(stats.dueToday.length ? stats.dueToday : stats.activeGoals.slice(0, 5)).length === 0 ? (
              <div className="dashboard-empty">
                <CheckCircle2 size={22} />
                <strong>No pending goals</strong>
                <span>Create a goal to start tracking your progress.</span>
              </div>
            ) : (
              (stats.dueToday.length ? stats.dueToday : stats.activeGoals.slice(0, 5)).map((goal) => (
                <div className="dashboard-goal-row" key={goal.id}>
                  <div className={`dashboard-check ${goal.completed ? "done" : ""}`}>
                    {goal.completed && <CheckCircle2 size={16} />}
                  </div>
                  <div className="dashboard-goal-copy">
                    <strong>{goal.title}</strong>
                    <span>{goal.category || "Academics"} · {goal.priority || "medium"}</span>
                  </div>
                  <span className="dashboard-goal-progress">{goal.progress || 0}%</span>
                </div>
              ))
            )}
          </div>

          <button className="dashboard-add-goal" onClick={() => setPage("goals")}>
            <Plus size={17} />
            Add a new goal
          </button>
        </article>

        <article className="dashboard-panel chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Study Activity</h2>
              <span>Last 7 days</span>
            </div>
            <BarChart3 size={19} />
          </div>

          <div className="dashboard-chart">
            {stats.dayBuckets.map((day) => (
              <div className="dashboard-bar-wrap" key={day.label}>
                <div className="dashboard-bar-value">
                  {day.seconds ? formatDuration(day.seconds) : ""}
                </div>
                <div className="dashboard-bar-track">
                  <div
                    className="dashboard-bar"
                    style={{ height: `${Math.max(5, (day.seconds / maxChart) * 100)}%` }}
                  />
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel rooms-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Study Rooms</h2>
              <span>{rooms.length} room{rooms.length === 1 ? "" : "s"} joined</span>
            </div>
            <button onClick={() => setPage("my-rooms")} className="dashboard-text-button">
              See all <ArrowRight size={14} />
            </button>
          </div>

          <div className="dashboard-room-list">
            {rooms.slice(0, 3).map((room) => (
              <button
                className="dashboard-room-row"
                key={room.id}
                onClick={() => setPage(`room:${room.id}`)}
              >
                <div className="dashboard-room-icon"><Users size={18} /></div>
                <div>
                  <strong>{room.name}</strong>
                  <span>{room.type === "public" ? "Public" : "Private"} · {room.room_code}</span>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}

            {rooms.length === 0 && (
              <div className="dashboard-empty compact">
                <Users size={21} />
                <strong>No rooms yet</strong>
                <span>Join or create a study room.</span>
              </div>
            )}
          </div>

          <div className="dashboard-quick-actions">
            <button onClick={() => setPage("solo")}>
              <Play size={16} fill="currentColor" />
              Start Solo Study
            </button>
            <button onClick={() => setPage("join-room")}>
              <Users size={16} />
              Join a Study Room
            </button>
          </div>
        </article>

        <article className="dashboard-panel recent-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Recent Activity</h2>
              <span>Your latest study sessions</span>
            </div>
          </div>

          <div className="dashboard-activity-list">
            {stats.recentSessions.length === 0 ? (
              <div className="dashboard-empty compact">
                <Clock3 size={21} />
                <strong>No study sessions yet</strong>
                <span>Start Solo Study to build your history.</span>
              </div>
            ) : (
              stats.recentSessions.map((session) => (
                <div className="dashboard-activity-row" key={session.id}>
                  <div className="dashboard-activity-icon">
                    <Clock3 size={16} />
                  </div>
                  <div>
                    <strong>
                      {session.session_type === "room" ? "Study room session" : "Solo study session"}
                    </strong>
                    <span>{formatDateTime(session.started_at)} · {formatDuration(session.effective_duration_seconds ?? session.duration_seconds)}</span>
                  </div>
                  <CheckCircle2 size={16} />
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="dashboard-footer-card">
        <div className="dashboard-footer-icon"><Trophy size={19} /></div>
        <div>
          <strong>Keep going!</strong>
          <span>
            {stats.totalSeconds > 0
              ? `You've studied ${formatDuration(stats.totalSeconds)} in total.`
              : "Your first study session is waiting."}
          </span>
        </div>
        <button onClick={() => setPage("solo")}>
          Study now <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}
