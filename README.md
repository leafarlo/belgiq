# BelgiQ

Belgian civic transparency platform, with the goal of making politics clear for every (Belgian) citizen. Still in Beta mode. I want to present a cristal clear view of the financials and politics of the Belgian governement. Where does all the money go, who spends it, who is in charge and what are they doing?

## Stack

| Layer | Tech | Purpose |
|---|---|---|
| Frontend | React (Vite) | UI served as static files via Nginx |
| Backend | FastAPI (Python) | REST API for bills, politicians, parties |
| Database | PostgreSQL | All structured data |
| Scheduler | Celery + Redis | Weekly pipeline runs |
| Web server | Nginx | Reverse proxy + static file serving |
| Server | Hetzner CX22 | everything runs here |

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


