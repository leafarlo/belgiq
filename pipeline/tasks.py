"""
BelgiQ Pipeline Scheduler
=========================
Uses Celery + Redis for scheduled weekly data refreshes.

Start worker:  celery -A pipeline.tasks worker --loglevel=info
Start beat:    celery -A pipeline.tasks beat   --loglevel=info
"""

import os
import logging
from datetime import datetime
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

LOG = logging.getLogger("belgiq.pipeline")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DB_URL    = os.getenv("DATABASE_URL", "postgresql://belgiq:password@localhost/belgiq")

app = Celery("belgiq", broker=REDIS_URL, backend=REDIS_URL)

app.conf.beat_schedule = {
    # Full data refresh every Monday at 3am
    "weekly-full-refresh": {
        "task": "pipeline.tasks.run_full_pipeline",
        "schedule": crontab(hour=3, minute=0, day_of_week=1),
    },
    # Bills only — every night at 1am (bills change frequently)
    "nightly-bills-refresh": {
        "task": "pipeline.tasks.refresh_bills_only",
        "schedule": crontab(hour=1, minute=0),
    },
}

app.conf.timezone = "Europe/Brussels"


# ── TASKS ─────────────────────────────────────────────────────────────────────

@app.task(bind=True, max_retries=3, default_retry_delay=300)
def run_full_pipeline(self):
    """Full weekly pipeline: bills + politicians + consistency + scoring."""
    import asyncpg, asyncio

    run_id = _log_run_start()
    errors = []
    stats = {"bills_fetched": 0, "bills_new": 0}

    try:
        LOG.info("=== BelgiQ Full Pipeline starting ===")

        # 1. Fetch bills from all sources
        from pipeline.kamer import KamerFetcher
        from pipeline.vlaams import VlaamsParlement
        from pipeline.consistency import ConsistencyChecker

        kamer  = KamerFetcher()
        vlaams = VlaamsParlement()
        checker = ConsistencyChecker()

        all_bills = []

        try:
            federal_bills = kamer.fetch_recent_bills(limit=100)
            all_bills.extend(federal_bills)
            LOG.info(f"Federal: {len(federal_bills)} bills")
        except Exception as e:
            LOG.error(f"Kamer fetch failed: {e}")
            errors.append(f"kamer: {e}")
            self.retry(exc=e)

        try:
            flemish_bills = vlaams.fetch_recent_bills(limit=100)
            all_bills.extend(flemish_bills)
            LOG.info(f"Flemish: {len(flemish_bills)} bills")
        except Exception as e:
            LOG.error(f"Vlaams fetch failed: {e}")
            errors.append(f"vlaams: {e}")

        # 2. Consistency check
        for bill in all_bills:
            bill.consistency_alerts = checker.check_bill(bill)

        stats["bills_fetched"] = len(all_bills)

        # 3. Upsert into Postgres
        new_count = asyncio.run(_upsert_bills(all_bills))
        stats["bills_new"] = new_count

        # 4. Refresh politician scores
        asyncio.run(_refresh_politician_scores())

        LOG.info(f"Pipeline complete. {stats}")
        _log_run_end(run_id, "success", stats, errors)

    except Exception as e:
        LOG.error(f"Pipeline failed: {e}")
        errors.append(str(e))
        _log_run_end(run_id, "failed", stats, errors)
        raise


@app.task
def refresh_bills_only():
    """Lighter nightly job — just fetch new bills, no scoring."""
    import asyncio
    from pipeline.kamer import KamerFetcher
    from pipeline.vlaams import VlaamsParlement

    LOG.info("=== Nightly bills refresh ===")
    kamer = KamerFetcher()
    vlaams = VlaamsParlement()

    bills = kamer.fetch_recent_bills(limit=30) + vlaams.fetch_recent_bills(limit=30)
    new_count = asyncio.run(_upsert_bills(bills))
    LOG.info(f"Nightly refresh: {len(bills)} fetched, {new_count} new")


# ── DATABASE HELPERS ──────────────────────────────────────────────────────────

