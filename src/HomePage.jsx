import { useState, useEffect, useRef } from "react";

// ─── REAL APP DATA (from App.js) ───────────────────────────
const FEATURES = [
  {
    icon: "🛒",
    title: "POS / Billing",
    desc: "Fast point-of-sale with cart, GST calculation (0/5/12/18/28%), discount support, and instant printable invoices.",
    color: "#0ea5e9",
    tag: "Core"
  },
  {
    icon: "💊",
    title: "Medicine Master",
    desc: "Add and manage your full medicine list with category, unit, selling rate, purchase rate, and minimum stock levels.",
    color: "#10b981",
    tag: "Core"
  },
  {
    icon: "📦",
    title: "Inventory Tracking",
    desc: "Real-time stock levels calculated from purchases minus sales. Instantly see what's OK, Low, or Out of Stock.",
    color: "#6366f1",
    tag: "Core"
  },
  {
    icon: "🛍️",
    title: "Purchase Entry",
    desc: "Log every stock-in with batch number, expiry date, supplier name, and purchase rate to keep inventory accurate.",
    color: "#f59e0b",
    tag: "Core"
  },
  {
    icon: "⏰",
    title: "Expiry Tracker",
    desc: "See all medicines grouped as Expired, Expiring in 30 days, or Good Stock. Never dispense an expired medicine again.",
    color: "#ef4444",
    tag: "Safety"
  },
  {
    icon: "🔔",
    title: "Reorder Alerts",
    desc: "Automatically flags medicines below your set minimum stock level so you reorder before running out.",
    color: "#8b5cf6",
    tag: "Smart"
  },
  {
    icon: "↩️",
    title: "Returns & Refunds",
    desc: "Process full returns by invoice number. Return history is tracked separately and stock is automatically restored.",
    color: "#06b6d4",
    tag: "Core"
  },
  {
    icon: "📈",
    title: "Analytics",
    desc: "Revenue vs cost charts, profit trends, top medicines by revenue, payment method breakdown — all in one view.",
    color: "#10b981",
    tag: "Insights"
  },
  {
    icon: "🧾",
    title: "GST-Ready Invoices",
    desc: "Print professional invoices with your shop name, GSTIN, itemized GST, discount, and net total in one click.",
    color: "#f97316",
    tag: "Compliance"
  },
];

const HOW_STEPS = [
  { no: "01", title: "Sign Up Free", icon: "✍️", desc: "Create your account in under 2 minutes. Enter your shop name, phone, and GSTIN. No technical setup needed." },
  { no: "02", title: "Add Your Medicines", icon: "💊", desc: "Add medicines to your master list with category, unit, rates, and minimum stock. Or import via CSV." },
  { no: "03", title: "Enter Your Stock", icon: "📦", desc: "Log purchases with batch numbers and expiry dates. Inventory levels are calculated automatically." },
  { no: "04", title: "Start Billing", icon: "🛒", desc: "Open POS, search medicines, add to cart, apply GST and discount, and print the invoice. Done." },
];

const TESTIMONIALS = [
  {
    avatar: "RK",
    name: "Ramesh Kumar",
    role: "Owner, Shree Medicals, Nagpur",
    text: "Pehle Excel mein sab kuch likhta tha — ab sirf MedStock Pro. Expiry tracker ne mujhe ek baar bade nuqsan se bacha liya.",
    stars: 5,
    color: "#0ea5e9"
  },
  {
    avatar: "SP",
    name: "Sunita Patil",
    role: "Pharmacist, Patil Medical Store, Pune",
    text: "Billing itni fast ho gayi hai. GST automatically calculate hoti hai aur invoice bhi print ho jaata hai. Bohot helpful hai.",
    stars: 5,
    color: "#10b981"
  },
  {
    avatar: "AJ",
    name: "Arjun Joshi",
    role: "Owner, Jan Aushadhi, Solapur",
    text: "Reorder alerts aate hain toh main stock khatam hone se pehle order kar leta hoon. Puri inventory ek jagah dikhti hai.",
    stars: 5,
    color: "#8b5cf6"
  },
];

