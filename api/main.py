"""
BelgiQ FastAPI Backend
======================
Run: uvicorn api.main:app --reload --port 8000
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://belgiq:password@localhost/belgiq")

pool: asyncpg.Pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(DB_URL, min_size=2, max_size=10)
    yield
    await pool.close()

app = FastAPI(title="BelgiQ API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://belgiq.be"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── BILLS ─────────────────────────────────────────────────────────────────────

@app.get("/api/bills")
async def get_bills(
    source: Optional[str] = Query(None, description="federal|flemish|walloon|brussels"),
    theme:  Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit:  int = Query(50, le=200),
    offset: int = Query(0),
):
    conditions = []
    args = []
    i = 1

    if source:
        conditions.append(f"source = ${i}"); args.append(source); i += 1
    if theme:
        conditions.append(f"theme = ${i}"); args.append(theme); i += 1
    if status:
        conditions.append(f"status = ${i}"); args.append(status); i += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    args += [limit, offset]

    rows = await pool.fetch(
        f"""
        SELECT b.*,
               json_agg(json_build_object(
                 'name', v.politician_name, 'party', v.party_id, 'vote', v.vote
               )) FILTER (WHERE v.id IS NOT NULL) AS votes_raw,
               json_agg(json_build_object(
                 'politician', a.politician_name, 'party', a.party_id,
                 'type', a.alert_type, 'nl', a.description_nl, 'fr', a.description_fr
               )) FILTER (WHERE a.id IS NOT NULL) AS alerts_raw
        FROM bills b
        LEFT JOIN votes v ON v.bill_id = b.id
        LEFT JOIN bill_consistency_alerts a ON a.bill_id = b.id
        {where}
        GROUP BY b.id
        ORDER BY b.introduced_date DESC
        LIMIT ${i} OFFSET ${i+1}
        """,
        *args
    )

    return [_format_bill(r) for r in rows]


@app.get("/api/bills/{bill_id}")
async def get_bill(bill_id: str):
    row = await pool.fetchrow(
        """
        SELECT b.*,
               json_agg(json_build_object('name', v.politician_name, 'party', v.party_id, 'vote', v.vote))
                 FILTER (WHERE v.id IS NOT NULL) AS votes_raw,
               json_agg(json_build_object('politician', a.politician_name, 'party', a.party_id,
                 'type', a.alert_type, 'nl', a.description_nl, 'fr', a.description_fr))
                 FILTER (WHERE a.id IS NOT NULL) AS alerts_raw
        FROM bills b
        LEFT JOIN votes v ON v.bill_id = b.id
        LEFT JOIN bill_consistency_alerts a ON a.bill_id = b.id
        WHERE b.id = $1
        GROUP BY b.id
        """, bill_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bill not found")
    return _format_bill(row)


def _format_bill(row) -> dict:
    import json as _json
    votes_raw = row["votes_raw"] or []
    alerts_raw = row["alerts_raw"] or []

    votes_grouped = {"yes": [], "no": [], "abstain": []}
    for v in votes_raw:
        if isinstance(v, str):
            v = _json.loads(v)
        votes_grouped.get(v.get("vote", "abstain"), votes_grouped["abstain"]).append(
            {"name": v["name"], "party": v["party"]}
        )

    return {
        "id": row["id"],
        "number": row["number"],
        "source": row["source"],
        "date": str(row["introduced_date"]),
        "status": row["status"],
        "theme": row["theme"],
        "themeColor": row["theme_color"],
        "title": {"nl": row["title_nl"], "fr": row["title_fr"] or row["title_nl"]},
        "summary": {"nl": row["summary_nl"] or "", "fr": row["summary_fr"] or ""},
        "impact": {"nl": row["impact_nl"] or "", "fr": row["impact_fr"] or ""},
        "introduced_by": {"name": row["introduced_by_name"], "party": row["introduced_by_party"]},
        "url": row["source_url"],
        "votes": votes_grouped if any(votes_grouped.values()) else None,
        "consistency_alerts": alerts_raw,
    }


# ── POLITICIANS ───────────────────────────────────────────────────────────────

@app.get("/api/politicians")
async def get_politicians(
    region: Optional[str] = Query(None),
    party:  Optional[str] = Query(None),
    government: Optional[str] = Query(None),
):
    conditions = ["is_active = TRUE"]
    args = []
    i = 1

    if region:
        conditions.append(f"region = ${i}"); args.append(region); i += 1
    if party:
        conditions.append(f"party_id = ${i}"); args.append(party); i += 1
    if government:
        conditions.append(f"${i} = ANY(government_level)"); args.append(government); i += 1

    rows = await pool.fetch(
        f"SELECT * FROM politicians WHERE {' AND '.join(conditions)} ORDER BY name",
        *args
    )
    return [dict(r) for r in rows]


@app.get("/api/politicians/{politician_id}")
async def get_politician(politician_id: str):
    row = await pool.fetchrow(
        "SELECT * FROM politicians WHERE id = $1 OR external_id = $1", politician_id
    )
    if not row:
        raise HTTPException(404, "Politician not found")

    costs = await pool.fetch(
        "SELECT * FROM politician_cost_items WHERE politician_id = $1 ORDER BY amount_eur DESC",
        row["id"]
    )
    consistency = await pool.fetch(
        "SELECT * FROM consistency_events WHERE politician_id = $1 ORDER BY event_date DESC",
        row["id"]
    )
    commotion = await pool.fetch(
        "SELECT * FROM commotion_events WHERE politician_id = $1 ORDER BY severity DESC",
        row["id"]
    )

    return {
        **dict(row),
        "cost_breakdown": [dict(c) for c in costs],
        "consistency_events": [dict(c) for c in consistency],
        "commotion_events": [dict(c) for c in commotion],
    }


# ── PARTIES ───────────────────────────────────────────────────────────────────

@app.get("/api/parties")
async def get_parties():
    rows = await pool.fetch("SELECT * FROM parties ORDER BY name")
    return [dict(r) for r in rows]


# ── BUDGET ────────────────────────────────────────────────────────────────────

@app.get("/api/budget")
async def get_budget(government_id: str = "federal", year: int = 2024):
    rows = await pool.fetch(
        """
        WITH RECURSIVE budget_tree AS (
            SELECT *, 0 AS depth FROM budget_items
            WHERE government_id = $1 AND parent_id IS NULL AND budget_year = $2
            UNION ALL
            SELECT bi.*, bt.depth + 1
            FROM budget_items bi
            JOIN budget_tree bt ON bi.parent_id = bt.id
        )
        SELECT * FROM budget_tree ORDER BY depth, amount_eur DESC
        """, government_id, year
    )
    return [dict(r) for r in rows]


# ── PIPELINE STATUS ───────────────────────────────────────────────────────────

@app.get("/api/pipeline/status")
async def pipeline_status():
    row = await pool.fetchrow(
        "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1"
    )
    return dict(row) if row else {"status": "never_run"}


# ── HEALTH ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    await pool.fetchval("SELECT 1")
    return {"status": "ok"}
