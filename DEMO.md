# LandSphere AI — SIH Demonstration Guide

This guide details the recommended step-by-step presentation flow for demonstrating **LandSphere AI: Integrated GIS-Based Land Governance Platform** during Smart India Hackathon (SIH) evaluations.

---

## Demo Overview & Canonical Identities

| Role | Demo User | Identifier | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Citizen** | Demo Citizen | `CIT-DEMO-001` | Private citizen portal, view authorized properties (`LS-PAR-0428`, `LS-PAR-0420`, `LS-PAR-0421`), submit service requests |
| **Government** | A. Officer | `GOV-DEMO-01` | Command center, GIS Explorer, AI validation review, satellite monitoring, report generation, audit log |
| **Canonical Parcel** | Unified ID: `LS-PAR-0428` | ULPIN: `IN-AP-28-0428-019-7` | 2.40 Acres · Residential · Kondapur / Serilingampally |

---

## Demonstration Walkthrough (7 Steps)

### STEP 1: Launch & Landing Page
1. Start the platform: `pnpm start` (production) or `pnpm dev` (development).
2. Open browser at `http://localhost:3000/`.
3. Highlight the core vision: **"One parcel, one identity"** — bringing fragmented revenue records, GIS maps, AI validation signals, and citizen services into a unified parcel architecture.
4. Click **"Enter workspace"** or navigate to `/login`.

---

### STEP 2: Citizen Dashboard & Services
1. Select the **Citizen** role toggle on the login page (or navigate to `/citizen`).
2. **Dashboard Overview**: Show authorized properties, summary stats (3 properties, 5.72 acres), and recent documents.
3. **Parcel Search**: In the search box, type `LS-PAR-0428` and click the matching result to open **Parcel Details**. Show ownership verification, ULPIN, and linked documents.
4. **Service Request**:
   - Navigate to **My Requests** (`/citizen/requests`).
   - Click **"Create new request"**.
   - Select Service Type: *Certified RoR copy*, select parcel `LS-PAR-0428`, enter purpose, and submit.
   - Show the instant submission confirmation (`REQ-2026-0042`) and status timeline.

---

### STEP 3: Switch to Government Role & GIS Explorer
1. Navigate to the **Government Portal** (`/government`).
2. Show the **Command Center Overview**:
   - Total registered parcels, pending AI validations, satellite change flags, and priority queue.
3. Open **GIS Explorer** (`/government/gis`):
   - Display the interactive **MapLibre** boundary map.
   - Switch intelligence layers: *Parcel boundaries* → *Land use* → *Risk indicators*.
   - Click on parcel `LS-PAR-0428` in the map extent list to show the feature details panel with instant ULPIN and risk readout.

---

### STEP 4: AI Validation & Mismatch Detection
1. Navigate to **AI Validation** (`/government/validation`).
2. Show explainable AI validation checks:
   - *Ownership mismatch*, *Land-use mismatch*, *Area mismatch*, and *Document inconsistency*.
3. Select parcel `LS-PAR-0428` finding:
   - Review the evidence comparison: Registration Record vs. RoR snapshot.
   - Emphasize civic AI principle: **"AI assists, officers decide"** — findings are routed to human review rather than automatic changes.

---

### STEP 5: Satellite Change Monitoring
1. Navigate to **Satellite Monitoring** (`/government/satellite`).
2. Show optical and NDVI change detection feed for monitored parcels.
3. Inspect parcel `LS-PAR-0420` (8.6% area modification detected).
4. Review before/after synthetic comparison imagery and confidence metrics.

---

### STEP 6: Governance Reports & Document Retrieval
1. Navigate to **Reports** (`/government/reports`).
2. Select **"Parcel Report"** card to trigger report generation for `LS-PAR-0428`.
3. View the generated structured preview containing parcel identity, land-use verification, AI findings, and satellite status.
4. Highlight document storage and retrieval capabilities.

---

### STEP 7: Security & Authorization Protection
1. Demonstrate role-based access control:
   - As Citizen (`CIT-DEMO-001`), attempting to access government APIs (`/api/validation`, `/api/satellite`, `/api/audit`) triggers strict **HTTP 403 Forbidden**.
   - Unauthenticated API access triggers **HTTP 401 Unauthorized**.
   - Cross-citizen isolation: Citizen cannot inspect or tamper with another citizen's service request.
2. Open **Audit Logs** (`/government/audit`):
   - Show immutable audit trail recording all view, submit, validate, and report events with actor timestamps.

---

## Quick Verification Commands

```bash
# Run TypeScript typecheck
pnpm check

# Run unit and integration tests
pnpm test

# Run full end-to-end Playwright tests
pnpm exec playwright test

# Build production bundle
pnpm build
```