// ─── LOGO SVG ──────────────────────────────────────────────
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="url(#lg)" />
      <path d="M20 10v20M10 20h20" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="20" cy="20" r="5" fill="#fff" opacity="0.25"/>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0ea5e9"/>
          <stop offset="1" stopColor="#0284c7"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── ANIMATED COUNTER ──────────────────────────────────────
function Counter({ target, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef();
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const end = parseFloat(target);
        const dur = 1600;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal((ease * end).toFixed(end % 1 !== 0 ? 1 : 0));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

// ─── SCROLL REVEAL ─────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const ref = useRef();
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`
    }}>{children}</div>
  );
}

// ─── MAIN HOMEPAGE ─────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenu(false);
  };

  const NAV = [
    { label: "Features", id: "features" },
    { label: "How It Works", id: "howitworks" },
    { label: "Pricing", id: "pricing" },
    { label: "Reviews", id: "reviews" },
  ];

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", color: "#0f172a", background: "#fff", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.cdnfonts.com/css/clash-display" rel="stylesheet" />
      <style>{`
        :root {
          --blue: #0ea5e9;
          --blue-dark: #0284c7;
          --blue-light: #e0f2fe;
          --navy: #0c1a2e;
          --slate: #475569;
          --border: #e2e8f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }

        .display { font-family: 'Clash Display', 'Nunito', sans-serif; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--blue); color: #fff; border: none;
          padding: 13px 28px; border-radius: 10px; font-size: 0.97rem;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.2s; text-decoration: none;
        }
        .btn-primary:hover { background: var(--blue-dark); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(14,165,233,0.35); }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: var(--blue); border: 2px solid var(--blue);
          padding: 11px 26px; border-radius: 10px; font-size: 0.97rem;
          font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.2s; text-decoration: none;
        }
        .btn-outline:hover { background: var(--blue-light); transform: translateY(-2px); }

        .btn-ghost {
          background: none; border: none; color: #475569; font-size: 0.9rem;
          font-weight: 600; cursor: pointer; padding: 8px 14px; border-radius: 8px;
          font-family: inherit; transition: all 0.2s;
        }
        .btn-ghost:hover { color: var(--blue); background: var(--blue-light); }

        .feature-card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 16px;
          padding: 26px; transition: all 0.25s;
        }
        .feature-card:hover { border-color: var(--blue); transform: translateY(-5px); box-shadow: 0 16px 48px rgba(14,165,233,0.12); }

        .plan-card {
          background: #fff; border: 2px solid var(--border);
          border-radius: 20px; padding: 36px 30px; transition: all 0.25s;
        }
        .plan-card.featured {
          border-color: var(--blue); background: #f0f9ff;
          box-shadow: 0 20px 60px rgba(14,165,233,0.2);
        }
        .plan-card:hover:not(.featured) { border-color: #93c5fd; box-shadow: 0 8px 32px rgba(14,165,233,0.1); }

        .tcard {
          background: #f8fafc; border: 1.5px solid var(--border);
          border-radius: 16px; padding: 28px; transition: all 0.25s;
        }
        .tcard:hover { background: #fff; box-shadow: 0 8px 32px rgba(14,165,233,0.1); border-color: #bae6fd; }

        .tag {
          display: inline-block; font-size: 0.7rem; font-weight: 700;
          padding: 3px 10px; border-radius: 20px; text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .toggle-pill {
          display: flex; align-items: center; gap: 0;
          background: #f1f5f9; border-radius: 50px; padding: 4px;
          border: 1.5px solid var(--border);
        }
        .toggle-pill button {
          padding: 8px 22px; border-radius: 50px; border: none;
          font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: inherit;
          transition: all 0.2s;
        }

        .mob-menu { display: none; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mob-menu { display: block; }
          .hero-cols { flex-direction: column !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .plans-row { flex-direction: column !important; align-items: center !important; }
          .tgrid { grid-template-columns: 1fr !important; }
          .stats-row { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-cols { flex-direction: column !important; gap: 40px !important; }
          .mob-stack { flex-direction: column !important; align-items: flex-start !important; }
          .plan-card { width: 100% !important; max-width: 360px !important; }
        }
        @media (min-width: 769px) {
          .features-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "none",
        transition: "all 0.3s", padding: "0 5%"
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 66 }}>

          {/* Logo + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Logo size={36} />
            <div>
              <div className="display" style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0c1a2e", lineHeight: 1.1 }}>
                MedStock <span style={{ color: "var(--blue)" }}>Pro</span>
              </div>
              <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Smart Pharmacy Inventory</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV.map(n => <button key={n.id} className="btn-ghost" onClick={() => scrollTo(n.id)}>{n.label}</button>)}
          </div>

          {/* CTA */}
          <div className="desktop-nav" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href="/login" className="btn-outline" style={{ padding: "9px 20px", fontSize: "0.88rem" }}>Login</a>
            <a href="/signup" className="btn-primary" style={{ padding: "9px 22px", fontSize: "0.88rem" }}>Start Free Trial</a>
          </div>

          {/* Mobile Hamburger */}
          <button className="mob-menu btn-ghost" onClick={() => setMobileMenu(m => !m)} style={{ fontSize: "1.4rem", padding: "6px 10px" }}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div style={{ background: "#fff", borderTop: "1px solid var(--border)", padding: "16px 5%", display: "flex", flexDirection: "column", gap: 8 }}>
            {NAV.map(n => <button key={n.id} className="btn-ghost" onClick={() => scrollTo(n.id)} style={{ textAlign: "left", fontSize: "1rem" }}>{n.label}</button>)}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <a href="/login" className="btn-outline" style={{ flex: 1, justifyContent: "center", fontSize: "0.9rem" }}>Login</a>
              <a href="/signup" className="btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: "0.9rem" }}>Free Trial</a>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ paddingTop: 100, paddingBottom: 70, padding: "100px 5% 70px", background: "linear-gradient(150deg, #f0f9ff 0%, #fff 55%, #f8fafc 100%)", position: "relative", overflow: "hidden" }}>
        {/* BG decorations */}
        <div style={{ position: "absolute", top: 80, right: "6%", width: 380, height: 380, background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 40, left: "3%", width: 240, height: 240, background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        {/* Grid pattern */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.5, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>

          {/* Badge */}
          <div style={{ marginBottom: 24, animation: "fadeUp 0.6s ease forwards", opacity: 0 }}>
            <style>{`@keyframes fadeUp { to { opacity:1; transform:translateY(0); } } [style*="animation: fadeUp"] { transform: translateY(20px); }`}</style>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #bae6fd", borderRadius: 100, padding: "7px 16px", boxShadow: "0 2px 12px rgba(14,165,233,0.1)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 0 3px #dcfce7" }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0284c7" }}>30-Day Free Trial · No Credit Card Needed</span>
            </span>
          </div>

          <div className="hero-cols" style={{ display: "flex", alignItems: "center", gap: 56 }}>
            {/* LEFT */}
            <div style={{ flex: 1, maxWidth: 560 }}>
              <h1 className="display" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", fontWeight: 700, color: "#0c1a2e", lineHeight: 1.18, marginBottom: 22 }}>
                Apni Pharmacy ka<br />
                <span style={{ color: "var(--blue)", position: "relative" }}>
                  Poora Hisaab
                  <svg style={{ position: "absolute", bottom: -4, left: 0, width: "100%", height: 6 }} viewBox="0 0 300 6" fill="none">
                    <path d="M0 5 Q150 1 300 5" stroke="#0ea5e9" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5"/>
                  </svg>
                </span>{" "}— Ek Hi Jagah
              </h1>
              <p style={{ fontSize: "1.07rem", color: "#475569", lineHeight: 1.75, marginBottom: 32, maxWidth: 480 }}>
                MedStock Pro ek simple inventory software hai chhoti pharmacies ke liye — billing, stock tracking, expiry alerts, GST invoices, aur analytics sab kuch ek dashboard mein.
              </p>
              <div className="mob-stack" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
                <a href="/signup" className="btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
                  30 Din Free Try Karein →
                </a>
                <button className="btn-outline" onClick={() => scrollTo("features")} style={{ fontSize: "1rem" }}>
                  Features Dekhein
                </button>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {["✓ Free 30-day trial", "✓ No setup fees", "✓ Works on mobile"].map(t => (
                  <span key={t} style={{ fontSize: "0.83rem", color: "#64748b", fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </div>

            {/* RIGHT — Dashboard Mockup */}
            <div style={{ flex: 1, maxWidth: 520 }}>
              <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 32px 100px rgba(14,165,233,0.18), 0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {/* Window chrome */}
                <div style={{ background: "#1e293b", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["#f87171","#fbbf24","#4ade80"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, display: "inline-block" }} />)}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>medstockpro.vercel.app — Dashboard</span>
                  <div style={{ width: 50 }} />
                </div>

                {/* Topbar */}
                <div style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1rem" }}>💊</span>
                    <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>MedStock Pro</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ background: "#1e3a5f", color: "#38bdf8", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>👑 Admin</span>
                    <span style={{ background: "#064e3b", color: "#4ade80", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>🟢 Trial: 27d</span>
                  </div>
                </div>

                <div style={{ display: "flex", background: "#0f172a" }}>
                  {/* Sidebar */}
                  <div style={{ width: 130, background: "#1e293b", padding: "10px 0", borderRight: "1px solid #334155" }}>
                    {[["📊","Dashboard",true],["🛒","POS / Sale",false],["💊","Medicines",false],["📦","Inventory",false],["⏰","Expiry",false],["🔔","Reorder",false]].map(([icon, label, active]) => (
                      <div key={label} style={{ padding: "7px 12px", background: active ? "#0f172a" : "transparent", borderLeft: active ? "3px solid #0284c7" : "3px solid transparent", color: active ? "#f1f5f9" : "#64748b", fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{icon}</span><span>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Dashboard content */}
                  <div style={{ flex: 1, padding: 14, background: "#0f172a" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[["🛒","Today Sales","4","#0284c7"],["💰","Revenue","₹2,480","#059669"],["⚠️","Low Stock","3","#dc2626"],["⏰","Expiring","7","#d97706"]].map(([icon, label, val, color]) => (
                        <div key={label} style={{ background: "#1e293b", borderRadius: 8, padding: "10px", borderLeft: `3px solid ${color}` }}>
                          <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
                          <div style={{ color, fontWeight: 800, fontSize: 16 }}>{val}</div>
                          <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Mini table */}
                    <div style={{ background: "#1e293b", borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ padding: "6px 10px", background: "#334155", fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", display: "grid", gridTemplateColumns: "1fr 50px 50px 50px" }}>
                        <span>Medicine</span><span>Stock</span><span>Expiry</span><span>Status</span>
                      </div>
                      {[["Paracetamol 500mg","240","Jun 25","✅"],["Amoxicillin 250mg","8","Mar 25","🔴"],["Crocin Advance","45","Aug 25","✅"],["Azithromycin","3","Feb 25","⚠️"]].map(([n,s,e,st], i) => (
                        <div key={n} style={{ padding: "5px 10px", borderTop: "1px solid #0f172a", display: "grid", gridTemplateColumns: "1fr 50px 50px 50px", fontSize: 10, color: "#94a3b8", background: i % 2 === 0 ? "#1e293b" : "#172033" }}>
                          <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{n}</span>
                          <span>{s}</span><span>{e}</span><span>{st}</span>
                        </div>
                      ))}
                    </div>
                    {/* Alert */}
                    <div style={{ marginTop: 8, background: "#7c2d12", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#fca5a5", fontWeight: 600 }}>
                      ⚠️ Amoxicillin critically low — 8 units left. Reorder now!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MINI TRUST BAR ═══ */}
      <section style={{ background: "#0c1a2e", padding: "28px 5%" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: "clamp(24px,5vw,80px)", flexWrap: "wrap" }}>
          {[
            { icon: "🏪", label: "Single-store pharmacies" },
            { icon: "🇮🇳", label: "Made for India" },
            { icon: "📱", label: "Web + Mobile ready" },
            { icon: "🔒", label: "Your data, secure" },
            { icon: "💸", label: "No hidden charges" },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.1rem" }}>{icon}</span>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" style={{ padding: "96px 5%", background: "#fff" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em" }}>What's Inside</span>
              <h2 className="display" style={{ fontSize: "clamp(1.7rem, 4vw, 2.5rem)", fontWeight: 700, color: "#0c1a2e", marginTop: 10, marginBottom: 14 }}>
                Ek App, Sab Kaam
              </h2>
              <p style={{ fontSize: "1.03rem", color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.72 }}>
                Har feature specifically chhoti pharmacy ke daily kaam ke liye design kiya gaya hai — koi extra complexity nahi.
              </p>
            </div>
          </Reveal>

          <div className="features-grid" style={{ display: "grid", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="feature-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 13, background: `${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                      {f.icon}
                    </div>
                    <span className="tag" style={{ background: `${f.color}15`, color: f.color }}>{f.tag}</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: "1.02rem", color: "#0c1a2e", marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="howitworks" style={{ padding: "96px 5%", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Getting Started</span>
              <h2 className="display" style={{ fontSize: "clamp(1.7rem, 4vw, 2.5rem)", fontWeight: 700, color: "#0c1a2e", marginTop: 10, marginBottom: 14 }}>
                4 Steps Mein Shuru Karein
              </h2>
              <p style={{ fontSize: "1.03rem", color: "#64748b", maxWidth: 440, margin: "0 auto" }}>
                Koi IT knowledge nahi chahiye. Pehle din se hi kaam karna shuru karein.
              </p>
            </div>
          </Reveal>

          {/* Step tabs */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
            {HOW_STEPS.map((s, i) => (
              <button key={i} onClick={() => setActiveStep(i)} style={{
                padding: "10px 22px", borderRadius: 50, border: "none",
                background: activeStep === i ? "var(--blue)" : "#fff",
                color: activeStep === i ? "#fff" : "#64748b",
                fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
                boxShadow: activeStep === i ? "0 4px 16px rgba(14,165,233,0.3)" : "0 1px 4px rgba(0,0,0,0.08)",
                border: activeStep === i ? "none" : "1.5px solid var(--border)",
                fontFamily: "inherit", transition: "all 0.2s"
              }}>
                {s.icon} Step {s.no}
              </button>
            ))}
          </div>

          <Reveal>
            <div style={{ background: "#fff", borderRadius: 20, padding: "44px 48px", border: "1.5px solid var(--border)", maxWidth: 680, margin: "0 auto", boxShadow: "0 8px 40px rgba(14,165,233,0.08)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
                <div style={{ width: 68, height: 68, borderRadius: 18, background: "linear-gradient(135deg, var(--blue) 0%, #0369a1 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px rgba(14,165,233,0.3)" }}>
                  <span style={{ fontSize: "1.8rem" }}>{HOW_STEPS[activeStep].icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Step {HOW_STEPS[activeStep].no}</div>
                  <h3 className="display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0c1a2e", marginBottom: 12 }}>{HOW_STEPS[activeStep].title}</h3>
                  <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.72 }}>{HOW_STEPS[activeStep].desc}</p>
                </div>
              </div>
              {/* Progress dots */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 32 }}>
                {HOW_STEPS.map((_, i) => (
                  <button key={i} onClick={() => setActiveStep(i)} style={{ width: i === activeStep ? 28 : 10, height: 10, borderRadius: 5, background: i === activeStep ? "var(--blue)" : "#e2e8f0", border: "none", cursor: "pointer", transition: "all 0.3s" }} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" style={{ padding: "96px 5%", background: "#fff" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Simple Pricing</span>
              <h2 className="display" style={{ fontSize: "clamp(1.7rem, 4vw, 2.5rem)", fontWeight: 700, color: "#0c1a2e", marginTop: 10, marginBottom: 14 }}>
                Sab Ke Liye Affordable
              </h2>
              <p style={{ fontSize: "1.03rem", color: "#64748b", marginBottom: 28 }}>
                30 din free. Phir sirf ₹149/month ya bachat ke liye annual plan lein.
              </p>
              {/* Annual/Monthly toggle */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
                <div className="toggle-pill">
                  <button onClick={() => setAnnual(false)} style={{ background: !annual ? "var(--blue)" : "transparent", color: !annual ? "#fff" : "#64748b" }}>Monthly</button>
                  <button onClick={() => setAnnual(true)} style={{ background: annual ? "var(--blue)" : "transparent", color: annual ? "#fff" : "#64748b" }}>Annual</button>
                </div>
                {annual && <span style={{ background: "#dcfce7", color: "#16a34a", padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700 }}>🎉 Save ₹789/year</span>}
              </div>
            </div>
          </Reveal>

          <div className="plans-row" style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "stretch", flexWrap: "wrap" }}>

            {/* FREE TRIAL */}
            <Reveal delay={0}>
              <div className="plan-card" style={{ width: 310 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: "1.5rem" }}>🆓</span>
                </div>
                <div className="display" style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0c1a2e", marginBottom: 6 }}>Free Trial</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: "2.8rem", fontWeight: 700, color: "#22c55e" }}>₹0</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>/ 30 days</span>
                </div>
                <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: 26, lineHeight: 1.6 }}>
                  Poora app try karein bina koi payment ke. Credit card ki zaroorat nahi.
                </p>
                <div style={{ marginBottom: 28 }}>
                  {["Full POS access", "All 9 modules unlocked", "Unlimited medicines", "GST invoices", "Expiry + Reorder alerts", "Analytics dashboard"].map(f => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: "0.9rem", color: "#475569" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#16a34a", fontWeight: 800, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/signup" className="btn-outline" style={{ width: "100%", justifyContent: "center", display: "flex" }}>Start Free Trial</a>
              </div>
            </Reveal>

            {/* MONTHLY */}
            <Reveal delay={0.1}>
              <div className="plan-card featured" style={{ width: 310, position: "relative" }}>
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--blue)", color: "#fff", fontSize: "0.75rem", fontWeight: 800, padding: "5px 18px", borderRadius: 100, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(14,165,233,0.4)" }}>
                  ⭐ Most Popular
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: "1.5rem" }}>📅</span>
                </div>
                <div className="display" style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0c1a2e", marginBottom: 6 }}>Monthly</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                  <span className="display" style={{ fontSize: "2.8rem", fontWeight: 700, color: "var(--blue)" }}>
                    {annual ? "₹83" : "₹149"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "0.9rem" }}>/ month</span>
                </div>
                {annual && <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 4, textDecoration: "line-through" }}>₹149/month</div>}
                <p style={{ fontSize: "0.88rem", color: "#475569", marginBottom: 26, lineHeight: 1.6 }}>
                  {annual ? "₹999 billed annually — 2 months free!" : "Har mahine pay karein. Kisi bhi time cancel karein."}
                </p>
                <div style={{ marginBottom: 28 }}>
                  {["Everything in Free Trial", "Unlimited sales & purchases", "Printable GST invoices", "Returns management", "Revenue analytics", "Email support"].map(f => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: "0.9rem", color: "#0c1a2e" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#fff", fontWeight: 800, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/signup" className="btn-primary" style={{ width: "100%", justifyContent: "center", display: "flex" }}>
                  {annual ? "Get Annual Plan →" : "Subscribe Monthly →"}
                </a>
                {annual && <div style={{ textAlign: "center", fontSize: "0.78rem", color: "#059669", fontWeight: 700, marginTop: 10 }}>✓ Save ₹789 vs monthly billing</div>}
              </div>
            </Reveal>

            {/* ANNUAL */}
            <Reveal delay={0.2}>
              <div className="plan-card" style={{ width: 310, background: "#0c1a2e", borderColor: "#1e3a5f" }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: "1.5rem" }}>📆</span>
                </div>
                <div className="display" style={{ fontWeight: 700, fontSize: "1.2rem", color: "#f1f5f9", marginBottom: 6 }}>Annual</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span className="display" style={{ fontSize: "2.8rem", fontWeight: 700, color: "#38bdf8" }}>₹999</span>
                  <span style={{ color: "#64748b", fontSize: "0.9rem" }}>/ year</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: 700, marginBottom: 8 }}>₹83/month — 2 mahine free!</div>
                <p style={{ fontSize: "0.88rem", color: "#94a3b8", marginBottom: 26, lineHeight: 1.6 }}>
                  Ek baar pay karein aur poora saal tension-free rahein.
                </p>
                <div style={{ marginBottom: 28 }}>
                  {["Everything in Monthly", "Best price per month", "2 months free vs monthly", "Priority email support", "Early access to new features"].map(f => (
                    <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: "0.9rem", color: "#cbd5e1" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#1e3a5f", border: "1.5px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#38bdf8", fontWeight: 800, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a href="/signup" style={{ width: "100%", justifyContent: "center", display: "flex", background: "#38bdf8", color: "#0c1a2e", border: "none", padding: "13px 28px", borderRadius: 10, fontSize: "0.97rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", textAlign: "center" }}>
                  Get Annual Plan →
                </a>
              </div>
            </Reveal>
          </div>

          {/* Pricing note */}
          <Reveal>
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                💳 Razorpay se secure payment · UPI, Card, Net Banking accept · GST invoice milega
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="reviews" style={{ padding: "96px 5%", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Real Users</span>
              <h2 className="display" style={{ fontSize: "clamp(1.7rem, 4vw, 2.5rem)", fontWeight: 700, color: "#0c1a2e", marginTop: 10 }}>
                Pharmacists Kya Kehte Hain
              </h2>
            </div>
          </Reveal>

          <div className="tgrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.1}>
                <div className="tcard">
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {[...Array(t.stars)].map((_, j) => <span key={j} style={{ color: "#f59e0b", fontSize: "1rem" }}>★</span>)}
                  </div>
                  <p style={{ fontSize: "0.93rem", color: "#475569", lineHeight: 1.72, marginBottom: 22, fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${t.color}22`, border: `2px solid ${t.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800, color: t.color, flexShrink: 0 }}>{t.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0c1a2e" }}>{t.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ textAlign: "center", marginTop: 44, padding: "28px 32px", background: "#fff", border: "1.5px solid var(--border)", borderRadius: 16, maxWidth: 480, margin: "44px auto 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.65 }}>
                Abhi early stage mein hain — <strong style={{ color: "#0c1a2e" }}>pehle users mein se ek bano</strong> aur apni pharmacy ka workflow completely badlo.
              </p>
              <a href="/signup" className="btn-primary" style={{ marginTop: 18, justifyContent: "center", display: "inline-flex" }}>
                Free Trial Shuru Karein
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ padding: "80px 5%", background: "#fff" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.1em" }}>FAQ</span>
              <h2 className="display" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 700, color: "#0c1a2e", marginTop: 10 }}>Aam Sawaal</h2>
            </div>
          </Reveal>
          {[
            ["Kya credit card chahiye trial ke liye?", "Nahi. 30 din ka free trial bina kisi payment ke milta hai. Sirf email se signup karein."],
            ["Kya ye mobile pe bhi chalta hai?", "Haan! MedStock Pro web aur mobile dono pe kaam karta hai. Kisi bhi browser mein open karein."],
            ["GST invoice print ho sakti hai?", "Bilkul. Har sale pe ek click mein GST-ready invoice generate aur print hoti hai — shop name, GSTIN, item-wise GST sab included."],
            ["Agar main trial ke baad upgrade na karoon?", "30 din baad account lock ho jaata hai. Aap apna data export kar sakte ho. Koi hidden charge nahi."],
            ["Multiple branches ke liye kaam karta hai?", "Abhi sirf single-store pharmacies ke liye design kiya gaya hai. Multi-branch support future mein aayega."],
            ["Payment kaise hogi?", "Razorpay se — UPI, Credit/Debit Card, Net Banking sab accept hota hai. Aapko apna GST invoice bhi milega."],
          ].map(([q, a], i) => <FAQItem key={i} q={q} a={a} />)}
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section style={{ padding: "80px 5%", background: "linear-gradient(135deg, #0c1a2e 0%, #0ea5e9 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 250, height: 250, border: "1px solid rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <Reveal>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: "2.8rem", marginBottom: 16 }}>💊</div>
            <h2 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "#fff", marginBottom: 16 }}>
              Apni Pharmacy Ko Digital Banao Aaj
            </h2>
            <p style={{ fontSize: "1.07rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.72, marginBottom: 36 }}>
              30 din free. No credit card. Koi commitment nahi. Bas signup karo aur aaj se hi stock track karna shuru karo.
            </p>
            <div className="mob-stack" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/signup" style={{ background: "#fff", color: "var(--blue)", border: "none", padding: "14px 36px", borderRadius: 10, fontSize: "1rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8 }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.2)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                30 Din Free Trial Shuru Karein →
              </a>
              <a href="/login" style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.5)", padding: "13px 28px", borderRadius: 10, fontSize: "1rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Login Karein
              </a>
            </div>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: 18 }}>
              ✓ Free 30 days &nbsp;·&nbsp; ✓ No card needed &nbsp;·&nbsp; ✓ Cancel anytime
            </p>
          </div>
        </Reveal>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "#060d1a", padding: "56px 5% 28px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="footer-cols" style={{ display: "flex", justifyContent: "space-between", marginBottom: 44, gap: 32, flexWrap: "wrap" }}>

            {/* Brand */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Logo size={34} />
                <div>
                  <div className="display" style={{ fontWeight: 700, fontSize: "1.1rem", color: "#f1f5f9" }}>MedStock <span style={{ color: "#38bdf8" }}>Pro</span></div>
                  <div style={{ fontSize: "0.6rem", color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Smart Pharmacy Inventory</div>
                </div>
              </div>
              <p style={{ fontSize: "0.87rem", color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
                Chhoti pharmacies ke liye bana simple aur affordable inventory management software. Billing, stock, expiry — sab kuch ek jagah.
              </p>
              {/* Social */}
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "📧", href: "mailto:vaibhavkhandare0462@gmail.com", tip: "Email" },
                  { label: "𝕏", href: "https://x.com", tip: "Twitter / X" },
                  { label: "in", href: "https://linkedin.com", tip: "LinkedIn" },
                ].map(s => (
                  <a key={s.label} href={s.href} title={s.tip} style={{ width: 36, height: 36, borderRadius: 8, background: "#1e293b", border: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "0.85rem", fontWeight: 800, textDecoration: "none", transition: "all 0.2s" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#0ea5e9"; e.currentTarget.style.color = "#fff"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#64748b"; }}>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>App</div>
              {[["Login", "/login"], ["Sign Up", "/signup"], ["Dashboard", "/dashboard"]].map(([l, h]) => (
                <a key={l} href={h} style={{ display: "block", fontSize: "0.88rem", color: "#475569", marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => e.target.style.color = "#38bdf8"}
                  onMouseOut={e => e.target.style.color = "#475569"}>{l}</a>
              ))}
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Features</div>
              {["POS & Billing", "Inventory Tracking", "Expiry Tracker", "Reorder Alerts", "Analytics", "GST Invoices"].map(l => (
                <div key={l} style={{ fontSize: "0.88rem", color: "#475569", marginBottom: 12, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseOver={e => e.target.style.color = "#38bdf8"}
                  onMouseOut={e => e.target.style.color = "#475569"}>{l}</div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Support</div>
              {[["Contact Us", "mailto:vaibhavkhandare0462@gmail.com"], ["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms"], ["Refund Policy", "/refund-policy"]].map(([l, h]) => (
                <a key={l} href={h} style={{ display: "block", fontSize: "0.88rem", color: "#475569", marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => e.target.style.color = "#38bdf8"}
                  onMouseOut={e => e.target.style.color = "#475569"}>{l}</a>
              ))}
              {/* Pricing highlight */}
              <div style={{ marginTop: 20, background: "#1e293b", borderRadius: 10, padding: "14px 16px", border: "1px solid #334155" }}>
                <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>💸 Pricing</div>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: "1rem" }}>₹149/mo</div>
                <div style={{ color: "#475569", fontSize: "0.75rem" }}>or ₹999/year · 30d free trial</div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: "0.82rem", color: "#334155" }}>© 2025 MedStock Pro. All rights reserved.</span>
            <span style={{ fontSize: "0.82rem", color: "#334155" }}>🇮🇳 Made with ❤️ for Indian Pharmacists</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── FAQ ACCORDION ─────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal>
      <div style={{ border: "1.5px solid var(--border)", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
        <button onClick={() => setOpen(o => !o)} style={{ width: "100%", background: open ? "#f0f9ff" : "#fff", border: "none", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ fontWeight: 700, fontSize: "0.97rem", color: "#0c1a2e" }}>{q}</span>
          <span style={{ color: "var(--blue)", fontSize: "1.1rem", fontWeight: 800, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 12 }}>+</span>
        </button>
        {open && (
          <div style={{ background: "#f0f9ff", padding: "14px 20px 18px", borderTop: "1px solid #bae6fd" }}>
            <p style={{ fontSize: "0.92rem", color: "#475569", lineHeight: 1.7, margin: 0 }}>{a}</p>
          </div>
        )}
      </div>
    </Reveal>
  );
}