import { useEffect, useState, useRef } from "react";

const API_BASE = "http://localhost:5000";

async function getHistory() {
  const res = await fetch(`${API_BASE}/history`);
  return res.json();
}

// ── Mock history data ─────────────────────────────────────────────────────────
const MOCK_HISTORY = [
  { timestamp: "12 Mar 2026, 11:54 PM", aggregate_w: 1800, aggregate_kw: 1.8,  total_identified_w: 950,  total_bg_w: 850,  identified_pct: 52.8, detected: [{ emoji:"🔥", appliance:"Geyser",         watts:750 },{ emoji:"🔄", appliance:"Washing Machine", watts:200 }], cost:{ per_hour:13.23, monthly:3175.2 }, tip:"Evening peak hours." },
  { timestamp: "12 Mar 2026, 11:49 PM", aggregate_w: 1650, aggregate_kw: 1.65, total_identified_w: 800,  total_bg_w: 850,  identified_pct: 48.5, detected: [{ emoji:"🔥", appliance:"Geyser",         watts:700 }],                                                    cost:{ per_hour:12.12, monthly:2908.8 }, tip:"Evening peak hours." },
  { timestamp: "12 Mar 2026, 11:44 PM", aggregate_w: 450,  aggregate_kw: 0.45, total_identified_w: 0,    total_bg_w: 450,  identified_pct: 0,    detected: [],                                                                                                        cost:{ per_hour:3.31,  monthly:793.8  }, tip:"Night — low load." },
  { timestamp: "12 Mar 2026, 11:39 PM", aggregate_w: 1400, aggregate_kw: 1.4,  total_identified_w: 600,  total_bg_w: 800,  identified_pct: 42.9, detected: [{ emoji:"🌡️", appliance:"Air Conditioner",  watts:600 }],                                                  cost:{ per_hour:10.29, monthly:2469.6 }, tip:"Normal hours." },
  { timestamp: "12 Mar 2026, 11:34 PM", aggregate_w: 2100, aggregate_kw: 2.1,  total_identified_w: 1400, total_bg_w: 700,  identified_pct: 66.7, detected: [{ emoji:"🔥", appliance:"Geyser",         watts:950 },{ emoji:"🌡️", appliance:"Air Conditioner", watts:450 }], cost:{ per_hour:15.44, monthly:3704.4 }, tip:"Morning peak!" },
  { timestamp: "12 Mar 2026, 11:29 PM", aggregate_w: 200,  aggregate_kw: 0.2,  total_identified_w: 0,    total_bg_w: 200,  identified_pct: 0,    detected: [],                                                                                                        cost:{ per_hour:1.47,  monthly:352.8  }, tip:"Night — low load." },
  { timestamp: "12 Mar 2026, 11:24 PM", aggregate_w: 800,  aggregate_kw: 0.8,  total_identified_w: 300,  total_bg_w: 500,  identified_pct: 37.5, detected: [{ emoji:"🔄", appliance:"Washing Machine", watts:300 }],                                                  cost:{ per_hour:5.88,  monthly:1411.2 }, tip:"Normal hours." },
  { timestamp: "12 Mar 2026, 11:19 PM", aggregate_w: 1200, aggregate_kw: 1.2,  total_identified_w: 500,  total_bg_w: 700,  identified_pct: 41.7, detected: [{ emoji:"♨️", appliance:"Induction Stove", watts:500 }],                                                  cost:{ per_hour:8.82,  monthly:2116.8 }, tip:"Normal hours." },
];

