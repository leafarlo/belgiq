"""
pipeline/consistency.py
=======================
Detects consistency issues in parliamentary votes:
  - Politicians voting against their own party majority
  - Politicians absent on key votes
  - Future: compare votes against party manifesto positions

Feeds directly into politician.consistency_score in the database.
"""

import logging
from dataclasses import dataclass

LOG = logging.getLogger("belgiq.consistency")

# Bills on these themes are considered "key votes" where
# absence is flagged as a consistency issue
KEY_VOTE_THEMES = {"fiscal", "migration", "social", "healthcare", "energy"}


@dataclass
class ConsistencyAlert:
    politician: str
    party: str
    alert_type: str   # "against_party" | "absent_key_vote" | "flip"
    description_nl: str
    description_fr: str


class ConsistencyChecker:
    """
    Analyses vote records per bill to detect consistency issues.

    Usage:
        checker = ConsistencyChecker()
        alerts = checker.check_bill(bill)
    """

    def check_bill(self, bill) -> list[ConsistencyAlert]:
        alerts = []

        if not bill.votes:
            return alerts

        # ── 1. Detect party rebels ────────────────────────────────────────────
        # Group votes by party
        party_votes: dict[str, list[str]] = {}
        for v in bill.votes:
            if v.party:
                party_votes.setdefault(v.party, []).append(v.vote)

        # Determine majority vote per party
        party_majority: dict[str, str] = {}
        for party, votes in party_votes.items():
            yes_count = votes.count("yes")
            no_count  = votes.count("no")
            if yes_count == 0 and no_count == 0:
                continue  # all abstained — no majority
            party_majority[party] = "yes" if yes_count >= no_count else "no"

        # Flag individual rebels
        for v in bill.votes:
            if not v.party or v.vote == "abstain":
                continue
            majority = party_majority.get(v.party)
            if majority and v.vote != majority:
                LOG.debug(
                    f"Rebel vote: {v.politician_name} ({v.party}) "
                    f"voted {v.vote}, party voted {majority} — {bill.title_nl[:60]}"
                )
                alerts.append(ConsistencyAlert(
                    politician=v.politician_name,
                    party=v.party,
                    alert_type="against_party",
                    description_nl=(
                        f"Stemde {_vote_nl(v.vote)} terwijl de meerderheid van "
                        f"{v.party} {_vote_nl(majority)} stemde"
                    ),
                    description_fr=(
                        f"A voté {_vote_fr(v.vote)} alors que la majorité de "
                        f"{v.party} a voté {_vote_fr(majority)}"
                    ),
                ))

        # ── 2. Detect high absences on key votes (future: needs attendance data) ──
        # Placeholder — requires politician attendance records from the API
        # which need an additional endpoint call per politician
        # Will be implemented in v2 when we have politician IDs matched to votes

        return alerts

    def calculate_consistency_score(
        self,
        kept: int,
        partial: int,
        broken: int,
        rebel_votes: int = 0,
    ) -> int:
        """
        Calculate a 0-100 consistency score for a politician.

        Weights:
          - Kept promise:    +10 points (up to 60 max)
          - Partial promise: +5 points
          - Broken promise:  -10 points
          - Rebel vote:      -3 points
          - Base score: 50
        """
        total = kept + partial + broken
        if total == 0:
            return 50  # no data — neutral score

        raw = 50 + (kept * 10) + (partial * 5) - (broken * 10) - (rebel_votes * 3)
        return max(0, min(100, raw))

    def calculate_commotion_score(self, events: list[dict]) -> int:
        """
        Calculate a 0-100 commotion score from a list of commotion events.

        Each event has a 'severity' (1-5):
          1 = minor media mention
          2 = notable controversy
          3 = parliamentary question / investigation
          4 = judicial involvement / major audit finding
          5 = criminal charges / major scandal
        """
        if not events:
            return 0

        total_severity = sum(e.get("severity", 1) for e in events)
        # Scale: severity 5 per event maxes out at ~20 events before hitting 100
        score = min(100, total_severity * 4)
        return score


# ── Helpers ───────────────────────────────────────────────────────────────────

def _vote_nl(vote: str) -> str:
    return {"yes": "voor", "no": "tegen", "abstain": "onthouding"}.get(vote, vote)

def _vote_fr(vote: str) -> str:
    return {"yes": "pour", "no": "contre", "abstain": "abstention"}.get(vote, vote)
