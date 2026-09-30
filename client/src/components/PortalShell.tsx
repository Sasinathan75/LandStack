import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Grid2X2,
  History,
  Inbox,
  Layers3,
  LandPlot,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Satellite,
  ScanSearch,
  Search,
  Settings2,
  Sparkles,
  X,
  FileText,
  ChartNoAxesCombined,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { citizenNav, governmentNav, demoParcels, type PortalRole } from "@/lib/demoData";
import { fetchParcelDetail } from "@/lib/gis";
import { useLandStack } from "@/contexts/LandStackContext";
import type { Parcel } from "@/types/parcel";

const iconMap = {
  grid: Grid2X2,
  map: Map,
  layers: Layers3,
  scan: ScanSearch,
  satellite: Satellite,
  chart: ChartNoAxesCombined,
  file: FileText,
  check: CheckCircle2,
  history: History,
  land: LandPlot,
  inbox: Inbox,
  bell: Bell,
  spark: Sparkles,
};

type PortalShellProps = {
  role: PortalRole;
  children: React.ReactNode;
};

function TopbarSearch({ role }: { role: PortalRole }) {
  const [location, setLocation] = useLocation();
  const { selectParcel, setSelectedParcelDetail } = useLandStack();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalized) return [];
    return demoParcels.filter((parcel) => {
      const id = parcel.id.toLowerCase();
      const ulpin = parcel.ulpin.toLowerCase();
      const locality = parcel.locality.toLowerCase();
      const owner = (parcel.owner || "").toLowerCase();
      return (
        id.includes(normalized) ||
        ulpin.includes(normalized) ||
        locality.includes(normalized) ||
        owner.includes(normalized)
      );
    });
  }, [normalized]);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (parcel: Parcel) => {
    selectParcel(parcel.id, parcel);
    setQuery("");
    setIsOpen(false);

    void fetchParcelDetail(parcel.id).then(({ parcel: detail }) => {
      if (detail) setSelectedParcelDetail(detail);
    });

    toast.success(`Parcel ${parcel.id} selected`);

    if (role === "government") {
      if (location === "/government" || location === "/government/dashboard") {
        setLocation("/government/gis");
      }
    } else {
      if (
        location === "/citizen" ||
        location === "/citizen/dashboard" ||
        location === "/citizen/land" ||
        location === "/citizen/records" ||
        location === "/citizen/notifications" ||
        location === "/citizen/profile" ||
        location === "/citizen/settings" ||
        location === "/citizen/requests"
      ) {
        setLocation("/citizen/parcel");
      }
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const clean = query.trim();
      if (!clean) return;

      const exact = matches.find(
        (m) =>
          m.id.toLowerCase() === clean.toLowerCase() ||
          m.ulpin.toLowerCase() === clean.toLowerCase(),
      );
      const target = exact || matches[0];

      if (target) {
        handleSelect(target);
        return;
      }

      try {
        const { parcel } = await fetchParcelDetail(clean);
        if (parcel) {
          handleSelect(parcel);
        } else {
          toast.info(`No parcel found matching "${clean}"`);
        }
      } catch {
        toast.info(`No parcel found matching "${clean}"`);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="topbar-search desktop-only" ref={containerRef}>
      <Search size={15} />
      <input
        ref={inputRef}
        type="text"
        className="topbar-search-input"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search parcels, ULPINs..."
        aria-label="Search parcels by ID or ULPIN"
      />
      {query ? (
        <button
          type="button"
          className="topbar-search-clear"
          onClick={() => {
            setQuery("");
            setIsOpen(false);
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : (
        <kbd>⌘ K</kbd>
      )}

      {isOpen && query.trim().length > 0 && (
        <div className="topbar-search-dropdown">
          {matches.length > 0 ? (
            matches.slice(0, 6).map((parcel) => (
              <button
                key={parcel.id}
                type="button"
                className="topbar-search-item"
                onClick={() => handleSelect(parcel)}
              >
                <div className="topbar-search-item-avatar">
                  <LandPlot size={14} />
                </div>
                <div className="topbar-search-item-info">
                  <strong>{parcel.id}</strong>
                  <small>
                    ULPIN {parcel.ulpin} · {parcel.locality}
                  </small>
                </div>
                <span className={`risk-badge risk-${parcel.risk.toLowerCase()}`}>
                  {parcel.risk}
                </span>
              </button>
            ))
          ) : (
            <div className="topbar-search-empty">No parcel found</div>
          )}
        </div>
      )}
    </div>
  );
}

export function PortalShell({ role, children }: PortalShellProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = role === "government" ? governmentNav : citizenNav;
  const isGovernment = role === "government";
  const { theme, setTheme } = useLandStack();

  const handlePlaceholder = (label: string) => {
    if (label !== "Dashboard") {
      toast.info(`${label} is staged for the next build stage`, {
        description: "The navigation is connected and ready for feature expansion.",
      });
    }
    setMobileOpen(false);
  };

  const sidebar = (
    <aside className={`portal-sidebar ${collapsed ? "portal-sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark"><LandPlot size={18} strokeWidth={2.4} /></div>
        {!collapsed && <div><div className="brand-name">LANDSTACK</div><div className="brand-kicker">Land intelligence platform</div></div>}
        <button className="sidebar-close mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      <div className="portal-switcher">
        {!collapsed && <div className="eyebrow">ACTIVE WORKSPACE</div>}
        <div className="workspace-chip">
          <span className={`workspace-dot ${isGovernment ? "dot-blue" : "dot-teal"}`} />
          {!collapsed && <><span>{isGovernment ? "Government Portal" : "Citizen Portal"}</span><ChevronDown size={14} className="ml-auto" /></>}
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={`${role} navigation`}>
        {!collapsed && <div className="nav-section-label">{isGovernment ? "LAND GOVERNANCE" : "LAND SERVICES"}</div>}
        {navItems.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = location === item.href || (item.href !== "/government" && item.href !== "/citizen" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? "nav-item-active" : ""}`} onClick={() => handlePlaceholder(item.label)} title={collapsed ? item.label : undefined}>
              <Icon size={17} strokeWidth={isActive ? 2.25 : 1.8} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.label === "Review / Approval" && <span className="nav-count">8</span>}
              {!collapsed && item.label === "Notifications" && <span className="nav-count nav-count-teal">3</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && <div className="support-card"><div className="support-icon"><CircleHelp size={16} /></div><div><strong>Need help?</strong><span>Read the platform guide</span></div></div>}
        {isGovernment ? 
<div className="nav-item nav-button" style={{display: 'flex', justifyContent: 'space-between'}}>
  <div style={{display: 'flex', gap: '7px'}}><Settings2 size={17} /><span className={collapsed ? "sr-only" : ""}>Theme</span></div>
  {!collapsed && <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")} style={{background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '11px', fontWeight: 'bold'}}><option value="light">Light</option><option value="dark">Dark</option></select>}
</div>
 : <><Link href="/citizen/profile" className="nav-item nav-button"><UserRound size={17} /><span className={collapsed ? "sr-only" : ""}>Profile</span></Link><Link href="/citizen/settings" className="nav-item nav-button"><Settings2 size={17} /><span className={collapsed ? "sr-only" : ""}>Settings</span></Link></>}
        <Link href="/" className="nav-item nav-button"><LogOut size={17} /><span className={collapsed ? "sr-only" : ""}>Citizen</span></Link>
      </div>
    </aside>
  );

  return (
    <div className={`app-frame ${isGovernment ? "app-government" : "app-citizen"}`}>
      <div className={`mobile-sidebar-overlay ${mobileOpen ? "is-open" : ""}`} onClick={() => setMobileOpen(false)} />
      <div className={`sidebar-wrap ${mobileOpen ? "mobile-open" : ""}`}>{sidebar}</div>
      <main className={`portal-main ${collapsed ? "portal-main-expanded" : ""}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button sidebar-toggle desktop-only" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
            <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="breadcrumb"><span>LandStack</span><span className="breadcrumb-slash">/</span><strong>{isGovernment ? "Government Portal" : "Citizen Portal"}</strong></div>
          </div>
          <div className="topbar-right">
            <TopbarSearch role={role} />
            <button className="icon-button notification-button" onClick={() => toast.success("You are all caught up")} aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
            <div className="profile-divider" />
            <div className="profile-chip"><div className={`profile-avatar ${isGovernment ? "avatar-blue" : "avatar-teal"}`}>{isGovernment ? "AO" : "DR"}</div><div className="profile-copy desktop-only"><strong>{isGovernment ? "A. Officer" : "Citizen resident"}</strong><span>{isGovernment ? "District land officer" : "Authorized citizen"}</span></div><ChevronDown size={14} className="desktop-only" /></div>
          </div>
        </header>
        <div className="portal-content">{children}</div>
        <footer className="portal-footer"><span><span className="footer-pulse" /> Environment · Synthetic data only</span><span>LandStack · Foundation v0.1</span></footer>
      </main>
    </div>
  );
}

