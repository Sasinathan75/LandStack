const fs = require('fs');

const contextPath = 'client/src/contexts/LandSphereContext.tsx';
let context = fs.readFileSync(contextPath, 'utf8');

// Add theme to type
context = context.replace(
  /updateWorkflow: \(update: Partial<SharedWorkflowState>\) => void;/g,
  'updateWorkflow: (update: Partial<SharedWorkflowState>) => void;\n  theme: "light" | "dark";\n  setTheme: (theme: "light" | "dark") => void;'
);

// Add state and effect
const stateToAdd = `
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("landstack-theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("landstack-theme", theme);
    if (theme === "dark") {
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.removeAttribute("data-theme");
    }
  }, [theme]);
`;

context = context.replace(
  /const \[selectedParcelDetail, setSelectedParcelDetail\] = useState<Parcel \| null>\(null\);/g,
  'const [selectedParcelDetail, setSelectedParcelDetail] = useState<Parcel | null>(null);\n' + stateToAdd
);

// Add to context value
context = context.replace(
  /workflow,\n      updateWorkflow,\n    \}\),\n    \[mapLayer, role, selectedParcel, selectedParcelDetail, selectedParcelId, workflow\],\n  \);/g,
  'workflow,\n      updateWorkflow,\n      theme,\n      setTheme,\n    }),\n    [mapLayer, role, selectedParcel, selectedParcelDetail, selectedParcelId, workflow, theme],\n  );'
);

fs.writeFileSync(contextPath, context);

// Now for CitizenModules.tsx to add the theme toggle in SettingsPage
const citizenModulesPath = 'client/src/pages/CitizenModules.tsx';
let citizen = fs.readFileSync(citizenModulesPath, 'utf8');

const themeToggle = `
<label>Theme
<select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
<option value="light">Light</option>
<option value="dark">Dark</option>
</select>
</label>
`;

citizen = citizen.replace(
  /<SectionCard title="Preferences" kicker="CITIZEN SETTINGS"><div className="citizen-settings-list">/g,
  '<SectionCard title="Preferences" kicker="CITIZEN SETTINGS"><div className="citizen-settings-list">' + themeToggle
);

citizen = citizen.replace(
  /function SettingsPage\(\) \{ return </g,
  'function SettingsPage() { const { theme, setTheme } = useLandStack(); return <'
);

fs.writeFileSync(citizenModulesPath, citizen);

// Now for Government settings placeholder. We'll replace it with the theme toggle or redirect to a new minimal Government Settings page
// Wait, the prompt says "If there is already a settings menu, integrate the theme switch there instead of creating an unnecessary new page."
// For Government, they don't have a settings page yet.
// Wait, is there a government settings component?
const portalShellPath = 'client/src/components/PortalShell.tsx';
let shell = fs.readFileSync(portalShellPath, 'utf8');

const govThemeToggle = `
<div className="nav-item nav-button" style={{display: 'flex', justifyContent: 'space-between'}}>
  <div style={{display: 'flex', gap: '7px'}}><Settings2 size={17} /><span className={collapsed ? "sr-only" : ""}>Theme</span></div>
  {!collapsed && <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")} style={{background: 'transparent', border: 'none', color: 'inherit', outline: 'none', fontSize: '11px', fontWeight: 'bold'}}><option value="light">Light</option><option value="dark">Dark</option></select>}
</div>
`;

shell = shell.replace(
  /{isGovernment \? <button className="nav-item nav-button" onClick=\{\(\) => toast\.info\("Government workspace settings are staged for the next workflow stage"\)\}>.*?<\/button> : /g,
  '{isGovernment ? ' + govThemeToggle + ' : '
);

shell = shell.replace(
  /const isGovernment = role === "government";/g,
  'const isGovernment = role === "government";\n  const { theme, setTheme } = useLandStack();'
);

fs.writeFileSync(portalShellPath, shell);
console.log("Done adding theme setting");
