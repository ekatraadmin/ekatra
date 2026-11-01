import React, { useEffect, useMemo, useState } from "react";
import {
  Target,
  Plus,
  Search,
  Check,
  Trash2,
  Pencil,
  X,
  CalendarDays,
  Flag,
  BookOpen,
  BriefcaseBusiness,
  Dumbbell,
  Code2,
  GraduationCap,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { supabase } from "./supabase";
import "./StudyGoals.css";

const CATEGORIES = [
  { value: "academics", label: "Academics", icon: GraduationCap },
  { value: "study", label: "Study", icon: BookOpen },
  { value: "projects", label: "Projects", icon: Code2 },
  { value: "career", label: "Career", icon: BriefcaseBusiness },
  { value: "fitness", label: "Fitness", icon: Dumbbell },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const PRIORITIES = ["low", "medium", "high"];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "academics",
  priority: "medium",
  target_date: "",
  progress: 0,
};

function formatDate(value) {
  if (!value) return "No deadline";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "No deadline";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function daysUntil(value) {
  if (!value) return null;

  const target = new Date(`${value}T23:59:59`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target - today.getTime()) / 86400000);
}

function CategoryIcon({ category, size = 18 }) {
  const item =
    CATEGORIES.find((entry) => entry.value === category) ||
    CATEGORIES[CATEGORIES.length - 1];

  const Icon = item.icon;
  return <Icon size={size} strokeWidth={1.8} />;
}

export default function StudyGoals({ profile }) {
  const userId = profile?.id;

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadGoals() {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("study_goals")
      .select(
        "id,user_id,room_id,title,description,category,priority,target_date,progress,completed,created_at,completed_at"
      )
      .eq("user_id", userId)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false });

    if (loadError) {
      console.error("Study goals load error:", loadError);
      setError(loadError.message || "Unable to load your goals.");
      setGoals([]);
    } else {
      setGoals(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((goal) => goal.completed).length;
    const active = total - completed;

    const progress = total
      ? Math.round(
          goals.reduce(
            (sum, goal) => sum + Number(goal.progress || 0),
            0
          ) / total
        )
      : 0;

    return { total, completed, active, progress };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return goals.filter((goal) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !goal.completed) ||
        (filter === "completed" && goal.completed);

      const matchesSearch =
        !query ||
        String(goal.title || "").toLowerCase().includes(query) ||
        String(goal.description || "").toLowerCase().includes(query) ||
        String(goal.category || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [goals, filter, search]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(goal) {
    setEditingId(goal.id);

    setForm({
      title: goal.title || "",
      description: goal.description || "",
      category: goal.category || "academics",
      priority: goal.priority || "medium",
      target_date: goal.target_date || "",
      progress: Number(goal.progress || 0),
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveGoal(event) {
    event.preventDefault();

    if (!userId) {
      setError("You are not signed in.");
      return;
    }

    const title = form.title.trim();

    if (title.length < 2) {
      setError("Please enter a goal title.");
      return;
    }

    const progress = Math.min(
      100,
      Math.max(0, Number(form.progress) || 0)
    );

    const completed = progress >= 100;

    setSaving(true);
    setError("");

    const payload = {
      user_id: userId,
      title,
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      target_date: form.target_date || null,
      progress,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    const result = editingId
      ? await supabase
          .from("study_goals")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", userId)
      : await supabase
          .from("study_goals")
          .insert({
            ...payload,
            room_id: null,
          });

    if (result.error) {
      console.error("Study goal save error:", result.error);
      setError(result.error.message || "Unable to save the goal.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);

    await loadGoals();
  }

  async function toggleGoal(goal) {
    const completed = !Boolean(goal.completed);
    const progress = completed
      ? 100
      : Math.min(Number(goal.progress || 0), 99);

    const { error: updateError } = await supabase
      .from("study_goals")
      .update({
        completed,
        progress,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", goal.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message || "Unable to update the goal.");
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              completed,
              progress,
              completed_at: completed
                ? new Date().toISOString()
                : null,
            }
          : item
      )
    );
  }

  async function setProgress(goal, value) {
    const progress = Math.min(
      100,
      Math.max(0, Number(value) || 0)
    );

    const completed = progress >= 100;

    const { error: updateError } = await supabase
      .from("study_goals")
      .update({
        progress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", goal.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message || "Unable to update progress.");
      return;
    }

    setGoals((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              progress,
              completed,
              completed_at: completed
                ? new Date().toISOString()
                : null,
            }
          : item
      )
    );
  }

  async function deleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.title}"?`)) return;

    const { error: deleteError } = await supabase
      .from("study_goals")
      .delete()
      .eq("id", goal.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message || "Unable to delete the goal.");
      return;
    }

    setGoals((current) =>
      current.filter((item) => item.id !== goal.id)
    );
  }

  return (
    <div className="goals-page">
      <div className="goals-shell">
        <header className="goals-header">
          <div className="goals-heading">
            <div className="goals-heading-icon">
              <Target size={23} strokeWidth={1.8} />
            </div>

            <div>
              <div className="goals-eyebrow">
                <Sparkles size={12} />
                PERSONAL PROGRESS
              </div>

              <h1>Study Goals</h1>
              <p>
                Turn your plans into clear targets and keep moving
                forward.
              </p>
            </div>
          </div>

          <button className="goals-create-btn" onClick={openCreate}>
            <Plus size={18} />
            Create Goal
          </button>
        </header>

        {error && <div className="goals-error">{error}</div>}

        <section className="goals-stats">
          <div className="goal-stat">
            <span>Total goals</span>
            <strong>{stats.total}</strong>
            <small>Everything you've created</small>
          </div>

          <div className="goal-stat">
            <span>Active</span>
            <strong>{stats.active}</strong>
            <small>Goals still in progress</small>
          </div>

          <div className="goal-stat">
            <span>Completed</span>
            <strong>{stats.completed}</strong>
            <small>Targets you've finished</small>
          </div>

          <div className="goal-stat goal-stat-progress">
            <span>Overall progress</span>
            <strong>{stats.progress}%</strong>

            <div className="mini-progress">
              <span style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
        </section>

        <section className="goals-toolbar">
          <div className="goal-filters">
            {["all", "active", "completed"].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <label className="goal-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search goals..."
            />
          </label>
        </section>

        {loading ? (
          <div className="goals-empty">
            <div className="goals-loading-dot" />
            <h2>Loading your goals</h2>
            <p>Getting everything ready...</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="goals-empty">
            <div className="goals-empty-icon">
              <Target size={27} />
            </div>

            <h2>
              {goals.length
                ? "No goals match your search"
                : "Start with your first goal"}
            </h2>

            <p>
              {goals.length
                ? "Try another filter or search term."
                : "Create a target for your next study session, subject, project, or milestone."}
            </p>

            {!goals.length && (
              <button className="goals-create-btn" onClick={openCreate}>
                <Plus size={17} />
                Create your first goal
              </button>
            )}
          </div>
        ) : (
          <div className="goals-list">
            {filteredGoals.map((goal) => {
              const days = daysUntil(goal.target_date);
              const overdue =
                !goal.completed && days !== null && days < 0;
              const dueSoon =
                !goal.completed &&
                days !== null &&
                days >= 0 &&
                days <= 3;

              return (
                <article
                  className={`goal-card ${
                    goal.completed ? "is-completed" : ""
                  }`}
                  key={goal.id}
                >
                  <button
                    className={`goal-complete ${
                      goal.completed ? "checked" : ""
                    }`}
                    onClick={() => toggleGoal(goal)}
                    aria-label="Toggle completion"
                  >
                    {goal.completed && <Check size={16} />}
                  </button>

                  <div className="goal-main">
                    <div className="goal-card-top">
                      <div className="goal-title-wrap">
                        <div className="goal-category-icon">
                          <CategoryIcon category={goal.category} />
                        </div>

                        <div>
                          <h2>{goal.title}</h2>

                          {goal.description && (
                            <p>{goal.description}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`goal-priority priority-${
                          goal.priority || "medium"
                        }`}
                      >
                        <Flag size={12} />
                        {goal.priority || "medium"}
                      </span>
                    </div>

                    <div className="goal-progress-row">
                      <div className="goal-progress-track">
                        <span
                          style={{
                            width: `${Number(
                              goal.progress || 0
                            )}%`,
                          }}
                        />
                      </div>

                      <strong>
                        {Number(goal.progress || 0)}%
                      </strong>
                    </div>

                    <div className="goal-card-bottom">
                      <span
                        className={`goal-meta ${
                          overdue
                            ? "danger"
                            : dueSoon
                            ? "warning"
                            : ""
                        }`}
                      >
                        <CalendarDays size={14} />

                        {overdue
                          ? `Overdue · ${formatDate(
                              goal.target_date
                            )}`
                          : dueSoon
                          ? `Due soon · ${formatDate(
                              goal.target_date
                            )}`
                          : formatDate(goal.target_date)}
                      </span>

                      <span className="goal-category-label">
                        {CATEGORIES.find(
                          (item) =>
                            item.value === goal.category
                        )?.label || "Other"}
                      </span>

                      <div className="goal-actions">
                        {!goal.completed && (
                          <input
                            className="goal-progress-input"
                            type="number"
                            min="0"
                            max="100"
                            value={Number(goal.progress || 0)}
                            onChange={(event) =>
                              setProgress(
                                goal,
                                event.target.value
                              )
                            }
                            aria-label="Progress percentage"
                          />
                        )}

                        <button
                          onClick={() => openEdit(goal)}
                          title="Edit goal"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          className="danger-action"
                          onClick={() => deleteGoal(goal)}
                          title="Delete goal"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="goal-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="goal-modal">
            <div className="goal-modal-header">
              <div>
                <span className="modal-kicker">
                  {editingId ? "UPDATE TARGET" : "NEW TARGET"}
                </span>

                <h2>
                  {editingId
                    ? "Edit study goal"
                    : "Create a study goal"}
                </h2>

                <p>
                  Keep it clear, measurable, and realistic.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveGoal}>
              <label>
                Goal title
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="e.g. Complete Data Structures"
                  maxLength={120}
                  required
                />
              </label>

              <label>
                Description <span>Optional</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="What exactly do you want to accomplish?"
                  rows={3}
                  maxLength={500}
                />
              </label>

              <div className="goal-form-grid">
                <label>
                  Category
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value
                      )
                    }
                  >
                    {CATEGORIES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      updateField(
                        "priority",
                        event.target.value
                      )
                    }
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item[0].toUpperCase() +
                          item.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="goal-form-grid">
                <label>
                  Target date <span>Optional</span>
                  <input
                    type="date"
                    value={form.target_date}
                    onChange={(event) =>
                      updateField(
                        "target_date",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Progress <strong>{form.progress}%</strong>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(event) =>
                      updateField(
                        "progress",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>
              </div>

              {error && (
                <div className="goal-modal-error">{error}</div>
              )}

              <div className="goal-modal-actions">
                <button
                  type="button"
                  className="goal-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="goals-create-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