async def _upsert_bills(bills) -> int:
    """Upsert bills into Postgres. Returns count of newly inserted bills."""
    import asyncpg

    conn = await asyncpg.connect(DB_URL)
    new_count = 0

    try:
        for bill in bills:
            # Check if bill already exists
            existing = await conn.fetchval("SELECT id FROM bills WHERE id = $1", bill.id)

            if existing is None:
                # Insert new bill
                await conn.execute("""
                    INSERT INTO bills (
                        id, number, source, introduced_date, status,
                        theme, theme_color, title_nl, title_fr,
                        summary_nl, summary_fr, impact_nl, impact_fr,
                        introduced_by_name, introduced_by_party, source_url
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        updated_at = NOW()
                """,
                    bill.id, bill.number, bill.source,
                    datetime.fromisoformat(bill.date).date(),
                    bill.status, bill.theme,
                    _theme_color(bill.theme),
                    bill.title_nl, bill.title_fr,
                    bill.summary_nl, bill.summary_fr,
                    bill.impact_nl, bill.impact_fr,
                    bill.introduced_by_name, bill.introduced_by_party,
                    bill.url
                )
                new_count += 1

                # Insert votes
                for v in bill.votes:
                    await conn.execute("""
                        INSERT INTO votes (bill_id, politician_name, party_id, vote)
                        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
                    """, bill.id, v.politician_name, v.party, v.vote)

                # Insert consistency alerts
                for a in bill.consistency_alerts:
                    await conn.execute("""
                        INSERT INTO bill_consistency_alerts
                            (bill_id, politician_name, party_id, alert_type, description_nl, description_fr)
                        VALUES ($1,$2,$3,$4,$5,$6)
                    """, bill.id, a.politician, a.party, a.alert_type,
                         a.description_nl, a.description_fr)

    finally:
        await conn.close()

    return new_count


async def _refresh_politician_scores():
    """Recalculate consistency scores from vote data."""
    import asyncpg

    conn = await asyncpg.connect(DB_URL)
    try:
        politicians = await conn.fetch("SELECT id FROM politicians")
        for pol in politicians:
            pid = pol["id"]
            name_row = await conn.fetchrow("SELECT name FROM politicians WHERE id = $1", pid)
            name = name_row["name"] if name_row else ""

            # Count consistency events
            total = await conn.fetchval(
                "SELECT COUNT(*) FROM consistency_events WHERE politician_id = $1", pid
            )
            kept = await conn.fetchval(
                "SELECT COUNT(*) FROM consistency_events WHERE politician_id = $1 AND verdict = 'kept'", pid
            )

            if total > 0:
                score = int((kept / total) * 100)
                await conn.execute(
                    "UPDATE politicians SET consistency_score = $1, updated_at = NOW() WHERE id = $2",
                    score, pid
                )

            # Commotion score from severity sum
            severity_sum = await conn.fetchval(
                "SELECT COALESCE(SUM(severity), 0) FROM commotion_events WHERE politician_id = $1", pid
            )
            commotion_score = min(100, int(severity_sum * 12))
            await conn.execute(
                "UPDATE politicians SET commotion_score = $1, updated_at = NOW() WHERE id = $2",
                commotion_score, pid
            )

    finally:
        await conn.close()


def _theme_color(theme: str) -> str:
    return {
        "fiscal": "#1a3a5c", "migration": "#c2410c", "energy": "#065f46",
        "housing": "#f5c518", "social": "#7c3aed", "healthcare": "#0369a1",
        "justice": "#374151", "education": "#059669", "defense": "#64748b",
        "climate": "#166534",
    }.get(theme, "#6b7280")


def _log_run_start() -> str:
    import asyncpg, asyncio, uuid
    async def _insert():
        conn = await asyncpg.connect(DB_URL)
        run_id = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO pipeline_runs (id) VALUES ($1)", run_id
        )
        await conn.close()
        return run_id
    return asyncio.run(_insert())


def _log_run_end(run_id: str, status: str, stats: dict, errors: list):
    import asyncpg, asyncio
    async def _update():
        conn = await asyncpg.connect(DB_URL)
        await conn.execute("""
            UPDATE pipeline_runs SET
                finished_at = NOW(), status = $2,
                bills_fetched = $3, bills_new = $4, errors = $5
            WHERE id = $1
        """, run_id, status,
             stats.get("bills_fetched", 0),
             stats.get("bills_new", 0),
             errors or [])
        await conn.close()
    asyncio.run(_update())
