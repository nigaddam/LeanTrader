# LangStock — Data Platform Status

**Last updated:** 2026-05-20  
**Agent session:** Phase 1 + Phase 2 complete

---

## Production Launch Readiness — 2026-05-22

### Phase 1 — Environment and Routing Cleanup

**Status:** Complete

**What changed**
- Public root `/` now stays on the landing page by default.
- The production app shell is mounted at `/home`.
- Local development still supports `/app` and `/orders` routes for convenience.
- Added a Vite runtime config module so production/local behavior is controlled by environment flags.
- Firebase hosting still rewrites SPA routes to `index.html`; the React root now decides whether to render landing or app, so the landing and app experiences do not need separate Firebase sites.

**Files modified**
- `frontend/src/config/runtime.js`
- `frontend/src/Root.jsx`
- `frontend/src/App.jsx`
- `frontend/src/components/Sidebar.jsx`
- `.env.example`

**How to test**
- Local dev default: `/` shows landing, `/home` shows app, `/app` still works.
- Production env: set `VITE_APP_EXPERIENCE=production` and `VITE_ENABLE_DEVELOPMENT_FEATURES=false`; `/` shows landing and `/home` shows the limited app shell.
- Firebase: current `firebase.json` already rewrites all routes to `/index.html`, which is correct for `/home`.

**Remaining work**
- Complete production feature gating audit.
- Add asset universe production seed fields.
- Harden refresh jobs for production.

### Phase 2 — Production Feature Gating

**Status:** Complete

**What changed**
- Added one clean frontend feature gate: `VITE_ENABLE_DEVELOPMENT_FEATURES`.
- Production `/home` hides the entire Development sidebar section.
- Production `/home` does not render the active strategy context bar or development action buttons.
- Direct in-app navigation to `backtests`, `models`, or `live` is guarded and resets to chat when development features are disabled.
- Chat suggestions are production-safe when development features are disabled.

**Files modified**
- `frontend/src/config/runtime.js`
- `frontend/src/App.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/ChatInterface.jsx`
- `frontend/src/components/MessageBubble.jsx` indirectly respects the missing `onAction` prop and renders no dev actions.

**How to test**
- Set `VITE_APP_EXPERIENCE=production` and `VITE_ENABLE_DEVELOPMENT_FEATURES=false`.
- Open `/home`: sidebar should show only History and Tools: Assets, Portfolio, Orders, Connect.
- Confirm no Backtests, Models, Live Trading, Run Backtest, Save Model, or Deploy Live controls are visible.
- Local dev with `VITE_ENABLE_DEVELOPMENT_FEATURES=true` should continue showing all development tools.

**Remaining work**
- Backend endpoints for development features still exist for local/dev use; they are not exposed through the production UI.
- If public backend access becomes a concern, add auth/admin checks around development API routes before broad beta.

### Phase 3 — Asset Universe Setup

**Status:** Complete

**What changed**
- Extended the asset model with `production_enabled` so production launch assets can be controlled separately from local/dev assets.
- Added an additive lightweight DB migration for the new `assets.production_enabled` column.
- Updated the asset seeder so it is idempotent and also updates existing asset/source rows instead of only inserting missing rows.
- Split the seed universe into `CORE_ASSET_UNIVERSE` plus `FAVORITE_STOCKS`, making it easy to add/remove the next 10 launch favorites without duplicate DB rows.
- Asset API serialization now exposes `production_enabled`.

**Files modified**
- `backend/data_assets/models/asset.py`
- `backend/data_assets/models/db.py`
- `backend/data_assets/seed/universe.py`
- `backend/data_assets/seed/seeder.py`
- `backend/data_assets/repositories/asset_repo.py`
- `backend/data_assets/services/asset_service.py`

**How to test**
- Add a ticker to `FAVORITE_STOCKS` in `backend/data_assets/seed/universe.py`.
- Restart the backend; `seed_assets()` should insert or update the row without duplicates.
- Check `GET /api/assets` and confirm the asset has `production_enabled`.

