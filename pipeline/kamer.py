"""
pipeline/kamer.py
=================
Fetches bills and vote records from the Belgian federal parliament
open data API at ws.lachambre.be

API documentation:
  https://www.lachambre.be/kvvcr/showpage.cfm?section=api

Notes:
- No authentication required — fully open
- Returns XML (UTF-8)
- Current legislature: 56 (started October 2024)
- Rate limit: be polite, 0.5s delay between requests
"""

import time
import logging
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field

import requests
from lxml import etree
from dateutil import parser as dateparser

LOG = logging.getLogger("belgiq.kamer")

CACHE_DIR = Path(".cache/kamer")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

KAMER_BASE  = "https://ws.lachambre.be"
LEGISLATURE = 56
HEADERS = {
    "User-Agent": "BelgiQ/0.1 civic-transparency (contact@belgiq.be)",
}

THEME_KEYWORDS = {
    "fiscal":     ["belasting", "fiscaal", "begroting", "btw", "tax", "impôt", "budget", "tva"],
    "migration":  ["asiel", "migratie", "vreemdeling", "dvz", "cgvs", "asile", "migration"],
    "energy":     ["energie", "kern", "nucleair", "hernieuwbaar", "nucleaire", "renouvelable"],
    "housing":    ["wonen", "huur", "woning", "vastgoed", "logement", "loyer", "immobilier"],
    "social":     ["sociale", "uitkering", "leefloon", "werkloosheid", "allocation", "chômage"],
    "healthcare": ["gezondheid", "zorg", "ziekenhuis", "geneesmiddel", "santé", "soins", "hôpital"],
    "justice":    ["justitie", "straf", "gevangenis", "politie", "justice", "pénal", "prison"],
    "education":  ["onderwijs", "school", "universiteit", "enseignement", "école", "université"],
    "defense":    ["defensie", "leger", "militair", "défense", "armée", "militaire"],
    "climate":    ["klimaat", "milieu", "co2", "emission", "climat", "environnement"],
}

PARTY_ALIASES = {
    "n-va": "N-VA", "nva": "N-VA",
    "mr": "MR", "mouvement réformateur": "MR",
    "ps": "PS", "parti socialiste": "PS",
    "vooruit": "Vooruit", "sp.a": "Vooruit",
    "cd&v": "CD&V", "cdv": "CD&V",
    "ecolo": "Ecolo", "groen": "Groen",
    "open vld": "Open Vld", "vld": "Open Vld",
    "les engagés": "Les Engagés", "cdh": "Les Engagés",
    "défi": "DéFI", "defi": "DéFI",
    "vlaams belang": "Vlaams Belang", "vb": "Vlaams Belang",
    "pvda": "PVDA/PTB", "ptb": "PVDA/PTB",
}


@dataclass
class Vote:
    politician_name: str
    party: str
    vote: str  # "yes" | "no" | "abstain"


@dataclass
class ConsistencyAlert:
    politician: str
    party: str
    alert_type: str
    description_nl: str
    description_fr: str


@dataclass
class Bill:
    id: str
    number: str
    source: str
    date: str
    status: str
    theme: str
    title_nl: str
    title_fr: str
    summary_nl: str
    summary_fr: str
    introduced_by_name: str
    introduced_by_party: str
    url: str
    votes: list = field(default_factory=list)
    consistency_alerts: list = field(default_factory=list)
    impact_nl: str = ""
    impact_fr: str = ""


def _cache_get(key: str) -> Optional[bytes]:
    f = CACHE_DIR / key
    if f.exists():
        age = datetime.now().timestamp() - f.stat().st_mtime
        if age < 3600:
            return f.read_bytes()
    return None


def _cache_set(key: str, data: bytes):
    (CACHE_DIR / key).write_bytes(data)


def _fetch_xml(url: str, params: dict = None) -> Optional[etree._Element]:
    cache_key = hashlib.md5((url + str(params or {})).encode()).hexdigest() + ".xml"
    cached = _cache_get(cache_key)

    if cached:
        LOG.debug(f"Cache hit: {url}")
        raw = cached
    else:
        try:
            LOG.info(f"GET {url} {params or ''}")
            r = requests.get(url, params=params, headers=HEADERS, timeout=30)
            r.raise_for_status()
            raw = r.content
            _cache_set(cache_key, raw)
            time.sleep(0.5)
        except Exception as e:
            LOG.error(f"Request failed: {url} — {e}")
            return None

    try:
        return etree.fromstring(raw)
    except Exception as e:
        LOG.error(f"XML parse failed: {e}")
        return None


