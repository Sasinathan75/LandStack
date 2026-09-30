import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, ChevronRight, FileCheck2, Globe2, LandPlot, LockKeyhole, Map, ScanSearch, ShieldCheck, Sparkles, Users, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useLandStack } from "@/contexts/LandStackContext";

const capabilities = [
  { icon: Map, label: "GIS explorer", text: "Explore parcels as the primary unit of land intelligence." },
  { icon: FileCheck2, label: "Unified records", text: "Bring ownership, use, tax and utility context together." },
  { icon: ScanSearch, label: "AI validation", text: "Prepare for mismatch detection and risk-aware reviews." },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useLandStack();

  useEffect(() => {
    document.title = "LandStack · One parcel, one identity";
  }, []);

  const enterPortal = (role: "government" | "citizen") => {
    // Role persistence removed; navigate directly.
    setLocation(role === "government" ? "/government" : "/citizen");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="landing-page">
      <header className="landing-nav"><a className="landing-brand" href="/"><span className="brand-mark"><LandPlot size={18} strokeWidth={2.4} /></span><span><strong>LANDSTACK</strong><small>Land intelligence platform</small></span></a><div className="landing-nav-center desktop-only"><span>Product foundation</span><span>For government</span><span>For citizens</span></div><div className="landing-nav-right">
        <button className="theme-toggle-btn" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', color: 'var(--ink)' }}>
          {theme === 'light' ? <><Moon size={15}/> <span>Dark</span></> : <><Sun size={15}/> <span>Light</span></>}
        </button>
        <span className="secure-label"><LockKeyhole size={13} /> Secure by design</span><button className="nav-enter-button" onClick={() => setLocation("/login")}>Enter workspace <ArrowRight size={14} /></button></div></header>

      <main>
        <section className="landing-hero"><div className="hero-ambient ambient-one" /><div className="hero-ambient ambient-two" /><div className="hero-copy"><div className="hero-eyebrow"><span className="eyebrow-dot" /> CIVIC TECHNOLOGY FOR LAND GOVERNANCE</div><h1>Every parcel has a story.<br /><span>Make it legible.</span></h1><p className="hero-lede">LandStack brings fragmented land records, maps, validation signals and citizen services together around one trusted parcel identity.</p><div className="hero-actions"><button className="primary-button hero-primary" onClick={() => document.getElementById("portals")?.scrollIntoView({ behavior: "smooth" })}>Choose your workspace <ArrowRight size={16} /></button><button className="quiet-button" onClick={() => toast.info("LandStack is being built in progressive stages", { description: "Stage 1 establishes the shell, roles and parcel intelligence foundation." })}><Sparkles size={15} /> See what’s inside</button></div><div className="hero-trust"><div className="trust-avatar-stack"><span>G</span><span>C</span><span>AI</span></div><span>One platform · Two clear experiences · Synthetic Data</span></div></div><div className="hero-visual"><div className="hero-map-frame"><div className="hero-map-top"><span><span className="live-dot" /> LIVE EXTENT</span><span className="mono-text">17.4621° N · 78.3657° E</span></div><div className="hero-map-canvas"><div className="hero-map-grid" /><div className="hero-map-route route-a" /><div className="hero-map-route route-b" /><div className="hero-map-shape shape-a" /><div className="hero-map-shape shape-b" /><div className="hero-map-shape shape-c" /><div className="hero-map-shape shape-d" /><div className="hero-map-pin pin-a"><Map size={14} /></div><div className="hero-map-pin pin-b"><Map size={14} /></div><div className="hero-map-tag tag-a">LS-PAR-0428</div><div className="hero-map-tag tag-b">Verified</div><div className="hero-map-label label-a">Kondapur</div><div className="hero-map-label label-b">Serilingampally</div></div><div className="hero-map-bottom"><span><i className="legend-dot legend-green" /> 9,841 verified</span><span><i className="legend-dot legend-amber" /> 218 in review</span><span><i className="legend-dot legend-red" /> 34 high-risk</span></div></div><div className="hero-float-card float-card-top"><span className="float-icon float-icon-green"><Check size={15} /></span><div><strong>Identity verified</strong><small>One parcel · one source of truth</small></div></div><div className="hero-float-card float-card-bottom"><span className="float-icon float-icon-blue"><Globe2 size={15} /></span><div><strong>Land intelligence</strong><small>Connected, parcel-centric, ready</small></div></div></div></section>

        <section className="principle-strip"><div className="principle-label"><span className="eyebrow accent-blue">THE FOUNDING PRINCIPLE</span><strong>One parcel<br /><span>One identity</span></strong></div><div className="principle-arrow"><span /><ArrowRight size={20} /><span /></div><div className="principle-result"><div className="principle-result-icon"><ShieldCheck size={19} /></div><div><span>Complete land intelligence</span><strong>Clearer decisions for everyone.</strong></div></div></section>

        <section className="capabilities-section"><div className="section-heading landing-section-heading"><div><div className="eyebrow accent-teal">A CONNECTED FOUNDATION</div><h2>Built around the parcel.</h2></div><p>LandStack is not a marketing layer over fragmented systems. It is a working application foundation designed to make the parcel the shared language between governance and service.</p></div><div className="capabilities-grid">{capabilities.map((item) => { const Icon = item.icon; return <div className="capability-card" key={item.label}><div className="capability-icon"><Icon size={19} /></div><div><strong>{item.label}</strong><p>{item.text}</p></div><ChevronRight className="capability-arrow" size={16} /></div>; })}</div></section>

        <section className="portal-section" id="portals"><div className="section-heading portal-section-heading"><div><div className="eyebrow accent-blue">ENTER YOUR WORKSPACE</div><h2>Two portals. One trusted foundation.</h2></div><p>Choose a role to explore the first working layer of LandStack.</p></div><div className="portal-cards"><button className="portal-card portal-card-government" onClick={() => enterPortal("government")}><div className="portal-card-top"><span className="portal-card-icon"><ShieldCheck size={21} /></span><span className="portal-card-arrow"><ArrowRight size={17} /></span></div><div className="portal-card-kicker">LAND GOVERNANCE</div><h3>Government Portal</h3><p>Validate, monitor and make parcel-level decisions with a command-center view of land intelligence.</p><div className="portal-card-list"><span><Check size={13} /> GIS Explorer foundation</span><span><Check size={13} /> Review & approval queue</span><span><Check size={13} /> Risk-aware parcel register</span></div><span className="portal-card-cta">Enter as government officer <ArrowRight size={14} /></span></button><button className="portal-card portal-card-citizen" onClick={() => enterPortal("citizen")}><div className="portal-card-top"><span className="portal-card-icon"><Users size={21} /></span><span className="portal-card-arrow"><ArrowRight size={17} /></span></div><div className="portal-card-kicker">LAND SERVICES</div><h3>Citizen Portal</h3><p>Access your authorized land information and request services without navigating fragmented offices.</p><div className="portal-card-list"><span><Check size={13} /> My land overview</span><span><Check size={13} /> Records & requests</span><span><Check size={13} /> AI assistant-ready shell</span></div><span className="portal-card-cta">Enter as citizen <ArrowRight size={14} /></span></button></div></section>

        <section className="landing-note"><div className="note-icon"><Sparkles size={18} /></div><div><strong>What you are seeing</strong><p>A functional Stage 1 prototype with synthetic data, reusable components, role separation and a GIS-ready parcel model. Advanced integrations will be layered on without changing the foundation.</p></div><span className="note-stage">STAGE 01 / 11</span></section>
      </main>
      <footer className="landing-footer"><span className="landing-brand landing-brand-footer"><span className="brand-mark"><LandPlot size={16} /></span><span><strong>LANDSTACK</strong></span></span><span>Government GIS command center · Modern civic technology · Professional SaaS foundation</span><span>© 2026 Environment</span></footer>
    </div>
  );
}
