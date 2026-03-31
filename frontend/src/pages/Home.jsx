import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate  = useNavigate();
  const font      = "'DM Sans', sans-serif";
  const fontMono  = "'JetBrains Mono', monospace";
  const canvasRef = useRef(null);

  // ── Animated particle grid on canvas ───────────────────────────────────────
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #070b12; overflow-x: hidden; }
      @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
      @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
      @keyframes floatY   { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
      @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
      .cta-btn:hover { background: #00d4ff !important; color: #070b12 !important; transform: translateY(-2px); box-shadow: 0 8px 30px #00d4ff44 !important; }
      .step-card:hover { border-color: #1a4a6a !important; transform: translateY(-3px); }
      .feat-card:hover { border-color: #00d4ff33 !important; background: #0d1e2d !important; }
    `;
    document.head.appendChild(el);

    // Particle canvas
    const canvas  = canvasRef.current;
    if (!canvas) return;
    const ctx     = canvas.getContext("2d");
    let W         = canvas.width  = window.innerWidth;
    let H         = canvas.height = window.innerHeight;
    const particles = [];
    const COUNT   = 90;

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.55 + 0.2,
      });
    }

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        // Glow effect
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grd.addColorStop(0, `rgba(0,212,255,${p.alpha})`);
        grd.addColorStop(1, `rgba(0,212,255,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // Solid core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,230,255,${p.alpha + 0.2})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.12 * (1 - d/150)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.head.removeChild(el);
    };
  }, []);

  // ── How it works steps ──────────────────────────────────────────────────────
  const steps = [
    {
      num: "01",
      icon: "🔌",
      title: "Sensor Reads Power",
      desc: "ESP32 + SCT-013 current transformer clamps on the main wire. Reads aggregate household wattage every 8 seconds — no rewiring, no per-device sensors.",
      color: "#00d4ff",
    },
    {
      num: "02",
      icon: "🧠",
      title: "ML Model Disaggregates",
      desc: "A sliding window of 15 readings feeds into a Random Forest model trained on the REFIT dataset. It identifies which appliances are running and estimates their individual wattage.",
      color: "#00ff88",
    },
    {
      num: "03",
      icon: "⚡",
      title: "Flask Backend Processes",
      desc: "The Flask API receives sensor data, runs the NILM prediction pipeline, applies physical constraints, calculates BESCOM tariff costs, and stores results in SQLite.",
      color: "#ffd700",
    },
    {
      num: "04",
      icon: "📊",
      title: "Dashboard Visualises",
      desc: "The React dashboard polls live data every 5 seconds — showing detected appliances, power breakdown, cost projections, and energy advisories in real time.",
      color: "#ff8844",
    },
  ];

  // ── Feature highlights ──────────────────────────────────────────────────────
  const features = [
    { icon: "🔍", title: "Non-Intrusive",     desc: "Single sensor on the main line. No per-appliance hardware needed." },
    { icon: "🤖", title: "ML-Powered",        desc: "Random Forest trained on real UK household data — 4 appliances tracked." },
    { icon: "💰", title: "Cost Prediction",   desc: "Live BESCOM tariff calculations — hourly, daily, and monthly bill estimates." },
    { icon: "📡", title: "IoT Integration",   desc: "ESP32 microcontroller sends live readings via HTTP POST every 8 seconds." },
    { icon: "🏠", title: "Indian Context",    desc: "Appliance names, BESCOM tariff, Karnataka usage patterns built in." },
    { icon: "📋", title: "History & Trends",  desc: "SQLite stores all readings. History page shows breakdown charts over time." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#070b12", color: "#d0e4f0", fontFamily: font, overflowX: "hidden" }}>

      {/* ── Particle canvas background ──────────────────────────────── */}
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      }} />

      {/* ── Grid overlay ───────────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,200,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,200,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── NAVBAR ─────────────────────────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 52,
          background: "#070b12cc",
          borderBottom: "1px solid #0f3a5a",
          backdropFilter: "blur(12px)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #00d4ff22, #ff880022)",
              border: "1px solid #00d4ff44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>⚡</div>
            <span style={{
              fontFamily: fontMono, fontSize: "0.75rem",
              letterSpacing: "2px", color: "#00d4ff", fontWeight: 500,
            }}>NILM</span>
          </div>
          {/* Nav links */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { label: "", path: "/dashboard" },
            //   { label: "History",   path: "/history"   },
            ].map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} style={{
                background: "transparent", border: "1px solid transparent",
                borderRadius: 6, padding: "5px 14px",
                fontFamily: fontMono, fontSize: "0.65rem",
                letterSpacing: "1.5px", color: "#3a6a8a",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.target.style.color="#00d4ff"; e.target.style.borderColor="#00d4ff44"; }}
              onMouseLeave={e => { e.target.style.color="#3a6a8a"; e.target.style.borderColor="transparent"; }}
              >{l.label}</button>
            ))}
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────────── */}
        <section style={{
          minHeight: "100vh", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "52px 28px",
          textAlign: "center",
        }}>
          {/* Center — headline + CTA only */}
          <div style={{ maxWidth: 680 }}>
            <div style={{
              fontFamily: fontMono, fontSize: "0.6rem",
              letterSpacing: "3px", color: "#3a6a8a",
              marginBottom: 22,
              animation: "fadeUp 0.6s ease 0.1s both",
            }}></div>

            <h1 style={{
              fontSize: "clamp(2.4rem, 5.5vw, 4.4rem)",
              fontWeight: 700, lineHeight: 1.08,
              letterSpacing: "-0.5px", marginBottom: 22,
              animation: "fadeUp 0.7s ease 0.15s both",
            }}>
              <span style={{ color: "#ffffff" }}>Know Every Watt</span>
              <br />
              <span style={{
                background: "linear-gradient(90deg, #00d4ff, #00ff88)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>In Your House</span>
            </h1>

            <p style={{
              fontSize: "1rem", color: "#5a8aaa", lineHeight: 1.75,
              maxWidth: 480, margin: "0 auto 36px",
              animation: "fadeUp 0.7s ease 0.25s both",
            }}>
              A single IoT sensor on your main line. A Random Forest ML model.
              Real-time appliance detection, cost prediction, and energy advisories
              — built for Indian homes.
            </p>

            <div style={{
              display: "flex", gap: 12, justifyContent: "center",
              flexWrap: "wrap",
              animation: "fadeUp 0.7s ease 0.35s both",
            }}>
              <button className="cta-btn" onClick={() => navigate("/dashboard")} style={{
                background: "transparent", border: "1px solid #00d4ff",
                borderRadius: 8, padding: "13px 32px",
                fontFamily: fontMono, fontSize: "0.78rem",
                letterSpacing: "2px", color: "#00d4ff",
                cursor: "pointer", transition: "all 0.2s",
              }}>OPEN DASHBOARD →</button>
              {/* <button className="cta-btn" onClick={() => navigate("/history")} style={{
                background: "transparent", border: "1px solid #0f3a5a",
                borderRadius: 8, padding: "13px 32px",
                fontFamily: fontMono, fontSize: "0.78rem",
                letterSpacing: "2px", color: "#3a6a8a",
                cursor: "pointer", transition: "all 0.2s",
              }}>VIEW HISTORY</button> */}
            </div>
          </div>

          {/* Scroll hint */}
          <div style={{
            position: "absolute", bottom: 28, left: "50%",
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "floatY 2.5s ease-in-out infinite",
          }}>
            <span style={{
              fontFamily: fontMono, fontSize: "0.55rem",
              letterSpacing: "2px", color: "#1a3a5a",
            }}>SCROLL</span>
            <div style={{ width: 1, height: 24, background: "linear-gradient(to bottom, #1a3a5a, transparent)" }} />
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
        <section style={{ padding: "80px 28px", maxWidth: 1100, margin: "0 auto" }}>

          {/* Section label */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginBottom: 48,
          }}>
            <div style={{ flex: 1, height: 1, background: "#0f3a5a" }} />
            <span style={{
              fontFamily: fontMono, fontSize: "0.65rem",
              letterSpacing: "3px", color: "#3a6a8a",
            }}>HOW IT WORKS</span>
            <div style={{ flex: 1, height: 1, background: "#0f3a5a" }} />
          </div>

          {/* Steps */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {steps.map((s, i) => (
              <div key={i} className="step-card" style={{
                background: "#0c1521",
                border: "1px solid #0f3a5a",
                borderRadius: 12, padding: "24px 22px",
                position: "relative", overflow: "hidden",
                transition: "all 0.2s",
              }}>
                {/* Top accent line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: s.color,
                }} />

                {/* Step number */}
                <div style={{
                  fontFamily: fontMono, fontSize: "0.6rem",
                  letterSpacing: "2px", color: "#1a3a5a",
                  marginBottom: 14,
                }}>{s.num}</div>

                {/* Icon */}
                <div style={{ fontSize: "1.8rem", marginBottom: 12, lineHeight: 1 }}>
                  {s.icon}
                </div>

                {/* Title */}
                <div style={{
                  fontSize: "0.95rem", fontWeight: 600,
                  color: s.color, marginBottom: 10,
                }}>{s.title}</div>

                {/* Desc */}
                <div style={{
                  fontSize: "0.8rem", color: "#5a8aaa",
                  lineHeight: 1.65,
                }}>{s.desc}</div>

                {/* Arrow connector (not last) */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", right: -12, top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: fontMono, fontSize: "0.8rem",
                    color: "#1a3a5a", zIndex: 2,
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────────── */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginBottom: 40,
          }}>
            <div style={{ flex: 1, height: 1, background: "#0f3a5a" }} />
            <span style={{
              fontFamily: fontMono, fontSize: "0.65rem",
              letterSpacing: "3px", color: "#3a6a8a",
            }}>FEATURES</span>
            <div style={{ flex: 1, height: 1, background: "#0f3a5a" }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {features.map((f, i) => (
              <div key={i} className="feat-card" style={{
                background: "#0a1521",
                border: "1px solid #0f2a3a",
                borderRadius: 10, padding: "20px 18px",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{f.icon}</div>
                <div style={{
                  fontSize: "0.88rem", fontWeight: 600,
                  color: "#c0d8e8", marginBottom: 8,
                }}>{f.title}</div>
                <div style={{
                  fontSize: "0.76rem", color: "#3a6a8a", lineHeight: 1.6,
                }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ─────────────────────────────────────────────── */}
        <section style={{
          padding: "60px 28px 80px",
          textAlign: "center",
          borderTop: "1px solid #0f3a5a",
        }}>
          <div style={{
            fontFamily: fontMono, fontSize: "0.6rem",
            letterSpacing: "3px", color: "#3a6a8a", marginBottom: 18,
          }}>READY TO MONITOR</div>
          <h2 style={{
            fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
            fontWeight: 700, color: "#ffffff",
            marginBottom: 14,
          }}>Start Monitoring Your Building</h2>
          <p style={{
            fontSize: "0.88rem", color: "#5a8aaa",
            maxWidth: 420, margin: "0 auto 32px",
            lineHeight: 1.7,
          }}>
            Live dashboard updates every 5 seconds.
            Connect your ESP32 sensor and go.
          </p>
          <button
            className="cta-btn"
            onClick={() => navigate("/dashboard")}
            style={{
              background: "transparent",
              border: "1px solid #00d4ff",
              borderRadius: 8, padding: "13px 32px",
              fontFamily: fontMono, fontSize: "0.78rem",
              letterSpacing: "2px", color: "#00d4ff",
              cursor: "pointer", transition: "all 0.2s",
              marginRight: 12,
            }}
          >
            OPEN DASHBOARD →
          </button>
          <button
            className="cta-btn"
            onClick={() => navigate("/history")}
            style={{
              background: "transparent",
              border: "1px solid #0f3a5a",
              borderRadius: 8, padding: "13px 32px",
              fontFamily: fontMono, fontSize: "0.78rem",
              letterSpacing: "2px", color: "#3a6a8a",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            VIEW HISTORY
          </button>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid #0a1e2d",
          padding: "20px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8,
        }}>
          <div style={{
            fontFamily: fontMono, fontSize: "0.62rem",
            letterSpacing: "1.5px", color: "#1a3a5a",
          }}>⚡ NILM ENERGY MONITOR · SMART BUILDING PROJECT</div>
          <div style={{
            fontFamily: fontMono, fontSize: "0.62rem",
            color: "#1a3a5a",
          }}>BENGALURU, KARNATAKA · BESCOM ₹7.35/kWh</div>
        </footer>

      </div>
    </div>
  );
}