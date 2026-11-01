import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Clock3,
  Copy,
  ImagePlus,
  LogOut,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { supabase } from "./supabase";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(import.meta.env.VITE_TURN_SERVER &&
    import.meta.env.VITE_TURN_USERNAME &&
    import.meta.env.VITE_TURN_CREDENTIAL
      ? [
          {
            urls: import.meta.env.VITE_TURN_SERVER,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

const MODE_SECONDS = {
  focus: 50 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

function idOf(value) {
  return String(value || "");
}

function profileName(profile, fallback = "Student") {
  return profile?.display_name || profile?.username || fallback;
}

export default function StudyRoom({ roomId, user, profile, setPage }) {
  const myId = idOf(profile?.id || user?.id);
  const myName = profileName(profile, "You");

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [remoteStreams, setRemoteStreams] = useState({});
  const [remoteCameraOn, setRemoteCameraOn] = useState({});
  const [presenceNames, setPresenceNames] = useState({});
  const onlineIdsRef = useRef([]);
  const [videoStatus, setVideoStatus] = useState("Video is ready when you turn on your camera.");
  const [signalingStatus, setSignalingStatus] = useState("Connecting video...");
  const [elapsedNow, setElapsedNow] = useState(0);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dataChannelRef = useRef(null);
  const videoChannelRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const membersRef = useRef([]);
  const cameraOnRef = useRef(false);
  const mountedRef = useRef(true);
  const roomStudySessionRef = useRef(null);
  const roomStudyBaseElapsedRef = useRef(0);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);

  const getMember = useCallback(
    (id) => membersRef.current.find((item) => idOf(item.user_id) === id),
    []
  );

  const getName = useCallback(
    (id) => profileName(getMember(id)?.profiles, "Study partner"),
    [getMember]
  );

  const formatTime = useCallback((seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, []);

  /* ---------------- study time tracking ---------------- */

  async function beginRoomStudyRecord() {
    if (!myId || roomStudySessionRef.current) return;

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: myId,
        room_id: roomId,
        session_type: "room",
        duration_seconds: 0,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Room study tracking unavailable:", error);
      return;
    }

    roomStudySessionRef.current = data.id;
    roomStudyBaseElapsedRef.current = elapsedNow;
  }

  async function finishRoomStudyRecord() {
    const id = roomStudySessionRef.current;
    if (!id) return;

    const duration = Math.max(0, Math.floor(elapsedNow - roomStudyBaseElapsedRef.current));

    const { error } = await supabase
      .from("study_sessions")
      .update({ duration_seconds: duration, ended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", myId);

    if (error) console.warn("Could not save room study session:", error);

    roomStudySessionRef.current = null;
    roomStudyBaseElapsedRef.current = 0;
  }

  /* ---------------- data loading ---------------- */

  const loadRoom = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id,name,description,room_code,type,max_members,owner_id,created_at")
      .eq("id", roomId)
      .single();
    if (error) throw error;
    setRoom(data);
    return data;
  }, [roomId]);

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_members")
      .select("id,room_id,user_id,joined_at,profiles(id,username,display_name)")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (error) {
      console.warn("Member refresh failed", error);
      return membersRef.current;
    }
    setMembers(data || []);
    membersRef.current = data || [];
    return data || [];
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,room_id,user_id,message,message_type,image_url,created_at,profiles(id,username,display_name)"
      )
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throw error;
    setMessages(data || []);
  }, [roomId]);

  const loadSession = useCallback(async () => {
    const { data, error } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      setSession(data);
      return data;
    }

    const { data: created, error: createError } = await supabase
      .from("room_sessions")
      .insert({ room_id: roomId, duration_seconds: MODE_SECONDS.focus })
      .select()
      .single();

    if (createError?.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("room_sessions")
        .select("*")
        .eq("room_id", roomId)
        .single();
      if (existingError) throw existingError;
      setSession(existing);
      return existing;
    }

    if (createError) throw createError;
    setSession(created);
    return created;
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !myId) return undefined;

    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setRoomError("");
      try {
        const [, memberData] = await Promise.all([loadRoom(), loadMembers()]);
        const isMember = memberData.some((item) => idOf(item.user_id) === myId);
        if (!isMember) {
          throw new Error("You are not a member of this room. Join the room first.");
        }
        await Promise.all([loadMessages(), loadSession()]);
        if (!cancelled) setVideoStatus("Camera is off. Turn it on to share your video.");
      } catch (error) {
        console.error("Study room load error:", error);
        if (!cancelled) setRoomError(error.message || "Unable to load this room.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [roomId, myId, loadRoom, loadMembers, loadMessages, loadSession]);

  /* ---------------- signaling helpers ---------------- */

  const sendSignal = useCallback((event, payload) => {
    const channel = videoChannelRef.current;
    if (!channel) return Promise.resolve(false);
    return channel
      .send({ type: "broadcast", event, payload })
      .then(() => true)
      .catch((error) => {
        console.warn(`Video signal ${event} failed`, error);
        return false;
      });
  }, []);

  const sendChatSignal = useCallback((payload) => {
    const channel = dataChannelRef.current;
    if (!channel) return Promise.resolve(false);
    return channel
      .send({ type: "broadcast", event: "chat-message", payload })
      .then(() => true)
      .catch((error) => {
        console.warn("Chat broadcast failed", error);
        return false;
      });
  }, []);

  const dropRemoteStream = useCallback((remoteId) => {
    remoteStreamsRef.current.delete(remoteId);
    setRemoteStreams((current) => {
      if (!current[remoteId]) return current;
      const next = { ...current };
      delete next[remoteId];
      return next;
    });
  }, []);

  const closePeer = useCallback(
    (remoteId) => {
      const pc = peersRef.current.get(remoteId);
      if (pc) {
        try {
          pc.close();
        } catch {}
        peersRef.current.delete(remoteId);
      }
      pendingIceRef.current.delete(remoteId);
      dropRemoteStream(remoteId);
    },
    [dropRemoteStream]
  );

  const flushIce = useCallback(async (remoteId) => {
    const pc = peersRef.current.get(remoteId);
    if (!pc?.remoteDescription) return;
    const queue = pendingIceRef.current.get(remoteId) || [];
    pendingIceRef.current.delete(remoteId);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("ICE candidate skipped", error);
      }
    }
  }, []);

  const createOffer = useCallback(
    async (remoteId, pc) => {
      if (!pc || pc.makingOffer) return;
      // One deterministic offerer per pair prevents offer glare.
      if (myId > remoteId) return;
      if (pc.signalingState !== "stable") return;
      pc.makingOffer = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { from: myId, to: remoteId, description: pc.localDescription });
      } catch (error) {
        console.error("Offer error", error);
      } finally {
        pc.makingOffer = false;
      }
    },
    [myId, sendSignal]
  );

  const ensurePeer = useCallback(
    async (remoteId) => {
      if (!remoteId || remoteId === myId) return null;

      const existing = peersRef.current.get(remoteId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.makingOffer = false;
      peersRef.current.set(remoteId, pc);

      // Only the offerer (lower id) creates the video slot. The answerer adopts the
      // slot from the incoming offer, otherwise its camera would go into an unused
      // slot and never reach the other person. The slot is always "sendrecv", so
      // turning a camera on/off is just a track swap: instant, no renegotiation.
      pc.videoTransceiver = null;
      if (myId < remoteId) {
        try {
          const localTrack = localStreamRef.current?.getVideoTracks?.()[0] || null;
          pc.videoTransceiver = pc.addTransceiver(localTrack || "video", { direction: "sendrecv" });
        } catch (error) {
          console.warn("Could not create video transceiver", error);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice", { from: myId, to: remoteId, candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        remoteStreamsRef.current.set(remoteId, stream);
        setRemoteStreams((current) => ({ ...current, [remoteId]: { stream } }));
        // Visibility of the tile is driven by the remote camera flag, not by
        // track mute events (those are flaky and never fire again on re-enable).
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          setVideoStatus(`${getName(remoteId)} is connected.`);
        } else if (state === "failed") {
          closePeer(remoteId);
          window.setTimeout(() => {
            if (!mountedRef.current) return;
            ensurePeer(remoteId).then((newPc) => newPc && createOffer(remoteId, newPc));
          }, 400);
        }
      };

      return pc;
    },
    [myId, sendSignal, getName, closePeer, createOffer, dropRemoteStream]
  );

  const connectToPeer = useCallback(
    async (remoteId) => {
      const pc = await ensurePeer(remoteId);
      if (!pc) return;
      if (myId < remoteId) await createOffer(remoteId, pc);
      else await sendSignal("peer-ready", { from: myId, to: remoteId });
    },
    [ensurePeer, createOffer, sendSignal, myId]
  );

  /* ---------------- realtime channels ---------------- */

  useEffect(() => {
    if (!roomId || !myId || loading) return undefined;

    const dataChannel = supabase
      .channel(`study-room-data-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        loadMessages
      )
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        const incoming = payload?.message;
        if (!incoming?.id) return;
        setMessages((current) => {
          if (current.some((item) => String(item.id) === String(incoming.id))) return current;
          return [...current, incoming].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        () => {
          loadMembers();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_sessions", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setSession(null);
          else if (payload.new) setSession(payload.new);
        }
      )
      .subscribe();
    dataChannelRef.current = dataChannel;

    const videoChannel = supabase
      .channel(`study-room-video-${roomId}`, {
        config: { presence: { key: myId }, broadcast: { self: false } },
      })
      .on("presence", { event: "sync" }, () => {
        const presence = videoChannel.presenceState();
        const activeIds = new Set();
        const cams = {};
        const names = {};

        Object.values(presence).forEach((metas) => {
          (metas || []).forEach((meta) => {
            const remoteId = idOf(meta?.userId);
            if (!remoteId) return;
            activeIds.add(remoteId);
            cams[remoteId] = Boolean(cams[remoteId] || meta?.cameraOn);
            if (meta?.name) names[remoteId] = meta.name;
          });
        });

        const list = Array.from(activeIds);
        onlineIdsRef.current = list;
        setOnlineIds(list);
        setRemoteCameraOn(cams);
        setPresenceNames(names);
        list.forEach((remoteId) => {
          if (remoteId !== myId && !peersRef.current.has(remoteId)) connectToPeer(remoteId);
        });

        // Someone left -> tear their tile down straight away.
        for (const remoteId of Array.from(peersRef.current.keys())) {
          if (!activeIds.has(remoteId)) closePeer(remoteId);
        }
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        const remoteId = idOf(newPresences?.[0]?.userId || key);
        if (!remoteId || remoteId === myId) return;
        // A new person joined: refresh the roster and start connecting now.
        loadMembers();
        connectToPeer(remoteId);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        const remoteId = idOf(leftPresences?.[0]?.userId || key);
        if (!remoteId || remoteId === myId) return;
        closePeer(remoteId);
        loadMembers();
      })
      .on("broadcast", { event: "peer-hello" }, async ({ payload }) => {
        const remoteId = idOf(payload?.userId);
        if (!remoteId || remoteId === myId) return;
        loadMembers();
        await connectToPeer(remoteId);
      })
      .on("broadcast", { event: "camera-state" }, async ({ payload }) => {
        const remoteId = idOf(payload?.from);
        if (!remoteId || remoteId === myId) return;
        setRemoteCameraOn((current) => ({ ...current, [remoteId]: Boolean(payload?.on) }));
        if (payload?.on) {
          if (!peersRef.current.has(remoteId)) await connectToPeer(remoteId);
        } else {
          setVideoStatus(`${getName(remoteId)} turned their camera off.`);
        }
      })
      .on("broadcast", { event: "peer-ready" }, async ({ payload }) => {
        if (payload?.to !== myId) return;
        const remoteId = idOf(payload.from);
        if (!remoteId || myId > remoteId) return;
        const pc = await ensurePeer(remoteId);
        if (pc) await createOffer(remoteId, pc);
      })
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload?.to !== myId || !payload?.description) return;
        const remoteId = idOf(payload.from);
        if (myId < remoteId) return; // lower id offers, higher id answers
        const pc = await ensurePeer(remoteId);
        if (!pc) return;
        try {
          if (pc.signalingState !== "stable") {
            try {
              await pc.setLocalDescription({ type: "rollback" });
            } catch {}
          }
          await pc.setRemoteDescription(payload.description);
          const transceiver =
            pc.getTransceivers().find((t) => t.receiver?.track?.kind === "video") || null;
          if (transceiver) {
            transceiver.direction = "sendrecv";
            const localTrack = localStreamRef.current?.getVideoTracks?.()[0] || null;
            if (transceiver.sender.track !== localTrack) {
              await transceiver.sender.replaceTrack(localTrack).catch(() => {});
            }
            pc.videoTransceiver = transceiver;
          }
          await flushIce(remoteId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("answer", { from: myId, to: remoteId, description: pc.localDescription });
        } catch (error) {
          console.error("Offer handling error", error);
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload?.to !== myId || !payload?.description) return;
        const remoteId = idOf(payload.from);
        const pc = peersRef.current.get(remoteId);
        if (!pc || pc.signalingState !== "have-local-offer") return;
        try {
          await pc.setRemoteDescription(payload.description);
          await flushIce(remoteId);
        } catch (error) {
          console.error("Answer handling error", error);
        }
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload?.to !== myId || !payload?.candidate) return;
        const remoteId = idOf(payload.from);
        const pc = peersRef.current.get(remoteId);
        if (!pc || !pc.remoteDescription) {
          const queue = pendingIceRef.current.get(remoteId) || [];
          queue.push(payload.candidate);
          pendingIceRef.current.set(remoteId, queue);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch (error) {
          console.warn("ICE add failed", error);
        }
      })
      .on("broadcast", { event: "peer-leave" }, ({ payload }) => {
        const remoteId = idOf(payload?.userId);
        if (remoteId && remoteId !== myId) {
          closePeer(remoteId);
          loadMembers();
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setSignalingStatus("Live");
          try {
            await videoChannel.track({ userId: myId, name: myName, cameraOn: cameraOnRef.current });
          } catch (error) {
            console.warn("Presence tracking unavailable:", error);
          }
          sendSignal("peer-hello", { userId: myId });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSignalingStatus("Reconnecting...");
        }
      });
    videoChannelRef.current = videoChannel;

    return () => {
      try {
        videoChannel.untrack();
      } catch {}
      supabase.removeChannel(dataChannel);
      supabase.removeChannel(videoChannel);
      dataChannelRef.current = null;
      videoChannelRef.current = null;
    };
  }, [
    roomId,
    myId,
    myName,
    loading,
    loadMessages,
    loadMembers,
    ensurePeer,
    connectToPeer,
    flushIce,
    sendSignal,
    closePeer,
    dropRemoteStream,
    createOffer,
    getName,
  ]);

  /* ---------------- shared timer ---------------- */

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!session) return;
      const base = Number(session.elapsed_seconds || 0);
      if (session.status !== "running" || !session.started_at) {
        setElapsedNow(Math.min(base, Number(session.duration_seconds || base)));
        return;
      }
      const started = new Date(session.started_at).getTime();
      const live = base + Math.max(0, Math.floor((Date.now() - started) / 1000));
      const duration = Number(session.duration_seconds || MODE_SECONDS.focus);
      setElapsedNow(Math.min(live, duration));
    }, 250);
    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!session || session.status !== "running") return;
    const duration = Number(session.duration_seconds || MODE_SECONDS.focus);
    if (elapsedNow < duration) return;
    supabase
      .from("room_sessions")
      .update({
        status: "stopped",
        elapsed_seconds: duration,
        started_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "running")
      .then(() => {});
  }, [elapsedNow, session, roomId]);

  useEffect(() => {
    if (!session || session.status !== "running") {
      if (roomStudySessionRef.current) finishRoomStudyRecord();
      return undefined;
    }
    if (session.mode !== "focus" || !roomStudySessionRef.current) return undefined;

    const syncRoomHeartbeat = async () => {
      const duration = Math.max(0, Math.floor(elapsedNow - roomStudyBaseElapsedRef.current));
      await supabase
        .from("study_sessions")
        .update({ duration_seconds: duration })
        .eq("id", roomStudySessionRef.current)
        .eq("user_id", myId);
    };

    syncRoomHeartbeat();
    const heartbeat = setInterval(syncRoomHeartbeat, 10000);
    return () => clearInterval(heartbeat);
  }, [session?.status, session?.mode, elapsedNow, myId]);

  /* ---------------- camera ---------------- */

  // Keep the <video> element bound to the live stream at all times. The element
  // is always mounted, so attaching a stream paints instantly with no remount.
  const attachLocalStream = useCallback(() => {
    const video = localVideoRef.current;
    if (!video) return;
    const stream = localStreamRef.current;
    if (video.srcObject !== stream) video.srcObject = stream || null;
    if (stream) video.play().catch(() => {});
  }, []);

  useEffect(() => {
    attachLocalStream();
  }, [cameraOn, attachLocalStream]);

  const applyLocalTrackToPeers = useCallback(
    async (track) => {
      const targets = onlineIdsRef.current.filter((id) => id && id !== myId);
      await Promise.all(
        targets.map(async (remoteId) => {
          const pc = peersRef.current.get(remoteId);
          if (!pc) {
            connectToPeer(remoteId);
            return;
          }
          const transceiver = pc.videoTransceiver;
          if (!transceiver) return; // answerer: track is attached when the offer arrives
          try {
            await transceiver.sender.replaceTrack(track);
            if (track) {
              const parameters = transceiver.sender.getParameters();
              if (!parameters.encodings?.length) parameters.encodings = [{}];
              parameters.encodings[0].maxBitrate = 900000;
              parameters.encodings[0].maxFramerate = 24;
              await transceiver.sender.setParameters(parameters).catch(() => {});
            }
          } catch (error) {
            console.debug("Track swap skipped", error);
          }
        })
      );
    },
    [connectToPeer, myId]
  );

  async function startCamera() {
    setCameraError("");
    if (cameraBusy) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available here. Use HTTPS or localhost.");
      return;
    }

    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // Show my own face immediately, before any network work happens.
      localStreamRef.current = stream;
      setCameraOn(true);
      cameraOnRef.current = true;
      attachLocalStream();
      setVideoStatus("Camera on.");

      // Everything below is network work: never block the preview on it.
      const track = stream.getVideoTracks()[0];
      track.onended = () => stopCamera();

      videoChannelRef.current?.track({ userId: myId, name: myName, cameraOn: true }).catch(() => {});
      sendSignal("camera-state", { from: myId, on: true });
      applyLocalTrackToPeers(track).catch((error) => console.warn("Peer update failed", error));
    } catch (error) {
      console.error(error);
      setCameraError(
        error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in the browser."
          : error.message || "Unable to start the camera."
      );
      setCameraOn(false);
      cameraOnRef.current = false;
    } finally {
      setCameraBusy(false);
    }
  }

  function stopCamera() {
    const stream = localStreamRef.current;

    // Stop hardware first and synchronously: light off, preview blank, instantly.
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    }
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCameraOn(false);
    cameraOnRef.current = false;
    setVideoStatus("Camera is off.");

    // Tell everyone afterwards. Other people's video is untouched.
    videoChannelRef.current?.track({ userId: myId, name: myName, cameraOn: false }).catch(() => {});
    sendSignal("camera-state", { from: myId, on: false });
    applyLocalTrackToPeers(null).catch(() => {});
  }

  function toggleCamera() {
    if (cameraOn) stopCamera();
    else startCamera();
  }

  /* ---------------- timer actions ---------------- */

  async function startTimer() {
    if (!session) return;
    const duration = Number(session.duration_seconds || MODE_SECONDS.focus);
    const current = elapsedNow >= duration ? 0 : elapsedNow;
    if (session.mode === "focus") await beginRoomStudyRecord();
    await supabase
      .from("room_sessions")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        elapsed_seconds: current,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId);
  }

  async function pauseTimer() {
    if (!session) return;
    await supabase
      .from("room_sessions")
      .update({
        status: "paused",
        started_at: null,
        elapsed_seconds: elapsedNow,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId);
    await finishRoomStudyRecord();
  }

  async function resetTimer() {
    if (!session) return;
    await supabase
      .from("room_sessions")
      .update({
        status: "stopped",
        started_at: null,
        elapsed_seconds: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId);
    await finishRoomStudyRecord();
  }

  async function changeMode(mode) {
    await finishRoomStudyRecord();
    await supabase
      .from("room_sessions")
      .update({
        mode,
        status: "stopped",
        started_at: null,
        elapsed_seconds: 0,
        duration_seconds: MODE_SECONDS[mode] || MODE_SECONDS.focus,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", roomId);
  }

  /* ---------------- chat ---------------- */

  async function sendMessage(event) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text) return;

    setMessageText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: myId,
        message: text,
        message_type: "text",
        image_url: null,
      })
      .select(
        "id,room_id,user_id,message,message_type,image_url,created_at,profiles(id,username,display_name)"
      )
      .single();

    if (error) {
      console.error(error);
      setMessageText(text);
      alert(error.message || "Unable to send message.");
      return;
    }

    setMessages((current) =>
      current.some((item) => String(item.id) === String(data.id)) ? current : [...current, data]
    );
    sendChatSignal({ message: data });
  }

  async function uploadChatPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Please choose an image smaller than 8 MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const ext =
        (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${roomId}/${myId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("room-chat-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("room-chat-images").getPublicUrl(path);
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          room_id: roomId,
          user_id: myId,
          message: "Shared a photo",
          message_type: "image",
          image_url: publicData.publicUrl,
        })
        .select(
          "id,room_id,user_id,message,message_type,image_url,created_at,profiles(id,username,display_name)"
        )
        .single();

      if (messageError) throw messageError;

      setMessages((current) =>
        current.some((item) => String(item.id) === String(messageData.id))
          ? current
          : [...current, messageData]
      );
      sendChatSignal({ message: messageData });
    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to upload photo.");
    } finally {
      setUploadingImage(false);
    }
  }

  /* ---------------- room actions ---------------- */

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room?.room_code || "");
      alert("Room code copied.");
    } catch {
      alert(`Room code: ${room?.room_code || ""}`);
    }
  }

  async function leaveRoom() {
    stopCamera();
    await sendSignal("peer-leave", { userId: myId });
    const { error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", myId);
    if (error) {
      console.error(error);
      alert(error.message || "Unable to leave room.");
      return;
    }
    setPage("my-rooms");
  }

  async function deleteRoom() {
    if (room?.owner_id !== myId) return;
    if (!window.confirm(`Delete "${room.name}"? This removes the room for everyone.`)) return;
    const { error } = await supabase.from("rooms").delete().eq("id", roomId).eq("owner_id", myId);
    if (error) {
      alert(error.message || "Unable to delete room.");
      return;
    }
    stopCamera();
    setPage("my-rooms");
  }

  // Hard cleanup on unmount: camera hardware released immediately.
  useEffect(() => {
    return () => {
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      for (const pc of peersRef.current.values()) {
        try {
          pc.close();
        } catch {}
      }
      peersRef.current.clear();
      remoteStreamsRef.current.clear();
    };
  }, []);

  /* ---------------- derived ---------------- */

  const onlineSet = useMemo(() => new Set(onlineIds), [onlineIds]);

  const participants = useMemo(() => {
    const seen = new Set();
    const list = [];

    membersRef.current.forEach(() => {});

    members.forEach((member) => {
      const id = idOf(member.user_id);
      if (!id || seen.has(id)) return;
      seen.add(id);
      list.push({
        userId: id,
        name: profileName(member.profiles, presenceNames[id] || "Study partner"),
        online: onlineSet.has(id) || id === myId,
      });
    });

    // Someone can be present before their membership row has synced.
    onlineIds.forEach((id) => {
      if (seen.has(id)) return;
      seen.add(id);
      list.push({ userId: id, name: presenceNames[id] || "Study partner", online: true });
    });

    return list;
  }, [members, onlineIds, onlineSet, myId, presenceNames]);

  const remoteEntries = useMemo(
    () =>
      participants
        .filter((item) => item.userId !== myId && item.online)
        .map((item) => ({
          ...item,
          stream: remoteCameraOn[item.userId] ? remoteStreams[item.userId]?.stream || null : null,
        })),
    [participants, remoteStreams, remoteCameraOn, myId]
  );

  const onlineCount = participants.filter((item) => item.online).length;

  if (loading) {
    return (
      <div className="study-room-loading">
        <div className="loading-spinner" />
        <strong>Loading study room...</strong>
        <span>Connecting chat, timer and video.</span>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="study-room-loading">
        <WifiOff size={30} />
        <strong>Unable to open this room</strong>
        <span>{roomError || "Room not found."}</span>
        <button className="room-secondary-button" onClick={() => setPage("my-rooms")}>
          Back to My Rooms
        </button>
      </div>
    );
  }

  const displayedSeconds = Math.min(
    elapsedNow,
    Number(session?.duration_seconds || MODE_SECONDS.focus)
  );

  return (
    <div className="study-room-page">
      <header className="study-room-header">
        <div className="room-header-left">
          <button
            className="room-icon-button"
            onClick={() => setPage("my-rooms")}
            title="Back to My Rooms"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="room-title-block">
            <h1>{room.name}</h1>
            <div className="room-code-row">
              Room code <strong>{room.room_code}</strong>
              <button className="copy-code-button" onClick={copyRoomCode} title="Copy room code">
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="room-header-right">
          <div className="room-online">
            <span className="online-dot" /> {onlineCount} online
          </div>
          {room.owner_id === myId && (
            <button className="leave-room-button" onClick={deleteRoom}>
              <X size={15} /> Delete
            </button>
          )}
          <button className="leave-room-button" onClick={leaveRoom}>
            <LogOut size={15} /> Leave
          </button>
        </div>
      </header>

      <main className="study-room-main">
        <section className="study-room-center">
          <div className="room-timer-card">
            <div className="timer-top">
              <div className="timer-mode">
                <Clock3 size={17} /> Shared Study Timer
              </div>
              <span className="timer-status">
                {session?.status === "running"
                  ? "Running"
                  : session?.status === "paused"
                    ? "Paused"
                    : "Ready"}
              </span>
            </div>
            <div className="room-timer-tabs">
              {Object.keys(MODE_SECONDS).map((mode) => (
                <button
                  key={mode}
                  className={session?.mode === mode ? "selected" : ""}
                  onClick={() => changeMode(mode)}
                >
                  {mode === "focus" ? "Focus" : mode === "short_break" ? "Short Break" : "Long Break"}
                </button>
              ))}
            </div>
            <div className="big-room-timer">{formatTime(displayedSeconds)}</div>
            <div className="timer-controls">
              {session?.status === "running" ? (
                <button className="timer-primary-button" onClick={pauseTimer}>
                  <Pause size={18} /> Pause
                </button>
              ) : (
                <button className="timer-primary-button" onClick={startTimer}>
                  <Play size={18} /> Start
                </button>
              )}
              <button className="timer-secondary-button" onClick={resetTimer}>
                <RotateCcw size={17} /> Reset
              </button>
            </div>
            <p className="shared-timer-text">Everyone in this room sees the same timer.</p>
          </div>

          <div className="room-camera-section">
            <div className="section-heading">
              <div>
                <h2>Study Cameras</h2>
                <p>Video only. Microphone is never requested.</p>
              </div>
              <button
                className={cameraOn ? "camera-button camera-on" : "camera-button"}
                onClick={toggleCamera}
                disabled={cameraBusy}
              >
                {cameraOn ? (
                  <>
                    <CameraOff size={17} /> Turn Off
                  </>
                ) : (
                  <>
                    <Camera size={17} /> {cameraBusy ? "Starting..." : "Turn On"}
                  </>
                )}
              </button>
            </div>

            <div
              className={`room-video-grid ${remoteEntries.length ? "has-remote" : "single-video"}`}
            >
              <div className="participant-video-card local-video-card">
                <div className="participant-video-label">
                  <span className={cameraOn ? "video-live-dot" : "video-off-dot"} /> You
                </div>
                {/* Always mounted so the picture appears the instant the stream starts. */}
                <video
                  ref={localVideoRef}
                  className="camera-video"
                  autoPlay
                  muted
                  playsInline
                  style={{ visibility: cameraOn ? "visible" : "hidden" }}
                />
                {!cameraOn && (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">
                      <Camera size={29} />
                    </div>
                    <strong>Camera is off</strong>
                    <span>Turn it on to share your video.</span>
                  </div>
                )}
              </div>

              {remoteEntries.map((entry) => (
                <RemoteVideoCard key={entry.userId} stream={entry.stream} name={entry.name} />
              ))}
            </div>

            {remoteEntries.length > 0 && remoteEntries.every((entry) => !entry.stream) && (
              <div className="room-video-waiting">
                <Users size={14} />
                <span>Others are here. Their video appears the moment they turn their camera on.</span>
              </div>
            )}

            <div className="room-video-helper">
              <span>{videoStatus}</span>
              <span>•</span>
              <span>{signalingStatus}</span>
            </div>
            {cameraError && <div className="camera-error">{cameraError}</div>}
          </div>

          {room.description && (
            <div className="room-description-card">
              <h2>About this room</h2>
              <p>{room.description}</p>
            </div>
          )}
        </section>

        <aside className="study-room-sidebar">
          <div className="room-panel">
            <div className="room-panel-title">
              <div>
                <h2>People</h2>
                <span>
                  {participants.length} member{participants.length === 1 ? "" : "s"} · {onlineCount}{" "}
                  online
                </span>
              </div>
              <Users size={18} />
            </div>
            <div className="members-list">
              {participants.map((item) => {
                const isYou = item.userId === myId;
                const connected = Boolean(remoteCameraOn[item.userId] && remoteStreams[item.userId]?.stream);
                return (
                  <div className="member-item" key={item.userId}>
                    <div className="member-avatar">{item.name.charAt(0).toUpperCase()}</div>
                    <div className="member-info">
                      <strong>
                        {item.name}
                        {isYou ? " (You)" : ""}
                      </strong>
                      <span>
                        <i
                          className={item.online ? "member-online-dot" : "member-offline-dot"}
                        />{" "}
                        {isYou
                          ? "You are here"
                          : connected
                            ? "Video connected"
                            : item.online
                              ? "In room"
                              : "Away"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="room-panel room-chat-panel">
            <div className="room-panel-title">
              <div>
                <h2>Room Chat</h2>
                <span>Text and photos</span>
              </div>
              <MessageCircle size={18} />
            </div>
            <div className="room-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <MessageCircle size={25} />
                  <p>No messages yet.</p>
                  <span>Say hello!</span>
                </div>
              ) : (
                messages.map((message) => {
                  const isMe = idOf(message.user_id) === myId;
                  const name = profileName(message.profiles, "Student");
                  return (
                    <div key={message.id} className={isMe ? "chat-message chat-message-me" : "chat-message"}>
                      {!isMe && <strong>{name}</strong>}
                      {message.message_type === "image" && message.image_url ? (
                        <a
                          className="chat-image-link"
                          href={message.image_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img src={message.image_url} alt="Shared" className="chat-image" />
                        </a>
                      ) : (
                        <div className="chat-bubble">{message.message}</div>
                      )}
                      <span className="chat-time">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={sendMessage}>
              <input
                ref={imageInputRef}
                className="chat-file-input"
                type="file"
                accept="image/*"
                onChange={uploadChatPhoto}
              />
              <button
                type="button"
                className="chat-attach-button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                title="Send photo"
              >
                <ImagePlus size={17} />
              </button>
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={uploadingImage ? "Uploading photo..." : "Message..."}
                maxLength={500}
                disabled={uploadingImage}
              />
              <button type="submit" disabled={!messageText.trim() || uploadingImage}>
                <Send size={17} />
              </button>
            </form>
          </div>
        </aside>
      </main>
    </div>
  );
}

function RemoteVideoCard({ stream, name }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.srcObject = stream || null;
    if (stream) video.play().catch(() => {});
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  return (
    <div
      className={`participant-video-card remote-video-card ${
        stream ? "remote-video-live" : "remote-video-off"
      }`}
    >
      <div className="participant-video-label">
        <span className={stream ? "video-live-dot" : "video-off-dot"} />
        {name}
      </div>

      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        style={{ visibility: stream ? "visible" : "hidden" }}
      />

      {!stream && (
        <div className="remote-camera-placeholder">
          <div className="remote-avatar">{String(name || "S").charAt(0).toUpperCase()}</div>
          <strong>{name}</strong>
          <span>Camera is off</span>
        </div>
      )}
    </div>
  );
}
