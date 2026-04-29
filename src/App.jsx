import React, { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://uuzrjxewcpbdsdfojrks.supabase.co";
const SUPABASE_KEY = "sb_publishable_nj9oivkF2-UCPNFmJS3A8w_g3_frYxQ";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

async function apiGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST", headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function apiUpsert(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: { ...headers, "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify(body),
  });
}
async function apiPatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...headers, "Prefer": "return=minimal" },
    body: JSON.stringify(body),
  });
}

const COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#C77DFF","#FF9F43","#48DBFB","#FF9FF3"];
const REACTIONS = ["😍","😭","😂","😱"];
function getColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem("playback_history") || "[]"); } catch { return []; }
}
function saveToHistory(code, title) {
  const history = loadHistory().filter(r => r.code !== code);
  history.unshift({ code, title, visitedAt: Date.now() });
  localStorage.setItem("playback_history", JSON.stringify(history.slice(0, 10)));
}
function removeFromHistory(code) {
  const history = loadHistory().filter(r => r.code !== code);
  localStorage.setItem("playback_history", JSON.stringify(history));
}

const T = {
  paper:     "#f6e8d8",
  paperDeep: "#ecd9c2",
  ink:       "#2a1a2e",
  ink2:      "#4a2f4f",
  muted:     "#8e6f86",
  rule:      "rgba(42,26,46,0.18)",
  magenta:   "#e0306b",
  cyan:      "#2aa5b8",
  yellow:    "#f2b950",
  green:     "#a8c66f",
};