**Remaining work**
- Wire refresh jobs to refresh only the production-enabled universe in production.
- Run a local DB init/seed verification after backend job changes.

### Phase 4 — Data Refresh Jobs

**Status:** Complete

**What changed**
- Refresh jobs can now be controlled with backend env vars:
  - `ENABLE_ASSET_SCHEDULER`
  - `ASSET_WARM_STARTUP_REFRESH`
  - `ASSET_REFRESH_PRODUCTION_ONLY`
  - `APP_ENV`
- Production refresh can be limited to `production_enabled` assets.
- Scheduler creation now reuses an existing configured/running scheduler within a process to avoid duplicate startup.
- Price and candle refresh services now catch/log per-ticker failures and continue processing the rest of the universe.
- Scheduler job wrappers log job start/end and log failures clearly without crashing the app.
- Manual refresh already exists at `POST /api/assets/admin/refresh`.

**Files modified**
- `backend/main.py`
- `backend/data_assets/jobs/scheduler.py`
- `backend/data_assets/jobs/tasks.py`
- `backend/data_assets/services/price_service.py`
- `backend/data_assets/services/history_service.py`
- `backend/data_assets/repositories/asset_repo.py`
- `.env.example`

**How to test**
- Local/dev: keep `ENABLE_ASSET_SCHEDULER=true`, `ASSET_WARM_STARTUP_REFRESH=true`, `ASSET_REFRESH_PRODUCTION_ONLY=false`.
- Production Cloud Run recommendation: set `ENABLE_ASSET_SCHEDULER=false` and use Cloud Scheduler to call `POST /api/assets/admin/refresh` on a cadence, avoiding multi-instance duplicate schedulers.
- Single-instance production/dev alternative: set `ENABLE_ASSET_SCHEDULER=true` and `ASSET_REFRESH_PRODUCTION_ONLY=true`.
- Check logs for `[job] refresh_* started` and `[job] refresh_* done`.

**Remaining work**
- Add an auth/secret requirement to admin refresh endpoints before exposing them outside trusted infrastructure.
- Add persistent refresh-run history in a later data-platform phase.

### Phase 5 — Production Deployment Readiness

**Status:** Complete

**What changed**
- Reviewed Firebase hosting config: `firebase.json` already points to `frontend/dist`, keeps clean URLs, and rewrites all SPA routes to `/index.html`, which supports `/` and `/home`.
- Reviewed Docker Compose: local frontend now explicitly uses development feature flags.
- Updated README with production/local launch flags, backend asset refresh flags, Cloud Run scheduler recommendation, and deployment checklist.
- `.env.example` now documents runtime and refresh controls.

**Files modified**
- `README.md`
- `docker-compose.yml`
- `.env.example`
- `STATUS.md`

**Required production env vars**
- Frontend build: `VITE_APP_EXPERIENCE=production`, `VITE_APP_HOME_PATH=/home`, `VITE_ENABLE_DEVELOPMENT_FEATURES=false`, `VITE_WAITLIST_ENDPOINT` if using the waitlist form.
- Backend: `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `SUPABASE_DB_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `KRAKEN_SANDBOX=true`.
- Asset jobs: `APP_ENV=production`, `ASSET_REFRESH_PRODUCTION_ONLY=true`; use either Cloud Scheduler with `ENABLE_ASSET_SCHEDULER=false` or single-instance in-app scheduling with `ENABLE_ASSET_SCHEDULER=true`.

**How to test**
- Build frontend with production flags.
- Deploy Firebase Hosting.
- Deploy backend with production env vars in GCP Secret Manager or Cloud Run env, never committed `.env`.
- Confirm root landing and `/home` app behavior before sharing the private URL.

### Phase 6 — Verification

**Status:** Complete

