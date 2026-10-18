import { useEffect, useState } from "react";
import { Target, Plus, Check, X, Loader2 } from "lucide-react";
import { supabase } from "./supabase";

export default function SoloGoalsPanel({ profile }) {
  const userId = profile?.id;
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    if (!userId) { setGoals([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("study_goals")
      .select("id,user_id,title,completed,progress,priority,target_date,created_at")
      .eq("user_id", userId)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) console.error("Study goals load error:", error);
    setGoals(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadGoals();
    if (!userId) return undefined;
    const channel = supabase
      .channel(`study-goals-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_goals", filter: `user_id=eq.${userId}` }, loadGoals)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function addGoal() {
    const title = goalInput.trim();
    if (!title || !userId || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from("study_goals").insert({
      user_id: userId,
      title,
      description: null,
      category: "study",
      priority: "medium",
      target_date: null,
      progress: 0,
      completed: false,
    }).select("id,user_id,title,completed,progress,priority,target_date,created_at").single();
    if (error) console.error("Create goal error:", error);
    else { setGoals(current => [data, ...current]); setGoalInput(""); }
    setSaving(false);
  }

  async function toggleGoal(goal) {
    const completed = !Boolean(goal.completed);
    const progress = completed ? 100 : Math.min(Number(goal.progress || 0), 99);
    const { error } = await supabase.from("study_goals").update({
      completed,
      progress,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", goal.id).eq("user_id", userId);
    if (error) { console.error("Toggle goal error:", error); return; }
    setGoals(current => current.map(item => item.id === goal.id ? { ...item, completed, progress } : item));
  }

  async function deleteGoal(goal) {
    const { error } = await supabase.from("study_goals").delete().eq("id", goal.id).eq("user_id", userId);
    if (error) { console.error("Delete goal error:", error); return; }
    setGoals(current => current.filter(item => item.id !== goal.id));
  }

  const completed = goals.filter(goal => goal.completed).length;

  return (
    <section className="glass-panel goals-panel">
      <div className="panel-heading">
        <div><Target size={20} /><span>Study Goals</span></div>
        <span className="goal-count">{completed}/{goals.length}</span>
      </div>
      <div className="goal-input">
        <input type="text" value={goalInput} placeholder="Add a study goal..." maxLength={120} disabled={saving}
          onChange={e => setGoalInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addGoal(); }} />
        <button type="button" onClick={addGoal} disabled={saving || !goalInput.trim()} title="Add study goal">
          {saving ? <Loader2 size={18} className="spin" /> : <Plus size={20} />}
        </button>
      </div>
      {loading ? (
        <div className="empty-goals"><Loader2 size={26} className="spin" /><strong>Loading goals...</strong></div>
      ) : goals.length === 0 ? (
        <div className="empty-goals"><Target size={34} /><strong>No goals yet</strong><p>Add a goal here or create one from Study Goals.</p></div>
      ) : (
        <div className="goal-list">
          {goals.map(goal => (
            <div className={`goal-item ${goal.completed ? "is-completed" : ""}`} key={goal.id}>
              <button type="button" className={`goal-check ${goal.completed ? "completed" : ""}`} onClick={() => toggleGoal(goal)} title={goal.completed ? "Reopen goal" : "Complete goal"}>
                {goal.completed && <Check size={14} />}
              </button>
              <div className="solo-goal-copy">
                <span className={goal.completed ? "goal-done" : ""}>{goal.title}</span>
                <div className="solo-goal-progress"><span style={{ width: `${Number(goal.progress || 0)}%` }} /></div>
              </div>
              <button type="button" className="goal-delete" onClick={() => deleteGoal(goal)} title="Delete goal"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