export default function App() {
  const [screen, setScreen] = useState("home");
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [roomTitleInput, setRoomTitleInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(loadHistory());
  const [roomDuration, setRoomDuration] = useState(5400);
  const [homeTab, setHomeTab] = useState("unirse");

  const DURATIONS = [
    { label: "30 min", value: 1800 },
    { label: "1 h",    value: 3600 },
    { label: "1.5 h",  value: 5400 },
    { label: "2 h",    value: 7200 },
  ];

  const enterRoom = (code, title, name, duration) => {
    saveToHistory(code, title);
    setHistory(loadHistory());
    localStorage.setItem("playback_current_room", code);
    localStorage.setItem("playback_current_user", name);
    setUserName(name); setRoomCode(code); setRoomTitle(title); setRoomDuration(duration);
    setScreen("watch");
  };

  const handleCreate = async () => {
    if (!userNameInput.trim() || !roomTitleInput.trim()) { setError("Rellena nombre y título"); return; }
    setLoading(true);
    const code = Math.random().toString(36).slice(2,7).toUpperCase();
    await apiPost("rooms", { id: code, title: roomTitleInput.trim(), duration: roomDuration });
    setLoading(false);
    enterRoom(code, roomTitleInput.trim(), userNameInput.trim(), roomDuration);
  };

  const handleJoin = async () => {
    if (!userNameInput.trim() || !roomCodeInput.trim()) { setError("Rellena nombre y código"); return; }
    setLoading(true);
    const code = roomCodeInput.trim().toUpperCase();
    const rooms = await apiGet(`rooms?id=eq.${code}`);
    if (!rooms || rooms.length === 0) { setError("Sala no encontrada"); setLoading(false); return; }
    setLoading(false);
    enterRoom(code, rooms[0].title, userNameInput.trim(), rooms[0].duration || 5400);
  };

  const handleRejoin = async (item) => {
    if (!userNameInput.trim()) { setError("Escribe tu nombre primero"); return; }
    setLoading(true);
    const rooms = await apiGet(`rooms?id=eq.${item.code}`);
    if (!rooms || rooms.length === 0) { setError("Sala no encontrada"); setLoading(false); return; }
    setLoading(false);
    enterRoom(item.code, item.title, userNameInput.trim(), rooms[0].duration || 5400);
  };

  const handleDeleteHistory = (code, e) => {
    e.stopPropagation();
    removeFromHistory(code);
    setHistory(loadHistory());
  };

  if (screen === "watch") return (
    <WatchScreen userName={userName} roomCode={roomCode} roomTitle={roomTitle} maxTime={roomDuration} onExit={() => setScreen("home")} />
  );

  return (
    <div style={{minHeight:"100vh", background:T.paper, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Familjen Grotesk', system-ui, sans-serif", padding:"20px"}}>
      <div style={{width:"100%", maxWidth:"440px"}}>

        {/* Logo */}
        <div style={{textAlign:"center", marginBottom:"40px"}}>
          <div style={{fontFamily:"'VT323', monospace", fontSize:"14px", letterSpacing:"0.32em", color:T.muted, textTransform:"lowercase", marginBottom:"4px"}}>
            watch together
          </div>
          <div className="vhsx-glitch" style={{fontFamily:"'Bungee', sans-serif", fontSize:"48px", lineHeight:1, color:T.ink, letterSpacing:"-0.01em"}}>
            play<span style={{color:T.magenta}}>back</span>
          </div>
          <div style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted, marginTop:"6px", letterSpacing:"0.18em"}}>
            comentarios sincrónicos · sin spoilers
          </div>
        </div>

        {/* Nombre */}
        <div style={{marginBottom:"16px"}}>
          <div style={labelStyle}>tu nombre</div>
          <input style={inputStyle} placeholder="¿cómo te llamas?" value={userNameInput}
            onChange={e => { setUserNameInput(e.target.value); setError(""); }} />
        </div>

        {/* Tabs Unirse / Crear sala */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", border:`2px solid ${T.ink}`, boxShadow:`3px 3px 0 ${T.ink}`, marginBottom:"16px"}}>
          {[["unirse","UNIRSE"],["crear","CREAR SALA"]].map(([key, label], i) => (
            <button key={key} onClick={() => setHomeTab(key)} style={{
              padding:"11px 0",
              background: homeTab === key ? T.yellow : T.paper,
              color: T.ink,
              border: "none",
              borderRight: i === 0 ? `2px solid ${T.ink}` : "none",
              fontFamily:"'Bungee', sans-serif",
              fontSize:"16px",
              letterSpacing:"0.04em",
              textTransform:"uppercase",
              cursor:"pointer",
            }}>{label}</button>
          ))}
        </div>

        {homeTab === "unirse" && (
          <div>
            <div style={labelStyle}>código de sala</div>
            <input style={{...inputStyle, fontFamily:"'VT323', monospace", fontSize:"22px", textAlign:"center", letterSpacing:"0.42em", textTransform:"uppercase", marginBottom:"14px"}}
              placeholder="X X X X X" value={roomCodeInput}
              onChange={e => { setRoomCodeInput(e.target.value.toUpperCase()); setError(""); }} maxLength={5} />
            <button style={{...btnStyle, background:T.yellow, color:T.ink}} onClick={handleJoin} disabled={loading}>
              {loading ? "buscando…" : "conectar →"}
            </button>
          </div>
        )}

        {homeTab === "crear" && (
          <div>
            <div style={labelStyle}>título de la serie</div>
            <input style={{...inputStyle, marginBottom:"4px"}} placeholder="Ej: Breaking Bad"
              value={roomTitleInput} onChange={e => { setRoomTitleInput(e.target.value); setError(""); }} />
            <div style={labelStyle}>duración</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"6px", marginBottom:"14px"}}>
              {DURATIONS.map((d, i) => (
                <button key={d.value} onClick={() => setRoomDuration(d.value)} style={{
                  padding:"9px 0",
                  background: roomDuration === d.value ? T.yellow : T.paper,
                  color: T.ink,
                  border: `2px solid ${T.ink}`,
                  boxShadow: roomDuration === d.value ? `2px 2px 0 ${T.ink}` : "none",
                  fontFamily:"'Familjen Grotesk', system-ui, sans-serif",
                  fontSize:"13px", fontWeight:600,
                  cursor:"pointer", borderRadius:0,
                }}>{d.label}</button>
              ))}
            </div>
            <button style={{...btnStyle, background:T.green, color:T.ink, fontFamily:"'Familjen Grotesk', system-ui, sans-serif", fontWeight:700, letterSpacing:"0.01em"}} onClick={handleCreate} disabled={loading}>
              {loading ? "creando…" : "Crear sala →"}
            </button>
          </div>
        )}

        {error && <div style={{marginTop:"12px", color:T.magenta, fontFamily:"'VT323', monospace", fontSize:"14px", textAlign:"center", letterSpacing:"0.1em"}}>{error}</div>}

        {history.length > 0 && (
          <div style={{marginTop:"32px"}}>
            <div style={{fontFamily:"'VT323', monospace", fontSize:"13px", letterSpacing:"0.18em", color:T.ink2, textTransform:"lowercase", marginBottom:"10px"}}>salas recientes</div>
            <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
              {history.map(item => (
                <div key={item.code} onClick={() => handleRejoin(item)}
                  style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:T.paperDeep, border:`2px solid ${T.ink}`, padding:"10px 14px", cursor:"pointer", boxShadow:`2px 2px 0 ${T.ink}`}}
                  onMouseEnter={e => { e.currentTarget.style.background = T.paper; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.paperDeep; }}>
                  <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                    <div style={{width:"8px", height:"8px", background:T.magenta, flexShrink:0}}></div>
                    <div>
                      <div style={{fontSize:"14px", color:T.ink, fontWeight:600}}>{item.title}</div>
                      <div style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted, letterSpacing:"0.1em", marginTop:"1px"}}>{item.code}</div>
                    </div>
                  </div>
                  <button onClick={e => handleDeleteHistory(item.code, e)}
                    style={{background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:"16px", padding:"4px", lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{marginTop:"24px", paddingTop:"16px", borderTop:`1.5px dashed ${T.rule}`, fontFamily:"'Familjen Grotesk', system-ui, sans-serif", fontSize:"12px", color:T.ink2, textAlign:"center", lineHeight:"1.8"}}>
          crea una sala · comparte el código · poneos el play · <span style={{color:T.magenta, fontWeight:600}}>los comentarios aparecen solos</span>
        </div>
      </div>

      <style>{globalStyles}</style>
    </div>
  );
}

function shareComment(c, title, code) {
  const text = `🎬 ${title} · ${formatTime(c.timestamp)}\n"${c.text}"\n— ${c.user_name}\n\n💬 playbackparty.netlify.app · sala ${code}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareCode(code, title, commentCount) {
  const text = `🎬 Playback · ${title}\n💬 ${commentCount} comentarios\nÚnete a la sala con el código: *${code}*`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareTimeline(code, title, comments) {
  const lines = [`🎬 *Playback · ${title}* (sala ${code})`, `💬 ${comments.length} comentarios`, ""];
  const parts = [...new Set(comments.map(c => c.part || 1))].sort((a, b) => a - b);
  const multi = parts.length > 1;
  parts.forEach(part => {
    if (multi) lines.push(`── Parte ${part} ──`);
    comments.filter(c => (c.part || 1) === part).forEach(c =>
      lines.push(`${formatTime(c.timestamp)}  ${c.user_name}: ${c.text}`)
    );
    if (multi) lines.push("");
  });
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

function WatchScreen({ userName, roomCode, roomTitle, maxTime, onExit }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [seenIds, setSeenIds] = useState(new Set());
  const [newVisible, setNewVisible] = useState([]);
  const [tab, setTab] = useState("watch");
  const [presence, setPresence] = useState([]);
  const intervalRef = useRef(null);
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const [currentPart, setCurrentPart] = useState(1);
  const currentPartRef = useRef(1);
  const TIMER_KEY = `playback_timer_${roomCode}`;

  const fetchComments = useCallback(async () => {
    const data = await apiGet(`comments?room_id=eq.${roomCode}&order=part.asc,timestamp.asc`);
    if (Array.isArray(data)) setComments(data);
  }, [roomCode]);

  useEffect(() => {
    fetchComments();
    const poll = setInterval(fetchComments, 3000);
    return () => clearInterval(poll);
  }, [fetchComments]);

  const fetchRoom = useCallback(async () => {
    const data = await apiGet(`rooms?id=eq.${roomCode}&select=current_part`);
    if (Array.isArray(data) && data[0]) {
      const newPart = data[0].current_part || 1;
      if (newPart !== currentPartRef.current) {
        currentPartRef.current = newPart;
        setCurrentPart(newPart);
        localStorage.removeItem(TIMER_KEY);
        setTime(0);
        setPlaying(false);
      }
    }
  }, [roomCode]);

  useEffect(() => {
    fetchRoom();
    const poll = setInterval(fetchRoom, 3000);
    return () => clearInterval(poll);
  }, [fetchRoom]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
    if (saved) {
      const elapsed = (Date.now() - saved.startedAt) / 1000;
      const current = Math.min(saved.baseTime + elapsed, maxTime);
      setTime(current);
      setPlaying(true);
    }
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
        if (!saved) return;
        const elapsed = (Date.now() - saved.startedAt) / 1000;
        const current = Math.min(saved.baseTime + elapsed, maxTime);
        setTime(current);
        if (current >= maxTime) { localStorage.removeItem(TIMER_KEY); setPlaying(false); }
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
      if (saved) {
        const elapsed = (Date.now() - saved.startedAt) / 1000;
        setTime(Math.min(saved.baseTime + elapsed, maxTime));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const sync = async () => {
      await apiUpsert("presence", {
        room_id: roomCode,
        user_name: userName,
        color: getColor(userName),
        time: Math.floor(timeRef.current),
        playing: playingRef.current,
        updated_at: new Date().toISOString(),
      });
      const data = await apiGet(`presence?room_id=eq.${roomCode}`);
      if (Array.isArray(data)) setPresence(data.filter(p => p.user_name !== userName));
    };
    sync();
    const poll = setInterval(sync, 5000);
    return () => clearInterval(poll);
  }, [roomCode, userName]);

  const handlePlayPause = () => {
    if (playing) {
      localStorage.removeItem(TIMER_KEY);
      setPlaying(false);
    } else {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ startedAt: Date.now(), baseTime: time }));
      setPlaying(true);
    }
  };

  const seek = (newTime) => {
    const t = Math.max(0, Math.min(newTime, maxTime));
    setTime(t);
    if (playing) {
      localStorage.setItem(TIMER_KEY, JSON.stringify({ startedAt: Date.now(), baseTime: t }));
    }
  };

  const changePart = async (newPart) => {
    if (newPart < 1) return;
    await apiPatch(`rooms?id=eq.${roomCode}`, { current_part: newPart });
    currentPartRef.current = newPart;
    setCurrentPart(newPart);
    localStorage.removeItem(TIMER_KEY);
    setTime(0);
    setPlaying(false);
  };

  useEffect(() => {
    const visible = comments.filter(c => (c.part || 1) === currentPart && c.timestamp <= time);
    const newOnes = visible.filter(c => !seenIds.has(c.id));
    if (newOnes.length > 0) {
      setSeenIds(prev => new Set([...prev, ...newOnes.map(c => c.id)]));
      setNewVisible(newOnes.map(c => c.id));
      setTimeout(() => setNewVisible([]), 2000);
      setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, 50);
    }
  }, [comments, time, currentPart]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now().toString(), room_id: roomCode,
      user_name: userName, text: newComment.trim(),
      timestamp: time, color: getColor(userName), part: currentPart,
    };
    setNewComment("");
    await apiPost("comments", comment);
    await fetchComments();
    inputRef.current?.focus();
  };

  const MAX_TIME = maxTime;
  const visibleComments = comments.filter(c => (c.part || 1) === currentPart && c.timestamp <= time);
  const commentParts = [...new Set(comments.map(c => c.part || 1))].sort((a, b) => a - b);
  const multiPart = commentParts.length > 1 || currentPart > 1;

  const postReaction = async (emoji) => {
    const comment = {
      id: Date.now().toString(), room_id: roomCode,
      user_name: userName, text: emoji,
      timestamp: time, color: getColor(userName), part: currentPart,
    };
    await apiPost("comments", comment);
    await fetchComments();
  };

  const timeDisplay = formatTime(time);
  const [mm, ss] = timeDisplay.split(":");

  return (
    <div style={{minHeight:"100vh", background:T.paper, fontFamily:"'Familjen Grotesk', system-ui, sans-serif", display:"flex", flexDirection:"column", maxWidth:"600px", margin:"0 auto"}}>

      {/* Header */}
      <div style={{padding:"10px 14px", borderBottom:`2px solid ${T.ink}`, background:T.paperDeep, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'VT323', monospace", fontSize:"14px", letterSpacing:"0.18em", color:T.ink, display:"flex", alignItems:"center", gap:"8px", textTransform:"uppercase"}}>
            SALA <span style={{color:T.magenta, fontWeight:"bold"}}>{roomCode}</span>
            {multiPart && <span style={{color:T.muted}}>· P{currentPart}</span>}
            <span style={{fontSize:"16px"}}>📼</span>
            <button onClick={() => shareCode(roomCode, roomTitle, comments.length)} style={{background:"none", border:"none", padding:0, cursor:"pointer", fontSize:"14px", lineHeight:1}} title="Compartir por WhatsApp">📲</button>
          </div>
          <div style={{fontFamily:"'Bungee', sans-serif", fontSize:"20px", color:T.ink, marginTop:"2px", letterSpacing:"-0.005em", lineHeight:1.05}}>
            {roomTitle}
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <span style={{display:"inline-flex", alignItems:"center", gap:"6px", background:T.paper, border:`1.5px solid ${T.ink}`, padding:"2px 8px", fontFamily:"'Familjen Grotesk', system-ui, sans-serif", fontSize:"12px", fontWeight:600}}>
            <span style={{width:"8px", height:"8px", borderRadius:"50%", background:T.magenta, display:"inline-block"}}/>
            {userName}
          </span>
          <button onClick={onExit} style={{padding:"4px 10px", background:T.paper, color:T.ink, border:`1.5px solid ${T.ink}`, fontFamily:"'VT323', monospace", fontSize:"13px", letterSpacing:"0.1em", cursor:"pointer", textTransform:"uppercase"}}>SALIR</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:`2px solid ${T.ink}`}}>
        {[["watch","▶ VER"],["timeline","📃 LÍNEA DE TIEMPO"]].map(([t, label], i) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:"12px 0",
            background: tab === t ? T.paper : T.paperDeep,
            color: tab === t ? T.ink : T.muted,
            border: "none",
            borderRight: i === 0 ? `2px solid ${T.ink}` : "none",
            borderBottom: tab === t ? `3px solid ${T.yellow}` : "none",
            fontFamily:"'VT323', monospace",
            fontSize:"14px",
            letterSpacing:"0.22em",
            cursor:"pointer",
            textTransform:"uppercase",
            position:"relative",
            top: tab === t ? 1 : 0,
          }}>{label}</button>
        ))}
      </div>

      {tab === "watch" && (
        <>
          <div style={{padding:"18px 16px 12px", borderBottom:`2px solid ${T.ink}`, background:T.paper}}>

            {/* Timer */}
            <div style={{textAlign:"center", marginBottom:"8px"}}>
              <div className="vhsx-glitch" style={{fontFamily:"'VT323', monospace", fontSize:"64px", lineHeight:0.95, color:T.ink, letterSpacing:"0.08em"}}>
                {mm}<span style={{color:T.magenta}}>:</span>{ss}
              </div>
              <div style={{fontFamily:"'VT323', monospace", fontSize:"14px", color:T.muted, letterSpacing:"0.18em", marginTop:"4px"}}>
                {playing
                  ? <span>▶ reproduciendo</span>
                  : <span className="vhsx-blink">‖ pausado</span>}
              </div>
            </div>

            {/* Presencia */}
            {presence.length > 0 && (
              <div style={{display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"10px", justifyContent:"center"}}>
                {presence.map(p => (
                  <div key={p.user_name} style={{display:"flex", alignItems:"center", gap:"5px", background:T.paperDeep, border:`1.5px solid ${T.ink}`, padding:"2px 8px 2px 4px"}}>
                    <div style={{width:"18px", height:"18px", borderRadius:"50%", background:T.cyan, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"700", color:T.ink, border:`1.5px solid ${T.ink}`}}>
                      {p.user_name[0].toUpperCase()}
                    </div>
                    <span style={{fontSize:"12px", color:T.ink, fontWeight:600}}>{p.user_name}</span>
                    <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted, letterSpacing:"0.08em"}}>{formatTime(p.time)}</span>
                    {p.playing && <span style={{fontSize:"10px", color:T.green}}>▶</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Scrubber */}
            <div style={{position:"relative", marginBottom:"8px"}}>
              <div style={{position:"relative", height:"14px", background:T.paperDeep, border:`2px solid ${T.ink}`, boxShadow:`2px 2px 0 ${T.ink}`, overflow:"visible"}}>
                {/* fill */}
                <div style={{position:"absolute", top:0, left:0, height:"100%", width:`${Math.min((time/MAX_TIME)*100,100)}%`, background:`repeating-linear-gradient(45deg, ${T.yellow} 0 6px, ${T.ink} 6px 8px)`, borderRight:`2px solid ${T.ink}`}}/>
                {/* comment markers */}
                {comments.filter(c => (c.part||1) === currentPart).map(c => (
                  <div key={c.id} style={{position:"absolute", top:-3, height:"20px", width:"2px", left:`${Math.min((c.timestamp/MAX_TIME)*100,100)}%`, background:T.cyan, zIndex:2}} title={`${formatTime(c.timestamp)} · ${c.user_name}`}/>
                ))}
                {/* presence markers */}
                {presence.map(p => (
                  <div key={p.user_name} style={{position:"absolute", top:-4, left:`${Math.min((p.time/MAX_TIME)*100,100)}%`, transform:"translateX(-50%)", zIndex:3, transition:"left 1s linear"}}>
                    <div style={{width:"16px", height:"16px", borderRadius:"50%", background:T.cyan, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px", fontWeight:"700", color:T.ink, border:`1.5px solid ${T.ink}`}}>
                      {p.user_name[0].toUpperCase()}
                    </div>
                  </div>
                ))}
                {/* scrubber thumb */}
                <div style={{position:"absolute", top:"-6px", left:`${Math.min((time/MAX_TIME)*100,100)}%`, transform:"translateX(-50%)", width:"14px", height:"26px", background:T.magenta, border:`2px solid ${T.ink}`, zIndex:4}}/>
              </div>
              <input type="range" min={0} max={MAX_TIME} step={1} value={Math.floor(time)}
                onChange={e => { localStorage.removeItem(TIMER_KEY); setPlaying(false); setTime(Number(e.target.value)); }}
                style={{position:"absolute", top:0, left:0, width:"100%", height:"14px", opacity:0, cursor:"pointer", zIndex:5, margin:0}} />
            </div>

            {/* Controls */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1.2fr 1fr", gap:"8px", marginBottom:"8px"}}>
              <button onClick={() => seek(time - 10)} style={ctrlBtn}>−10s</button>
              <button onClick={handlePlayPause} style={{...ctrlBtn, background:playing ? T.magenta : T.green, color:T.ink}}>
                <span style={{marginRight:"6px"}}>{playing ? "⏸" : "▶"}</span>{playing ? "PAUSA" : "PLAY"}
              </button>
              <button onClick={() => seek(time + 10)} style={ctrlBtn}>+10s</button>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"8px", alignItems:"center"}}>
              <button onClick={() => changePart(currentPart - 1)} disabled={currentPart <= 1}
                style={{...ctrlBtn, opacity:currentPart<=1 ? 0.45 : 1, fontSize:"12px", padding:"8px 0", boxShadow:currentPart<=1?"none":`3px 3px 0 ${T.ink}`}}>
                ← P{currentPart - 1}
              </button>
              <span style={{fontFamily:"'VT323', monospace", fontSize:"14px", letterSpacing:"0.18em", color:T.ink, textTransform:"uppercase"}}>PARTE {currentPart}</span>
              <button onClick={() => changePart(currentPart + 1)}
                style={{...ctrlBtn, fontSize:"12px", padding:"8px 0"}}>
                P{currentPart + 1} →
              </button>
            </div>
          </div>

          {/* Comments feed */}
          <div ref={feedRef} style={{flex:1, overflowY:"auto", padding:"10px 14px", display:"flex", flexDirection:"column", gap:"8px", minHeight:"160px", maxHeight:"280px"}}>
            {visibleComments.length === 0 && (
              <div style={{color:T.muted, fontFamily:"'VT323', monospace", fontSize:"14px", textAlign:"center", marginTop:"40px", letterSpacing:"0.1em"}}>
                los comentarios aparecerán cuando llegues a su momento…
              </div>
            )}
            {visibleComments.map(c => {
              const isReaction = REACTIONS.includes(c.text);
              return isReaction ? (
                <div key={c.id} style={{display:"flex", alignItems:"center", gap:"8px", animation:newVisible.includes(c.id)?"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)":"none"}}>
                  <span style={{fontSize:"20px"}}>{c.text}</span>
                  <span style={{fontSize:"12px", color:T.cyan, fontWeight:700}}>{c.user_name}</span>
                  <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted}}>{formatTime(c.timestamp)}</span>
                </div>
              ) : (
                <div key={c.id} style={{animation:newVisible.includes(c.id)?"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)":"none"}}>
                  <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px"}}>
                    <span style={{width:"22px", height:"22px", borderRadius:"50%", background:T.cyan, color:T.ink, display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bungee', sans-serif", fontSize:"11px", border:`1.5px solid ${T.ink}`, flexShrink:0}}>
                      {c.user_name[0].toUpperCase()}
                    </span>
                    <span style={{fontSize:"13px", fontWeight:700, color:T.cyan}}>{c.user_name}</span>
                    <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted}}>{formatTime(c.timestamp)}</span>
                  </div>
                  <div style={{fontSize:"14px", color:T.ink, lineHeight:"1.35", paddingLeft:"30px"}}>{c.text}</div>
                </div>
              );
            })}
          </div>

          {/* Emoji bar + comment input */}
          <div style={{borderTop:`2px solid ${T.ink}`, background:T.paperDeep}}>
            <div style={{padding:"10px 12px 0", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px"}}>
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => postReaction(emoji)}
                  style={{padding:"8px 0", background:T.paper, border:`2px solid ${T.ink}`, boxShadow:`2px 2px 0 ${T.ink}`, fontSize:"20px", cursor:"pointer", borderRadius:0}}>
                  {emoji}
                </button>
              ))}
            </div>
            <div style={{padding:"10px 12px", display:"flex", gap:"8px", alignItems:"center"}}>
              <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted, letterSpacing:"0.08em", whiteSpace:"nowrap"}}>{formatTime(time)}</span>
              <input ref={inputRef} style={{...inputStyle, flex:1, margin:0, padding:"8px 12px", fontSize:"14px", boxShadow:`2px 2px 0 ${T.ink}`}}
                placeholder="comenta en este momento…"
                value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && postComment()} />
              <button onClick={postComment} style={{...ctrlBtn, padding:"8px 14px", flexShrink:0, fontSize:"18px"}}>→</button>
            </div>
          </div>
        </>
      )}

      {tab === "timeline" && (
        <div style={{flex:1, overflowY:"auto"}}>
          {/* Meta row */}
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:`2px solid ${T.ink}`, background:T.paper}}>
            <div style={{fontFamily:"'VT323', monospace", fontSize:"13px", letterSpacing:"0.16em", color:T.ink2, textTransform:"uppercase"}}>
              TODOS LOS COMENTARIOS · <span style={{color:T.ink, fontWeight:"bold"}}>{comments.length} EN TOTAL</span>
            </div>
            <button onClick={() => shareTimeline(roomCode, roomTitle, comments)}
              style={{display:"inline-flex", alignItems:"center", gap:"6px", padding:"5px 11px", background:T.cyan, color:T.ink, border:`2px solid ${T.ink}`, boxShadow:`2px 2px 0 ${T.ink}`, fontFamily:"'Familjen Grotesk', system-ui, sans-serif", fontSize:"12px", fontWeight:600, cursor:"pointer", borderRadius:0}}>
              📋 compartir
            </button>
          </div>

          {comments.length === 0 ? (
            <div style={{color:T.muted, fontFamily:"'VT323', monospace", fontSize:"14px", textAlign:"center", marginTop:"60px", letterSpacing:"0.1em"}}>
              aún no hay comentarios en esta sala
            </div>
          ) : (
            <div style={{position:"relative", padding:"14px 14px 14px 28px"}}>
              {/* vertical dashed rule */}
              <div style={{position:"absolute", top:14, bottom:14, left:18, width:2, background:`repeating-linear-gradient(to bottom, ${T.ink} 0 6px, transparent 6px 10px)`}}/>

              {commentParts.map(part => {
                const pc = comments.filter(c => (c.part || 1) === part);
                return (
                  <div key={part}>
                    {multiPart && (
                      <div style={{display:"flex", alignItems:"center", gap:"10px", margin:"8px 0 12px", paddingLeft:"18px"}}>
                        <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", letterSpacing:"0.22em", color:T.yellow, textTransform:"uppercase"}}>── PARTE {part} ──</span>
                      </div>
                    )}
                    {pc.map((c) => {
                      const isReaction = REACTIONS.includes(c.text);
                      return (
                        <div key={c.id} style={{position:"relative", paddingLeft:"18px", marginBottom:"14px"}}>
                          {/* diamond marker */}
                          <div style={{position:"absolute", left:"-18px", top:"4px", width:"14px", height:"14px", background:T.magenta, border:`2px solid ${T.ink}`, transform:"rotate(45deg)"}}/>
                          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"2px"}}>
                            <span style={{fontSize:"13px", fontWeight:700, color:T.cyan}}>{c.user_name}</span>
                            <span style={{fontFamily:"'VT323', monospace", fontSize:"13px", color:T.muted}}>{formatTime(c.timestamp)}</span>
                            <button onClick={() => shareComment(c, roomTitle, roomCode)} style={{background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:"13px", padding:"0 2px", lineHeight:1}} title="Compartir por WhatsApp">↗</button>
                          </div>
                          {isReaction
                            ? <span style={{fontSize:"20px"}}>{c.text}</span>
                            : <div style={{fontSize:"14px", color:T.ink, lineHeight:"1.35"}}>{c.text}</div>
                          }
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{globalStyles}</style>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontFamily: "'VT323', monospace",
  fontSize: "13px",
  letterSpacing: "0.18em",
  color: T.ink2,
  textTransform: "lowercase",
  marginBottom: "6px",
  marginTop: "14px",
};
const inputStyle = {
  width: "100%",
  background: T.paperDeep,
  border: `2px solid ${T.ink}`,
  padding: "12px 14px",
  color: T.ink,
  fontSize: "15px",
  fontFamily: "'Familjen Grotesk', system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: `3px 3px 0 ${T.ink}`,
  borderRadius: 0,
};
const btnStyle = {
  width: "100%",
  border: `2px solid ${T.ink}`,
  padding: "14px 16px",
  fontSize: "18px",
  fontFamily: "'Bungee', sans-serif",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  boxShadow: `3px 3px 0 ${T.ink}`,
  borderRadius: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};
const ctrlBtn = {
  background: T.paper,
  color: T.ink,
  border: `2px solid ${T.ink}`,
  padding: "10px 0",
  fontSize: "14px",
  letterSpacing: "0.04em",
  cursor: "pointer",
  fontFamily: "'Bungee', sans-serif",
  textTransform: "uppercase",
  boxShadow: `3px 3px 0 ${T.ink}`,
  borderRadius: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const globalStyles = `
  .vhsx-glitch {
    text-shadow:
      1.5px 0 0 rgba(224,48,107,0.85),
      -1.5px 0 0 rgba(42,165,184,0.85);
  }
  .vhsx-blink::after {
    content: '▍'; margin-left: 2px;
    animation: vhsxblink 1s steps(2) infinite;
    color: #e0306b;
  }
  @keyframes vhsxblink { 50% { opacity: 0; } }
  @keyframes popIn {
    from { opacity:0; transform: translateY(6px) scale(0.97); }
    to { opacity:1; transform: translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .vhsx-glitch { text-shadow: none; }
    .vhsx-blink::after { animation: none; }
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #ecd9c2; }
  ::-webkit-scrollbar-thumb { background: #8e6f86; }
  input::placeholder { color: #8e6f86; }
`;