**Verification results**
- `npm run build` in `frontend/`: passed.
- `python3 -m compileall backend/data_assets backend/main.py`: passed.
- Asset DB init/seed with backend venv: passed, `inserted=0`, `total_assets=40`.
- Duplicate symbol check: passed, `duplicate_symbols=0`.

**Notes**
- Vite reported the existing large bundle warning: `dist/assets/index-*.js` is over 500 kB after minification. This does not block launch, but code splitting is a good follow-up.
- Live market-data refresh was not executed during this verification pass because provider calls require network access and may depend on market/provider availability. The refresh path was compile-checked and hardened for per-ticker failures.

**Launch verification checklist**
- `/` shows landing page.
- `/home` shows production app.
- Production app shows only Chat plus Tools: Assets, Portfolio, Orders, Connect.
- Development features are hidden in production.
- Local dev at `/home` or `/app` still shows development features when `VITE_ENABLE_DEVELOPMENT_FEATURES=true`.
- Asset seed runs without duplicate rows.
- Scheduled refresh is either enabled for a single instance or disabled in Cloud Run in favor of Cloud Scheduler.
- Refresh logs are visible in app/backend logs.
- Firebase hosting deploy serves `frontend/dist`.
- GCP backend deploy uses environment variables/secrets, not committed credentials.

---

## Production Data Readiness — 2026-05-22

### Phase 1 — Production Deployment Runbook

**Status:** Complete

**What changed**
- Added a `# Production Deployment Runbook` section to `README.md`.
- Captured the current Firebase + Google Cloud / Cloud Run deployment understanding.
- Added explicit TODO placeholders for unconfirmed commands: Cloud Run deploy, Cloud Scheduler create/pause, rollback, env setup.
- Kept the runbook conservative: no invented production `gcloud` commands.

**Files modified**
- `README.md`

### Phase 2 — Current Data Processing Summary

**Status:** Complete

**What changed**
- Added `docs/DATA_PIPELINE.md` with the current data pipeline summary based on the code in `backend/data_assets/`.
- Documented providers, asset universe, seeded count, tables, refresh services, endpoints, scheduler jobs, env vars, local DB path, and cloud behavior.

**Current summary**
- Providers: Kraken public REST for crypto; yfinance for stocks/ETFs.
- Asset universe: `backend/data_assets/seed/universe.py`.
- Current local seed count: 40 assets.
- Local DB: `data/assets.db`.
- Cloud DB: Postgres when `SUPABASE_DB_URL` is set.
- Refresh endpoints: `POST /api/assets/admin/refresh`, `GET /api/assets/admin/status`, `GET /api/data/status`.

**Files modified**
- `docs/DATA_PIPELINE.md`

### Phase 3 — Cost-Conscious Architecture Review

**Status:** Complete

**Recommendation**
- Current setup is fine for ~50 stocks refreshed a few times per day.
- Use Cloud Scheduler + Cloud Run endpoint in production; keep in-app scheduler disabled on Cloud Run.
- Use Postgres/Supabase for production durability and concurrent writes.
- Do not use BigQuery, GCS parquet, or Airflow/Composer yet.
- Add GCS/BigQuery later for large historical research and analytics workloads.

**Files modified**
- `docs/DATA_PIPELINE.md`

### Phase 4 — Lightweight Data Observability

**Status:** Complete

**What changed**
- Added `job_runs` model/table for data refresh observability.
- Added repository helpers to start/complete/list job runs.
- Scheduler and manual/warm refresh flows now record job runs.
- `/api/data/status` now includes the 10 most recent job runs.
- Added a SQLite timeout to reduce local `database is locked` friction.

**Files modified**
- `backend/data_assets/models/asset.py`
- `backend/data_assets/models/db.py`
- `backend/data_assets/repositories/job_run_repo.py`
- `backend/data_assets/jobs/tasks.py`
- `backend/data_assets/refresh/coordinator.py`
- `backend/data_assets/dashboard/views.py`
- `backend/data_assets/services/price_service.py`
- `backend/data_assets/services/history_service.py`

