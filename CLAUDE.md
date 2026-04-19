# BelgiQ — Claude Code Project Memory

## What This Project Is
Belgian civic transparency platform. Makes politics understandable for every
citizen by visualising governments, budgets, legislation, politicians and party
performance. Bilingual (NL/FR). Target audience: Belgian voters.

Inspired by Nikita Bier's Politify app.

---

## Stack

| Layer | Tech | Location |
|---|---|---|
| Frontend | React 18 + Vite | `frontend/` |
| Backend API | FastAPI (Python) | `api/main.py` |
| Database | PostgreSQL | local / Hetzner |
| Scheduler | Celery + Redis | `pipeline/tasks.py` |
| Web server | Nginx | `deploy/nginx/` |
| Hosting | Hetzner CX22 (€4.51/mo) | — |
| AI enrichment | Claude API (Anthropic) | `pipeline/ai_summariser.py` |

---

## Project Structure

```
belgiq/
├── CLAUDE.md                  ← you are here
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← MAIN DASHBOARD (all UI lives here)
│   │   ├── hooks.js           ← useBills(), usePoliticians() etc.
│   │   └── main.jsx           ← Vite entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js         ← /api proxy to FastAPI in dev
├── api/
│   └── main.py                ← FastAPI: /api/bills, /api/politicians etc.
├── pipeline/
│   ├── kamer.py               ← Kamer.be XML fetcher (federal parliament)
│   ├── vlaams.py              ← Vlaams Parlement JSON fetcher
│   ├── consistency.py         ← rebel vote detector + scoring
│   ├── ai_summariser.py       ← Claude API enrichment (summaries, impact)
│   └── tasks.py               ← Celery scheduler (nightly + weekly)
├── deploy/
│   ├── setup.sh               ← one-shot Hetzner server setup
│   ├── nginx/belgiq.conf
│   └── systemd/               ← service files for API + Celery
├── schema.sql                 ← PostgreSQL schema (run once)
├── requirements.txt
└── .env.example               ← copy to .env and fill in
```

---

## The Five Dashboard Tabs

1. **Mijn Overheid / Mon Gouvernement** — user enters commune → sees all
   governments governing them (federal → regional → province → commune) with
   a visual budget flow showing money cascading down each level. Politicians
   are clickable cards.

2. **Mijn Belastingen / Mes Impôts** — drill-down SVG pie chart of where
   €232Mrd in tax money goes. Click segments to zoom in (e.g. Subsidies →
   NGOs → specific NGOs). Each segment tagged with responsible parties.

3. **Partijmatch / Match de Parti** — user inputs income, commune, kids,
   homeowner → parties ranked by estimated monthly financial impact, with
   promise scores and track record scores.

4. **Beloftes / Promesses** — per-party promise tracker. Kept / partial /
   broken verdicts per promise, sourced to parliamentary votes.

5. **Wetgeving / Législation** — recent bills from Kamer.be and Vlaams
   Parlement. Filterable by theme, parliament, status. Each bill expandable
   to show full vote breakdown per politician + consistency alerts.

---

## Politician Profile System

Every politician is a clickable card/modal across all tabs with three scores:

- **💰 Cost Score** — annual cost to taxpayer (salary + allowances + cabinet)
- **✓ Consistency Score** — do they vote how they talk? (0-100)
- **⚡ Commotion Score** — controversies, audit findings, judicial cases (0-100)

Each score cites its sources. Sources are clickable links to primary documents.

---

## Data Sources

| Data | Source | Format | Update frequency |
|---|---|---|---|
| Federal bills + votes | ws.lachambre.be | XML API | Nightly |
| Flemish bills + votes | ws.vlaamsparlement.be | JSON API | Nightly |
| Party financing | CDVU jaarverslag (PDF) | PDF → pdfplumber | Annual |
| Audit findings | Rekenhof jaarverslag (PDF) | PDF → pdfplumber | Annual |
| Politician salaries | Kamer.be mandaten | XML API | Annual |
| Local budgets | Belfius gemeentemonitor | Manual / CSV | Annual |

---

## Environment Variables

```bash
DATABASE_URL=postgresql://belgiq:password@localhost/belgiq
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
ENVIRONMENT=development   # or: production
```

