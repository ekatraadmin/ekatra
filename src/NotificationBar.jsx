import React, { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, UserPlus, X } from "lucide-react";
import { supabase } from "./supabase";

// Top notification bar: pops up for new friend requests and new messages.
export default function NotificationBar({ userId }) {
  const [items, setItems] = useState([]);
  const timers = useRef({});

  function push(item) {
    const id = crypto.randomUUID();
    setItems((cur) => [{ id, ...item }, ...cur].slice(0, 4));
    timers.current[id] = setTimeout(() => dismiss(id), 6000);
  }
  function dismiss(id) {
    clearTimeout(timers.current[id]);
    setItems((cur) => cur.filter((x) => x.id !== id));
  }

  async function nameFor(id) {
    const { data } = await supabase.from("profiles").select("display_name,username").eq("id", id).maybeSingle();
    return data?.display_name || data?.username || "Someone";
  }

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notify-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "st_friend_requests", filter: `receiver_id=eq.${userId}` }, async (p) => {
        push({ type: "request", title: "New friend request", text: `${await nameFor(p.new.sender_id)} wants to be friends` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "st_friend_requests", filter: `sender_id=eq.${userId}` }, async (p) => {
        if (p.new.status === "accepted") push({ type: "request", title: "Request accepted", text: `${await nameFor(p.new.receiver_id)} is now your friend` });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages", filter: `receiver_id=eq.${userId}` }, async (p) => {
        const body = p.new.message_type === "image" ? "Sent a photo" : String(p.new.message || "").slice(0, 80);
        push({ type: "message", title: `Message from ${await nameFor(p.new.sender_id)}`, text: body });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (!items.length) return null;
  return (
    <div className="st-notify-wrap">
      {items.map((n) => (
        <div className="st-notify" key={n.id}>
          <div className="st-notify-icon">{n.type === "message" ? <MessageCircle size={18} /> : n.type === "request" ? <UserPlus size={18} /> : <Bell size={18} />}</div>
          <div className="st-notify-body"><strong>{n.title}</strong><span>{n.text}</span></div>
          <button onClick={() => dismiss(n.id)} aria-label="Close"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}