**Verification**
- `python3 -m compileall backend/data_assets backend/main.py`: passed.
- Local `job_runs` write/read verification: passed after adding SQLite timeout.

### Phase 5 — Production Data Job Plan

**Status:** Complete

**Recommended production env**
- `APP_ENV=production`
- `SUPABASE_DB_URL=<postgres-url>`
- `ENABLE_ASSET_SCHEDULER=false`
- `ASSET_WARM_STARTUP_REFRESH=false`
- `ASSET_REFRESH_PRODUCTION_ONLY=true`

**Recommended cadence**
- Stocks/ETFs: 2-3 refreshes per trading day.
- Crypto: 3-6 refreshes per day.
- Daily candles: once per day after market close / overnight.
- Universe seed: once per deploy or once daily.

**Production endpoint plan**
- `POST /api/assets/admin/refresh?asset_type=stock`
- `POST /api/assets/admin/refresh?asset_type=crypto`
- `POST /api/assets/admin/refresh?asset_type=candles`

**Open production TODOs**
- Confirm Cloud Run service name, region, image/build path, and deploy command.
- Confirm Cloud Scheduler auth method, ideally OIDC service-account auth.
- Protect admin refresh endpoints with an auth/secret check before public exposure.
- Confirm rollback commands for Firebase Hosting and Cloud Run.

### Phase 6 — Handoff Summary

**Completed**
- Production deployment runbook drafted.
- Data pipeline documented from actual code.
- Cost-conscious architecture plan written for 50-stock launch.
- Lightweight `job_runs` observability implemented and verified.
- Production data refresh plan documented.

**Recommended next steps**
- Add auth protection to `/api/assets/admin/refresh` and `/api/assets/admin/status`.
- Confirm actual GCP project, Cloud Run service name, region, and Cloud Scheduler auth.
- Add the next 10 production favorite stocks to `FAVORITE_STOCKS`.
- Move production data to Postgres/Supabase before relying on Cloud Run for user-facing data.
- Create Cloud Scheduler jobs after backend URL and auth are confirmed.

**Risks / open questions**
- yfinance is cheap and convenient but not a paid production data SLA.
- Admin data endpoints are currently operationally useful but should not remain publicly unprotected.
- Exact prior `gcloud` deploy commands are not present in the repo and still need confirmation.

---

## Data Operations Tooling — 2026-05-22

### Phase 1 — Current Data Architecture Review

**Status:** Complete

**Current refresh flow**
- Asset universe is defined in `backend/data_assets/seed/universe.py` and seeded through `seed_assets()`.
- Quotes refresh through `refresh_crypto_prices()` and `refresh_stock_prices()`.
- Daily candles refresh through `refresh_daily_candles()`.
- In-app APScheduler jobs exist, but production should prefer Cloud Scheduler calling secured endpoints.
- Manual refresh currently queues background tasks through `manual_refresh()`.

**Current admin/status endpoints**
- Public data endpoints: `GET /api/assets`, `GET /api/assets/{symbol}`, quotes, history, search.
- Operational endpoints currently present:
  - `GET /api/assets/admin/status`
  - `POST /api/assets/admin/refresh`
  - `GET /api/data/status`
- These operational endpoints are not yet protected; this is the next fix.

**Current asset universe management**
- `Asset` has `is_active` and `production_enabled` flags.
- `AssetSource` maps provider symbols like yfinance or Kraken symbols.
- Seeder is idempotent and updates existing asset/source rows.
- Adding launch assets should happen in `FAVORITE_STOCKS` or via new admin APIs.

**Current job_runs tracking**
- `JobRun` stores `job_name`, `status`, timestamps, counts, and error message.
- Scheduler jobs and manual/warm refresh paths record job runs.
- `GET /api/data/status` returns the 10 most recent job runs.

