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

const COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#C77DFF","#FF9F43","#48DBFB","#FF9FF3"];
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

function getHotSegments(comments, maxTime) {
  const WINDOW = 5 * 60;
  const segments = [];
  for (let t = 0; t < maxTime; t += WINDOW) {
    const inWindow = comments.filter(c => c.timestamp >= t && c.timestamp < t + WINDOW);
    if (inWindow.length >= 2) segments.push({ start: t, end: Math.min(t + WINDOW, maxTime), count: inWindow.length });
  }
  return segments;
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

  const DURATIONS = [
    { label: "1 h",    value: 3600 },
    { label: "1 h 30", value: 5400 },
    { label: "2 h",    value: 7200 },
  ];

  const enterRoom = (code, title, name, duration) => {
    saveToHistory(code, title);
    setHistory(loadHistory());
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
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Courier New', monospace",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"420px"}}>
        <div style={{textAlign:"center",marginBottom:"48px"}}>
          <div style={{fontSize:"13px",letterSpacing:"6px",color:"#555",textTransform:"uppercase",marginBottom:"8px"}}>watch together</div>
          <div style={{fontSize:"42px",fontWeight:"900",color:"#fff",letterSpacing:"-2px",lineHeight:1}}>
            play<span style={{color:"#FFD93D"}}>back</span>
          </div>
          <div style={{fontSize:"12px",color:"#444",marginTop:"8px",letterSpacing:"2px"}}>comentarios sincrónicos · sin spoilers</div>
        </div>

        <div style={{marginBottom:"24px"}}>
          <label style={labelStyle}>tu nombre</label>
          <input style={inputStyle} placeholder="¿Cómo te llamas?" value={userNameInput}
            onChange={e => { setUserNameInput(e.target.value); setError(""); }} />
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div style={cardStyle}>
            <div style={{fontSize:"11px",letterSpacing:"3px",color:"#FFD93D",marginBottom:"12px"}}>CREAR SALA</div>
            <input style={{...inputStyle,marginBottom:"12px"}} placeholder="Título de la serie"
              value={roomTitleInput} onChange={e => { setRoomTitleInput(e.target.value); setError(""); }} />
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"12px"}}>
              {DURATIONS.map(d => (
                <button key={d.value} onClick={() => setRoomDuration(d.value)} style={{
                  background: roomDuration === d.value ? "#FFD93D" : "#1a1a1a",
                  color: roomDuration === d.value ? "#000" : "#555",
                  border: "1px solid " + (roomDuration === d.value ? "#FFD93D" : "#2a2a2a"),
                  borderRadius:"4px", padding:"4px 7px", fontSize:"9px",
                  letterSpacing:"1px", cursor:"pointer", fontFamily:"'Courier New', monospace",
                }}>{d.label}</button>
              ))}
            </div>
            <button style={{...btnStyle,background:"#FFD93D",color:"#000"}} onClick={handleCreate} disabled={loading}>
              {loading ? "..." : "Crear →"}
            </button>
          </div>
          <div style={cardStyle}>
            <div style={{fontSize:"11px",letterSpacing:"3px",color:"#6BCB77",marginBottom:"12px"}}>UNIRSE</div>
            <input style={{...inputStyle,marginBottom:"12px"}} placeholder="Código de sala"
              value={roomCodeInput} onChange={e => { setRoomCodeInput(e.target.value.toUpperCase()); setError(""); }} maxLength={5} />
            <button style={{...btnStyle,background:"#6BCB77",color:"#000"}} onClick={handleJoin} disabled={loading}>
              {loading ? "..." : "Entrar →"}
            </button>
          </div>
        </div>

        {error && <div style={{marginTop:"16px",color:"#FF6B6B",fontSize:"12px",textAlign:"center",letterSpacing:"1px"}}>{error}</div>}

        {history.length > 0 && (
          <div style={{marginTop:"32px"}}>
            <div style={{fontSize:"10px",letterSpacing:"3px",color:"#333",marginBottom:"12px"}}>SALAS RECIENTES</div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {history.map(item => (
                <div key={item.code} onClick={() => handleRejoin(item)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0f0f16",border:"1px solid #1a1a1a",borderRadius:"8px",padding:"10px 14px",cursor:"pointer",transition:"border-color 0.2s"}}
                  onMouseEnter={e => e.currentTarget.style.borderColor="#333"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="#1a1a1a"}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#FFD93D",flexShrink:0}}></div>
                    <div>
                      <div style={{fontSize:"13px",color:"#ccc"}}>{item.title}</div>
                      <div style={{fontSize:"10px",color:"#444",letterSpacing:"1px",marginTop:"2px"}}>{item.code}</div>
                    </div>
                  </div>
                  <button onClick={e => handleDeleteHistory(item.code, e)}
                    style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:"14px",padding:"4px",lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{marginTop:"24px",fontSize:"11px",color:"#333",textAlign:"center",lineHeight:"1.8"}}>
          Crea una sala · comparte el código · poneos el play · <span style={{color:"#FFD93D"}}>los comentarios aparecen solos</span>
        </div>
      </div>
    </div>
  );
}

function shareCode(code, title, commentCount) {
  const text = `🎬 Playback · ${title}\n💬 ${commentCount} comentarios\nÚnete a la sala con el código: *${code}*`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

function shareTimeline(code, title, comments) {
  const lines = [`🎬 *Playback · ${title}* (sala ${code})`, `💬 ${comments.length} comentarios`, ""];
  comments.forEach(c => lines.push(`${formatTime(c.timestamp)}  ${c.user_name}: ${c.text}`));
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
  const intervalRef = useRef(null);
  const feedRef = useRef(null);
  const inputRef = useRef(null);
  const TIMER_KEY = `playback_timer_${roomCode}`;

  const fetchComments = useCallback(async () => {
    const data = await apiGet(`comments?room_id=eq.${roomCode}&order=timestamp.asc`);
    if (Array.isArray(data)) setComments(data);
  }, [roomCode]);

  useEffect(() => {
    fetchComments();
    const poll = setInterval(fetchComments, 3000);
    return () => clearInterval(poll);
  }, [fetchComments]);

  // Restaurar temporizador al montar (por si el usuario volvió)
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
    if (saved) {
      const elapsed = (Date.now() - saved.startedAt) / 1000;
      const current = Math.min(saved.baseTime + elapsed, maxTime);
      setTime(current);
      setPlaying(true);
    }
  }, []);

  // Tick: deriva el tiempo de Date.now() para ser preciso aunque la pestaña estuviera en segundo plano
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

  // Sincronizar al volver a la pestaña
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

  useEffect(() => {
    const visible = comments.filter(c => c.timestamp <= time);
    const newOnes = visible.filter(c => !seenIds.has(c.id));
    if (newOnes.length > 0) {
      setSeenIds(prev => new Set([...prev, ...newOnes.map(c => c.id)]));
      setNewVisible(newOnes.map(c => c.id));
      setTimeout(() => setNewVisible([]), 2000);
      setTimeout(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, 50);
    }
  }, [comments, time]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now().toString(), room_id: roomCode,
      user_name: userName, text: newComment.trim(),
      timestamp: time, color: getColor(userName),
    };
    setNewComment("");
    await apiPost("comments", comment);
    await fetchComments();
    inputRef.current?.focus();
  };

  const MAX_TIME = maxTime;
  const visibleComments = comments.filter(c => c.timestamp <= time);
  const hotSegments = getHotSegments(comments, MAX_TIME);

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",fontFamily:"'Courier New', monospace",display:"flex",flexDirection:"column",maxWidth:"600px",margin:"0 auto"}}>

      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:"11px",letterSpacing:"3px",color:"#555",display:"flex",alignItems:"center",gap:"8px"}}>
            SALA <span style={{color:"#FFD93D"}}>{roomCode}</span>
            <button onClick={() => shareCode(roomCode, roomTitle, comments.length)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:"13px",lineHeight:1}} title="Compartir código por WhatsApp">📲</button>
          </div>
          <div style={{fontSize:"16px",fontWeight:"700",color:"#fff",marginTop:"2px"}}>{roomTitle}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:getColor(userName)}}></div>
          <div style={{fontSize:"12px",color:"#888"}}>{userName}</div>
          <button onClick={onExit} style={{background:"none",border:"1px solid #222",color:"#555",borderRadius:"4px",padding:"4px 8px",fontSize:"10px",cursor:"pointer",letterSpacing:"1px"}}>SALIR</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid #1a1a1a"}}>
        {[["watch","▶ Ver"],["timeline","📋 Línea de tiempo"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, background:"none", border:"none", padding:"12px",
            fontSize:"10px", letterSpacing:"3px", cursor:"pointer",
            color: tab === t ? "#FFD93D" : "#444",
            borderBottom: tab === t ? "2px solid #FFD93D" : "2px solid transparent",
            fontFamily:"'Courier New', monospace", textTransform:"uppercase",
            transition:"color 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {tab === "watch" && (
        <>
          <div style={{padding:"24px 20px",borderBottom:"1px solid #1a1a1a",background:"#0d0d14"}}>
            <div style={{textAlign:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"52px",fontWeight:"900",letterSpacing:"4px",color:playing?"#fff":"#444",fontVariantNumeric:"tabular-nums",transition:"color 0.3s"}}>
                {formatTime(time)}
              </div>
              <div style={{fontSize:"11px",color:"#333",letterSpacing:"2px",marginTop:"4px"}}>
                {playing ? <span style={{color:"#6BCB77"}}>▶ reproduciendo</span> : <span>⏸ pausado</span>}
              </div>
            </div>

            {/* Scrubber */}
            <div style={{position:"relative",marginBottom:"8px",padding:"10px 0"}}>
              {hotSegments.map((seg, i) => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${(seg.start/MAX_TIME)*100}%`,
                  width:`${((seg.end-seg.start)/MAX_TIME)*100}%`,
                  top:"50%", transform:"translateY(-50%)",
                  height:"8px", borderRadius:"4px",
                  background:"rgba(255,107,107,0.3)",
                  pointerEvents:"none", zIndex:1,
                }} />
              ))}
              <div style={{position:"absolute",top:"50%",left:0,right:0,transform:"translateY(-50%)",pointerEvents:"none",height:"3px",zIndex:2}}>
                {comments.map(c => (
                  <div key={c.id} style={{
                    position:"absolute", top:"-3px",
                    left:`${Math.min((c.timestamp/MAX_TIME)*100,100)}%`,
                    width:"9px", height:"9px", borderRadius:"50%",
                    background: c.timestamp <= time ? c.color : "#333",
                    transform:"translateX(-50%)", transition:"background 0.5s",
                    boxShadow: c.timestamp <= time ? `0 0 6px ${c.color}` : "none",
                  }} title={`${formatTime(c.timestamp)} · ${c.user_name}`} />
                ))}
              </div>
              <input type="range" min={0} max={MAX_TIME} step={1} value={Math.floor(time)}
                onChange={e => { localStorage.removeItem(TIMER_KEY); setPlaying(false); setTime(Number(e.target.value)); }}
                style={{width:"100%",cursor:"pointer",accentColor:"#FFD93D",position:"relative",zIndex:3}} />
            </div>

            {hotSegments.length > 0 && (
              <div style={{fontSize:"10px",color:"#FF6B6B",letterSpacing:"1px",textAlign:"center",marginBottom:"16px"}}>
                🔥 Tramos calientes: {hotSegments.map(s => formatTime(s.start)).join(" · ")}
              </div>
            )}

            <div style={{display:"flex",gap:"12px",justifyContent:"center"}}>
              <button onClick={() => seek(time - 10)} style={ctrlBtn}>−10s</button>
              <button onClick={handlePlayPause}
                style={{...ctrlBtn,background:playing?"#FF6B6B":"#6BCB77",color:"#000",width:"80px",fontWeight:"700"}}>
                {playing ? "⏸ PAUSE" : "▶ PLAY"}
              </button>
              <button onClick={() => seek(time + 10)} style={ctrlBtn}>+10s</button>
            </div>
          </div>

          <div ref={feedRef} style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:"10px",minHeight:"200px",maxHeight:"320px"}}>
            {visibleComments.length === 0 && (
              <div style={{color:"#333",fontSize:"12px",textAlign:"center",marginTop:"40px",letterSpacing:"1px"}}>
                Los comentarios aparecerán cuando llegues a su momento…
              </div>
            )}
            {visibleComments.map(c => (
              <div key={c.id} style={{display:"flex",gap:"10px",alignItems:"flex-start",animation:newVisible.includes(c.id)?"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)":"none"}}>
                <div style={{width:"28px",height:"28px",borderRadius:"50%",background:c.color,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#000"}}>
                  {c.user_name[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"3px"}}>
                    <span style={{fontSize:"11px",fontWeight:"700",color:c.color}}>{c.user_name}</span>
                    <span style={{fontSize:"10px",color:"#444",letterSpacing:"1px"}}>{formatTime(c.timestamp)}</span>
                  </div>
                  <div style={{fontSize:"13px",color:"#ccc",lineHeight:"1.5"}}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{padding:"16px 20px",borderTop:"1px solid #1a1a1a",display:"flex",gap:"10px"}}>
            <div style={{fontSize:"10px",color:"#444",alignSelf:"center",whiteSpace:"nowrap",letterSpacing:"1px"}}>{formatTime(time)}</div>
            <input ref={inputRef} style={{...inputStyle,flex:1,margin:0}}
              placeholder="Comenta en este momento…"
              value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && postComment()} />
            <button onClick={postComment} style={{...btnStyle,background:"#FFD93D",color:"#000",padding:"8px 14px",flexShrink:0,width:"auto"}}>→</button>
          </div>
        </>
      )}

      {tab === "timeline" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          {comments.length === 0 ? (
            <div style={{color:"#333",fontSize:"12px",textAlign:"center",marginTop:"60px",letterSpacing:"1px"}}>
              Aún no hay comentarios en esta sala
            </div>
          ) : (
            <>
              {hotSegments.length > 0 && (
                <div style={{marginBottom:"24px",padding:"14px 16px",background:"#1a0a0a",border:"1px solid #3a1a1a",borderRadius:"8px"}}>
                  <div style={{fontSize:"10px",letterSpacing:"3px",color:"#FF6B6B",marginBottom:"10px"}}>🔥 MOMENTOS CALIENTES</div>
                  {hotSegments.map((seg, i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px"}}>
                      <span style={{fontSize:"11px",color:"#FF6B6B",letterSpacing:"1px"}}>{formatTime(seg.start)}–{formatTime(seg.end)}</span>
                      <span style={{fontSize:"11px",color:"#666"}}>{seg.count} comentarios</span>
                      <div style={{display:"flex",gap:"2px"}}>
                        {Array.from({length:seg.count}).map((_,j) => (
                          <div key={j} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#FF6B6B",opacity:0.7}} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"}}>
                <div style={{fontSize:"10px",letterSpacing:"3px",color:"#333"}}>
                  TODOS LOS COMENTARIOS · {comments.length} en total
                </div>
                <button onClick={() => shareTimeline(roomCode, roomTitle, comments)}
                  style={{background:"none",border:"1px solid #222",color:"#555",borderRadius:"4px",padding:"4px 10px",fontSize:"10px",cursor:"pointer",letterSpacing:"1px",fontFamily:"'Courier New', monospace",display:"flex",alignItems:"center",gap:"6px"}}>
                  📲 compartir
                </button>
              </div>

              <div style={{display:"flex",flexDirection:"column"}}>
                {comments.map((c, i) => {
                  const isHot = hotSegments.some(s => c.timestamp >= s.start && c.timestamp < s.end);
                  return (
                    <div key={c.id} style={{display:"flex",gap:"0",position:"relative"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"40px",flexShrink:0}}>
                        <div style={{width:"2px",flex:"0 0 12px",background:i===0?"transparent":"#1a1a1a"}}></div>
                        <div style={{width:"10px",height:"10px",borderRadius:"50%",background:isHot?"#FF6B6B":c.color,flexShrink:0,boxShadow:isHot?"0 0 8px #FF6B6B":"none"}}></div>
                        <div style={{width:"2px",flex:1,minHeight:"20px",background:i===comments.length-1?"transparent":"#1a1a1a"}}></div>
                      </div>
                      <div style={{flex:1,padding:"0 0 20px 12px"}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"4px"}}>
                          <span style={{fontSize:"11px",fontWeight:"700",color:c.color}}>{c.user_name}</span>
                          <span style={{fontSize:"10px",color:"#555",letterSpacing:"1px"}}>{formatTime(c.timestamp)}</span>
                          {isHot && <span style={{fontSize:"9px",color:"#FF6B6B"}}>🔥</span>}
                        </div>
                        <div style={{fontSize:"13px",color:"#ccc",lineHeight:"1.5"}}>{c.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { opacity:0; transform: translateY(8px) scale(0.95); }
          to { opacity:1; transform: translateY(0) scale(1); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
      `}</style>
    </div>
  );
}

const labelStyle = { display:"block", fontSize:"10px", letterSpacing:"3px", color:"#555", textTransform:"uppercase", marginBottom:"6px" };
const inputStyle = { width:"100%", background:"#111", border:"1px solid #222", borderRadius:"6px", padding:"10px 12px", color:"#fff", fontSize:"13px", fontFamily:"'Courier New', monospace", outline:"none", boxSizing:"border-box" };
const btnStyle = { width:"100%", border:"none", borderRadius:"6px", padding:"10px", fontSize:"12px", fontWeight:"700", letterSpacing:"2px", cursor:"pointer", fontFamily:"'Courier New', monospace" };
const cardStyle = { background:"#0f0f16", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"16px" };
const ctrlBtn = { background:"#111", border:"1px solid #222", color:"#888", borderRadius:"6px", padding:"8px 14px", fontSize:"11px", letterSpacing:"2px", cursor:"pointer", fontFamily:"'Courier New', monospace" };