// ── Stacked bar chart — Identified vs Background per reading ─────────────────
function LoadChart({ data, fontMono }) {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return null;

  const maxW     = Math.max(...data.map(r => r.aggregate_w), 1);
  const barW     = 28;
  const gap      = 10;
  const chartH   = 160;
  const padL     = 48;
  const padB     = 52;
  const padT     = 16;
  const totalW   = padL + data.length * (barW + gap) + 20;
  const svgH     = chartH + padB + padT;

  // Y-axis gridlines at 0%, 25%, 50%, 75%, 100% of maxW
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y    : padT + chartH - f * chartH,
    label: `${Math.round(f * maxW)}W`,
  }));

  return (
    <div style={{
      background: "#0c1521", border: "1px solid #0f3a5a",
      borderRadius: 12, padding: "18px 20px", marginBottom: 20,
      overflowX: "auto",
    }}>
      {/* Title + legend */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14,
      }}>
        <div style={{
          fontFamily: fontMono, fontSize: "0.62rem",
          letterSpacing: "2px", color: "#3a6a8a",
        }}>LOAD BREAKDOWN CHART  <span style={{ color: "#2a4a5a" }}>· LAST {data.length} READINGS</span></div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { color: "#00d4ff", label: "Identified" },
            { color: "#ffd700", label: "Background" },
            { color: "#1a3a5a", label: "Untracked"  },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2, background: l.color,
              }} />
              <span style={{
                fontFamily: fontMono, fontSize: "0.62rem", color: "#5a8aaa",
              }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        width={Math.max(totalW, 600)}
        height={svgH}
        style={{ display: "block", minWidth: "100%" }}
      >
        {/* Y gridlines + labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padL} y1={g.y} x2={totalW} y2={g.y}
              stroke="#0f2a3a" strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "3,4"}
            />
            <text
              x={padL - 6} y={g.y + 4}
              textAnchor="end"
              fontSize="9" fill="#3a6a8a"
              fontFamily="JetBrains Mono, monospace"
            >{g.label}</text>
          </g>
        ))}

        {/* Bars */}
        {data.map((row, i) => {
          const x        = padL + i * (barW + gap);
          const identH   = (row.total_identified_w / maxW) * chartH;
          const bgH      = (row.total_bg_w         / maxW) * chartH;
          const totalH   = ((row.total_identified_w + row.total_bg_w) / maxW) * chartH;
          const aggH     = (row.aggregate_w         / maxW) * chartH;
          const unknownH = Math.max(0, aggH - totalH);
          const isHov    = hovered === i;

          // Short label — just time part
          const timePart = row.timestamp?.split(", ")[1]?.replace(" AM","a").replace(" PM","p") || "";

          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Hover bg */}
              {isHov && (
                <rect
                  x={x - 4} y={padT}
                  width={barW + 8} height={chartH}
                  fill="#ffffff08" rx="4"
                />
              )}

              {/* Unknown / untracked (top) */}
              {unknownH > 1 && (
                <rect
                  x={x}
                  y={padT + chartH - aggH}
                  width={barW} height={unknownH}
                  fill="#1a3a5a" rx="2"
                />
              )}

              {/* Background (middle) */}
              {bgH > 1 && (
                <rect
                  x={x}
                  y={padT + chartH - Math.min(totalH, aggH)}
                  width={barW} height={Math.min(bgH, aggH - identH)}
                  fill={isHov ? "#ffe844" : "#ffd700"}
                  opacity={isHov ? 1 : 0.85}
                  rx="2"
                />
              )}

              {/* Identified (bottom) */}
              {identH > 1 && (
                <rect
                  x={x}
                  y={padT + chartH - identH}
                  width={barW} height={identH}
                  fill={isHov ? "#22eeff" : "#00d4ff"}
                  opacity={isHov ? 1 : 0.85}
                  rx="2"
                />
              )}

              {/* Aggregate watts label on top */}
              {aggH > 8 && (
                <text
                  x={x + barW / 2} y={padT + chartH - aggH - 5}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isHov ? "#ffffff" : "#5a8aaa"}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {row.aggregate_w}
                </text>
              )}

              {/* X-axis time label */}
              <text
                x={x + barW / 2}
                y={padT + chartH + 14}
                textAnchor="middle"
                fontSize="8"
                fill={isHov ? "#00d4ff" : "#3a6a8a"}
                fontFamily="JetBrains Mono, monospace"
              >{timePart}</text>

              {/* Appliance emojis below time */}
              {row.detected?.length > 0 && (
                <text
                  x={x + barW / 2}
                  y={padT + chartH + 28}
                  textAnchor="middle"
                  fontSize="10"
                >
                  {row.detected.slice(0, 2).map(a => a.emoji).join("")}
                </text>
              )}

              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect
                    x={Math.min(x - 10, totalW - 130)}
                    y={padT}
                    width={128} height={70}
                    fill="#0a1a2a" stroke="#00d4ff44"
                    strokeWidth="1" rx="6"
                  />
                  <text x={Math.min(x - 4, totalW - 124)} y={padT + 14}
                    fontSize="8" fill="#00d4ff"
                    fontFamily="JetBrains Mono, monospace">
                    {row.aggregate_w}W total
                  </text>
                  <text x={Math.min(x - 4, totalW - 124)} y={padT + 27}
                    fontSize="8" fill="#00d4ff"
                    fontFamily="JetBrains Mono, monospace">
                    ↑ {row.total_identified_w}W identified
                  </text>
                  <text x={Math.min(x - 4, totalW - 124)} y={padT + 40}
                    fontSize="8" fill="#ffd700"
                    fontFamily="JetBrains Mono, monospace">
                    ↑ {Math.round(row.total_bg_w)}W background
                  </text>
                  <text x={Math.min(x - 4, totalW - 124)} y={padT + 53}
                    fontSize="8" fill="#ffaa44"
                    fontFamily="JetBrains Mono, monospace">
                    ₹{row.cost?.per_hour}/hr · ₹{row.cost?.monthly}/mo
                  </text>
                  <text x={Math.min(x - 4, totalW - 124)} y={padT + 66}
                    fontSize="8" fill="#3a6a8a"
                    fontFamily="JetBrains Mono, monospace">
                    {row.identified_pct}% identified
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main History Page ─────────────────────────────────────────────────────────
export default function History() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [useMock, setUseMock]       = useState(false);
  const [filter, setFilter]         = useState("all");   // all | detected | clean
  const [lastUpdate, setLastUpdate] = useState("");

  const font     = "'DM Sans', sans-serif";
  const fontMono = "'JetBrains Mono', monospace";

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
      .hist-row:hover { background: #0d1e2d !important; }
      .filt-btn:hover { border-color: #00d4ff88 !important; color: #00d4ff !important; }
    `;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const fetchData = async () => {
    try {
      const data = await getHistory();
      if (!Array.isArray(data) || data.length === 0) {
        setUseMock(true); setRows(MOCK_HISTORY);
      } else {
        setUseMock(false); setRows(data);
      }
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      setUseMock(true); setRows(MOCK_HISTORY);
      setError("Backend offline — showing demo data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const filtered = rows.filter(r => {
    if (filter === "detected") return r.detected?.length > 0;
    if (filter === "clean")    return r.detected?.length === 0;
    return true;
  });

  const peakWatts  = rows.length ? Math.max(...rows.map(r => r.aggregate_w)) : 0;
  // Chart data — last 20 readings, oldest first for left-to-right display
  const chartData  = [...rows].reverse().slice(-20);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070b12",
      color: "#d0e4f0",
      fontFamily: font,
      fontSize: "0.9rem",
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

        {/* ── HEADER ───────────────────────────────────────────────────── */}
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
            }}>📋</div>
            <div>
              <div style={{
                fontFamily: fontMono, fontSize: "0.95rem",
                letterSpacing: "2.5px", color: "#00d4ff", fontWeight: 500,
              }}>ENERGY HISTORY</div>
              <div style={{
                fontSize: "0.72rem", color: "#3a6a8a",
                letterSpacing: "1.5px", marginTop: 3,
              }}>
                SMART BUILDING · BENGALURU, KARNATAKA
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {useMock && (
              <span style={{ fontFamily: fontMono, fontSize: "0.62rem", color: "#ff8844", letterSpacing: 1 }}>
                DEMO MODE
              </span>
            )}
            {error && (
              <span style={{ fontSize: "0.7rem", color: "#ff6644" }}>⚠ {error}</span>
            )}
            {/* Refresh button */}
            <button onClick={fetchData} style={{
              background: "#0a1521", border: "1px solid #0f3a5a",
              borderRadius: 6, padding: "6px 14px",
              fontFamily: fontMono, fontSize: "0.65rem",
              color: "#00d4ff", letterSpacing: "1px",
              cursor: "pointer",
            }}>↺ REFRESH</button>
            <div style={{
              fontFamily: fontMono, fontSize: "0.65rem",
              color: "#2a4a5a", letterSpacing: 1,
            }}>
              {lastUpdate ? `FETCHED · ${lastUpdate}` : "—"}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "#3a6a8a", fontFamily: fontMono, fontSize: "0.85rem", letterSpacing: 2,
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>📋</div>
            LOADING HISTORY...
          </div>
        ) : (
          <>
            {/* ── COMPACT STAT CHIPS ────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "TOTAL READINGS", value: rows.length,       color: "#00d4ff" },
                { label: "PEAK LOAD",      value: `${peakWatts}W`,   color: "#ff6644" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: "#0c1521", border: `1px solid ${s.color}33`,
                  borderRadius: 8, padding: "8px 18px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: s.color, boxShadow: `0 0 6px ${s.color}88`,
                  }} />
                  <span style={{
                    fontFamily: fontMono, fontSize: "0.6rem",
                    letterSpacing: "1.5px", color: "#3a6a8a",
                  }}>{s.label}</span>
                  <span style={{
                    fontFamily: fontMono, fontSize: "0.95rem",
                    fontWeight: 700, color: s.color,
                  }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* ── STACKED BAR CHART ─────────────────────────────────── */}
            <LoadChart data={chartData} fontMono={fontMono} />

            {/* ── FILTER TABS ───────────────────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 16,
            }}>
              <span style={{
                fontFamily: fontMono, fontSize: "0.6rem",
                color: "#3a6a8a", letterSpacing: "1.5px", marginRight: 4,
              }}>FILTER</span>
              {[
                { key: "all",      label: `ALL  (${rows.length})` },
                { key: "detected", label: `WITH APPLIANCES  (${rows.filter(r=>r.detected?.length>0).length})` },
                { key: "clean",    label: `BACKGROUND ONLY  (${rows.filter(r=>r.detected?.length===0).length})` },
              ].map(f => (
                <button key={f.key} className="filt-btn" onClick={() => setFilter(f.key)} style={{
                  background: filter === f.key ? "#0a2a3a" : "#0a1521",
                  border: `1px solid ${filter === f.key ? "#00d4ff" : "#0f3a5a"}`,
                  borderRadius: 6, padding: "5px 14px",
                  fontFamily: fontMono, fontSize: "0.62rem",
                  color: filter === f.key ? "#00d4ff" : "#3a6a8a",
                  letterSpacing: "1px", cursor: "pointer",
                  transition: "all 0.15s",
                }}>{f.label}</button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{
                fontFamily: fontMono, fontSize: "0.62rem",
                color: "#2a4a5a",
              }}>
                SHOWING {filtered.length} RECORDS
              </div>
            </div>

            {/* ── HISTORY TABLE ─────────────────────────────────────── */}
            <div style={{
              background: "#0c1521", border: "1px solid #0f3a5a",
              borderRadius: 12, overflow: "hidden",
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 0.9fr 0.9fr 0.9fr 1.6fr 0.8fr 0.7fr",
                padding: "10px 20px",
                background: "#080f18",
                borderBottom: "1px solid #0f3a5a",
                gap: 8,
              }}>
                {["TIMESTAMP", "AGGREGATE", "IDENTIFIED", "BACKGROUND", "APPLIANCES DETECTED", "COST/HR", "MONTHLY"].map(h => (
                  <div key={h} style={{
                    fontFamily: fontMono, fontSize: "0.58rem",
                    letterSpacing: "1.5px", color: "#3a6a8a",
                  }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "40px",
                  color: "#3a6a8a", fontFamily: fontMono, fontSize: "0.8rem",
                }}>
                  NO RECORDS MATCH THIS FILTER
                </div>
              ) : (
                filtered.map((row, i) => {
                  const hasDetected = row.detected?.length > 0;
                  return (
                    <div key={i} className="hist-row" style={{
                      display: "grid",
                      gridTemplateColumns: "1.8fr 0.9fr 0.9fr 0.9fr 1.6fr 0.8fr 0.7fr",
                      padding: "12px 20px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #0a1a28" : "none",
                      gap: 8, alignItems: "center",
                      animation: `fadeUp 0.3s ease ${Math.min(i, 15) * 0.03}s both`,
                      cursor: "default",
                    }}>
                      {/* Timestamp */}
                      <div style={{
                        fontFamily: fontMono, fontSize: "0.75rem", color: "#5a8aaa",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                          background: hasDetected ? "#00ff88" : "#1a3a5a",
                          boxShadow: hasDetected ? "0 0 5px #00ff8866" : "none",
                        }} />
                        {row.timestamp}
                      </div>

                      {/* Aggregate */}
                      <div style={{
                        fontFamily: fontMono, fontSize: "0.85rem",
                        fontWeight: 600, color: "#00d4ff",
                      }}>{row.aggregate_w}W</div>

                      {/* Identified */}
                      <div>
                        <div style={{
                          fontFamily: fontMono, fontSize: "0.82rem",
                          color: "#00ff88",
                        }}>{row.total_identified_w}W</div>
                        <div style={{
                          fontFamily: fontMono, fontSize: "0.62rem",
                          color: "#3a6a8a", marginTop: 2,
                        }}>{row.identified_pct}%</div>
                      </div>

                      {/* Background */}
                      <div style={{
                        fontFamily: fontMono, fontSize: "0.82rem",
                        color: "#ffd700",
                      }}>{Math.round(row.total_bg_w)}W</div>

                      {/* Appliances — emoji pills */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {hasDetected ? (
                          row.detected.map((a, j) => (
                            <div key={j} style={{
                              display: "flex", alignItems: "center", gap: 4,
                              background: "#0a1e2d", border: "1px solid #0f3a5a",
                              borderRadius: 20, padding: "2px 8px",
                              fontSize: "0.72rem", color: "#9ab8cc",
                              whiteSpace: "nowrap",
                            }}>
                              <span>{a.emoji}</span>
                              <span style={{ fontFamily: fontMono }}>{a.watts}W</span>
                            </div>
                          ))
                        ) : (
                          <span style={{
                            fontFamily: fontMono, fontSize: "0.68rem",
                            color: "#2a4a5a", letterSpacing: 1,
                          }}>BACKGROUND ONLY</span>
                        )}
                      </div>

                      {/* Cost/hr */}
                      <div style={{
                        fontFamily: fontMono, fontSize: "0.85rem",
                        fontWeight: 600, color: "#ffaa44",
                      }}>₹{row.cost?.per_hour ?? "—"}</div>

                      {/* Monthly */}
                      <div style={{
                        fontFamily: fontMono, fontSize: "0.8rem",
                        color: "#ff6622",
                      }}>₹{row.cost?.monthly ?? "—"}</div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div style={{
              textAlign: "center", marginTop: 20,
              fontFamily: fontMono, fontSize: "0.62rem",
              color: "#1a3a5a", letterSpacing: 1,
            }}>
              {filtered.length} RECORDS · BESCOM ₹7.35/kWh · BENGALURU, KARNATAKA
            </div>
          </>
        )}
      </div>
    </div>
  );
}