**No architecture rewrite planned**
- Current layered package is good enough for the ~50-asset beta.
- The work below keeps the existing structure and adds only small operational APIs/UI.

### Phase 2 — Secure Admin Endpoints

**Status:** Complete

**What changed**
- Added `ADMIN_API_SECRET`.
- Operational endpoints require `X-Admin-Secret` when the secret is configured.
- Production fails closed if `ADMIN_API_SECRET` is missing.
- Local development can run without the header when `APP_ENV=development` and no secret is configured.
- Protected existing endpoints:
  - `GET /api/assets/admin/status`
  - `POST /api/assets/admin/refresh`
  - `GET /api/data/status`

**Files modified**
- `backend/data_assets/admin_auth.py`
- `backend/data_assets/router.py`
- `backend/data_assets/dashboard/views.py`
- `.env.example`

### Phase 3 — Lightweight Data Admin APIs

**Status:** Complete

**What changed**
- Added `/api/admin/data/runs` for recent job runs with filters.
- Added `/api/admin/data/assets` for asset health and stale/missing state.
- Added `/api/admin/data/refresh` for manual batch refresh.
- Added `/api/admin/data/assets` to create assets.
- Added `/api/admin/data/assets/{symbol}` to update enable/production/provider metadata.
- Added `/api/admin/data/assets/{symbol}/refresh` for a single latest-price refresh.

**Files modified**
- `backend/data_assets/admin_router.py`
- `backend/main.py`

### Phase 4 — Lightweight Internal Admin UI

**Status:** Complete

**What changed**
- Added hidden frontend route `/home/admin/data`.
- Route/nav is only available when `VITE_ENABLE_ADMIN=true`.
- Added Recent Data Runs table.
- Added Asset Health table with filters and actions.
- Added Add Asset form.
- Admin UI stores the admin secret in `sessionStorage`, not localStorage.

**Files modified**
- `frontend/src/config/runtime.js`
- `frontend/src/utils/api.js`
- `frontend/src/App.jsx`
- `frontend/src/components/Sidebar.jsx`
- `frontend/src/components/DataAdminPanel.jsx`

### Phase 5 — Operational Recommendations

**Status:** Complete

Added `# Operational Scaling Recommendations` to `docs/DATA_PIPELINE.md`.

**Recommendation summary**
- Current setup is good for ~50 assets.
- Prefer Cloud Scheduler to Cloud Run endpoints.
- Keep in-app scheduler disabled in Cloud Run.
- SQLite is fine locally; use Postgres/Supabase for production durability.
- GCS/BigQuery/Airflow are later-stage tools.
- Use `enabled` and `production_enabled` to grow the universe cleanly.

### Phase 6 — Verification + Documentation

**Status:** Complete

**Docs updated**
- `README.md`
- `.env.example`
- `docs/DATA_PIPELINE.md`
- `STATUS.md`

**How to test admin APIs**
- Missing header in production: returns `401`.
- Wrong header in production: returns `403`.
- Correct `X-Admin-Secret`: returns `200`.
- Local dev with `APP_ENV=development` and empty `ADMIN_API_SECRET`: allowed for fast local debugging.

**How to enable admin UI locally**
- Set `VITE_ENABLE_ADMIN=true`.
- Open `/home/admin/data`.
- If `ADMIN_API_SECRET` is set, enter it in the UI secret bar.

**Verification run**
- `python3 -m compileall backend/data_assets backend/main.py`: passed.
- Backend route import: passed.
- Admin auth/API smoke test with `TestClient`: missing `401`, wrong `403`, correct `200`.
- `npm run build`: passed.

**Known note**
- Frontend build still reports the existing large bundle warning. It is not blocking this ops tooling work.

---

## ✅ Completed

### Phase 1 — Internal Data Platform Cleanup

