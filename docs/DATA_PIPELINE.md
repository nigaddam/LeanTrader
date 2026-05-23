# LangStock Data Pipeline

Last updated: 2026-05-22

## Current Data Processing Summary

This summary is based on the current `backend/data_assets/` code.

### Supported Data Providers

- `kraken`: public Kraken REST through `krakenex`; used for crypto quotes and OHLCV.
- `yfinance`: used for stock and ETF quotes plus daily OHLCV.

Provider abstraction lives in `backend/data_assets/providers/base.py`.
Concrete providers live in:

- `backend/data_assets/providers/kraken.py`
- `backend/data_assets/providers/yfinance.py`

### Asset Universe

The production/local asset universe is defined in:

- `backend/data_assets/seed/universe.py`

Current structure:

- `CORE_ASSET_UNIVERSE`: existing launch universe.
- `FAVORITE_STOCKS`: empty extension point for the next launch favorites.
- `ASSET_UNIVERSE`: merged list with default `enabled=true` and `production_enabled=true`.

Current seeded count verified locally: `40` assets.

Current mix from the seed file:

- 25 stocks
- 5 ETFs
- 10 crypto assets

### Tables / Models

Defined in `backend/data_assets/models/asset.py`:

- `assets`
  - logical asset row, including `symbol`, `display_name`, `asset_type`, `is_active`, `production_enabled`, `default_source`.
- `asset_sources`
  - provider/broker symbol mappings per asset.
- `asset_prices`
  - latest price per asset/source, updated in place.
- `asset_ohlcv`
  - daily OHLCV candles, insert-only with uniqueness on asset/interval/timestamp.
- `asset_watchlists`
  - placeholder for future per-user/session watchlists.
- `job_runs`
  - lightweight refresh job audit trail.

### What Gets Refreshed

Price refresh:

- `refresh_crypto_prices()` fetches latest Kraken quotes for active crypto assets.
- `refresh_stock_prices()` fetches latest yfinance quotes for active stocks and ETFs.
- Latest prices upsert into `asset_prices`.

History refresh:

- `refresh_daily_candles()` fetches daily candles for active assets using each asset's primary provider.
- Candles insert into `asset_ohlcv`; duplicates are skipped by timestamp.

Universe refresh:

- `seed_assets()` inserts missing assets/sources and updates existing rows.
- It is idempotent and safe to run repeatedly.

### Refresh Endpoints

Defined in `backend/data_assets/router.py`:

- `GET /api/assets`
- `GET /api/assets/search?q=...`
- `GET /api/assets/admin/status`
- `POST /api/assets/admin/refresh`
- `GET /api/assets/{symbol}`
- `GET /api/assets/{symbol}/quote`
- `GET /api/assets/{symbol}/history`

Monitoring endpoint:

- `GET /api/data/status`

Admin endpoints are protected by `X-Admin-Secret` when `ADMIN_API_SECRET` is
configured. In production, missing `ADMIN_API_SECRET` fails closed.

Internal data operations endpoints:

- `GET /api/admin/data/runs`
- `GET /api/admin/data/assets`
- `POST /api/admin/data/refresh`
- `POST /api/admin/data/assets`
- `PATCH /api/admin/data/assets/{symbol}`
- `POST /api/admin/data/assets/{symbol}/refresh`

Manual refresh accepts:

- `asset_type=crypto`
- `asset_type=stock` or `asset_type=etf`
- `asset_type=candles`
- blank/all for crypto + stock/ETF

### Scheduled Jobs

Defined in `backend/data_assets/jobs/scheduler.py`:

- `crypto_prices`: every 1 hour
- `stock_prices`: every 1 hour
- `daily_candles`: every day at 01:00 UTC
- `asset_universe`: every day at 02:00 UTC

For production Cloud Run, in-app scheduling should be disabled and replaced
with Cloud Scheduler calling refresh endpoints.

### Refresh Environment Variables

- `APP_ENV`
  - `production` makes production-only refresh the default.
- `ADMIN_API_SECRET`
  - required in production for operational data endpoints.
- `ENABLE_ASSET_SCHEDULER`
  - whether APScheduler starts inside the backend process.
- `ASSET_WARM_STARTUP_REFRESH`
  - whether backend startup queues immediate price refresh tasks.
- `ASSET_REFRESH_PRODUCTION_ONLY`
  - whether refresh jobs only process `production_enabled` assets.
- `SUPABASE_DB_URL`
  - if present, data-assets DB uses Postgres via asyncpg.
  - if absent, local SQLite is used.
- `VITE_ENABLE_ADMIN`
  - frontend flag to expose `/home/admin/data`; default should be false.

