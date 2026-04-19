"""
pipeline/vlaams.py
==================
Fetches bills and vote records from the Flemish Parliament open API.

API documentation:
  https://ws.vlaamsparlement.be/rest/docs

Key endpoints:
  GET /legislatuur/huidig/document/recent   → recent documents
  GET /legislatuur/huidig/stemming/{id}     → vote records
  GET /legislatuur/huidig/commissie         → committee list

Notes:
- Returns JSON, no auth required
- 'type' filter: BES=beslissing, DEC=decreet, VR=voorstel van decreet
"""

import time
import logging
import hashlib
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

import requests
from dateutil import parser as dateparser

# Re-use dataclasses and helpers from kamer module
from pipeline.kamer import Bill, Vote, _detect_theme, _normalise_party

LOG = logging.getLogger("belgiq.vlaams")

CACHE_DIR = Path(".cache/vlaams")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

VLAAMS_BASE = "https://ws.vlaamsparlement.be/rest"
HEADERS = {
    "User-Agent": "BelgiQ/0.1 civic-transparency (contact@belgiq.be)",
    "Accept": "application/json",
}


def _cache_get(key: str) -> Optional[dict]:
    f = CACHE_DIR / key
    if f.exists():
        age = datetime.now().timestamp() - f.stat().st_mtime
        if age < 3600:
            return json.loads(f.read_text())
    return None


def _cache_set(key: str, data: dict):
    (CACHE_DIR / key).write_text(json.dumps(data, ensure_ascii=False))


def _fetch_json(url: str, params: dict = None) -> Optional[dict | list]:
    cache_key = hashlib.md5((url + str(params or {})).encode()).hexdigest() + ".json"
    cached = _cache_get(cache_key)
    if cached is not None:
        LOG.debug(f"Cache hit: {url}")
        return cached

    try:
        LOG.info(f"GET {url} {params or ''}")
        r = requests.get(url, params=params, headers=HEADERS, timeout=30)
        r.raise_for_status()
        data = r.json()
        _cache_set(cache_key, data)
        time.sleep(0.5)
        return data
    except Exception as e:
        LOG.error(f"Request failed: {url} — {e}")
        return None


class VlaamsParlement:
    """Fetch recent bills and votes from ws.vlaamsparlement.be"""

    def fetch_recent_bills(self, limit: int = 50) -> list[Bill]:
        LOG.info(f"Fetching {limit} recent Flemish bills")

        # Types: BES=beslissing, DEC=decreet, VR=voorstel van decreet, RES=resolutie
        data = _fetch_json(
            f"{VLAAMS_BASE}/legislatuur/huidig/document/recent",
            params={"aantalItems": limit, "type": "DEC,VR,RES"}
        )
        if not data:
            LOG.warning("No data from Vlaams Parlement API")
            return []

        items = data if isinstance(data, list) else data.get("items", [])
        bills = []
        for item in items[:limit]:
            bill = self._parse_item(item)
            if bill:
                bills.append(bill)

        LOG.info(f"Parsed {len(bills)} Flemish bills")
        return bills

    def _parse_item(self, item: dict) -> Optional[Bill]:
        try:
            doc_id   = str(item.get("id", ""))
            number   = item.get("beknopteNaam") or item.get("documentnummer") or doc_id
            date_raw = (
                item.get("datumNeerlegging")
                or item.get("datumGoedkeuring")
                or item.get("datum")
                or ""
            )

            try:
                date = dateparser.parse(date_raw).date().isoformat()
            except Exception:
                date = datetime.now().date().isoformat()

            title_nl   = (item.get("titel") or item.get("title") or "").strip()
            summary_nl = (item.get("samenvatting") or item.get("omschrijving") or "").strip()

            # Status mapping from Flemish vocab
            status_raw = (item.get("status") or item.get("fase") or "").lower()
            if any(k in status_raw for k in ["goedgekeurd", "aangenomen", "definitief"]):
                status = "passed"
            elif any(k in status_raw for k in ["verworpen", "afgewezen"]):
                status = "rejected"
            elif any(k in status_raw for k in ["commissie", "behandeling"]):
                status = "committee"
            else:
                status = "introduced"

            # Author / indiener
            indieners = item.get("indieners") or item.get("auteurs") or []
            if indieners:
                first = indieners[0]
                author_name  = first.get("naam") or first.get("name") or "Onbekend"
                author_party = _normalise_party(
                    first.get("fractieAfkorting") or first.get("partij") or ""
                )
            else:
                author_name  = item.get("indiener", "Onbekend")
                author_party = ""

            url = f"https://docs.vlaamsparlement.be/pfile?id={doc_id}"

            bill = Bill(
                id=f"vlaams_{doc_id}",
                number=str(number),
                source="flemish",
                date=date,
                status=status,
                theme=_detect_theme(title_nl, summary_nl),
                title_nl=title_nl,
                title_fr=title_nl,   # Flemish parliament publishes in Dutch only
                summary_nl=summary_nl,
                summary_fr=summary_nl,
                introduced_by_name=author_name,
                introduced_by_party=author_party,
                url=url,
            )

            # Fetch vote record if available
            vote_id = item.get("stemmingId") or item.get("stemming_id")
            if vote_id and status in ("passed", "rejected"):
                bill.votes = self._fetch_votes(str(vote_id))

            return bill

        except Exception as e:
            LOG.warning(f"Failed to parse Flemish item: {e}")
            return None

    def _fetch_votes(self, vote_id: str) -> list[Vote]:
        data = _fetch_json(
            f"{VLAAMS_BASE}/legislatuur/huidig/stemming/{vote_id}"
        )
        if not data:
            return []

        votes = []
        # API returns list of individual votes or nested structure
        raw_votes = data if isinstance(data, list) else data.get("stemmingen", [])

        for entry in raw_votes:
            stem = (entry.get("stem") or entry.get("vote") or "").lower()
            if stem in ("ja", "yes", "voor"):
                vote_str = "yes"
            elif stem in ("neen", "nee", "no", "tegen"):
                vote_str = "no"
            else:
                vote_str = "abstain"

            votes.append(Vote(
                politician_name=(entry.get("naam") or entry.get("name") or "").strip(),
                party=_normalise_party(
                    entry.get("fractieAfkorting") or entry.get("partij") or ""
                ),
                vote=vote_str,
            ))

        LOG.debug(f"Stemming {vote_id}: {len(votes)} votes")
        return votes
