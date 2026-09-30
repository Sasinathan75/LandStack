# LandSphere AI — Integrated GIS-Based Land Governance Platform

LandSphere AI is a civic technology platform that unifies fragmented land records, cadastral GIS maps, AI validation signals, satellite change detection, and citizen services around a single source of truth: **One parcel, one identity**.

Developed for digital public infrastructure and land administration modernization (SIH), LandSphere AI provides specialized workflows for both **Government Officers** and **Citizens** while enforcing strict role-based security boundaries.

---

## Key Features

- **Parcel-Centric Architecture**: Every record, document, permit, and validation signal is anchored to a unique parcel identity (ULPIN).
- **Dual Role-Based Portals**:
  - **Government Command Center**: Live GIS monitoring, AI validation queues, satellite change feeds, decision workflows, audit trails, and report generation.
  - **Citizen Portal**: Private authorized workspace for viewing owned land records, tracking service requests, and interacting with the AI Land Assistant.
- **MapLibre GIS Engine**: Cadastral parcel boundary rendering, interactive layer switching (Land Use, Risk Indicators, Boundaries), and extent inspection.
- **Explainable AI Validation**: Detects mismatches between land registry, revenue records (RoR), and planning master plans with human-in-the-loop review.
- **Satellite Change Detection**: Identifies potential land-use shifts, unauthorized construction, and vegetation anomalies.
- **Governance Reports**: Generates structured, tamper-evident parcel reports and audit summaries with document retrieval.
- **Security & Authorization Hardening**: Strict JWT session verification, HTTP 401/403 boundary enforcement, rate limiting, and immutable audit logging.

---

## Architecture & System Design

```
                     ┌──────────────────────────────────────────────┐
                     │          LandSphere AI Client (React)        │
                     │  - Citizen Portal    - Government Portal     │
                     │  - MapLibre GIS Map  - AI Assistant Chat     │
                     └───────────────────────┬──────────────────────┘
                                             │ REST / tRPC / JWT Cookies
                     ┌───────────────────────▼──────────────────────┐
                     │          Express Backend Server (Node)       │
                     ├──────────────────────────────────────────────┤
                     │ Security & Headers │ Rate Limiter │ Auditing │
                     ├──────────────────────────────────────────────┤
                     │ Auth & RBAC (Citizen vs Government vs Admin) │
                     ├──────────────┬──────────────┬────────────────┤
                     │ Parcels API  │ Requests API │ Validation API │
                     │ Satellite    │ Reports API  │ Audit API      │
                     └──────────────┴───────┬──────┴────────────────┘
                                            │
                     ┌──────────────────────▼──────────────────────┐
                     │         Data & Storage Layer (PostGIS)       │
                     │ - Canonical In-Memory Datasets (Demo Mode)   │
                     │ - PostGIS / PostgreSQL Foundation (Ready)    │
                     └──────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, Radix UI primitives, Lucide Icons, Wouter routing, Sonner toasts.
- **Mapping & GIS**: MapLibre GL JS, GeoJSON (EPSG:4326), PostGIS-ready schemas.
- **Backend**: Node.js, Express, TypeScript, tsx, esbuild, jose (JWT / JWS), Drizzle ORM.
- **Testing & Quality**: Vitest (unit/integration), Playwright (E2E testing), TypeScript (`tsc --noEmit`).

---

## Local Setup & Installation

### Prerequisites
- Node.js 20+
- pnpm 10+

### Installation
```bash
# Clone the repository and install dependencies
git clone https://github.com/landsphere-ai/landsphere-ai.git
cd landsphere-ai
pnpm install

# Copy environment template
cp .env.example .env

# Start development server
pnpm dev
```
The server will start on `http://localhost:3000`.

---

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development` or `production`) | `development` |
| `PORT` | HTTP server listening port | `3000` |
| `JWT_SECRET` | Secret key used for signing session tokens (min 32 chars) | Safe demo fallback |
| `DATABASE_URL` | PostgreSQL/PostGIS connection string (Optional) | `postgresql://postgres:...` |
| `OWNER_OPEN_ID` | Default administrator account identifier | `demo-admin-owner` |
| `VITE_APP_ID` | Application identifier | `landsphere-ai` |

---

## Demo Credentials & Canonical Data

LandSphere AI includes pre-seeded, high-fidelity synthetic demo data for SIH presentations.

| Role | User ID | Name | Email | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Government Officer** | `GOV-DEMO-01` | A. Officer | `officer.demo@example.test` | Full governance & GIS access |
| **Citizen** | `CIT-DEMO-001` | Demo Citizen | `citizen.demo@example.test` | Authorized for parcels `LS-PAR-0428`, `LS-PAR-0420`, `LS-PAR-0421` |
| **Secondary Citizen** | `CIT-DEMO-002` | A. Sharma | `sharma.a@example.test` | Tenant isolation benchmark user |

### Canonical Demo Parcel
- **Identifier**: `LS-PAR-0428`
- **ULPIN**: `IN-AP-28-0428-019-7`
- **Location**: Kondapur Sector 1, Serilingampally (17.4621° N, 78.3657° E)
- **Area & Use**: 2.40 Acres · Residential

---

## API Overview

All protected endpoints require an authenticated session cookie (`app_session_id`) or `Authorization: Bearer <token>` header.

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Public | PostGIS & system health probe |
| `/api/parcels` | `GET` | Citizen, Gov | List and filter cadastral parcels |
| `/api/parcels/:id` | `GET` | Citizen, Gov | Retrieve 360° unified parcel profile |
| `/api/requests` | `POST` | Citizen | Submit a service request (citizenId server-bound) |
| `/api/requests` | `GET` | Citizen, Gov | Queue view (Citizen sees own; Gov sees all) |
| `/api/requests/:id` | `GET` | Citizen, Gov | Request tracking (protected by tenant boundary) |
| `/api/validation` | `GET`, `POST` | Government | Query AI validation findings / run validation |
| `/api/satellite` | `GET` | Government | Query satellite change detection feed |
| `/api/reports/generate` | `POST` | Government | Generate structured parcel report |
| `/api/reports` | `GET` | Government | List generated reports |
| `/api/reports/:id` | `GET` | Government | Retrieve report document |
| `/api/gis/monitor` | `GET` | Government | GIS operational status & monitoring count |
| `/api/audit` | `GET` | Government | Query immutable security audit trail |

---

## Testing & Verification

```bash
# 1. Typecheck TypeScript codebase
pnpm check

# 2. Run unit and integration tests (Vitest)
pnpm test

# 3. Run complete End-to-End test suite (Playwright)
pnpm exec playwright test
```

---

## Production Build & Run

```bash
# Build production bundle (client assets + backend server)
pnpm build

# Start production server
pnpm start
```

---

## Deployment Notes & Known Limitations

- **Deployment Status**: The application is **deployment-ready** as a standalone Node.js web service serving the Vite production bundle and Express API.
- **Database Architecture Limitation**: Prompt 11 (persistent PostgreSQL/PostGIS database instance) was intentionally postponed. The current release operates in high-fidelity demo mode with in-memory canonical datasets and full PostGIS schema compatibility. Connecting a live PostGIS database is achievable by providing `DATABASE_URL` in production without modifying business logic.
- **Synthetic Data**: All names, coordinates, and satellite records are synthetic demonstration data for hackathon evaluation.
