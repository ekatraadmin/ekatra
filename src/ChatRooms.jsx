import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Send,
  ImagePlus,
  UserPlus,
  Check,
  X,
  MessageCircle,
  Users,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "./supabase";
import "./ChatRooms.css";

function nameOf(profile) {
  return profile?.display_name || profile?.username || "Student";
}

function initials(profile) {
  return nameOf(profile).trim().split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "S";
}

function timeOf(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatRooms({ profile, user }) {
  const userId = user?.id || profile?.id;
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineIds, setOnlineIds] = useState([]);
  const endRef = useRef(null);
  const channelRef = useRef(null);

  async function loadFriends() {
    if (!userId) return;
    setLoading(true);
    setError("");

    const { data: rows, error: e } = await supabase
      .from("st_friendships")
      .select("id,user_id,friend_id,created_at")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    const ids = [...new Set((rows || []).map((r) => r.user_id === userId ? r.friend_id : r.user_id))];
    let profiles = [];
    if (ids.length) {
      const { data, error: pe } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", ids);
      if (pe) setError(pe.message);
      profiles = data || [];
    }

    const map = new Map(profiles.map((p) => [p.id, p]));
    setFriends(ids.map((id) => ({ id, profile: map.get(id) || null })).filter((x) => x.profile));
    setLoading(false);
  }

  async function loadRequests() {
    if (!userId) return;
    const { data: rows, error: e } = await supabase
      .from("st_friend_requests")
      .select("id,sender_id,receiver_id,created_at")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (e) return;

    const ids = [...new Set((rows || []).map((r) => r.sender_id))];
    let profiles = [];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id,display_name,username,avatar_url").in("id", ids);
      profiles = data || [];
    }
    const map = new Map(profiles.map((p) => [p.id, p]));
    setRequests((rows || []).map((r) => ({ ...r, profile: map.get(r.sender_id) || null })));
  }

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [userId]);

  const unreadStorageKey = `studytogether-unread-${userId}`;
  const activeChatKey = `studytogether-active-chat-${userId}`;
  const readUnreadCounts = () => {
    try { return JSON.parse(localStorage.getItem(unreadStorageKey) || "{}"); }
    catch { return {}; }
  };
  const markFriendRead = (friendId) => {
    if (!friendId) return;
    const next = readUnreadCounts(); delete next[friendId];
    try {
      localStorage.setItem(unreadStorageKey, JSON.stringify(next));
      localStorage.setItem(`studytogether-last-read-${userId}-${friendId}`, new Date().toISOString());
      localStorage.setItem(activeChatKey, friendId);
    } catch {}
    setUnreadCounts(next);
    window.dispatchEvent(new CustomEvent("studytogether-unread-change"));
  };

  useEffect(() => {
    if (!userId) return;
    setUnreadCounts(readUnreadCounts());
    const refreshUnread = () => setUnreadCounts(readUnreadCounts());
    const onStorage = (event) => { if (event.key === unreadStorageKey) refreshUnread(); };
    window.addEventListener("studytogether-unread-change", refreshUnread);
    window.addEventListener("storage", onStorage);
    const refreshPresence = () => {
      try { setOnlineIds(JSON.parse(localStorage.getItem("studytogether-online-users") || "[]")); }
      catch { setOnlineIds([]); }
    };
    refreshPresence();
    window.addEventListener("studytogether-presence-change", refreshPresence);
    window.addEventListener("storage", refreshPresence);
    return () => {
      window.removeEventListener("studytogether-unread-change", refreshUnread);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("studytogether-presence-change", refreshPresence);
      window.removeEventListener("storage", refreshPresence);
      try { localStorage.removeItem(activeChatKey); } catch {}
    };
  }, [userId]);

  const [results, setResults] = useState([]);

  // Step 1: search -> show EVERY matching student so you pick the exact person
  async function addFriend(e) {
    e.preventDefault();
    const value = friendSearch.trim().replace(/^@/, "");
    if (!value || !userId) return;
    setAdding(true); setError(""); setNotice(""); setResults([]);
    const safe = value.replace(/[%,()]/g, "");
    const { data, error: se } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
      .neq("id", userId)
      .limit(20);
    if (se) setError(se.message);
    else if (!data?.length) setError("No student found.");
    else setResults(data);
    setAdding(false);
  }

  // Step 2: send to the exact id you clicked (never guesses by name)
  async function sendRequestTo(target) {
    if (!target?.id || target.id === userId) return;
    setError(""); setNotice("");
    const { data: existing } = await supabase
      .from("st_friendships")
      .select("id")
      .or(`and(user_id.eq.${userId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${userId})`)
      .limit(1);
    if (existing?.length) { setNotice(`You are already friends with ${nameOf(target)}.`); return; }
    const { data: pending } = await supabase
      .from("st_friend_requests")
      .select("id")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${userId})`)
      .eq("status", "pending")
      .limit(1);
    if (pending?.length) { setNotice("A friend request is already pending."); return; }
    const { error: insertError } = await supabase.from("st_friend_requests").insert({ sender_id: userId, receiver_id: target.id });
    if (insertError) setError(insertError.message);
    else { setNotice(`Friend request sent to ${nameOf(target)} (@${target.username || target.id.slice(0, 6)}).`); setResults([]); setFriendSearch(""); }
  }

  // Keep the request list live
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`chatrooms-requests-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "st_friend_requests", filter: `receiver_id=eq.${userId}` }, () => loadRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "st_friendships", filter: `user_id=eq.${userId}` }, () => loadFriends())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  async function respondToRequest(request, accept) {
    setError("");
    if (!accept) {
      const { error: e } = await supabase.from("st_friend_requests").delete().eq("id", request.id).eq("receiver_id", userId);
      if (e) setError(e.message);
      else setRequests((current) => current.filter((r) => r.id !== request.id));
      return;
    }

    const { error: requestError } = await supabase
      .from("st_friend_requests")
      .update({ status: "accepted" })
      .eq("id", request.id)
      .eq("receiver_id", userId);
    if (requestError) { setError(requestError.message); return; }

    const { error: firstError } = await supabase.from("st_friendships").insert({ user_id: userId, friend_id: request.sender_id });
    if (firstError && firstError.code !== "23505") { setError(firstError.message); return; }
    const { error: secondError } = await supabase.from("st_friendships").insert({ user_id: request.sender_id, friend_id: userId });
    if (secondError && secondError.code !== "23505") { setError(secondError.message); return; }

    setRequests((current) => current.filter((r) => r.id !== request.id));
    await loadFriends();
  }

  async function loadMessages(friendId) {
    if (!friendId || !userId) return;
    setChatLoading(true); setError("");
    const { data, error: e } = await supabase
      .from("friend_messages")
      .select("id,sender_id,receiver_id,message,message_type,image_url,created_at")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true })
      .limit(300);
    if (e) setError(e.message); else setMessages(data || []);
    setChatLoading(false);
  }

  function openFriend(friend) {
    setSelected(friend);
    setMobileChat(true);
    markFriendRead(friend.id);
    loadMessages(friend.id);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const channel = supabase
      .channel(`friend-chat-${userId}-${friend.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages", filter: `receiver_id=eq.${userId}` }, (payload) => {
        if (payload.new.sender_id === friend.id) setMessages((current) => current.some((m) => m.id === payload.new.id) ? current : [...current, payload.new]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "friend_messages", filter: `sender_id=eq.${userId}` }, (payload) => {
        if (payload.new.receiver_id === friend.id) setMessages((current) => current.some((m) => m.id === payload.new.id) ? current : [...current, payload.new]);
      })
      .subscribe();
    channelRef.current = channel;
  }

  function backToFriendList() {
    setMobileChat(false);
    try { localStorage.removeItem(activeChatKey); } catch {}
  }

  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selected || sending) return;
    setSending(true); setMessageText("");
    const { data, error: e2 } = await supabase.from("friend_messages").insert({
      sender_id: userId,
      receiver_id: selected.id,
      message: text,
      message_type: "text",
    }).select().single();
    if (e2) { setMessageText(text); setError(e2.message); }
    else setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
    setSending(false);
  }

  async function sendPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Photo must be smaller than 8 MB."); return; }
    setUploading(true); setError("");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `friends/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("friend-chat-images").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("friend-chat-images").getPublicUrl(path);
      const { data, error: messageError } = await supabase.from("friend_messages").insert({ sender_id: userId, receiver_id: selected.id, message: "Shared a photo", message_type: "image", image_url: publicData.publicUrl }).select().single();
      if (messageError) throw messageError;
      setMessages((current) => current.some((m) => m.id === data.id) ? current : [...current, data]);
    } catch (e2) { setError(e2.message || "Unable to send photo."); }
    setUploading(false);
  }

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friends.filter((f) => !q || nameOf(f.profile).toLowerCase().includes(q) || String(f.profile?.username || "").toLowerCase().includes(q));
  }, [friends, search]);

  return (
    <div className={`chat-page ${mobileChat ? "mobile-chat-open" : ""}`}>
      <aside className="chat-sidebar">
        <div className="chat-sidebar-head">
          <div><span className="chat-kicker">EKATRA</span><h1>Chat</h1></div>
          <MessageCircle size={22} />
        </div>

        <form className="add-friend-form" onSubmit={addFriend}>
          <UserPlus size={17} />
          <input value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} placeholder="Search name or username" />
          <button disabled={adding} type="submit">{adding ? <Loader2 size={16} className="spin" /> : <Send size={15} />}</button>
        </form>

        {results.length > 0 && (
          <section className="requests-box">
            <div className="section-label">Pick the right person · {results.length}</div>
            {results.map((p) => (
              <div className="request-item" key={p.id}>
                <div className="avatar">{initials(p)}</div>
                <div className="request-main"><strong>{nameOf(p)}</strong><span>@{p.username || p.id.slice(0, 6)}</span></div>
                <button title="Send request" onClick={() => sendRequestTo(p)}><UserPlus size={15} /></button>
              </div>
            ))}
          </section>
        )}

        {notice && <div className="chat-notice">{notice}</div>}
        {error && <div className="chat-error">{error}</div>}

        {requests.length > 0 && (
          <section className="requests-box">
            <div className="section-label">Friend requests · {requests.length}</div>
            {requests.map((request) => (
              <div className="request-item" key={request.id}>
                <div className="avatar">{initials(request.profile)}</div>
                <div className="request-main"><strong>{nameOf(request.profile)}</strong><span>@{request.profile?.username || "student"}</span></div>
                <button title="Accept" onClick={() => respondToRequest(request, true)}><Check size={15} /></button>
                <button title="Decline" onClick={() => respondToRequest(request, false)}><X size={15} /></button>
              </div>
            ))}
          </section>
        )}

        <div className="friends-head"><span>Friends</span><b>{friends.length}</b></div>
        <div className="friend-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" /></div>
        <div className="friends-list">
          {loading ? <div className="empty-chat-list">Loading friends…</div> : filteredFriends.length === 0 ? <div className="empty-chat-list"><Users size={28} /><p>No friends yet.</p><span>Add a friend using their username.</span></div> : filteredFriends.map((friend) => (
            <button key={friend.id} className={`friend-row ${selected?.id === friend.id ? "selected" : ""}`} onClick={() => openFriend(friend)}>
              <div className="avatar-wrap"><div className="avatar">{initials(friend.profile)}</div><i className={`friend-presence-dot ${onlineIds.includes(friend.id) ? "is-online" : ""}`} /></div>
              <div className="friend-identity"><strong>{nameOf(friend.profile)}</strong><span>@{friend.profile?.username || "student"} · {onlineIds.includes(friend.id) ? "Active now" : "Offline"}</span></div>
              {Number(unreadCounts[friend.id] || 0) > 0 && <b className="friend-unread-badge">{Number(unreadCounts[friend.id]) > 99 ? "99+" : unreadCounts[friend.id]}</b>}
            </button>
          ))}
        </div>
      </aside>

      <main className="chat-main">
        {!selected ? (
          <div className="chat-welcome"><div className="chat-welcome-icon"><MessageCircle size={32} /></div><h2>Your study conversations</h2><p>Select a friend to start chatting, or add someone using their username.</p></div>
        ) : (
          <>
            <header className="chat-header">
              <button className="mobile-back" onClick={backToFriendList}><ArrowLeft size={19} /></button>
              <div className="avatar-wrap"><div className="avatar">{initials(selected.profile)}</div><i className={`friend-presence-dot ${onlineIds.includes(selected.id) ? "is-online" : ""}`} /></div>
              <div className="chat-header-identity"><strong>{nameOf(selected.profile)}</strong><span>{onlineIds.includes(selected.id) ? "Active now" : "Offline"}</span></div>
            </header>

            <div className="messages-area">
              {chatLoading ? <div className="chat-loading">Loading conversation…</div> : messages.length === 0 ? <div className="chat-loading"><MessageCircle size={26} /><p>No messages yet.</p><span>Say hello to your study partner.</span></div> : messages.map((message) => {
                const mine = message.sender_id === userId;
                return <div className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>
                  <div className="message-bubble">
                    {message.message_type === "image" && message.image_url ? <img src={message.image_url} alt="Shared" className="chat-photo" /> : <div>{message.message}</div>}
                    <small>{timeOf(message.created_at)}</small>
                  </div>
                </div>;
              })}
              <div ref={endRef} />
            </div>

            {error && <div className="chat-compose-error">{error}</div>}
            <form className="message-compose" onSubmit={sendMessage}>
              <label className="photo-button" title="Send photo"><ImagePlus size={20} /><input type="file" accept="image/*" onChange={sendPhoto} disabled={uploading} /></label>
              <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder={uploading ? "Uploading photo…" : `Message ${nameOf(selected.profile)}…`} disabled={uploading} />
              <button type="submit" disabled={!messageText.trim() || sending || uploading}><Send size={18} /></button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