### Local Data Location

Local data-assets storage:

- SQLite database: `data/assets.db`

The async DB config lives in:

- `backend/data_assets/models/db.py`

### Cloud Behavior

When `SUPABASE_DB_URL` is set:

- data-assets uses Postgres instead of local SQLite.
- seed and refresh jobs write to the cloud database.
- Cloud Run instances should not rely on local disk for durable data.

Recommended Cloud Run data settings:

- `APP_ENV=production`
- `ENABLE_ASSET_SCHEDULER=false`
- `ASSET_WARM_STARTUP_REFRESH=false`
- `ASSET_REFRESH_PRODUCTION_ONLY=true`

Then Cloud Scheduler triggers refresh endpoints.

## Cost-Conscious Data Architecture Review

### Is the Current Setup Fine for 50 Stocks?

Yes. For around 50 stocks and a few refreshes per day, the current approach is
simple and cost-conscious:

- One small asset universe table.
- One latest-price row per asset/source.
- Daily candles stored only once per asset/day.
- Cloud Scheduler can trigger a small Cloud Run request a few times per day.
- No always-on worker is required.

The current setup optimizes for learning and reliability, which is the right
tradeoff for the near-term launch.

### Likely Scaling Bottlenecks

The first bottlenecks will probably be:

- Provider limits and reliability, especially yfinance for larger universes.
- Sequential per-symbol refresh calls.
- Cloud Run request timeout if a single refresh endpoint tries thousands of symbols.
- SQLite if multiple workers/users/jobs write concurrently.
- Candle table growth once historical depth and symbol count increase.
- Lack of persistent per-asset refresh diagnostics beyond logs.

### When SQLite Is No Longer Enough

SQLite is fine for local development and small single-process experiments.
Move off SQLite when:

- Cloud deployment needs durable shared storage.
- Multiple Cloud Run instances may read/write at once.
- User-specific portfolios/orders become production-critical.
- Refresh jobs run concurrently.
- You need regular backups, migrations, and operational visibility.

For production, use Postgres sooner rather than later if the app is taking real
user actions or storing user portfolio/order data.

### Postgres / Cloud SQL / Supabase

Postgres is the right next step for production app data:

- Assets
- Latest prices
- Orders
- Portfolios
- Job runs
- User/account connection metadata

The repo already supports `SUPABASE_DB_URL`, which is a good low-ops path.
Cloud SQL is also fine, but typically has more baseline cost/ops overhead.

### BigQuery

BigQuery does not make sense for the near-term 50-stock refresh plan.
Consider it later for:

- Large historical analytics.
- Many millions of price/candle rows.
- Research queries across broad universes.
- Aggregated user/product analytics.

Do not use BigQuery as the primary app database.

### GCS Parquet / CSV

GCS is attractive later for cheap historical data:

- Raw provider downloads.
- Backfilled daily candles.
- Large historical snapshots.
- Parquet files partitioned by provider/date/asset_type.

For now, keep data in Postgres/SQLite. Add GCS when historical data size starts
to matter or when you want reproducible research backfills.

### Airflow / Composer

Airflow/Cloud Composer is overkill right now.

Use lighter options first:

- Cloud Scheduler + Cloud Run endpoint.
- Cloud Tasks if refreshes need fan-out/retry per batch.
- A `job_runs` table.
- Batch refresh by asset group.
- Cron-like scheduled refreshes.

Move to Airflow/Composer only if you have many dependent pipelines, backfills,
SLAs, retries, branching workflows, and enough complexity to justify the cost.

### Avoiding Unnecessary Cloud Costs

- Disable in-app scheduler in Cloud Run.
- Use Cloud Scheduler to wake the backend only when needed.
- Refresh a few times per day, not every minute.
- Store one latest-price row per asset/source.
- Insert candles once per day and skip duplicates.
- Keep production asset universe small via `production_enabled`.
- Avoid BigQuery/Composer until data volume requires them.
- Batch by asset group: stocks, crypto, candles.

### Minimizing API Calls

- Refresh only `production_enabled` assets.
- Keep stocks to a curated list.
- Do not refresh historical candles on every quote refresh.
- Run candle jobs daily or less.
- Cache latest prices in `asset_prices`.
- Add provider-level batching later where supported.

### Avoiding Duplicate Data

Current protections:

- `assets.symbol` is unique.
- `asset_sources` is unique by asset/source.
- `asset_prices` is unique by asset/source and updated in place.
- `asset_ohlcv` is unique by asset/interval/timestamp.
- Seeder updates existing rows instead of inserting duplicates.

