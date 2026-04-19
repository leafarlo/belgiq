"""
pipeline/ai_summariser.py
=========================
Uses the Claude API to enrich bill data during the weekly pipeline run:
  - Summarise bills in plain NL and FR (avoiding legal jargon)
  - Estimate personal financial impact per income bracket
  - Classify theme when keyword detection is ambiguous
  - Generate "impact for you" text for the frontend

Cost estimate: ~50 bills × ~800 tokens each = ~40,000 tokens/week
At Claude Sonnet pricing: roughly €0.10-0.20 per weekly run. Negligible.

Usage:
    from pipeline.ai_summariser import AISummariser
    ai = AISummariser()
    bill = ai.enrich_bill(bill)
"""

import os
import logging
from dataclasses import dataclass

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

LOG = logging.getLogger("belgiq.ai")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """
Je bent een neutrale Belgische politieke analist die complexe wetgeving uitlegt
aan gewone burgers. Je schrijft in eenvoudig Nederlands en Frans, zonder jargon.
Je bent politiek neutraal en baseert je uitsluitend op de feiten in de wetstekst.
Je antwoorden zijn beknopt: maximaal 3 zinnen per sectie.
Retourneer ALLEEN geldige JSON, geen uitleg.
"""


@dataclass
class BillEnrichment:
    summary_nl: str
    summary_fr: str
    impact_nl: str
    impact_fr: str
    theme: str
    theme_confidence: float


class AISummariser:
    """Enriches bill data using Claude API calls during the weekly pipeline."""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    def enrich_bill(self, bill) -> "Bill":
        """
        Enrich a single bill with AI-generated summaries and impact estimates.
        Returns the bill with updated fields.
        """
        LOG.info(f"Enriching bill {bill.id}: {bill.title_nl[:60]}...")

        prompt = f"""
Analyseer dit Belgisch wetsvoorstel en retourneer een JSON object:

Titel (NL): {bill.title_nl}
Titel (FR): {bill.title_fr}
Samenvatting (NL): {bill.summary_nl or 'Niet beschikbaar'}
Ingediend door: {bill.introduced_by_name} ({bill.introduced_by_party})
Status: {bill.status}

Retourneer dit JSON formaat (geen andere tekst):
{{
  "summary_nl": "Eenvoudige samenvatting in 2-3 zinnen voor gewone burgers (NL)",
  "summary_fr": "Résumé simple en 2-3 phrases pour citoyens ordinaires (FR)",
  "impact_nl": "Wat betekent dit concreet voor een gemiddeld Belgisch gezin? Max 2 zinnen (NL)",
  "impact_fr": "Qu'est-ce que cela signifie concrètement pour un ménage belge moyen? Max 2 phrases (FR)",
  "theme": "een van: fiscal|migration|energy|housing|social|healthcare|justice|education|defense|climate|other",
  "theme_confidence": 0.0
}}
"""

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )

            import json
            text = response.content[0].text.strip()
            # Strip markdown fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text.strip())

            bill.summary_nl = data.get("summary_nl", bill.summary_nl)
            bill.summary_fr = data.get("summary_fr", bill.summary_fr)
            bill.impact_nl  = data.get("impact_nl", "")
            bill.impact_fr  = data.get("impact_fr", "")

            # Only override theme if AI is confident
            if data.get("theme_confidence", 0) > 0.7:
                bill.theme = data.get("theme", bill.theme)

            LOG.info(f"Enriched {bill.id} — theme: {bill.theme}")

        except Exception as e:
            LOG.error(f"AI enrichment failed for {bill.id}: {e}")
            # Non-fatal — bill still gets saved with original data

        return bill

    def enrich_bills_batch(self, bills: list, max_bills: int = 50) -> list:
        """
        Enrich a batch of bills. Only processes bills without existing summaries
        to avoid re-spending tokens on already-enriched bills.
        """
        to_enrich = [
            b for b in bills
            if not b.impact_nl  # only enrich if impact text is missing
        ][:max_bills]

        LOG.info(f"Enriching {len(to_enrich)} bills with AI (of {len(bills)} total)")

        for i, bill in enumerate(to_enrich):
            self.enrich_bill(bill)
            if i % 10 == 0:
                LOG.info(f"  Progress: {i+1}/{len(to_enrich)}")

        return bills

    def generate_party_impact_summary(
        self,
        party: str,
        income_eur: int,
        commune: str,
        has_kids: bool,
        is_homeowner: bool,
    ) -> dict:
        """
        Generate a personalised financial impact estimate for a given party
        and user profile. Used by the Party Match tab.

        Returns:
            {
              "monthly_impact_eur": int,  # positive = gain, negative = loss
              "impact_nl": str,
              "impact_fr": str,
              "confidence": float
            }
        """
        prompt = f"""
Schat de maandelijkse financiële impact (in euro) als {party} de volgende
4 jaar het federale en regionale beleid bepaalt, voor dit profiel:
- Netto maandinkomen: €{income_eur}
- Gemeente: {commune}
- Kinderen: {'ja' if has_kids else 'nee'}
- Eigenaar: {'ja' if is_homeowner else 'nee'}

Baseer je op de officiële partijprogramma's en eerder beleid van {party}.
Wees realistisch en neutraal. Retourneer JSON:
{{
  "monthly_impact_eur": 0,
  "impact_nl": "Korte uitleg in 2 zinnen (NL)",
  "impact_fr": "Courte explication en 2 phrases (FR)",
  "confidence": 0.0
}}
"""
        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            import json
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text.strip())
        except Exception as e:
            LOG.error(f"Party impact estimate failed for {party}: {e}")
            return {
                "monthly_impact_eur": 0,
                "impact_nl": "Schatting niet beschikbaar.",
                "impact_fr": "Estimation non disponible.",
                "confidence": 0.0
            }
