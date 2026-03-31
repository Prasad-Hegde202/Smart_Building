import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

async function getLatest() {
  const res = await fetch(`${API_BASE}/latest`);
  return res.json();
}

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK = {
  timestamp: "10 Mar 2026, 11:54 PM",
  aggregate_w: 1800,
  aggregate_kw: 1.8,
  total_identified_w: 950,
  total_bg_w: 850,
  identified_pct: 52.8,
  truly_unknown_w: 20,
  detected: [
    { emoji: "🔥", appliance: "Geyser / Electric Water Heater", category: "Heating Appliance", watts: 750, share_pct: 41.7, cost_per_hr: 5.51 },
    { emoji: "🔄", appliance: "Washing Machine / Water Pump",   category: "Motor Appliance",   watts: 200, share_pct: 11.1, cost_per_hr: 1.47 },
  ],
  background: [
    { name: "🧊 Refrigerator",          watts: 150, note: "Always ON" },
    { name: "🌀 Ceiling Fan(s) ×2",     watts: 150, note: "2 fans running" },
    { name: "💡 LED Lights",            watts: 80,  note: "Evening lighting" },
    { name: "📺 TV + Set-top Box",      watts: 120, note: "Evening viewing" },
    { name: "📡 WiFi Router",           watts: 15,  note: "Always ON" },
    { name: "🔋 Phone/Laptop Chargers", watts: 40,  note: "Charging" },
    { name: "💧 Water Motor Pump",      watts: 295, note: "Evening supply" },
  ],
  cost: { per_hour: 13.23, daily: 105.84, monthly: 3175.2 },
  tip: "Evening peak (6-9 PM). Avoid high-power appliances if possible.",
  location: "Bengaluru, Karnataka",
};

// ── Category colours ──────────────────────────────────────────────────────────
const CAT_COLOR = {
  "Heating Appliance" : "#ff6644",
  "Motor Appliance"   : "#00d4ff",
  "Thermal Appliance" : "#44aaff",
  "Cooling Appliance" : "#00ffcc",
  "Standby Appliance" : "#ffd700",
  "Low Power Device"  : "#aaaaaa",
};