### Adding / Removing Tickers Cleanly

Add/remove tickers in:

- `backend/data_assets/seed/universe.py`

Recommended flow:

1. Add the asset to `FAVORITE_STOCKS` or `CORE_ASSET_UNIVERSE`.
2. Set `enabled=true`.
3. Set `production_enabled=true` only if it should refresh in production.
4. Restart backend or run the universe seed job.
5. Verify with `GET /api/assets`.

To remove from production without deleting history, set:

- `production_enabled=false`

To hide locally and production, set:

- `enabled=false`

## Recommended Production Data Job Plan

Assumptions:

- Backend runs on Cloud Run.
- Cloud Scheduler triggers refreshes.
- Around 50 production-enabled stocks.
- Refresh a few times per day.
- No in-app scheduler in production.

### Recommended Env Vars

```bash
APP_ENV=production
SUPABASE_DB_URL=<postgres-url>
ENABLE_ASSET_SCHEDULER=false
ASSET_WARM_STARTUP_REFRESH=false
ASSET_REFRESH_PRODUCTION_ONLY=true
```

### Recommended Cadence

Near-term low-cost schedule:

- Stock/ETF latest prices: 3 times per trading day.
- Crypto latest prices: 3-6 times per day.
- Daily candles: once per day after market close / overnight.
- Asset universe seed: once per day or on deploy.

For the first launch, even 2-3 stock refreshes per day is enough.

### Endpoints to Hit

```bash
POST /api/assets/admin/refresh?asset_type=stock
POST /api/assets/admin/refresh?asset_type=crypto
POST /api/assets/admin/refresh?asset_type=candles
```

### Manual Trigger

```bash
curl -X POST "https://<backend-host>/api/assets/admin/refresh?asset_type=stock"
```

Admin refresh endpoints are protected with `ADMIN_API_SECRET` +
`X-Admin-Secret`. The next improvement is Cloud Scheduler OIDC or a secret
stored only in Cloud Scheduler/Cloud Run config.

### Verify Success

Check:

- `GET /api/data/status`
- `GET /api/assets`
- `job_runs` rows
- Cloud Run logs
- Cloud Scheduler execution history

### Rollback / Disable Jobs

- Pause Cloud Scheduler jobs.
- Set `ASSET_REFRESH_PRODUCTION_ONLY=true` to limit blast radius.
- Set `production_enabled=false` for problematic tickers.
- Temporarily disable endpoints or revoke scheduler auth if needed.

### Current Risks / Open Questions

- Admin refresh endpoint has a shared-secret guard, but Cloud Scheduler OIDC is a better long-term production auth shape.
- yfinance is convenient but not a formal paid market-data SLA.
- For production user portfolios/orders, use Postgres rather than local SQLite.
- Exact Cloud Run service name, region, deploy command, and Cloud Scheduler auth method still need confirmation.

# Operational Scaling Recommendations

The current system is intentionally small: Cloud Scheduler triggers a secured
Cloud Run endpoint, the endpoint refreshes a curated asset batch, results land
in SQLite locally or Postgres in cloud, and the internal admin UI gives just
enough visibility to debug failures.

For 50 assets, this is the right shape. You do not need Airflow, Composer,
Kafka, Spark, or BigQuery-heavy workflows. A few scheduled HTTP calls per day
keeps compute near zero when idle, which is ideal for an early beta.

Use SQLite locally because it is fast, simple, and easy to inspect. Move
production data to Postgres/Supabase when Cloud Run is serving real users,
when multiple instances may write, or when portfolio/order history matters.
SQLite is not a durable shared cloud database.

GCS parquet or CSV storage makes sense later for cheap historical archives:
raw provider files, daily backfills, or research snapshots. It is not needed
for current latest-price and small candle storage. BigQuery should wait until
you have large historical analytics or product analytics workloads.

Keep costs low by:

- disabling in-app schedulers in Cloud Run,
- refreshing only `production_enabled` assets,
- batching by asset group,
- refreshing stocks only a few times per day,
- storing one latest-price row per asset/source,
- inserting candles once per day and skipping duplicates,
- using `job_runs` for visibility instead of a separate orchestration stack.

Avoid duplicate refreshes by running either Cloud Scheduler or in-app
APScheduler, not both, in production. For Cloud Run, prefer Cloud Scheduler.

When the universe grows, batch refreshes by provider and asset type first.
Later, add Cloud Tasks fan-out if a single request becomes too slow. Keep the
asset universe clean by using `enabled` and `production_enabled` rather than
deleting rows; this preserves history while controlling what refreshes.