Migrated all asset/market-data logic from `backend/assets/` into a cleanly
isolated, layered internal package `backend/data_assets/`.

**New package structure:**
```
backend/data_assets/
  __init__.py              # public API surface + docstring
  models/
    db.py                  # async engine, SessionLocal, Base, init_db, get_db
    asset.py               # SQLAlchemy models: Asset, AssetSource, AssetPrice, AssetOHLCV, AssetWatchlist
  providers/
    base.py                # AssetProvider ABC, PriceQuote, OHLCVCandle dataclasses
    kraken.py              # KrakenProvider (public REST, no keys needed)
    yfinance.py            # YFinanceProvider (fast_info quotes + download OHLCV)
  repositories/
    asset_repo.py          # Asset + AssetSource queries (thin DB access layer)
    price_repo.py          # AssetPrice upsert + read
    history_repo.py        # AssetOHLCV read + upsert, period_to_since helper
  services/
    price_service.py       # refresh_crypto_prices(db), refresh_stock_prices(db)
    history_service.py     # refresh_daily_candles(db)
    asset_service.py       # get_asset_list, get_asset_detail, search_assets, get_asset_history
  seed/
    universe.py            # ASSET_UNIVERSE data (25 stocks, 5 ETFs, 10 crypto)
    seeder.py              # seed_assets(db) — idempotent
  jobs/
    scheduler.py           # AsyncIOScheduler lifecycle + get_status()
    tasks.py               # job_refresh_* functions (call services, open their own session)
  refresh/
    coordinator.py         # warm_startup_refresh() + manual_refresh(asset_type)
  utils/
    format.py              # age_minutes(), is_fresh(), fmt_compact()
  router.py                # FastAPI routes (unchanged API surface)
  dashboard/
    views.py               # GET /api/data/status — ops/monitoring endpoint
```

**backward compat:** `backend/assets/` is now a shim that re-exports from
`data_assets/`. No other code needed to change; any remaining direct
`assets.*` imports continue to work.

**Updated files:**
- `backend/main.py` — imports from `data_assets.*`, mounts dashboard router at `/api/data/status`, version bumped to 0.2.0
- `backend/admin.py` — imports Asset models from `data_assets.models.asset`

### Phase 2 — Warm Startup Refresh

`warm_startup_refresh()` is called during FastAPI lifespan (after DB init and
seed) and schedules two background asyncio tasks:
- `_run_crypto()` → fetches Kraken quotes for all 10 crypto assets
- `_run_stocks()` → fetches yfinance quotes for 25 stocks + 5 ETFs

These run **without blocking startup**. Crypto prices will be live within
~2 seconds of server start. Stock/ETF prices succeed only during market hours.

---

## 🔄 Architecture Summary

```
HTTP Request
    │
    ▼
router.py (FastAPI routes)
    │
    ▼
services/ (business logic — no HTTP concerns)
    │        │
    ▼        ▼
repos/   providers/
(DB)     (Kraken, yfinance)
    │
    ▼
models/ (SQLAlchemy)
    │
    ▼
models/db.py (SQLite dev / Postgres prod)
```

**Key principle:** frontend → backend API → service layer → providers.
Frontend never calls providers directly.

---

## 📊 Current Data State (2026-05-20)

- **Assets in DB:** 40 (25 stocks, 5 ETFs, 10 crypto)
- **Prices cached:** 10 (crypto only — stocks need market hours)
- **OHLCV candles:** 0 (daily job runs at 01:00 UTC)
- **Scheduler:** 4 jobs (crypto_prices 1h, stock_prices 1h, daily_candles 01:00 UTC, asset_universe 02:00 UTC)
- **DB backend:** SQLite (data/assets.db) — Supabase via SUPABASE_DB_URL

---

## 🚧 Pending Phases

### Phase 3 — Refresh Monitoring System
Track per-job run history: started_at, completed_at, success/failure, duration,
provider, errors. Add a `RefreshRun` model. Expose via dashboard.

