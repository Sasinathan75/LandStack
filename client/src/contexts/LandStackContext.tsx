import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoParcels } from "@/lib/demoData";
import { fetchParcelDetail, type MapLayer } from "@/lib/gis";
import type { PortalRole, UserIdentity } from "@/types/platform";
import type { Parcel, ParcelDetailStatuses } from "@/types/parcel";
import { initialWorkflowState, persistWorkflowState, readWorkflowState, type SharedWorkflowState } from "@/lib/workflowState";

type LandStackContextValue = {
  user: UserIdentity;
  role: PortalRole;
  selectedParcel: Parcel;
  selectedParcelId: string;
  selectParcel: (parcelId: string, initialParcel?: Parcel | null) => void;
  selectedParcelDetail: Parcel | null;
  setSelectedParcelDetail: (parcel: Parcel | null) => void;
  selectedParcelStatuses: ParcelDetailStatuses | null;
  mapLayer: MapLayer;
  setMapLayer: (layer: MapLayer) => void;
  notificationsUnread: number;
  workflow: SharedWorkflowState;
  updateWorkflow: (update: Partial<SharedWorkflowState>) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

const demoUsers: Record<PortalRole, UserIdentity> = {
  government: { id: "GOV-DEMO-01", displayName: "A. Officer", role: "government", organization: "District land office", permissions: ["parcel:read", "validation:review", "satellite:read", "reports:read", "audit:read"] },
  citizen: { id: "CIT-DEMO-001", displayName: "Citizen", role: "citizen", organization: "Authorized citizen", permissions: ["parcel:read:authorized", "records:read", "requests:create", "notifications:read"] },
};

const LandStackContext = createContext<LandStackContextValue | null>(null);

export function LandStackProvider({ role, children }: { role: PortalRole; children: React.ReactNode }) {
  const [selectedParcelId, setSelectedParcelId] = useState(demoParcels[0].id);
  const [mapLayer, setMapLayer] = useState<MapLayer>("Parcel boundaries");
  const [workflow, setWorkflow] = useState<SharedWorkflowState>(() => readWorkflowState());
  const [selectedParcelDetail, setSelectedParcelDetail] = useState<Parcel | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("landstack-theme") as "light" | "dark") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("landstack-theme", theme);
    if (theme === "dark") {
      document.body.setAttribute("data-theme", "dark");
    } else {
      document.body.removeAttribute("data-theme");
    }
  }, [theme]);


  const selectParcel = (parcelId: string, initialParcel?: Parcel | null) => {
    const cleanId = (parcelId || "").trim();
    if (!cleanId) return;
    setSelectedParcelId(cleanId);
    if (
      initialParcel &&
      (initialParcel.id.toLowerCase() === cleanId.toLowerCase() ||
        initialParcel.ulpin.toLowerCase() === cleanId.toLowerCase())
    ) {
      setSelectedParcelDetail(initialParcel);
    }
  };

  const fallbackParcel = useMemo((): Parcel => {
    const found = demoParcels.find(
      (parcel) =>
        parcel.id.toLowerCase() === selectedParcelId.toLowerCase() ||
        parcel.ulpin.toLowerCase() === selectedParcelId.toLowerCase(),
    );
    if (found) return found;
    return {
      id: selectedParcelId,
      ulpin: selectedParcelId,
      owner: "Not recorded",
      area: "—",
      locality: "—",
      coordinates: "—",
      location: { locality: "—", coordinates: "—" },
      landUse: "Residential",
      status: "Under review",
      risk: "Low",
      lastUpdated: new Date().toISOString().slice(0, 10),
      geometry: { type: "Polygon", coordinates: [] },
    };
  }, [selectedParcelId]);

  const selectedParcel: Parcel = useMemo(() => {
    if (
      selectedParcelDetail &&
      (selectedParcelDetail.id.toLowerCase() === selectedParcelId.toLowerCase() ||
        selectedParcelDetail.ulpin.toLowerCase() === selectedParcelId.toLowerCase())
    ) {
      return selectedParcelDetail;
    }
    return fallbackParcel;
  }, [selectedParcelDetail, selectedParcelId, fallbackParcel]);

  // Whenever selectedParcelId changes, fetch the authoritative PostGIS record
  // with joined detail statuses (RoR, registration, tax, encumbrance, building, etc.).
  useEffect(() => {
    let cancelled = false;
    void fetchParcelDetail(selectedParcelId).then(({ parcel }) => {
      if (cancelled || !parcel) return;
      setSelectedParcelDetail(parcel);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedParcelId]);

  useEffect(() => { persistWorkflowState(workflow); }, [workflow]);
  useEffect(() => {
    const sync = () => setWorkflow(readWorkflowState());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const updateWorkflow = (update: Partial<SharedWorkflowState>) => setWorkflow((current) => ({ ...current, ...update }));

  const value = useMemo(
    () => ({
      user: demoUsers[role],
      role,
      selectedParcel,
      selectedParcelId,
      selectParcel,
      selectedParcelDetail,
      setSelectedParcelDetail,
      selectedParcelStatuses: selectedParcel.details ?? null,
      mapLayer,
      setMapLayer,
      notificationsUnread: role === "citizen" ? workflow.notifications.filter((item) => !item.read).length : 3,
      workflow,
      updateWorkflow,
      theme,
      setTheme,
    }),
    [mapLayer, role, selectedParcel, selectedParcelDetail, selectedParcelId, workflow, theme],
  );

  return <LandStackContext.Provider value={value}>{children}</LandStackContext.Provider>;
}

export function useLandStack() {
  const context = useContext(LandStackContext);
  if (!context) throw new Error("useLandStack must be used inside LandStackProvider");
  return context;
}

export function hasPermission(user: UserIdentity, permission: string) { return user.permissions.includes(permission); }

