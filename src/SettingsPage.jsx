import React, { useEffect, useState } from "react";
import {
  Settings,
  UserRound,
  Palette,
  ImagePlus,
  Video,
  Volume2,
  Save,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "./supabase";
import "./SettingsPage.css";

const BG_KEY = "studytogether-solo-background";
const YT_KEY = "studytogether-youtube-url";
const MUSIC_KEY = "studytogether-youtube-music-url";

const presetBackgrounds = [
  ["Rainy Window", "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=2400&q=85"],
  ["Cozy Study", "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=2400&q=85"],
  ["Night City", "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2400&q=85"],
  ["Library", "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=2400&q=85"],
  ["Desk Setup", "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=2400&q=85"],
  ["Mountain Morning", "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2400&q=85"],
  ["Ocean", "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85"],
  ["Forest", "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85"],
];

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
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  return "";
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 1800;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage({ profile, theme, setTheme }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || profile?.username || "");
  const [savedName, setSavedName] = useState(false);
  const [background, setBackground] = useState(() => localStorage.getItem(BG_KEY) || presetBackgrounds[0][1]);
  const [youtubeUrl, setYoutubeUrl] = useState(() => localStorage.getItem(YT_KEY) || "");
  const [musicUrl, setMusicUrl] = useState(() => localStorage.getItem(MUSIC_KEY) || "");
  const [savedMedia, setSavedMedia] = useState(false);
  const [error, setError] = useState("");

  const youtubeId = getYouTubeId(youtubeUrl);
  const musicId = getYouTubeId(musicUrl);

  useEffect(() => {
    if (background) localStorage.setItem(BG_KEY, background);
  }, [background]);

  async function saveProfile() {
    const name = displayName.trim();
    if (!name || !profile?.id) return;
    setError("");
    setSavedName(false);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", profile.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1800);
  }

  async function uploadBackground(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      const dataUrl = await resizeImage(file);
      setBackground(dataUrl);
    } catch (e) {
      setError(e.message || "Could not load that image.");
    }
    event.target.value = "";
  }

  function saveMedia() {
    const videoId = getYouTubeId(youtubeUrl);
    const musicVideoId = getYouTubeId(musicUrl);
    if (youtubeUrl.trim() && !videoId) {
      setError("Enter a valid YouTube video link for the video player.");
      return;
    }
    if (musicUrl.trim() && !musicVideoId) {
      setError("Enter a valid YouTube link for music.");
      return;
    }
    localStorage.setItem(YT_KEY, youtubeUrl.trim());
    localStorage.setItem(MUSIC_KEY, musicUrl.trim());
    setSavedMedia(true);
    setError("");
    setTimeout(() => setSavedMedia(false), 1800);
  }

  function removeCustomBackground() {
    localStorage.removeItem(BG_KEY);
    setBackground(presetBackgrounds[0][1]);
  }

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <div className="settings-header">
          <div className="settings-heading-icon"><Settings size={25} /></div>
          <div>
            <div className="settings-eyebrow">ACCOUNT & PREFERENCES</div>
            <h1>Settings</h1>
            <p>Control your profile, appearance, study backgrounds, video and music.</p>
          </div>
        </div>

        {error && <div className="settings-error">{error}</div>}

        <section className="settings-section">
          <div className="settings-section-head">
            <UserRound size={19} />
            <div><h2>Profile</h2><p>Update the name shown around Ekatra.</p></div>
          </div>
          <div className="settings-form-row">
            <label>
              <span>Display name</span>
              <input value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <button className="settings-primary" onClick={saveProfile}><Save size={16} />{savedName ? "Saved" : "Save"}</button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <Palette size={19} />
            <div><h2>Appearance</h2><p>Choose how Ekatra looks.</p></div>
          </div>
          <div className="theme-choice-grid">
            <button className={theme === "dark" ? "theme-choice active" : "theme-choice"} onClick={() => setTheme("dark")}><span className="theme-preview dark-preview" /><strong>Dark</strong><small>Best for night study</small></button>
            <button className={theme === "light" ? "theme-choice active" : "theme-choice"} onClick={() => setTheme("light")}><span className="theme-preview light-preview" /><strong>Light</strong><small>Bright and clean</small></button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <ImagePlus size={19} />
            <div><h2>Solo Study Backgrounds</h2><p>Choose from presets or upload your own photo. Only image files are accepted.</p></div>
          </div>

          <div className="background-grid">
            {presetBackgrounds.map(([name, url]) => (
              <button key={name} className={background === url ? "background-card active" : "background-card"} onClick={() => setBackground(url)}>
                <img src={url} alt="" />
                <span>{name}</span>
              </button>
            ))}
          </div>

          <div className="upload-row">
            <label className="upload-button">
              <ImagePlus size={17} /> Upload photo
              <input type="file" accept="image/*" onChange={uploadBackground} hidden />
            </label>
            <button className="settings-secondary" onClick={removeCustomBackground}><Trash2 size={16} /> Reset background</button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <Video size={19} />
            <div><h2>YouTube Study Video</h2><p>Paste a YouTube link and play it in Solo Study using the official embedded player.</p></div>
          </div>
          <div className="youtube-input-row">
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            {youtubeId && <a href={`https://www.youtube.com/watch?v=${youtubeId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}
          </div>
          {youtubeId && <div className="youtube-preview"><iframe title="Study video preview" src={`https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <Volume2 size={19} />
            <div><h2>YouTube Music</h2><p>Paste any embeddable YouTube music/video link. It will play inside the Solo Study media player.</p></div>
          </div>
          <div className="youtube-input-row">
            <input value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="Paste a YouTube music link..." />
            {musicId && <a href={`https://www.youtube.com/watch?v=${musicId}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /></a>}
          </div>
          <div className="built-in-music-list">
            {[
              ["Rain", "Soft rain for focus"],
              ["Brown Noise", "Deep low-frequency focus"],
              ["Ocean", "Gentle wave ambience"],
              ["Forest", "Nature ambience"],
              ["Cafe", "Quiet cafe ambience"],
              ["Fireplace", "Warm room ambience"],
            ].map(([name, desc]) => <div key={name} className="built-in-music"><Volume2 size={15} /><div><strong>{name}</strong><span>{desc}</span></div></div>)}
          </div>
          <button className="settings-primary save-media" onClick={saveMedia}><Save size={16} />{savedMedia ? "Saved" : "Save media settings"}</button>
        </section>
      </div>
    </div>
  );
}
