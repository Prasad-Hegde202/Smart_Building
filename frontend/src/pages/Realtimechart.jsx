import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";

const API_BASE = "http://localhost:5000";
const font     = "'DM Sans', sans-serif";
const fontMono = "'JetBrains Mono', monospace";

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { timestamp:"19 Mar 2026, 12:01 AM", aggregate_w:1800, total_identified_w:950,  total_bg_w:850,  detected:[{appliance:"Geyser",watts:750},{appliance:"Washing Machine",watts:200}], cost:{per_hour:13.23} },
  { timestamp:"19 Mar 2026, 12:06 AM", aggregate_w:450,  total_identified_w:0,    total_bg_w:450,  detected:[], cost:{per_hour:3.31}  },
  { timestamp:"19 Mar 2026, 12:11 AM", aggregate_w:1400, total_identified_w:600,  total_bg_w:800,  detected:[{appliance:"Air Conditioner",watts:600}], cost:{per_hour:10.29} },
  { timestamp:"19 Mar 2026, 12:16 AM", aggregate_w:2100, total_identified_w:1400, total_bg_w:700,  detected:[{appliance:"Geyser",watts:950},{appliance:"Air Conditioner",watts:450}], cost:{per_hour:15.44} },
  { timestamp:"19 Mar 2026, 12:21 AM", aggregate_w:200,  total_identified_w:0,    total_bg_w:200,  detected:[], cost:{per_hour:1.47}  },
  { timestamp:"19 Mar 2026, 12:26 AM", aggregate_w:800,  total_identified_w:300,  total_bg_w:500,  detected:[{appliance:"Washing Machine",watts:300}], cost:{per_hour:5.88}  },
  { timestamp:"19 Mar 2026, 12:31 AM", aggregate_w:1200, total_identified_w:500,  total_bg_w:700,  detected:[{appliance:"Induction Stove",watts:500}], cost:{per_hour:8.82}  },
  { timestamp:"19 Mar 2026, 12:36 AM", aggregate_w:1600, total_identified_w:900,  total_bg_w:700,  detected:[{appliance:"Geyser",watts:700},{appliance:"Washing Machine",watts:200}], cost:{per_hour:11.76} },
];

function formatTime(ts) {
  if (!ts) return "";
  const parts = ts.split(", ");
  return parts.length > 1 ? parts[1] : ts;
}

// ── Appliance Tooltip ─────────────────────────────────────────────────────────
function ApplianceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0a1521", border: "1px solid #1a4a6a",
      borderRadius: 8, padding: "10px 14px", minWidth: 170,
      fontFamily: fontMono, fontSize: "0.7rem",
    }}>
      <div style={{ color: "#00d4ff", marginBottom: 8, letterSpacing: 1 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between",
          gap: 16, marginBottom: 3,
        }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: "#fff" }}>{p.value}W</span>
        </div>
      ))}
    </div>
  );
}

