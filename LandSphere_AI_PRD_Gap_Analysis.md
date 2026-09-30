# LandSphere AI — PRD and Technical Stack Gap Analysis

**Prepared for:** SIH 2026, Problem Statement 26014  
**Project reviewed:** Existing LandSphere AI web application  
**Source package reviewed:** `LandSphere_AI_SIH26014_Complete_Package.zip`  
**Assessment scope:** Product Requirements Document, Technical Stack, UI/UX Specification, README, and the current implementation at `/home/ubuntu/landsphere-ai`

## Executive conclusion

The current application has implemented a strong **clickable SIH demonstration layer**. The two-portal product concept is present, the Government and Citizen experiences are visibly different, the main workflow is navigable, the shared parcel story is communicated clearly, and the most important demo screens are polished. The application already covers most of the requested MVP surface at the UI and synthetic-data level.

The application is **not yet a production implementation of the supplied architecture**. The current project is a React/Vite/Express/tRPC application with Drizzle/MySQL support and Manus OAuth infrastructure. The package specifies Next.js/React, FastAPI/Python, PostgreSQL/PostGIS, MapLibre, Python geospatial processing, AI/ML services, background jobs, S3 storage, OpenAPI, Docker and Playwright. Those production components are not present in the repository. The current parcel, validation, satellite, request, report and audit records are primarily client-side synthetic data, with the cross-portal workflow persisted in browser local storage.

A practical summary is:

| Area | Current assessment | Meaning |
|---|---|---|
| SIH clickable demo | **Strong / mostly complete** | The judge can follow the intended Government and Citizen stories through working screens. |
| UI/UX specification | **Largely aligned** | Visual language, portals, navigation and screen structure match the supplied direction. |
| PRD MVP behavior | **Partially complete** | The modules exist, but many are demo simulations rather than real services. |
| Technical architecture | **Major gap** | The current stack differs from the specified production stack. |
| Production readiness | **Not complete** | Persistence, APIs, RBAC enforcement, real GIS, processing pipelines and deployment automation remain. |

## What is already implemented

### Product concept and role split

The central product message is implemented: **one parcel, one identity, complete land intelligence**. The public landing page communicates the civic-technology purpose and routes users to a role-aware demo login. The login screen separates Government and Citizen workspaces. Government users receive the command-center experience, while citizens receive a simpler service-oriented portal.

The current application contains separate navigation models for both roles. Government navigation includes Dashboard, GIS Explorer, Parcel 360°, AI Validation, Satellite Monitoring, Analytics, Reports, Review / Approval and Audit Logs. Citizen navigation includes Dashboard, My Land, My Records, My Parcel Map, My Requests, Notifications and AI Land Assistant. Route aliases and deep detail routes have been added for the principal demo paths.

### Government portal

The Government Dashboard includes synthetic governance metrics, a GIS preview, selected parcel context, priority actions, validation signals, satellite signals, pending review information, a parcel register, recent governance activity and an analytics preview. The dashboard also surfaces the shared Citizen request and its current request status.

The GIS Explorer includes a parcel list, search, parcel selection, synthetic GeoJSON data, layer controls and filters. The primary SIH parcel can be found through the required alias `LS-PAR-0428`, while the internal synthetic record remains `LS-AP-0428-019`.

Parcel 360° provides a selected-parcel intelligence workspace with identity, ULPIN, location, area, land use, ownership and related records. AI Validation provides validation cases, risk labels, evidence panels and review actions. Satellite Monitoring provides synthetic before/after observations, change type, affected area, confidence and review status. Review & Approval provides a queue, filters, evidence, reviewer notes, status transitions, confirmation dialogs and citizen notifications. Reports provides six report-type choices with synthetic previews and library actions. Audit Logs provides search, role/module filters and event detail.

### Citizen portal

The Citizen Dashboard is service-oriented and includes My Land, records, notifications, quick services, parcel map access, requests and the AI Land Assistant entry point. My Land and My Parcel Map use the selected parcel context. My Records exposes synthetic ownership, registration and tax-related records. My Requests supports request creation and tracking. Notifications displays citizen updates. The Citizen portal uses a scoped search that limits results to authorized parcel, ULPIN, request and record identifiers.

The Government-to-Citizen workflow is connected in the demo state. A Government review action can update the shared request status, create a notification, and append an audit event. The status sequence supports Under Review, Need Information, Approved/Completed and Escalated demo outcomes.

### Visual and interaction quality

The implementation aligns well with the supplied UI/UX specification. It uses a deep navy civic-tech visual system with blue, green, amber, red and teal semantic states. IDs use compact technical styling. Government screens emphasize maps, queues and evidence. Citizen screens are lighter and more service-oriented. Responsive behavior has been checked on desktop and mobile for the priority flows.

