# Inkroom App — CLAUDE.md

## Project Overview
Cloudflare Workers SPA for color quality management in rotogravure/flexo printing.
Single file: `src/index.js` (JS, not TypeScript). One dependency: `hono ^4.1.0`.

## Deploy
```bash
npx wrangler deploy
```
After schema changes, run: `https://inkroom-app.mk-d93.workers.dev/api/migrate`

## Stack
- Runtime: Cloudflare Workers
- Framework: Hono
- Database: D1 (SQLite) — binding `DB` → `inkroom-db`
- Frontend: Vanilla JS SPA served inline from the worker
- Bundle: ~189 KiB raw / ~41 KiB gzip (well within 1MB limit)

## Architecture
`evaluateColor()` (server-side, lines 5–104) — core diagnosis engine. Takes `colorData` + `globalData`, returns benchmark/status/diagnosis in EN and TR.

All routes are in `src/index.js`:
- `GET /` — SPA shell (cached 1h)
- `GET /api/dashboard` — press + job + measurement data
- `GET /api/analytics` — KPIs, trends, job history, problem colors
- `GET /api/jobs/:id/history` — per-job measurement history
- `POST /api/jobs/:id/measurements` — submit measurement, triggers evaluateColor
- `PUT /api/benchmarks/:id` — edit measurement
- `GET /api/migrate` — idempotent schema migration + index creation

## Current Deployed Version
**`3293a327`** — deployed 2026-03-21

## Fixes Deployed

### Bug Fixes (2026-03-20, version 8e62ca52)
- **Fix 1 — Volume Issue threshold**: `Math.abs(delta_h) <= 1.0` → `< 1.5`
  - Location: `evaluateColor()` line 74
  - Effect: delta_h values 1.0–1.5 now correctly trigger "Volume Issue" instead of falling through to "General Deviation"
- **Fix 2 — Transfer block ΔC* overdose warning (Turkish)**: Added `isGravure` conditional to `overConcTR` string
  - Flexo now correctly omits "before restart" from Turkish diagnosis
- **Fix 3 — 4-tier badge in updateLiveEval (job history table)**: Added `action` tier for 40–59% pass rate
  - Was: `ok/warn/crit` (3-tier). Now: `ok/warn/action/crit` (4-tier), matching `renderPerfBadge`
- **Fix 4 — 4-tier badge in fetchBenchmarks (press comparison)**: Same 3→4-tier fix applied to press comparison cards

### Security & Performance (2026-03-21, version 3293a327)
- **XSS fixes (8 locations)**: Added `escapeHtml()` function; applied to all user-controlled data in `innerHTML` (`color_name`, `job_title`, `job_number`, `press_name`). `data.error` / `e.message` switched to DOM `textContent`
- **D1 indexes (4 new)**: Created via `/api/migrate`
  - `idx_benchmarks_job_id` — covers all per-job lookups and window function partition
  - `idx_benchmarks_job_created` — covers time-windowed FPR stats (24h/7d/30d)
  - `idx_benchmarks_seq` — covers first-pass filter `measurement_seq = 1`
  - `idx_jobs_press_status` — covers dashboard `press_id + status = 'active'` join
- **Cache-Control**: `public, max-age=3600, stale-while-revalidate=86400` on `GET /`
- **UI improvements**: sticky save button, tab icons, colored FAIL/PASS rows

## Key Logic Notes
- `evaluateColor()` is called server-side on every measurement POST and PUT
- The 4-tier CSS system: `ok` (green) / `warn` (amber) / `action` (orange) / `crit` (red) — all four classes exist in CSS; use consistently
- Turkish translations live alongside English in the same function; `isGravure` must be checked for process-specific text
- `renderPerfBadge()` uses 4 tiers: `>=80 ok`, `>=60 warn`, `>=40 action`, `<40 crit` — this is the reference implementation
- No DELETE endpoint for benchmarks; test data must be cleaned via D1 console

## Testing
All Playwright tests passing. To run manual verification:
1. Open https://inkroom-app.mk-d93.workers.dev
2. Dashboard: verify job tiles, badge colors, Enter correction modal
3. Analytics: verify KPIs, job history pass-rate badge tiers, press comparison colors
4. Submit a measurement with `ds=90, delta_c=-1, delta_h=1.2` → must diagnose "Volume Issue"
