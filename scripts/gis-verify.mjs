/**
 * GIS Explorer map verification harness (MapLibre render, layer toggles,
 * parcel click selection, parcel search, console/network errors).
 *
 * Usage: node scripts/gis-verify.mjs [baseUrl] [secret]
 * Writes screenshots to .tmp-gis-*.png next to the project root.
 */
import { chromium } from "@playwright/test";
import { SignJWT } from "jose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const baseUrl = process.argv[2] || "http://localhost:3000";
// Session secret comes from .env (JWT_SECRET) via dotenv on the server.
const secret = process.argv[3] || process.env.JWT_SECRET || "landsphere-dev-secret-key-change-in-production";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makeToken(role) {
  const claims = { openId: role === "government" ? "GOV-DEMO-01" : "CIT-DEMO-001", appId: "landsphere-ai", name: role === "government" ? "A. Officer" : "Demo Citizen", role };
  if (role !== "government") claims.citizenId = "CIT-DEMO-001";
  return await new SignJWT(claims).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(Math.floor(Date.now() / 1000) + 7200).sign(new TextEncoder().encode(secret));
}

const report = { console: [], pageErrors: [], failedRequests: [], badResponses: [], checks: {} };
let failures = 0;

function check(name, ok, detail = "") {
  report.checks[name] = { ok, detail };
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function attachPageDiagnostics(page, label) {
  page.on("console", (msg) => {
    const text = `[${label}][console.${msg.type()}] ${msg.text()}`;
    if (["error", "warning"].includes(msg.type())) report.console.push(text);
  });
  page.on("pageerror", (err) => report.pageErrors.push(`[${label}] ${err.message}`));
  page.on("requestfailed", (req) => report.failedRequests.push(`[${label}] ${req.url()} :: ${req.failure()?.errorText}`));
  page.on("response", (res) => {
    if (res.status() >= 400) report.badResponses.push(`[${label}] ${res.status()} ${res.url()}`);
  });
}

async function openGisPage(context, url, label) {
  const page = await context.newPage();
  attachPageDiagnostics(page, label);
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  return page;
}

async function readMapState(page) {
  return await page.evaluate(() => {
    const container = document.querySelector(".map-container");
    const canvas = document.querySelector(".maplibregl-canvas");
    const rect = container ? container.getBoundingClientRect() : null;
    return {
      hasContainer: !!container,
      containerSize: rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : null,
      hasCanvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
      mapReady: container?.dataset.mapReady ?? null,
      dataSource: container?.dataset.source ?? null,
      parcelCount: container?.dataset.parcelCount ?? null,
      activeLayer: container?.dataset.activeLayer ?? null,
      heading: document.querySelector(".module-header h1")?.textContent ?? null,
      selectedPanelKicker: document.querySelector(".gis-selected-panel .selected-panel-kicker")?.textContent?.trim() ?? null,
      selectedParcelId: document.querySelector(".gis-selected-panel .mono-text")?.textContent?.trim() ?? null,
      extentCount: document.querySelectorAll(".map-extent-list button").length,
    };
  });
}


async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: baseUrl, viewport: { width: 1440, height: 900 } });
  const token = await makeToken("government");
  // Chrome rejects `SameSite=None` cookies that are not `Secure`, so on
  // http://localhost the cookie must use Lax (or Strict) to be stored at all.
  await context.addCookies([{ name: "app_session_id", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax", secure: false }]);

  // 1. GIS Explorer page renders the MapLibre map with backend parcels
  const page = await openGisPage(context, `${baseUrl}/government/gis`, "gis");
  await sleep(2500);

  const state = await readMapState(page);
  console.log("initial state:", JSON.stringify(state, null, 2));

  check("GIS page heading renders", state.heading === "Explore the land fabric.", String(state.heading));
  check("Map container has non-zero size", !!state.containerSize && !state.containerSize.startsWith("0x"), state.containerSize);
  check("MapLibre canvas mounted", state.hasCanvas, state.canvasSize);
  check("Map marked ready (style loaded)", state.mapReady === "true", String(state.mapReady));
  check("Parcel features loaded from backend", state.dataSource === "postgis" && Number(state.parcelCount) > 0, `count=${state.parcelCount} source=${state.dataSource}`);
  check("Selected Feature panel visible", !!state.selectedPanelKicker, state.selectedPanelKicker);

  const mapShot = path.join(root, ".tmp-gis-map.png");
  const wrap = page.locator(".gis-canvas-wrap");
  if (await wrap.count()) await wrap.screenshot({ path: mapShot });
  await page.screenshot({ path: path.join(root, ".tmp-gis-page.png"), fullPage: false });

  // 2. Layer toggles change the map
  const modes = ["Land use", "Administrative boundaries", "Roads", "Risk indicators", "Satellite view", "Restrictions", "Parcel boundaries"];
  const seen = new Set();
  for (const mode of modes) {
    const btn = page.locator(".layer-list .layer-row").filter({ hasText: mode }).first();
    await btn.click();
    await sleep(600);
    const active = await page.evaluate(() => document.querySelector(".map-container")?.dataset.activeLayer ?? null);
    const visible = await page.evaluate(() => document.querySelector(".map-container")?.dataset.visibleLayers ?? null);
    seen.add(`${mode}=>${active}`);
    check(`Toggle "${mode}" applied to map`, active === mode && !!visible, `active=${active} visible=${visible}`);
    if (["Land use", "Satellite view", "Restrictions"].includes(mode)) {
      await page.locator(".gis-canvas-wrap").screenshot({ path: path.join(root, `.tmp-gis-layer-${mode.replace(/\s+/g, "-").toLowerCase()}.png`) });
    }
  }
  check("All toggles produced distinct map states", seen.size >= modes.length, `${seen.size}/${modes.length}`);

  // 3. Map click selects a parcel and updates Selected Feature panel
  const panelBefore = await page.evaluate(() => document.querySelector(".gis-selected-panel .mono-text")?.textContent?.trim());
  const clickPoint = await page.evaluate(() => {
    const container = document.querySelector(".map-container");
    const map = container && container.__maplibre;
    if (map && typeof map.queryRenderedFeatures === "function") {
      const feats = map.queryRenderedFeatures({ layers: ["parcel-fill"] });
      if (feats.length > 0) {
        const f = feats[0];
        const ring = f.geometry.coordinates[0];
        let sx = 0, sy = 0, n = 0;
        for (const [lng, lat] of ring) {
          const pt = map.project([lng, lat]);
          sx += pt.x; sy += pt.y; n += 1;
        }
        return { x: sx / n, y: sy / n, parcelId: f.properties.parcelId };
      }
    }
    return null;
  });
  if (clickPoint) {
    const canvasBox = await page.locator(".maplibregl-canvas").boundingBox();
    await page.mouse.click(canvasBox.x + clickPoint.x, canvasBox.y + clickPoint.y);
    await sleep(900);
    const panelAfter = await page.evaluate(() => document.querySelector(".gis-selected-panel .mono-text")?.textContent?.trim());
    check("Map parcel click updates Selected Feature panel", !!panelAfter && panelAfter === clickPoint.parcelId, `expected=${clickPoint.parcelId} before=${panelBefore} after=${panelAfter}`);
  } else {
    check("Map parcel click updates Selected Feature panel", false, "could not locate a rendered parcel feature to click");
  }
  await page.screenshot({ path: path.join(root, ".tmp-gis-after-click.png") });

  // 4. Parcel search by Parcel ID and ULPIN
  const searchField = page.locator(".module-actions input").first();
  await searchField.fill("LS-PAR-0428");
  await sleep(500);
  let rows = await page.locator(".map-extent-list button").count();
  check("Search by Parcel ID filters list", rows >= 1, `rows=${rows}`);

  await searchField.fill("IN-AP-28-0403");
  await sleep(500);
  rows = await page.locator(".map-extent-list button").count();
  check("Search by ULPIN filters list", rows >= 1, `rows=${rows}`);
  const firstRowId = await page.locator(".map-extent-list button strong").first().textContent();
  check("ULPIN search matches expected parcel", firstRowId === "LS-PAR-0403", String(firstRowId));

  await searchField.fill("");
  await sleep(300);

  // 5. /gis-explorer alias route
  const aliasPage = await openGisPage(context, `${baseUrl}/gis-explorer`, "alias");
  await sleep(2000);
  const aliasState = await readMapState(aliasPage);
  check("/gis-explorer renders GIS Explorer", aliasState.heading === "Explore the land fabric.", String(aliasState.heading));
  check("/gis-explorer map ready with parcels", aliasState.mapReady === "true" && Number(aliasState.parcelCount) > 0, `ready=${aliasState.mapReady} count=${aliasState.parcelCount}`);
  check("/gis-explorer draws seed parcels from PostGIS", aliasState.dataSource === "postgis", `source=${aliasState.dataSource}`);
  await aliasPage.screenshot({ path: path.join(root, ".tmp-gis-alias-page.png") });
  await aliasPage.close();

  // 6. Diagnostics — errors only, with harness labels stripped, focused on
  //    MapLibre / style / GeoJSON / API / CORS / missing-asset failures.
  const stripLabel = (line) =>
    line.replace(/^\[(gis|alias)\]\[console\.\w+\]\s*/, "").replace(/^\[(gis|alias)\]\s*/, "");
  const errorLines = [
    ...report.console.filter((line) => line.includes("[console.error]")),
    ...report.pageErrors,
    ...report.failedRequests,
    ...report.badResponses,
  ];
  const mapNoise = errorLines
    .map(stripLabel)
    .filter((line) => /maplibre|worker|style\.json|geojson|\/api\/gis|demotiles|webgl|cors/i.test(line));
  check("No map-related console/page/network errors", mapNoise.length === 0, mapNoise.slice(0, 8).join(" | "));

  report.mapNoise = mapNoise;
  fs.writeFileSync(path.join(root, ".tmp-gis-report.json"), JSON.stringify(report, null, 2));

  await browser.close();
  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("VERIFY SCRIPT ERROR:", err);
  process.exit(2);
});