## PRD coverage matrix

| PRD requirement | Current implementation | Assessment | Remaining work |
|---|---|---|---|
| Role-based Government and Citizen portals | Separate login choice, routes, navigation and visual shells | **Implemented as demo** | Enforce role authorization on server APIs and database queries. |
| Government Dashboard | Metrics, map preview, queues, activity and request signal | **Implemented as demo** | Replace hard-coded metrics with live aggregate queries. |
| GIS Explorer | Synthetic parcel map preview, GeoJSON adapter, parcel selection and filters | **Partially implemented** | Add MapLibre, base maps, real vector layers, spatial queries and server-side search. |
| Parcel 360° | Selected parcel identity, ULPIN, location, area, land use and connected evidence | **Partially implemented** | Add persisted ownership/RoR, transactions, encumbrance, tax, utilities and building-permission records. |
| AI Validation | Synthetic findings, confidence, risk, evidence and human-review actions | **Implemented as demo** | Build an actual validation service with traceable rules/models and persisted results. |
| Satellite Monitoring | Synthetic observations and visual evidence panels | **Implemented as demo** | Add imagery ingestion, raster processing, change detection jobs and provenance. |
| Risk/mismatch detection | Risk badges, filters and case queue | **Implemented as demo** | Persist rules, model versions, evidence links and reviewer outcomes. |
| Analytics | Synthetic charts and risk distribution | **Implemented as demo** | Add live aggregation, time filters, spatial aggregation and exportable data. |
| Review / Approval workflow | Review, notes, approval, escalation and information-request states | **Implemented in browser demo** | Move transitions to transactional backend procedures with authorization and concurrency control. |
| Reports | Six report types, preview and download-style feedback | **Partially implemented** | Generate actual PDF/CSV files, store them, expose secure download links and report history. |
| Audit | Searchable synthetic audit events and detail view | **Partially implemented** | Write immutable server-side audit events for every protected action. |
| Citizen Dashboard | Own-land/service view, request and notification summaries | **Implemented as demo** | Resolve records from authenticated citizen identity and database ownership links. |
| My Land / Parcel Map | Authorized synthetic parcel cards and map view | **Implemented as demo** | Add authorization-aware parcel relations and real geometry services. |
| My Records | Synthetic ownership, RoR, registration and tax records | **Implemented as demo** | Add record entities, document metadata, secure storage and access logging. |
| Service Requests | Create and track request UI | **Partially implemented** | Persist requests, validate required fields server-side, assign cases and support status history. |
| Notifications | Synthetic and workflow-generated citizen updates | **Partially implemented** | Add notification persistence, delivery/read APIs and reliable event triggers. |
| AI Land Assistant | Assistant UI and route | **Partially implemented** | Connect it to an authorized LLM with retrieval, scoped context, prompt safety and citation/provenance. |
| Demo data clearly marked synthetic | Repeated synthetic/demo labels in UI | **Implemented** | Keep this labeling in production seed/demo mode and remove ambiguity when real data is introduced. |

## Technical stack comparison

| Package specification | Current repository | Gap severity |
|---|---|---|
| Next.js + React + TypeScript | React + Vite + TypeScript | **Medium** for demo; **High** if Next.js is mandatory for delivery. |
| Tailwind CSS | Tailwind 4 and project CSS design system | **Mostly aligned** |
| MapLibre GL JS | Custom map preview and GeoJSON adapter; no MapLibre dependency detected | **High** |
| PostgreSQL + PostGIS | Drizzle/MySQL schema with only `users` table | **Critical** |
| GeoPandas, Shapely, Rasterio | No Python geospatial service or dependency detected | **Critical** |
| FastAPI + Python | Express/tRPC server | **Critical** if the supplied backend architecture is required |
| SQLAlchemy/SQLModel | Drizzle ORM | **Critical** for the prescribed architecture; conceptually equivalent data access is not enough for stack compliance. |
| OpenAPI/Swagger | API catalog metadata exists, but no running FastAPI/OpenAPI contract was found | **High** |
| scikit-learn/PyTorch and authorized LLM | Synthetic validation outputs and frontend assistant surface; no connected production model pipeline found | **Critical** |
| Rasterio/OpenCV/change detection | Synthetic satellite records and visual panels | **Critical** |
| Redis + Celery/RQ | No worker/queue service found | **High** |
| S3-compatible object storage | Storage helpers exist in the template, but no complete document/imagery/report workflow is persisted | **Medium–High** |
| OAuth2/OIDC/JWT + RBAC | Manus OAuth infrastructure and demo role selection; backend feature authorization is not implemented | **Critical** |
| Pytest + Playwright | Vitest unit tests; no Playwright project or Python test suite found | **High** |
| Docker and CI/CD | No Dockerfile, compose file or CI workflow found | **High** |
| Repository split into frontend/backend/ai/gis/data/docs/tests/infra | Single React/Express project with shared TypeScript folders | **Medium–High** |