// ── Animated number counter ───────────────────────────────────────────────────
function AnimatedVal({ value, color = "#00d4ff" }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current, end = value, t0 = Date.now(), dur = 600;
    const tick = () => {
      const p    = Math.min(1, (Date.now() - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <span style={{ color }}>{display}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate                    = useNavigate();
  const [latest, setLatest]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [useMock, setUseMock]       = useState(false);

  // Inject global styles once
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #070b12; }
      @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      .card-hover:hover { border-color: #1a4a6a !important; transition: border-color 0.2s; }
      .row-hover:hover  { background: #0d1e2d !important; }
      .bg-row-hover:hover { background: #0c1a26 !important; border-radius: 6px; }
    `;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const fetchData = async () => {
    try {
      const data = await getLatest();
      if (!data || data.message === "no predictions yet") {
        setUseMock(true); setLatest(MOCK);
      } else {
        setUseMock(false); setLatest(data);
      }
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      setUseMock(true); setLatest(MOCK);
      setError("Backend offline — showing demo data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);



  // ── Common style tokens ───────────────────────────────────────────────────
  const font     = "'DM Sans', sans-serif";
  const fontMono = "'JetBrains Mono', monospace";
  const card     = {
    background: "#0c1521",
    border: "1px solid #0f3a5a",
    borderRadius: 12,
    padding: "20px 22px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070b12",
      color: "#d0e4f0",
      fontFamily: font,
      fontSize: "0.9rem",
      padding: 0,
      overflowX: "hidden",
    }}>

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "36px 36px",
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: "22px 28px 48px" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #0f3a5a", paddingBottom: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "linear-gradient(135deg, #00d4ff18, #ff880018)",
              border: "1px solid #00d4ff33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>⚡</div>
            <div>
              <div style={{
                fontFamily: fontMono, fontSize: "0.95rem",
                letterSpacing: "2.5px", color: "#00d4ff", fontWeight: 500,
              }}>
                NILM ENERGY MONITOR
              </div>
              <div style={{
                fontSize: "0.72rem", color: "#3a6a8a",
                letterSpacing: "1.5px", marginTop: 3,
              }}>
                SMART BUILDING · {latest?.location?.toUpperCase() || "BENGALURU, KARNATAKA"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {useMock && (
              <span style={{
                fontFamily: fontMono, fontSize: "0.65rem",
                color: "#ff8844", letterSpacing: 1,
              }}>DEMO MODE</span>
            )}
            {error && (
              <span style={{ fontSize: "0.7rem", color: "#ff6644" }}>⚠ {error}</span>
            )}
            {/* Nav buttons */}
            {[
              { label: "📋 History", path: "/history" },
              { label: "📈 Chart",   path: "/chart"   },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} style={{
                background: "#0a1521", border: "1px solid #0f3a5a",
                borderRadius: 6, padding: "5px 13px",
                fontFamily: fontMono, fontSize: "0.65rem",
                letterSpacing: "1px", color: "#3a6a8a",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#00d4ff"; e.currentTarget.style.borderColor="#00d4ff44"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#3a6a8a"; e.currentTarget.style.borderColor="#0f3a5a"; }}
              >{l.label}</button>
            ))}
            {/* Live chip */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#001a0a", border: "1px solid #00ff4422",
              borderRadius: 20, padding: "5px 14px",
              fontFamily: fontMono, fontSize: "0.68rem",
              color: "#00ff88", letterSpacing: "1px",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#00ff88", animation: "pulse 1.5s infinite",
              }} />
              LIVE · {lastUpdate || "—"}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "#3a6a8a", fontFamily: fontMono,
            fontSize: "0.85rem", letterSpacing: 2,
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⚡</div>
            INITIALISING ENERGY MONITOR...
          </div>
        ) : !latest ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "#3a6a8a", fontFamily: fontMono, fontSize: "0.85rem",
          }}>
            NO DATA — send a POST to /predict to start
          </div>
        ) : (
          <>

            {/* ── STAT CARDS ───────────────────────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 14, marginBottom: 20,
            }}>
              {[
                { label: "TOTAL LOAD",     val: <><AnimatedVal value={latest.aggregate_w} color="#00d4ff" /><span style={{ color: "#3a6a8a", fontSize: "0.75rem" }}> W</span></>, sub: `${latest.aggregate_kw} kW`,            accent: "#00d4ff" },
                { label: "IDENTIFIED",     val: <><AnimatedVal value={latest.total_identified_w} color="#00ff88" /><span style={{ color: "#3a6a8a", fontSize: "0.75rem" }}> W</span></>, sub: `${latest.identified_pct}% of total`, accent: "#00ff88" },
                { label: "BACKGROUND",     val: <><AnimatedVal value={Math.round(latest.total_bg_w)} color="#ffd700" /><span style={{ color: "#3a6a8a", fontSize: "0.75rem" }}> W</span></>, sub: `${(100 - latest.identified_pct).toFixed(1)}% of total`, accent: "#ffd700" },
                { label: "COST / HOUR",    val: <span style={{ color: "#ff8844" }}>₹{latest.cost.per_hour}</span>, sub: `₹${latest.cost.monthly} / month`,  accent: "#ff8844" },
                { label: "APPLIANCES ON",  val: <span style={{ color: "#cc88ff" }}>{latest.detected.length}</span>, sub: "of 4 monitored",                    accent: "#cc88ff" },
              ].map((c, i) => (
                <div key={i} className="card-hover" style={{
                  ...card, position: "relative", overflow: "hidden",
                  animation: `fadeUp 0.4s ease ${i * 0.06}s both`,
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: c.accent,
                  }} />
                  <div style={{
                    fontFamily: fontMono, fontSize: "0.6rem",
                    letterSpacing: "2px", color: "#3a6a8a", marginBottom: 8,
                  }}>{c.label}</div>
                  <div style={{ fontSize: "1.65rem", fontWeight: 600, lineHeight: 1 }}>
                    {c.val}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#3a6a8a", marginTop: 6 }}>
                    {c.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ── TIP TICKER — JS-driven marquee ───────────────────────── */}
            <Ticker tip={latest.tip} location={latest.location} fontMono={fontMono} />

            {/* ── THREE COLUMN LAYOUT ───────────────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr 1fr",
              gap: 16, marginBottom: 20,
              alignItems: "start",
            }}>

              {/* COL 1 — Detected Appliances + OFF appliances summary */}
              <div className="card-hover" style={{ ...card, alignSelf: "start" }}>
                <SectionTitle icon="🔎" label="DETECTED APPLIANCES" mono={fontMono} />
                {latest.detected.length === 0 ? (
                  <div style={{
                    color: "#3a6a8a", fontSize: "0.82rem", padding: "14px 0",
                    fontFamily: fontMono, letterSpacing: 1,
                  }}>
                    No major appliances detected — all load is background.
                  </div>
                ) : (
                  <>
                    {latest.detected.map((a, i) => {
                      const color = CAT_COLOR[a.category] || "#00d4ff";
                      return (
                        <div key={i} className="row-hover" style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "11px 6px",
                          borderBottom: "1px solid #0a1e2d",
                          borderRadius: 6,
                        }}>
                          <div style={{ fontSize: "1.4rem", width: 30, textAlign: "center" }}>
                            {a.emoji}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: "0.84rem", fontWeight: 500,
                              color: "#d0e4f0", whiteSpace: "nowrap",
                              overflow: "hidden", textOverflow: "ellipsis",
                            }}>{a.appliance}</div>
                            <div style={{
                              fontSize: "0.65rem", color: "#3a6a8a",
                              marginTop: 2, fontFamily: fontMono, letterSpacing: 1,
                            }}>{a.category}</div>
                            <div style={{
                              height: 4, background: "#0f2a3a",
                              borderRadius: 2, marginTop: 7, overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${a.share_pct}%`,
                                background: `linear-gradient(90deg, ${color}66, ${color})`,
                                transition: "width 0.6s ease",
                              }} />
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{
                              fontFamily: fontMono, fontSize: "0.95rem",
                              fontWeight: 500, color,
                            }}>{a.watts}W</div>
                            <div style={{ fontSize: "0.68rem", color: "#5a8aaa", marginTop: 2 }}>
                              ₹{a.cost_per_hr}/hr
                            </div>
                            <div style={{ fontSize: "0.65rem", color: "#3a6a8a", marginTop: 1 }}>
                              {a.share_pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Off appliances count */}
                    {(4 - latest.detected.length) > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 6px", marginTop: 2,
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "#1a2a3a", border: "1px solid #2a4a5a",
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: "0.75rem", color: "#2a4a5a",
                          fontFamily: fontMono, letterSpacing: 1,
                        }}>
                          {4 - latest.detected.length} appliance(s) not running
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* COL 2 — Unified Cost Hero Card */}
              <div className="card-hover" style={{
                ...card,
                border: "1px solid #2a4a1a",
                background: "linear-gradient(160deg, #0c1a0e, #0c1521)",
                alignSelf: "start",
              }}>
                <SectionTitle icon="💰" label="COST PREDICTION" mono={fontMono} />

                {/* Monthly hero */}
                <div style={{
                  textAlign: "center",
                  background: "#0a1400",
                  border: "1px solid #ff662233",
                  borderRadius: 10, padding: "18px 12px 14px",
                  marginBottom: 14,
                }}>
                  <div style={{
                    fontFamily: fontMono, fontSize: "0.58rem",
                    letterSpacing: "2px", color: "#4a5a3a", marginBottom: 6,
                  }}>IF YOU CONTINUE THIS USAGE ALL MONTH</div>
                  <div style={{
                    fontFamily: fontMono, fontSize: "2.4rem",
                    fontWeight: 700, color: "#ff6622", lineHeight: 1,
                    textShadow: "0 0 30px #ff662244",
                  }}>₹{latest.cost.monthly}</div>
                  <div style={{
                    fontSize: "0.72rem", color: "#5a6a3a",
                    marginTop: 8,
                  }}>estimated monthly bill</div>
                </div>

                {/* Running cost row */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                  background: "#080e00", borderRadius: 8,
                  padding: "10px 14px", marginBottom: 14,
                  border: "1px solid #ffd70018",
                }}>
                  <div>
                    <div style={{
                      fontFamily: fontMono, fontSize: "0.55rem",
                      letterSpacing: "1.5px", color: "#4a6a4a", marginBottom: 4,
                    }}>RIGHT NOW</div>
                    <div style={{
                      fontFamily: fontMono, fontSize: "1.1rem",
                      fontWeight: 700, color: "#ffd700",
                    }}>₹{latest.cost.per_hour}<span style={{ fontSize: "0.65rem", color: "#4a6a4a" }}> / hr</span></div>
                  </div>
                  <div style={{
                    width: 1, height: 36, background: "#1a3a1a",
                  }} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontFamily: fontMono, fontSize: "0.55rem",
                      letterSpacing: "1.5px", color: "#4a6a4a", marginBottom: 4,
                    }}>DAILY (8 HRS)</div>
                    <div style={{
                      fontFamily: fontMono, fontSize: "1.1rem",
                      fontWeight: 700, color: "#ffaa44",
                    }}>₹{latest.cost.daily}</div>
                  </div>
                </div>

                {/* BESCOM note */}
                <div style={{
                  textAlign: "center", fontSize: "0.62rem",
                  color: "#3a5a3a", fontFamily: fontMono,
                  marginBottom: 14, letterSpacing: 1,
                }}>
                  BESCOM domestic slab · ₹7.35/kWh
                </div>

                {/* Load breakdown */}
                <div style={{
                  background: "#080f0a", borderRadius: 8,
                  padding: "14px", border: "1px solid #0f2a0f",
                }}>
                  <div style={{
                    fontFamily: fontMono, fontSize: "0.58rem",
                    letterSpacing: "2px", color: "#3a5a3a", marginBottom: 14,
                  }}>LOAD BREAKDOWN</div>
                  {[
                    { label: "Detected appliances", w: latest.total_identified_w, color: "#00d4ff" },
                    { label: "Background devices",  w: latest.total_bg_w,         color: "#ffd700" },
                  ].map((b, i) => {
                    const pct = latest.aggregate_w > 0
                      ? (b.w / latest.aggregate_w * 100).toFixed(1) : 0;
                    return (
                      <div key={i} style={{ marginBottom: i === 0 ? 12 : 0 }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "baseline", marginBottom: 5,
                        }}>
                          <span style={{ fontSize: "0.75rem", color: "#5a8a6a" }}>{b.label}</span>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <span style={{
                              fontFamily: fontMono, fontSize: "0.82rem",
                              fontWeight: 600, color: b.color,
                            }}>{Math.round(b.w)}W</span>
                            <span style={{
                              fontFamily: fontMono, fontSize: "0.65rem", color: "#3a5a3a",
                            }}>({pct}%)</span>
                          </div>
                        </div>
                        <div style={{ background: "#0f2a1a", borderRadius: 3, height: 5 }}>
                          <div style={{
                            height: "100%", borderRadius: 3,
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${b.color}44, ${b.color})`,
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    borderTop: "1px solid #0f2a1a", marginTop: 12, paddingTop: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  }}>
                    <span style={{ fontSize: "0.75rem", color: "#5a8a6a" }}>Total load</span>
                    <span style={{
                      fontFamily: fontMono, fontSize: "0.82rem",
                      fontWeight: 600, color: "#ffffff",
                    }}>{latest.aggregate_w}W</span>
                  </div>
                </div>
              </div>

              {/* COL 3 — Background Devices (VERTICAL, clean list) */}
              <div className="card-hover" style={{ ...card, alignSelf: "start" }}>
                <SectionTitle icon="🏡" label="BACKGROUND DEVICES" mono={fontMono} />
                <div style={{ fontSize: "0.65rem", color: "#3a5a6a", marginBottom: 12, fontFamily: fontMono }}>
                  ALWAYS-ON ESTIMATE
                </div>

                {/* Each device — name + note + always-on dot, NO watts */}
                {latest.background.map((b, i) => (
                  <div key={i} className="bg-row-hover" style={{
                    display: "flex", alignItems: "center",
                    padding: "9px 8px", gap: 12,
                    borderBottom: i < latest.background.length - 1
                      ? "1px solid #0a1e2d" : "none",
                  }}>
                    {/* Always-on indicator dot */}
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#00ff88", flexShrink: 0,
                      boxShadow: "0 0 6px #00ff8866",
                    }} />
                    {/* Name */}
                    <div style={{ flex: 1, fontSize: "0.82rem", color: "#9ab8cc" }}>
                      {b.name}
                    </div>
                    {/* Note */}
                    <div style={{
                      fontSize: "0.65rem", color: "#3a5a6a",
                      fontFamily: fontMono, whiteSpace: "nowrap",
                    }}>
                      {b.note}
                    </div>
                  </div>
                ))}

                {/* Truly unknown row */}
                {latest.truly_unknown_w > 5 && (
                  <div style={{
                    display: "flex", alignItems: "center",
                    padding: "9px 8px", gap: 12,
                    borderTop: "1px solid #0a1e2d",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "#5a6a7a", flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, fontSize: "0.82rem", color: "#5a7a8a" }}>
                      ❓ Other / Untracked
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#2a4a5a", fontFamily: fontMono }}>
                      unknown
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ── TIMESTAMP FOOTER ─────────────────────────────────────── */}
            <div style={{
              textAlign: "center", fontFamily: fontMono,
              fontSize: "0.65rem", color: "#2a4a5a", letterSpacing: 1,
              marginTop: 8,
            }}>
              LAST READING · {latest.timestamp} · AUTO-REFRESH EVERY 5s
            </div>

          </>
        )}
      </div>
    </div>
  );
}

// ── Scrolling ticker component (JS-driven, reliable) ─────────────────────────
function Ticker({ tip, location, fontMono }) {
  const trackRef = useRef(null);
  const animRef  = useRef(null);
  const posRef   = useRef(0);
  const text     = `💡  ${tip}     ⚡  BESCOM Tariff: ₹7.35/kWh     📍  ${location}     `;

  useEffect(() => {
    let pos = 0;
    const speed = 0.6; // px per frame
    const step = () => {
      if (!trackRef.current) return;
      pos -= speed;
      const w = trackRef.current.scrollWidth / 2;
      if (Math.abs(pos) >= w) pos = 0;
      trackRef.current.style.transform = `translateX(${pos}px)`;
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [tip]);

  return (
    <div style={{
      background: "#050e0a", border: "1px solid #00ff4422",
      borderRadius: 8, marginBottom: 20,
      overflow: "hidden", display: "flex", alignItems: "center",
      height: 40,
    }}>
      {/* Pinned badge */}
      <div style={{
        background: "#001a0a", borderRight: "1px solid #00ff4422",
        padding: "0 14px", height: "100%", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 7,
        fontFamily: fontMono, fontSize: "0.6rem",
        letterSpacing: "2px", color: "#00ff88",
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#00ff88",
          boxShadow: "0 0 6px #00ff88",
          animation: "pulse 1.5s infinite",
        }} />
        ADVISORY
      </div>
      {/* Scrolling track */}
      <div style={{ overflow: "hidden", flex: 1, height: "100%", position: "relative" }}>
        <div ref={trackRef} style={{
          display: "inline-flex", alignItems: "center",
          height: "100%", whiteSpace: "nowrap",
          fontSize: "0.8rem", color: "#00ff88",
        }}>
          {/* Duplicate for seamless loop */}
          <span style={{ paddingRight: 60 }}>{text}</span>
          <span style={{ paddingRight: 60 }}>{text}</span>
        </div>
      </div>
    </div>
  );
}

// ── Reusable section title ────────────────────────────────────────────────────
function SectionTitle({ icon, label, mono }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 14,
    }}>
      <span style={{ fontSize: "0.85rem" }}>{icon}</span>
      <span style={{
        fontFamily: mono, fontSize: "0.62rem",
        letterSpacing: "2.5px", color: "#3a6a8a", fontWeight: 500,
      }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#0f3a5a" }} />
    </div>
  );
}