def _detect_theme(title: str, summary: str = "") -> str:
    text = (title + " " + summary).lower()
    scores = {
        theme: sum(1 for kw in kws if kw in text)
        for theme, kws in THEME_KEYWORDS.items()
    }
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "other"


def _normalise_party(raw: str) -> str:
    return PARTY_ALIASES.get(raw.strip().lower(), raw.strip())


class KamerFetcher:
    """Fetch recent bills and vote records from ws.lachambre.be"""

    def fetch_recent_bills(self, limit: int = 50) -> list[Bill]:
        LOG.info(f"Fetching {limit} recent federal bills (legislature {LEGISLATURE})")

        root = _fetch_xml(
            f"{KAMER_BASE}/flwb/recent",
            params={"lang": "N", "legislat": LEGISLATURE, "limit": limit}
        )
        if root is None:
            LOG.warning("No data from Kamer API — returning empty list")
            return []

        bills = []
        for doc in root.findall(".//document"):
            bill = self._parse_bill(doc)
            if bill:
                bills.append(bill)

        LOG.info(f"Parsed {len(bills)} federal bills")
        return bills

    def _parse_bill(self, el: etree._Element) -> Optional[Bill]:
        try:
            doc_id   = (el.findtext("documentId") or "").strip()
            number   = (el.findtext("documentNumber") or doc_id).strip()
            date_raw = el.findtext("lastUpdateDate") or el.findtext("introductionDate") or ""

            try:
                date = dateparser.parse(date_raw).date().isoformat()
            except Exception:
                date = datetime.now().date().isoformat()

            title_nl   = (el.findtext("titleNl") or "").strip()
            title_fr   = (el.findtext("titleFr") or title_nl).strip()
            summary_nl = (el.findtext("summaryNl") or "").strip()
            summary_fr = (el.findtext("summaryFr") or summary_nl).strip()

            status_raw = (el.findtext("status") or "").lower()
            if any(k in status_raw for k in ["aangenomen", "adopté", "voted", "approved"]):
                status = "passed"
            elif any(k in status_raw for k in ["verworpen", "rejeté", "rejected"]):
                status = "rejected"
            elif any(k in status_raw for k in ["commissie", "commission", "committee"]):
                status = "committee"
            else:
                status = "introduced"

            author_el   = el.find(".//author")
            author_name = (author_el.findtext("fullName") if author_el is not None else "") or "Onbekend"
            author_party = _normalise_party(
                (author_el.findtext("party") if author_el is not None else "") or ""
            )

            url = (
                f"https://www.lachambre.be/kvvcr/showpage.cfm"
                f"?section=flwb&language=nl&cfm=flwbn.cfm"
                f"?lang=N&legislat={LEGISLATURE}&dossierID={doc_id}"
            )

            bill = Bill(
                id=f"kamer_{doc_id}",
                number=number,
                source="federal",
                date=date,
                status=status,
                theme=_detect_theme(title_nl, summary_nl),
                title_nl=title_nl,
                title_fr=title_fr,
                summary_nl=summary_nl,
                summary_fr=summary_fr,
                introduced_by_name=author_name,
                introduced_by_party=author_party,
                url=url,
            )

            # Fetch votes if this bill has been voted on
            vote_id = (el.findtext("voteSessionId") or "").strip()
            if vote_id and status in ("passed", "rejected"):
                bill.votes = self._fetch_votes(vote_id)

            return bill

        except Exception as e:
            LOG.warning(f"Failed to parse bill element: {e}")
            return None

    def _fetch_votes(self, vote_session_id: str) -> list[Vote]:
        root = _fetch_xml(
            f"{KAMER_BASE}/vote/{vote_session_id}",
            params={"lang": "N"}
        )
        if root is None:
            return []

        votes = []
        for voter_el in root.findall(".//voter"):
            vote_type = (voter_el.findtext("voteType") or "").lower()
            if vote_type in ("yes", "ja", "oui", "pour"):
                vote_str = "yes"
            elif vote_type in ("no", "nee", "non", "contre"):
                vote_str = "no"
            else:
                vote_str = "abstain"

            votes.append(Vote(
                politician_name=(voter_el.findtext("fullName") or "").strip(),
                party=_normalise_party((voter_el.findtext("party") or "").strip()),
                vote=vote_str,
            ))

        LOG.debug(f"Vote session {vote_session_id}: {len(votes)} voters")
        return votes