The stack mismatch does not make the current demo unusable. It means the current code should be treated as a **presentation prototype and integration-ready frontend foundation**, not as the final backend architecture described in the package.

## Database and persistence gap

The supplied PRD identifies parcel records, ownership/RoR, transactions, encumbrance, land-use records, building permissions, tax, utilities, validation results, satellite observations, service requests, users/roles and audit logs as database entities. The current Drizzle schema contains only the authentication `users` table. There are no persisted tables for the product domain.

The current feature data is in `client/src/lib/demoData.ts`. The review workflow is synchronized through `localStorage` in `client/src/lib/workflowState.ts`. This is useful for a single-browser hackathon demonstration, but it does not support multiple users, concurrent officers, server-side authorization, recovery after browser storage deletion, audit immutability or cross-device status tracking.

The minimum production schema should include at least the following entities: `parcels`, `parcel_geometries`, `ulpin_identifiers`, `ownership_records`, `transactions`, `encumbrances`, `land_use_records`, `building_permissions`, `property_tax_records`, `utility_connections`, `validation_cases`, `validation_evidence`, `satellite_observations`, `service_requests`, `workflow_events`, `notifications`, `reports`, `audit_logs`, `users`, `roles`, `permissions` and citizen-to-parcel authorization relations.

## GIS and satellite gap

The current application demonstrates parcel polygons and layer controls through synthetic data. It does not yet provide a production GIS engine. A complete GIS implementation needs MapLibre or an equivalent map client, a tile or vector-tile source, server-side spatial search, PostGIS geometry columns, coordinate reference system handling, spatial indexes and layer-specific authorization.

The current satellite experience demonstrates the intended user flow but does not process imagery. Production work needs an imagery ingestion contract, object storage, raster metadata, cloud masking or preprocessing, image registration, change-detection methods, confidence calibration, affected-area calculation, provenance and a background job pipeline. Every output should be labeled as an observation or model suggestion until an authorized reviewer makes a decision.

## AI and assistant gap

The PRD correctly defines AI as assistive rather than authoritative. The UI follows that principle by using cautious wording such as potential mismatch and review recommended. However, the current validation findings are synthetic records. A complete AI layer still needs a versioned rules/model service, structured output schema, evidence references, confidence thresholds, model monitoring, prompt and input logging, safe failure behavior and human-review gating.

The AI Land Assistant needs an authorized server-side LLM integration. It should answer only from permitted citizen records and product guidance. It should not expose Government validation evidence, internal notes, other citizens' records or unsupported legal conclusions. Responses should identify when information is unavailable and should link answers to the underlying authorized record where appropriate.

## Security and RBAC gap

The application has a clean demo role split, but the current role distinction is primarily frontend routing and context state. The backend router currently exposes authentication procedures and system procedures; it does not expose the product domain through protected Government and Citizen procedures. This means the current UI separation should not be interpreted as production data isolation.

The production implementation needs authenticated API requests, server-side role and permission checks, ownership or authorization checks for every citizen record, Government permission scopes, tenant or department boundaries where applicable, secure secret management, CSRF/session protections appropriate to the chosen authentication model, rate limiting, structured security logging, document access controls and privacy retention rules.

## Testing and operational gap

The current project has nine passing Vitest tests covering authentication logout, architecture metadata, synthetic foundation behavior and shared workflow state. It has no Playwright end-to-end suite, no API contract tests, no Python tests, no database integration tests and no load or spatial-query performance tests.

The supplied demo flow should become automated in Playwright. At minimum, the suite should cover Government login, parcel search by ID and ULPIN, selection continuity through Parcel 360°, validation, satellite and review; approval, escalation and information-request branches; Citizen request creation and tracking; notification synchronization; role isolation; deep routes; empty/error states; and mobile layouts.

The repository has no Dockerfile, compose configuration or CI workflow. A production delivery needs reproducible builds, environment validation, migration execution, seed/demo-data loading, test gates, artifact creation, deployment, health checks, rollback strategy and observability.

## Synthetic data gap

The current dataset contains five parcels, four validation cases, three satellite observations, two service requests, three notifications, three reports and three baseline audit records. This is enough to make the screens believable, but it does not meet the package's suggested target of 30 or more demo parcels with multiple records across each domain.

