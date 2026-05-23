"""JobRun read/write helpers for lightweight data refresh observability."""
from datetime import datetime
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.asset import JobRun


async def start_job_run(db: AsyncSession, job_name: str) -> JobRun:
    row = JobRun(job_name=job_name, status="running", started_at=datetime.utcnow())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def complete_job_run(
    db: AsyncSession,
    run: JobRun,
    *,
    status: str,
    asset_count: int | None = None,
    success_count: int | None = None,
    failure_count: int | None = None,
    error_message: str | None = None,
) -> JobRun:
    row = await db.merge(run)
    row.status = status
    row.completed_at = datetime.utcnow()
    row.asset_count = asset_count
    row.success_count = success_count
    row.failure_count = failure_count
    row.error_message = error_message[:2000] if error_message else None
    await db.commit()
    await db.refresh(row)
    return row


async def recent_job_runs(db: AsyncSession, limit: int = 20) -> list[JobRun]:
    result = await db.execute(
        select(JobRun)
        .order_by(desc(JobRun.started_at))
        .limit(limit)
    )
    return list(result.scalars().all())
