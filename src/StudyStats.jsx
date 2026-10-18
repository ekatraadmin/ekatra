import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Timer,
} from "lucide-react";
import { supabase } from "./supabase";
import "./StudyStats.css";

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(value = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDuration(totalSeconds, compact = false) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (compact) {
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return `${seconds}s`;
  }

  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function effectiveDuration(session, now = Date.now()) {
  const saved = Math.max(0, Number(session.duration_seconds || 0));
  if (session.ended_at || !session.started_at) return saved;

  const start = new Date(session.started_at).getTime();
  if (!Number.isFinite(start)) return saved;

  const live = Math.max(0, Math.floor((now - start) / 1000));
  return Math.max(saved, live);
}

function getDateKey(value) {
  const d = startOfDay(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sameDay(a, b) {
  return getDateKey(a) === getDateKey(b);
}

function StatCard({ icon, label, value, detail, className = "" }) {
  return (
    <article className={`stats-stat-card ${className}`}>
      <div className="stats-stat-icon">{icon}</div>
      <div className="stats-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function StudyStats({ profile }) {
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (refresh = false) => {
    if (!profile?.id) return;

    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const [sessionResult, goalResult] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("id,room_id,session_type,duration_seconds,started_at,ended_at")
          .eq("user_id", profile.id)
          .order("started_at", { ascending: false })
          .limit(1000),
        supabase
          .from("study_goals")
          .select("id,title,completed,progress,created_at,completed_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (goalResult.error) throw goalResult.error;

      const loadedSessions = sessionResult.data || [];
      const roomIds = [
        ...new Set(
          loadedSessions
            .map((session) => session.room_id)
            .filter(Boolean)
        ),
      ];

      let loadedRooms = [];
      if (roomIds.length) {
        const { data, error: roomError } = await supabase
          .from("rooms")
          .select("id,name")
          .in("id", roomIds);

        if (roomError) throw roomError;
        loadedRooms = data || [];
      }

      setSessions(loadedSessions);
      setGoals(goalResult.data || []);
      setRooms(loadedRooms);
    } catch (err) {
      console.error("Study stats load error:", err);
      setError(err.message || "Unable to load your study statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadStats();

    if (!profile?.id) return undefined;

    const channel = supabase
      .channel(`study-stats-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_sessions",
          filter: `user_id=eq.${profile.id}`,
        },
        () => loadStats(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_goals",
          filter: `user_id=eq.${profile.id}`,
        },
        () => loadStats(true)
      )
      .subscribe();

    const interval = setInterval(() => loadStats(true), 15000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadStats]);

  const computed = useMemo(() => {
    const now = Date.now();
    const today = startOfDay();
    const validSessions = sessions
      .map((session) => ({
        ...session,
        effective_seconds: effectiveDuration(session, now),
      }))
      .filter((session) => session.effective_seconds > 0 && session.started_at);

    const totalSeconds = validSessions.reduce(
      (sum, session) => sum + session.effective_seconds,
      0
    );

    const todaySeconds = validSessions
      .filter((session) => sameDay(session.started_at, today))
      .reduce((sum, session) => sum + session.effective_seconds, 0);

    const weekStart = new Date(today.getTime() - 6 * DAY);
    const weekSeconds = validSessions
      .filter((session) => new Date(session.started_at) >= weekStart)
      .reduce((sum, session) => sum + session.effective_seconds, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthSeconds = validSessions
      .filter((session) => new Date(session.started_at) >= monthStart)
      .reduce((sum, session) => sum + session.effective_seconds, 0);

    const activeDays = new Set(validSessions.map((session) => getDateKey(session.started_at)));

    let streak = 0;
    let cursor = today;
    while (activeDays.has(getDateKey(cursor))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY);
    }

    // If today has no activity, show the still-valid streak ending yesterday.
    if (streak === 0) {
      cursor = new Date(today.getTime() - DAY);
      while (activeDays.has(getDateKey(cursor))) {
        streak += 1;
        cursor = new Date(cursor.getTime() - DAY);
      }
    }

    const visibleStart =
      range === "7"
        ? new Date(today.getTime() - 6 * DAY)
        : range === "30"
          ? new Date(today.getTime() - 29 * DAY)
          : null;

    const visibleSessions = visibleStart
      ? validSessions.filter((session) => new Date(session.started_at) >= visibleStart)
      : validSessions;

    const bucketCount = range === "7" ? 7 : range === "30" ? 30 : 12;
    const buckets = [];

    if (range === "all") {
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      for (let i = 11; i >= 0; i -= 1) {
        const month = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - i, 1);
        const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
        const seconds = visibleSessions
          .filter((session) => {
            const date = new Date(session.started_at);
            return date >= month && date < next;
          })
          .reduce((sum, session) => sum + session.effective_seconds, 0);

        buckets.push({
          key: `${month.getFullYear()}-${month.getMonth()}`,
          label: month.toLocaleDateString([], { month: "short" }),
          seconds,
        });
      }
    } else {
      for (let i = bucketCount - 1; i >= 0; i -= 1) {
        const day = new Date(today.getTime() - i * DAY);
        const next = new Date(day.getTime() + DAY);
        const seconds = visibleSessions
          .filter((session) => {
            const date = new Date(session.started_at);
            return date >= day && date < next;
          })
          .reduce((sum, session) => sum + session.effective_seconds, 0);

        buckets.push({
          key: getDateKey(day),
          label: day.toLocaleDateString([], { weekday: "short" }).slice(0, 2),
          date: day,
          seconds,
        });
      }
    }

    const soloSeconds = validSessions
      .filter((session) => session.session_type === "solo")
      .reduce((sum, session) => sum + session.effective_seconds, 0);

    const roomSeconds = validSessions
      .filter((session) => session.session_type === "room")
      .reduce((sum, session) => sum + session.effective_seconds, 0);

    const sessionCount = validSessions.length;
    const averageSession = sessionCount ? Math.round(totalSeconds / sessionCount) : 0;

    const goalCompleted = goals.filter((goal) => goal.completed).length;
    const goalProgress = goals.length
      ? Math.round(
          goals.reduce((sum, goal) => sum + Number(goal.progress || (goal.completed ? 100 : 0)), 0) /
            goals.length
        )
      : 0;

    const roomMap = new Map(rooms.map((room) => [room.id, room.name]));
    const recent = [...validSessions]
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, 8)
      .map((session) => ({
        ...session,
        label:
          session.session_type === "room"
            ? roomMap.get(session.room_id) || "Study room"
            : "Solo study",
      }));

    // Last 12 weeks for a compact consistency heatmap.
    const heatmap = [];
    for (let i = 83; i >= 0; i -= 1) {
      const day = new Date(today.getTime() - i * DAY);
      const key = getDateKey(day);
      const seconds = validSessions
        .filter((session) => getDateKey(session.started_at) === key)
        .reduce((sum, session) => sum + session.effective_seconds, 0);
      heatmap.push({ key, day, seconds });
    }

    return {
      validSessions,
      totalSeconds,
      todaySeconds,
      weekSeconds,
      monthSeconds,
      streak,
      buckets,
      soloSeconds,
      roomSeconds,
      sessionCount,
      averageSession,
      goalCompleted,
      goalProgress,
      recent,
      heatmap,
    };
  }, [sessions, goals, rooms, range]);

  const maxBucket = Math.max(...computed.buckets.map((item) => item.seconds), 1);
  const maxHeat = Math.max(...computed.heatmap.map((item) => item.seconds), 1);
  const soloPercent = computed.totalSeconds
    ? Math.round((computed.soloSeconds / computed.totalSeconds) * 100)
    : 0;
  const roomPercent = computed.totalSeconds ? 100 - soloPercent : 0;

  if (loading) {
    return (
      <div className="study-stats-page stats-loading">
        <RefreshCw size={23} className="stats-spin" />
        <span>Loading your study statistics...</span>
      </div>
    );
  }

  return (
    <div className="study-stats-page">
      <header className="stats-header">
        <div>
          <span className="stats-eyebrow">YOUR PROGRESS</span>
          <h1>Study Stats</h1>
          <p>See how consistently you are studying and where your time goes.</p>
        </div>

        <div className="stats-header-actions">
          <div className="stats-date-card">
            <CalendarDays size={17} />
            <div>
              <strong>{new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</strong>
              <span>Updated automatically</span>
            </div>
          </div>
          <button
            className="stats-refresh"
            onClick={() => loadStats(true)}
            disabled={refreshing}
            title="Refresh statistics"
          >
            <RefreshCw size={16} className={refreshing ? "stats-spin" : ""} />
          </button>
        </div>
      </header>

      {error && <div className="stats-error">{error}</div>}

      <section className="stats-stat-grid">
        <StatCard
          className="stats-gold"
          icon={<Clock3 size={19} />}
          label="Today"
          value={formatDuration(computed.todaySeconds)}
          detail="Focused study time"
        />
        <StatCard
          className="stats-blue"
          icon={<TrendingUp size={19} />}
          label="Last 7 Days"
          value={formatDuration(computed.weekSeconds)}
          detail="Your weekly total"
        />
        <StatCard
          className="stats-purple"
          icon={<Flame size={19} />}
          label="Current Streak"
          value={`${computed.streak} ${computed.streak === 1 ? "day" : "days"}`}
          detail="Consecutive study days"
        />
        <StatCard
          className="stats-green"
          icon={<Timer size={19} />}
          label="Average Session"
          value={formatDuration(computed.averageSession)}
          detail={`${computed.sessionCount} tracked sessions`}
        />
      </section>

      <section className="stats-main-grid">
        <article className="stats-panel stats-chart-panel">
          <div className="stats-panel-header">
            <div>
              <h2>Study Activity</h2>
              <span>Your focused time over the selected period</span>
            </div>
            <div className="stats-range-tabs">
              {[
                ["7", "7D"],
                ["30", "30D"],
                ["all", "12M"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={range === value ? "active" : ""}
                  onClick={() => setRange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-chart">
            {computed.buckets.map((bucket) => (
              <div className="stats-bar-column" key={bucket.key} title={formatDuration(bucket.seconds)}>
                <div className="stats-bar-value">
                  {bucket.seconds >= 3600 ? `${Math.round(bucket.seconds / 3600)}h` : bucket.seconds >= 60 ? `${Math.round(bucket.seconds / 60)}m` : ""}
                </div>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar"
                    style={{ height: `${Math.max(bucket.seconds ? 6 : 2, (bucket.seconds / maxBucket) * 100)}%` }}
                  />
                </div>
                <span>{bucket.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="stats-panel stats-breakdown-panel">
          <div className="stats-panel-header">
            <div>
              <h2>Study Breakdown</h2>
              <span>Where your study time comes from</span>
            </div>
            <BarChart3 size={18} />
          </div>

          <div className="stats-donut-wrap">
            <div
              className="stats-donut"
              style={{
                background: `conic-gradient(#78a9ff 0 ${soloPercent}%, #b985e9 ${soloPercent}% 100%)`,
              }}
            >
              <div>
                <strong>{formatDuration(computed.totalSeconds, true)}</strong>
                <span>all time</span>
              </div>
            </div>

            <div className="stats-breakdown-list">
              <div>
                <span><i className="stats-dot stats-dot-blue" /> Solo Study</span>
                <strong>{soloPercent}%</strong>
              </div>
              <div>
                <span><i className="stats-dot stats-dot-purple" /> Study Rooms</span>
                <strong>{roomPercent}%</strong>
              </div>
              <div>
                <span><i className="stats-dot stats-dot-neutral" /> This month</span>
                <strong>{formatDuration(computed.monthSeconds)}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="stats-bottom-grid">
        <article className="stats-panel">
          <div className="stats-panel-header">
            <div>
              <h2>Consistency</h2>
              <span>Last 12 weeks</span>
            </div>
            <Flame size={18} />
          </div>

          <div className="stats-heatmap">
            {computed.heatmap.map((cell) => {
              const intensity = cell.seconds === 0 ? 0 : Math.min(4, Math.ceil((cell.seconds / maxHeat) * 4));
              return (
                <div
                  key={cell.key}
                  className={`stats-heat-cell level-${intensity}`}
                  title={`${cell.day.toLocaleDateString()}: ${formatDuration(cell.seconds)}`}
                />
              );
            })}
          </div>
          <div className="stats-heat-legend">
            <span>Less</span>
            <i className="stats-heat-cell level-0" />
            <i className="stats-heat-cell level-1" />
            <i className="stats-heat-cell level-2" />
            <i className="stats-heat-cell level-3" />
            <i className="stats-heat-cell level-4" />
            <span>More</span>
          </div>
        </article>

        <article className="stats-panel">
          <div className="stats-panel-header">
            <div>
              <h2>Goals Progress</h2>
              <span>Based on your Study Goals</span>
            </div>
            <Target size={18} />
          </div>

          <div className="stats-goal-summary">
            <div className="stats-goal-ring">
              <div>
                <strong>{computed.goalProgress}%</strong>
                <span>progress</span>
              </div>
            </div>
            <div className="stats-goal-copy">
              <strong>{computed.goalCompleted} completed</strong>
              <span>{goals.length} total goals</span>
              <div className="stats-progress-track">
                <div style={{ width: `${computed.goalProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="stats-mini-goals">
            {goals.slice(0, 3).map((goal) => (
              <div key={goal.id}>
                <span>{goal.completed ? <CheckCircle2 size={14} /> : <Target size={14} />}</span>
                <strong>{goal.title}</strong>
                <small>{goal.completed ? "Completed" : `${Number(goal.progress || 0)}%`}</small>
              </div>
            ))}
            {!goals.length && <div className="stats-empty-small">No goals yet.</div>}
          </div>
        </article>
      </section>

      <section className="stats-panel stats-recent-panel">
        <div className="stats-panel-header">
          <div>
            <h2>Recent Sessions</h2>
            <span>Your latest tracked study sessions</span>
          </div>
          <Clock3 size={18} />
        </div>

        <div className="stats-session-list">
          {computed.recent.length === 0 ? (
            <div className="stats-empty">
              <Clock3 size={24} />
              <strong>No study sessions yet</strong>
              <span>Start Solo Study or enter a Study Room to begin building your stats.</span>
            </div>
          ) : (
            computed.recent.map((session) => (
              <div className="stats-session-row" key={session.id}>
                <div className={`stats-session-icon ${session.session_type === "room" ? "room" : "solo"}`}>
                  {session.session_type === "room" ? <Users size={16} /> : <Timer size={16} />}
                </div>
                <div className="stats-session-copy">
                  <strong>{session.label}</strong>
                  <span>{formatDateTime(session.started_at)}</span>
                </div>
                <strong className="stats-session-duration">{formatDuration(session.effective_seconds)}</strong>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="stats-footer-summary">
        <div>
          <strong>{formatDuration(computed.totalSeconds)}</strong>
          <span>Total focused time</span>
        </div>
        <div>
          <strong>{formatDuration(computed.monthSeconds)}</strong>
          <span>This month</span>
        </div>
        <div>
          <strong>{computed.sessionCount}</strong>
          <span>Sessions</span>
        </div>
        <div>
          <strong>{computed.streak}</strong>
          <span>Day streak</span>
        </div>
      </div>
    </div>
  );
}