The demo dataset should be expanded while remaining synthetic. It should include at least 30 parcels distributed across verified, under-review and flagged states; 10 or more validation cases; 10 or more satellite observations; multiple Citizen requests across submitted, under-review, information-needed, completed and escalated states; multiple report records; and a richer audit history. The primary story parcel must remain consistent across every dataset.

## High-priority remaining work

### Priority 1 — Make the demo story data-consistent

The current interface uses both the required alias `LS-PAR-0428` and the internal ID `LS-AP-0428-019`. That alias is now searchable, but the production-quality approach is to define a canonical display identifier and a separate internal key. The Citizen request seed data also contains older request examples alongside the Stage 8 shared request. Before a judge-facing demo, every primary screen should use one canonical parcel display ID, one ULPIN, one citizen ID, one request ID and one case ID.

### Priority 2 — Replace localStorage workflow with API persistence

Implement service requests, review decisions, notifications and audit events in the database. Make every transition transactional. Add server-side validation, optimistic UI updates only after mutation success, status history and concurrency protection. Keep the local demo store only as an explicit offline/demo fallback.

### Priority 3 — Implement server-side authorization

Add Government and Citizen procedures to the API. Enforce permissions on the server, not only in the React router. Ensure that Citizen queries are filtered by the authenticated citizen-to-parcel relationship. Add negative tests proving that citizens cannot read Government validation evidence, reviewer notes, risk analytics, audit logs or Government-wide GIS records.

### Priority 4 — Add real GIS foundations

Choose whether to retain the current TypeScript server for the hackathon or migrate toward the supplied FastAPI architecture. In either case, add PostgreSQL/PostGIS, spatial indexes, MapLibre, authenticated layer endpoints, server-side parcel search by ID and ULPIN, and geometry validation. This is the largest technical gap between the prototype and the PRD architecture.

### Priority 5 — Add actual AI and satellite service boundaries

Create explicit backend interfaces for validation, assistant responses and satellite change detection. Start with deterministic rules and seeded synthetic evidence, then connect an authorized model and a background processing worker. Store model version, input references, output schema, confidence and human outcome for every result.

### Priority 6 — Add production-grade reports, storage and audit

Generate actual PDF and CSV reports. Store report metadata and files in S3-compatible storage. Provide secure, expiring download URLs. Record report generation, download, review, approval, escalation, request creation, request updates and notification creation as server-side audit events.

### Priority 7 — Automate end-to-end QA and delivery

Add Playwright coverage for both portal flows, API contract tests, database integration tests and mobile viewport checks. Add Docker and CI/CD only after the service boundaries and migrations are stable. Run typecheck, unit tests, integration tests, Playwright tests, build, migration checks and security checks in CI.

## Suggested completion plan

### Phase A — Demo hardening

Use the current application for the immediate SIH presentation. Normalize the primary identifiers, expand the synthetic dataset, remove misleading placeholder actions, add a visible demo reset control and complete Playwright coverage for the exact judge flow. This phase improves reliability without changing the existing visual system.

### Phase B — Backend foundation

Introduce the canonical domain schema, migrations, seed data and protected APIs. Move requests, workflow transitions, notifications, reports and audit records from local storage into persistent storage. Implement Government and Citizen authorization tests before adding real integrations.

### Phase C — GIS and processing services

Add PostGIS and MapLibre. Implement parcel and layer APIs. Add object storage for documents and imagery. Add a queue for satellite processing, batch validation and report generation. Expose OpenAPI contracts for all domain endpoints.

### Phase D — AI, satellite and production operations

Connect the authorized AI assistant and structured validation service. Add satellite change processing with provenance. Add model and job observability. Containerize the services, configure CI/CD, add health checks and complete the production security review.

## Final verdict

**The full concept is represented in the current website at the UI/demo level, and it is suitable for a guided SIH prototype demonstration after data normalization and automated flow testing. It is not yet complete according to the supplied production technical stack.**

The most important remaining work is not another visual redesign. It is the transition from synthetic client-side records to a persistent, authorized, spatially indexed backend with real API contracts, processing services, auditable workflow transitions and end-to-end tests.

## References

[1]: /home/ubuntu/landsphere-package/LandSphere_AI_PRD_SIH26014.docx "LandSphere AI Product Requirements Document"

[2]: /home/ubuntu/landsphere-package/LandSphere_AI_Technical_Stack_SIH26014.docx "LandSphere AI Technical Stack"

[3]: /home/ubuntu/landsphere-package/LandSphere_AI_UI_UX_Specification.docx "LandSphere AI UI/UX Specification"

[4]: /home/ubuntu/landsphere-package/README.txt "LandSphere AI SIH 2026 Project Package README"
