# BelgiQ

Belgian civic transparency platform — making politics clear for every citizen.

## Stack

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React (Vite) | UI served as static files via Nginx |
| Backend | FastAPI (Python) | REST API for bills, politicians, parties |
| Database | PostgreSQL | All structured data |
| Scheduler | Celery + Redis | Weekly pipeline runs |
| Web server | Nginx | Reverse proxy + static file serving |
| Server | Hetzner CX22 | €4.51/month, everything runs here |

## Project Structure

```
belgiq/
├── frontend/          # React app (Vite)
│   └── src/
│       ├── App.jsx    # Main dashboard (civiq.jsx goes here)
│       └── main.jsx
├── api/               # FastAPI backend
│   ├── main.py        # App + routes
│   ├── db.py          # Database connection pool
│   └── models.py      # Pydantic response models
├── pipeline/          # Data scraping + AI agent
│   ├── tasks.py       # Celery tasks (scheduler)
│   ├── kamer.py       # Kamer.be fetcher
│   ├── vlaams.py      # Vlaams Parlement fetcher
│   ├── pdf_parser.py  # Rekenhof / CDVU PDF parsing
│   └── consistency.py # Vote consistency checker
├── deploy/
│   ├── nginx/
│   │   └── belgiq.conf  # Nginx site config
│   └── systemd/
│       ├── belgiq-api.service
│       ├── belgiq-worker.service
│       └── belgiq-beat.service
├── schema.sql         # PostgreSQL schema
├── requirements.txt   # Python dependencies
└── .env.example       # Environment variables template
```

## Quick Start (local development)

```bash
# 1. Clone and enter project
git clone https://github.com/you/belgiq && cd belgiq

# 2. Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values

# 3. Database (needs PostgreSQL running locally)
psql -U postgres -c "CREATE DATABASE belgiq;"
psql -U postgres -d belgiq -f schema.sql

# 4. Start API
uvicorn api.main:app --reload --port 8000

# 5. Start Celery worker (separate terminal)
celery -A pipeline.tasks worker --loglevel=info

# 6. Frontend
cd frontend && npm install && npm run dev
```

## Deployment (Hetzner)

See `deploy/` folder. Full instructions in `deploy/README.md`.

Run once on your server:
```bash
curl -fsSL https://raw.githubusercontent.com/you/belgiq/main/deploy/setup.sh | bash
```