### Phase 4 — Data Dashboard  
Rich internal HTML dashboard at `/data-platform/` showing:
- Asset counts by type
- Price freshness heatmap
- Scheduler job status
- Recent errors
- Provider health

### Phase 5 — Better Search
Fuzzy search: "apple" → AAPL, "btc" → BTC, "google" → GOOGL.
Group results by asset type. Return by relevance score.

### Phase 6 — Better Asset Detail Panel
Frontend: add 7d change, 52-week high/low, description, richer metadata.
Backend: add `description`, `sector`, `market_cap_category` fields to Asset model.

### Phase 7 — Chart Interval Picker
Frontend interval buttons: 1D / 1W / 1M / 3M / 1Y / 3Y.
Backend already supports `period` param (1m/3m/6m/1y/2y/3y).
Only daily candles — no intraday.

### Phase 8 — Watchlists
`AssetWatchlist` model already exists in DB. Need:
- `POST /api/assets/{symbol}/watch`
- `DELETE /api/assets/{symbol}/watch`
- `GET /api/assets/watchlist` (per session/user)
- Frontend: heart icon on asset rows

---

## 🔑 Key Files

| File | Purpose |
|---|---|
| `backend/data_assets/models/db.py` | DB engine config (SQLite/Postgres) |
| `backend/data_assets/models/asset.py` | SQLAlchemy models |
| `backend/data_assets/seed/universe.py` | ASSET_UNIVERSE — edit to add assets |
| `backend/data_assets/jobs/scheduler.py` | APScheduler setup |
| `backend/data_assets/refresh/coordinator.py` | Warm startup + manual refresh |
| `backend/data_assets/router.py` | Public API routes |
| `backend/data_assets/dashboard/views.py` | Ops monitoring |
| `backend/main.py` | App entry point |
| `backend/data/assets.db` | SQLite DB (dev) |
| `frontend/src/hooks/useAssets.js` | Polls /api/assets every 5 min |
| `frontend/src/components/AssetsPanel.jsx` | Main assets UI |

---

## 🐛 Known Issues

1. **yfinance after-hours:** `YFinanceProvider.get_quote()` fails for stocks
   when US markets are closed. Prices remain stale until market open.
   _Workaround:_ this is acceptable per product principle (prefer stale over
   complex real-time infra). The `price_fresh` field shows staleness.

2. **No refresh run history:** failures are only in logs, not queryable.
   Phase 3 will fix this.

3. **OHLCV empty on first boot:** daily candle job runs at 01:00 UTC.
   On first boot, chart shows "No historical data yet" until then.
   _Workaround:_ `GET /api/assets/admin/refresh?asset_type=candles` triggers
   an immediate background fetch.

4. **Stock prices during market hours only:** yfinance fast_info works reliably
   only when markets are open. Phase 3 monitoring will surface this clearly.

---

## ✅ API Endpoints (unchanged, no breaking changes)

```
GET  /api/assets                      → list all assets (filters: asset_type, tradable)
GET  /api/assets/search?q=...         → search by symbol/name
GET  /api/assets/admin/status         → ops status (delegates to dashboard)
POST /api/assets/admin/refresh        → manual refresh trigger
GET  /api/assets/{symbol}             → single asset detail + sources
GET  /api/assets/{symbol}/quote       → latest price only
GET  /api/assets/{symbol}/history     → OHLCV candles (period: 1m/3m/6m/1y/2y/3y)
GET  /api/data/status                 → new: full ops monitoring endpoint
```

---

## 🔧 Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SUPABASE_DB_URL` | (empty → SQLite) | Postgres URL for prod |
| `ADMIN_SECRET` | changeme | Admin panel password |
| `CORS_ORIGINS` | localhost:5173,3000 | Allowed CORS origins |
| `KRAKEN_SANDBOX` | true | Live vs paper orders |
