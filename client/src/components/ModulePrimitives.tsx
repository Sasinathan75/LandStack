import { AlertCircle, CheckCircle2, Loader2, Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function ModuleHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <section className="module-header"><div><div className="eyebrow accent-blue">{eyebrow} <span className="eyebrow-line" /></div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="module-actions">{actions}</div>}</section>;
}

export function ModuleStat({ label, value, detail, tone = "blue", icon }: { label: string; value: string; detail: string; tone?: string; icon?: ReactNode }) {
  return <div className="module-stat"><div className={`module-stat-icon module-stat-${tone}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export function StatePanel({ kind, title, detail }: { kind: "loading" | "empty" | "error"; title: string; detail: string }) {
  const Icon = kind === "loading" ? Loader2 : kind === "empty" ? CheckCircle2 : AlertCircle;
  return <div className={`state-panel state-${kind}`}><Icon size={21} className={kind === "loading" ? "state-spin" : ""} /><strong>{title}</strong><span>{detail}</span></div>;
}

export function SearchField({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="module-search"><Search size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><kbd>⌘ K</kbd>{value && <button type="button" onClick={() => onChange("")} aria-label="Clear search"><X size={13} /></button>}</label>;
}

export function PillTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <div className="pill-tabs">{tabs.map((tab) => <button key={tab} className={active === tab ? "pill-tab-active" : ""} onClick={() => onChange(tab)}>{tab}</button>)}</div>;
}

export function SectionCard({ title, kicker, children, action }: { title: string; kicker?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="surface-card module-card"><div className="module-card-heading"><div>{kicker && <div className="card-kicker">{kicker}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
