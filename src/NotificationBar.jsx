import React, { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, UserPlus, X } from "lucide-react";
import { supabase } from "./supabase";

const unreadKey = (id) => `studytogether-unread-${id}`;
const lastActiveKey = (id) => `studytogether-last-active-${id}`;
const readUnread = (id) => { try { return JSON.parse(localStorage.getItem(unreadKey(id)) || "{}"); } catch { return {}; } };
const saveUnread = (id, value) => { try { localStorage.setItem(unreadKey(id), JSON.stringify(value)); } catch {} window.dispatchEvent(new CustomEvent("studytogether-unread-change")); };

export default function NotificationBar({ userId, enabled = true }) {
  const [items, setItems] = useState([]);
  const [permission, setPermission] = useState(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  const timers = useRef({});
  const dismiss = (id) => { clearTimeout(timers.current[id]); setItems((list) => list.filter((item) => item.id !== id)); delete timers.current[id]; };
  const push = (item) => {
    if (!enabled) return;
    const id = crypto.randomUUID(); setItems((list) => [{ id, ...item }, ...list].slice(0, 4));
    timers.current[id] = setTimeout(() => dismiss(id), 6500);
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
      try { new Notification(item.title, { body: item.text, icon: "/ekatra-mark.svg", tag: item.tag || id }); } catch {}
    }
  };
  const nameFor = async (id) => {
    const { data } = await supabase.from("profiles").select("display_name,username").eq("id", id).maybeSingle();
    return data?.display_name || data?.username || "Someone";
  };
  const enableAlerts = async () => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(await Notification.requestPermission());
  };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      let lastActive = null;
      try { lastActive = localStorage.getItem(lastActiveKey(userId)); } catch {}
      if (lastActive) {
        const { data } = await supabase.from("friend_messages").select("sender_id,created_at").eq("receiver_id", userId).gt("created_at", lastActive).order("created_at", { ascending: true }).limit(500);
        if (!cancelled && data?.length) {
          const counts = readUnread(userId);
          const activeChat = (() => { try { return localStorage.getItem(`studytogether-active-chat-${userId}`); } catch { return null; } })();
          data.forEach((m) => { if (m.sender_id !== activeChat) counts[m.sender_id] = Number(counts[m.sender_id] || 0) + 1; });
          saveUnread(userId, counts);
        }
      }
      try { localStorage.setItem(lastActiveKey(userId), new Date().toISOString()); } catch {}
    })();

    const publishPresence = (channel) => {
      const state = channel.presenceState();
      const ids = Object.keys(state);
      try { localStorage.setItem("studytogether-online-users", JSON.stringify(ids)); } catch {}
      window.dispatchEvent(new CustomEvent("studytogether-presence-change"));
    };
    const channel = supabase.channel("study-presence", { config: { presence: { key: userId } } })
      .on("presence", { event: "sync" }, () => publishPresence(channel))
      .on("presence", { event: "join" }, () => publishPresence(channel))
      .on("presence", { event: "leave" }, () => publishPresence(channel))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "st_friend_requests", filter: `receiver_id=eq.${userId}` }, async (p) => {
        push({ type: "request", title: "New friend request", text: `${await nameFor(p.new.sender_id)} wants to be friends` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "st_friend_requests", filter: `sender_id=eq.${userId}` }, async (p) => {
        if (p.new.status === "accepted") push({ type: "request", title: "Request accepted", text: `${await nameFor(p.new.receiver_id)} is now your friend` });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages", filter: `receiver_id=eq.${userId}` }, async (p) => {
        const senderId = p.new.sender_id;
        const activeChat = (() => { try { return localStorage.getItem(`studytogether-active-chat-${userId}`); } catch { return null; } })();
        if (activeChat !== senderId || document.visibilityState !== "visible") {
          const counts = readUnread(userId); counts[senderId] = Number(counts[senderId] || 0) + 1; saveUnread(userId, counts);
        }
        const sender = await nameFor(senderId);
        push({ type: "message", title: `Message from ${sender}`, text: p.new.message_type === "image" ? "Sent a photo" : String(p.new.message || "").slice(0, 100), tag: `message-${senderId}` });
      })
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ user_id: userId, online_at: new Date().toISOString() }); });

    const onFocus = () => { if (channel.state === "joined") channel.track({ user_id: userId, online_at: new Date().toISOString() }); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); supabase.removeChannel(channel); try { localStorage.removeItem("studytogether-online-users"); } catch {} window.dispatchEvent(new CustomEvent("studytogether-presence-change")); Object.values(timers.current).forEach(clearTimeout); timers.current = {}; };
  }, [userId]);

  return <>
    {enabled && permission === "default" && <button className="st-notify-enable" type="button" onClick={enableAlerts} title="Enable desktop notifications"><Bell size={15} /><span>Enable alerts</span></button>}
    {enabled && items.length > 0 && <div className="st-notify-wrap" aria-live="polite">{items.map((n) => <div className="st-notify" key={n.id}><div className="st-notify-icon">{n.type === "message" ? <MessageCircle size={18} /> : n.type === "request" ? <UserPlus size={18} /> : <Bell size={18} />}</div><div className="st-notify-body"><strong>{n.title}</strong><span>{n.text}</span></div><button onClick={() => dismiss(n.id)} aria-label="Close notification"><X size={16} /></button></div>)}</div>}
  </>;
}