Copy `.env.example` to `.env` and fill in before running anything.

---

## Local Development — Getting Started

```bash
# 1. Python backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # fill in DATABASE_URL etc.

# 2. Database (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE belgiq;"
psql -U postgres -d belgiq -f schema.sql

# 3. Start API
uvicorn api.main:app --reload --port 8000

# 4. Frontend (separate terminal)
cd frontend && npm install && npm run dev
# → opens at http://localhost:5173
# → /api/* requests proxied to FastAPI on :8000

# 5. Celery (optional for local dev — only needed for pipeline)
redis-server &
celery -A pipeline.tasks worker --loglevel=info
```

---

## Deployment (Hetzner CX22)

```bash
# On the server — run once as root:
curl -fsSL https://raw.githubusercontent.com/you/belgiq/main/deploy/setup.sh | bash

# After setup, deploy new code:
cd /var/www/belgiq && git pull
cd frontend && npm run build
systemctl restart belgiq-api
```

Services managed by systemd:
- `belgiq-api` — FastAPI (uvicorn, port 8000)
- `belgiq-worker` — Celery worker
- `belgiq-beat` — Celery beat scheduler

Logs: `journalctl -u belgiq-api -f` or `tail -f /var/log/belgiq/worker.log`

---

## Key Decisions Already Made

- **All UI in one file** (`App.jsx`) for now — split into components later when
  it gets unwieldy
- **Static data first** — App.jsx has hardcoded Belgian data (BILLS, POLITICIANS,
  GOVERNMENTS, LOCAL_GOVERNMENTS etc.). Migration to real API calls is next step.
- **No TypeScript** — plain JS for speed. Add later if needed.
- **No CSS framework** — all inline styles + a small `<style>` block in App.jsx.
  Keeps the bundle tiny and avoids Tailwind purge config complexity.
- **Bilingual NL/FR** — all data objects have `{ nl: "...", fr: "..." }` shape.
  `t(obj)` helper selects the right language.
- **Hetzner over Vercel/Supabase** — full control, no vendor limits, €4.51/month flat.

---

## Current Status & Next Steps

### Done
- [x] Full dashboard mockup with static data (all 5 tabs)
- [x] Politician modal with Cost / Consistency / Commotion scores
- [x] Budget flow visualisation (federal → regional → province → commune)
- [x] Drill-down tax pie chart
- [x] Party match calculator
- [x] Legislation tab with vote breakdowns
- [x] FastAPI backend skeleton
- [x] PostgreSQL schema
- [x] Pipeline modules (Kamer, Vlaams, consistency checker, AI enrichment)
- [x] Hetzner deploy scripts + systemd services

### Next
- [ ] Get frontend running locally (`npm run dev`)
- [ ] Set up local Postgres and run schema.sql
- [ ] Start FastAPI locally and verify `/api/health`
- [ ] Replace static data in App.jsx with fetch() calls to /api/
- [ ] Run pipeline manually to pull real bills from Kamer.be
- [ ] Add remaining communes to LOCAL_GOVERNMENTS (currently 6 of 581)
- [ ] Add more politicians to POLITICIANS dataset
- [ ] Wire AI summariser into weekly pipeline run
- [ ] Deploy to Hetzner

---

## Code Conventions

- Component names: PascalCase (`BudgetFlowSection`, `PoliticianModal`)
- Data keys: camelCase in JS, snake_case in Python/SQL
- All user-facing strings: bilingual object `{ nl: "...", fr: "..." }`
- API responses: always return camelCase JSON (FastAPI aliases handled in models)
- Git commits: conventional format `feat:`, `fix:`, `data:`, `deploy:`

---

## Important Notes for Claude Code

- Before editing App.jsx, always read it first — it is 1700+ lines
- The `t()` helper translates `{ nl, fr }` objects based on current `lang` state
- `fmtB()` formats large numbers as €142Mrd / €412M
- `fmt()` formats as Belgian euro currency (nl-BE locale)
- PARTIES constant maps party name → { color, textColor } for pills
- LOCAL_GOVERNMENTS maps commune id → full local gov data including budget flow
- Do not split App.jsx into multiple files yet — keep it a single deployable file
  until the static→API migration is complete
