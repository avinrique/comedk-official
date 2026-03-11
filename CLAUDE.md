# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LS Predictor — a college admission CRM and rank predictor platform. Two main parts:
- **Public-facing college predictor** at `frontend/predictor.html` — students enter exam scores/ranks, get matched colleges
- **Internal CRM dashboard** at `frontend/admin/index.html` — counselors manage student leads through a sales pipeline

Supported exams: JEE Main, NEET, COMEDK, SRMJEE, VITEEE.

## Commands

### Backend
```bash
cd backend
npm start              # Start server (node src/server.js)
npm run dev            # Start with nodemon (auto-reload)
npm run seed           # Seed admin user + default settings
```

### Frontend
```bash
cd frontend
python3 -m http.server 8000   # Serve static files on port 8000
```

### Environment
Backend requires `.env` in `backend/` (see `backend/.env.example`):
- `PORT` (default 3000)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — signing key for auth tokens
- `CORS_ORIGINS` — comma-separated allowed origins (must include frontend URL)

Frontend API URL is configured in `frontend/js/config.js` (`API_BASE_URL`).

Default admin credentials (after seeding): `Lsconsultancy.adm@gmail.com` / `admin123`

## Architecture

### Backend (`backend/src/`)

Express + Mongoose. Entry point: `server.js`.

**Request flow:** Routes → Controllers → Services → Models

- `routes/` — Express route definitions, apply middleware (auth, rate limiting, authorization)
- `controllers/` — Thin handlers that delegate to services and format responses
- `services/` — Business logic (auth, leads, analytics, predictor)
- `models/` — Mongoose schemas (User, Lead, Note, Reminder, Setting)
- `middleware/` — `authenticate` (JWT verify), `authorize` (role check), `rateLimiter`, `errorHandler`
- `utils/response.js` — Standardized `{ success, data/message }` response helpers

**Prediction engine** (`services/predictor.service.js`):
- Loads cutoff CSVs from `data/` at startup (josaa, neet, comedk, srm, vit)
- Marks→rank interpolation using `data/cutoffs.json` lookup tables
- Filters colleges by exam/category/branch, assigns chance labels (Safe/Good/Reach) based on rank vs cutoff thresholds

**Auth**: JWT with 7-day expiry. Three roles: `admin`, `manager`, `counselor`. Passwords hashed with bcryptjs.

**Rate limiting**: `publicLimiter` (30 req/15min) on public routes, `authLimiter` (10 req/15min) on login. JSON payload limit: 10mb.

**API routes** (all prefixed `/api/`):
- `health` — public health check
- `auth` — login (POST), verify token (GET)
- `predictor` — get exams, predict (public)
- `settings` — public read via `/public/:key`, admin write
- `leads` — CRUD + nested `/leads/:id/notes` and `/leads/:id/reminders`
- `reminders` — general reminder read/update
- `analytics` — overview, pipeline, sources, trends
- `users` — user management (admin only)

**Lead model** is the central entity — tracks student info, exam data, CRM status (new→contacted→qualified→enrolled/lost), assignment, status history, and priority.

**Database**: MongoDB with connection retry logic (5 retries, 5s delay) in `config/database.js`.

**No test infrastructure** — no test runner, linter, or CI configured.

### Frontend (`frontend/`)

Vanilla HTML/CSS/JS — no build step, no framework.

- `js/config.js` — API base URL constant
- `js/api.js` — Fetch wrapper that attaches JWT from `localStorage['auth_token']` to all requests
- `js/predictor.js` — Predictor tool logic including optional lead gate modal (controlled by `predictor_lead_gate` setting)
- `js/admin/` — SPA using hash-based routing (`#/dashboard`, `#/leads`, `#/pipeline`, etc.)
  - `auth.js` — Login/logout, token management in localStorage
  - `app.js` — Router, sidebar nav, top bar, global search
  - `leads.js` — Leads table with filtering, sorting, pagination, CSV export
  - `pipeline.js` — Kanban drag-and-drop board by lead status
  - `detail.js` — Lead detail modal (3 tabs: Info, Activity/Notes, Reminders)
  - `analytics.js` — Dashboard overview cards, pipeline/source/trend charts

**Design system** in `css/style.css`: Primary green (#0ea960), accent orange (#ff6b35). Fonts: Poppins (headings), Inter (body).

### Key Data Flow

1. **Predictor → Lead creation**: When lead gate is enabled, predictor captures student details via modal before showing results, creating a lead with `source: "predictor"`
2. **Lead lifecycle**: Leads flow through statuses (new→contacted→qualified→enrolled/lost) with full status history tracking and assigned counselors
3. **Notes/Reminders**: Activity logging and follow-up scheduling are tied to individual leads