// ── Cost Tooltip ──────────────────────────────────────────────────────────────
function CostTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{
      background: "#0a1521", border: "1px solid #2a3a1a",
      borderRadius: 8, padding: "10px 14px",
      fontFamily: fontMono, fontSize: "0.7rem",
    }}>
      <div style={{ color: "#ffd700", marginBottom: 6, letterSpacing: 1 }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
        ₹{val}<span style={{ color: "#5a8a5a", fontSize: "0.65rem" }}>/hr</span>
      </div>
      <div style={{ color: "#5a8a5a", fontSize: "0.65rem", marginTop: 4 }}>
        ≈ ₹{(val * 8).toFixed(2)} today · ₹{(val * 8 * 30).toFixed(0)}/mo
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RealtimeChart() {
  const [rows, setRows]             = useState([]);
  const [useMock, setUseMock]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const navigate                    = useNavigate();

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #070b12; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    `;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const fetchData = async () => {
    try {
      const res  = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setUseMock(true); setRows(MOCK);
      } else {
        setUseMock(false);
        setRows([...data].reverse().slice(-15));
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      setUseMock(true); setRows(MOCK);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  // ── Chart 1 data — appliance power over time ──────────────────────────────
  const applianceData = rows.map(r => ({
    time      : formatTime(r.timestamp),
    "Total Load"  : Math.round(r.aggregate_w        || 0),
    "Identified"  : Math.round(r.total_identified_w || 0),
    "Background"  : Math.round(r.total_bg_w         || 0),
  }));

  // ── Chart 2 data — cost per hour as bar chart ─────────────────────────────
  const costData = rows.map(r => ({
    time : formatTime(r.timestamp),
    cost : r.cost?.per_hour || 0,
    load : Math.round(r.aggregate_w || 0),
  }));

  // ── Latest values for stat pills ─────────────────────────────────────────
  const latest = rows[rows.length - 1];

  const card = {
    background: "#0c1521", border: "1px solid #0f3a5a",
    borderRadius: 12, padding: "20px 20px 14px",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#070b12",
      color: "#d0e4f0", fontFamily: font,
    }}>
      {/* Grid bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "36px 36px",
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: "22px 28px 48px" }}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #0f3a5a", paddingBottom: 16, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              background: "linear-gradient(135deg, #00d4ff18, #00ff8818)",
              border: "1px solid #00d4ff33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>📈</div>
            <div>
              <div style={{
                fontFamily: fontMono, fontSize: "0.95rem",
                letterSpacing: "2.5px", color: "#00d4ff", fontWeight: 500,
              }}>ENERGY CHARTS</div>
              <div style={{
                fontSize: "0.72rem", color: "#3a6a8a",
                letterSpacing: "1.5px", marginTop: 3,
              }}>SMART BUILDING · LIVE TREND</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {useMock && (
              <span style={{ fontFamily: fontMono, fontSize: "0.62rem", color: "#ff8844" }}>
                DEMO MODE
              </span>
            )}
            {[
              { label: "⚡ Dashboard", path: "/dashboard" },
              { label: "📋 History",   path: "/history"   },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} style={{
                background: "#0a1521", border: "1px solid #0f3a5a",
                borderRadius: 6, padding: "5px 13px",
                fontFamily: fontMono, fontSize: "0.65rem",
                letterSpacing: "1px", color: "#3a6a8a", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.color="#00d4ff"; e.currentTarget.style.borderColor="#00d4ff44"; }}
              onMouseLeave={e => { e.currentTarget.style.color="#3a6a8a"; e.currentTarget.style.borderColor="#0f3a5a"; }}
              >{l.label}</button>
            ))}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#001a0a", border: "1px solid #00ff4422",
              borderRadius: 20, padding: "5px 14px",
              fontFamily: fontMono, fontSize: "0.65rem", color: "#00ff88",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#00ff88", animation: "pulse 1.5s infinite",
              }} />
              LIVE · {lastUpdate || "—"}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHART 1 — APPLIANCE POWER TREND
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, marginBottom: 24, animation: "fadeUp 0.4s ease both" }}>

          {/* Title + legend */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 18,
          }}>
            <div>
              <div style={{
                fontFamily: fontMono, fontSize: "0.7rem",
                letterSpacing: "2px", color: "#00d4ff", marginBottom: 4,
              }}>⚡ APPLIANCE POWER TREND</div>
              <div style={{
                fontSize: "0.75rem", color: "#3a6a8a",
              }}>How much power each category is using over time</div>
            </div>

            {/* Live values */}
            {latest && (
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Total",      val: `${latest.aggregate_w}W`,        color: "#00d4ff" },
                  { label: "Identified", val: `${latest.total_identified_w}W`,  color: "#00ff88" },
                  { label: "Background", val: `${Math.round(latest.total_bg_w)}W`, color: "#ffd700" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{
                      fontFamily: fontMono, fontSize: "0.55rem",
                      letterSpacing: "1px", color: "#3a6a8a", marginBottom: 3,
                    }}>{s.label.toUpperCase()}</div>
                    <div style={{
                      fontFamily: fontMono, fontSize: "0.95rem",
                      fontWeight: 700, color: s.color,
                    }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend pills */}
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            {[
              { color: "#00d4ff", label: "Total Load",  dashed: false },
              { color: "#00ff88", label: "Identified",  dashed: true  },
              { color: "#ffd700", label: "Background",  dashed: true  },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22, height: 2,
                  backgroundImage: l.dashed
                    ? `repeating-linear-gradient(90deg,${l.color} 0,${l.color} 5px,transparent 5px,transparent 9px)`
                    : "none",
                  background: l.dashed ? "none" : l.color,
                  borderRadius: 1,
                }} />
                <span style={{
                  fontFamily: fontMono, fontSize: "0.62rem",
                  color: "#5a8aaa", letterSpacing: 1,
                }}>{l.label}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={applianceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>

              <CartesianGrid stroke="#0f2a3a" strokeDasharray="3 4" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#1a3a5a"
                tick={{ fill: "#3a6a8a", fontSize: 11, fontFamily: fontMono }}
                tickLine={false}
                axisLine={{ stroke: "#0f3a5a" }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#1a3a5a"
                tick={{ fill: "#3a6a8a", fontSize: 11, fontFamily: fontMono }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}W`}
                width={58}
              />

              <Tooltip content={<ApplianceTooltip />} />

              <Line type="monotone" dataKey="Total Load"
                stroke="#00d4ff" strokeWidth={2.5}
                dot={false} activeDot={{ r: 5, fill: "#00d4ff", strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line type="monotone" dataKey="Identified"
                stroke="#00ff88" strokeWidth={1.5} strokeDasharray="5 3"
                dot={false} activeDot={{ r: 4, fill: "#00ff88", strokeWidth: 0 }}
                isAnimationActive={false}
              />
              <Line type="monotone" dataKey="Background"
                stroke="#ffd700" strokeWidth={1.5} strokeDasharray="5 3"
                dot={false} activeDot={{ r: 4, fill: "#ffd700", strokeWidth: 0 }}
                isAnimationActive={false}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHART 2 — COST PER HOUR BAR CHART
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ ...card, animation: "fadeUp 0.4s ease 0.1s both" }}>

          {/* Title */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 18,
          }}>
            <div>
              <div style={{
                fontFamily: fontMono, fontSize: "0.7rem",
                letterSpacing: "2px", color: "#ffd700", marginBottom: 4,
              }}>💰 COST PER HOUR  (₹)</div>
              <div style={{ fontSize: "0.75rem", color: "#3a6a8a" }}>
                BESCOM tariff at ₹7.35/kWh — each bar = one reading
              </div>
            </div>

            {/* Current cost callout */}
            {latest && (
              <div style={{
                background: "#120f00", border: "1px solid #ffd70033",
                borderRadius: 8, padding: "10px 18px", textAlign: "center",
              }}>
                <div style={{
                  fontFamily: fontMono, fontSize: "0.55rem",
                  color: "#4a6a4a", letterSpacing: "1.5px", marginBottom: 4,
                }}>RIGHT NOW</div>
                <div style={{
                  fontFamily: fontMono, fontSize: "1.4rem",
                  fontWeight: 700, color: "#ffd700",
                }}>₹{latest.cost?.per_hour}</div>
                <div style={{
                  fontFamily: fontMono, fontSize: "0.6rem",
                  color: "#4a6a4a", marginTop: 3,
                }}>per hour</div>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costData} margin={{ top: 16, right: 20, left: 0, bottom: 5 }}
              barCategoryGap="30%">

              <CartesianGrid stroke="#0f2a3a" strokeDasharray="3 4" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#1a3a5a"
                tick={{ fill: "#3a6a8a", fontSize: 11, fontFamily: fontMono }}
                tickLine={false}
                axisLine={{ stroke: "#0f3a5a" }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#1a3a5a"
                tick={{ fill: "#3a6a8a", fontSize: 11, fontFamily: fontMono }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `₹${v}`}
                width={44}
              />

              <Tooltip content={<CostTooltip />} cursor={{ fill: "#ffffff08" }} />

              <Bar dataKey="cost" name="Cost/hr" radius={[4, 4, 0, 0]}>
                {costData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.cost >= 14 ? "#ff4422" :
                      entry.cost >= 10 ? "#ff8844" :
                      entry.cost >= 6  ? "#ffd700" :
                                         "#00ff8866"
                    }
                  />
                ))}
                <LabelList
                  dataKey="cost"
                  position="top"
                  formatter={v => `₹${v}`}
                  style={{
                    fontFamily: fontMono, fontSize: 10,
                    fill: "#5a8aaa",
                  }}
                />
              </Bar>

            </BarChart>
          </ResponsiveContainer>

          {/* Cost legend */}
          <div style={{
            display: "flex", gap: 16, marginTop: 10,
            justifyContent: "center",
          }}>
            {[
              { color: "#00ff8866", label: "Low  (< ₹6)"   },
              { color: "#ffd700",   label: "Normal (₹6–10)" },
              { color: "#ff8844",   label: "High (₹10–14)"  },
              { color: "#ff4422",   label: "Peak  (> ₹14)"  },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: l.color,
                }} />
                <span style={{
                  fontFamily: fontMono, fontSize: "0.6rem", color: "#5a8aaa",
                }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 20,
          fontFamily: fontMono, fontSize: "0.6rem",
          color: "#1a3a5a", letterSpacing: 1,
        }}>
          LAST {rows.length} READINGS · AUTO-REFRESH EVERY 5s · BESCOM ₹7.35/kWh
        </div>

      </div>
    </div>
  );
}