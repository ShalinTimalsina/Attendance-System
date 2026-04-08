# Full-Stack Attendance System

A production-style attendance application with:

- **Backend:** FastAPI + SQLAlchemy ORM + JWT auth
- **Frontend:** React (Vite)
- **Database:** PostgreSQL
- **Optional hardening:** Redis-backed QR nonce storage + IP restriction

## Features implemented

- JWT-based authentication with role support (`student`, `teacher`)
- Teacher can start attendance session with configurable metadata:
  - session type (`solo`, `lecture`, `tutorial`, `practical`)
  - course code/title
  - audience label + grouped target sections (e.g. `A10,A11,A12`)
  - topic, notes, and custom duration
- Teacher can explicitly stop a running session
- Dynamic signed QR token endpoint:
  - payload includes `session_id`, `timestamp`, `nonce`
  - signed using HMAC-SHA256
  - token TTL = 5 seconds
- Student attendance scan flow validates:
  - token signature + token expiry
  - session validity + session expiry
  - duplicate marking prevention
  - device ID consistency per student
- Attendance stored in PostgreSQL
- Teacher can view attendance list per session
- Student can view attendance percentage
- Clean architecture style (`routers`, `services`, `models`, `schemas`, `dependencies`)

---

## Project structure

```
Attendance System/
├─ backend/
│  ├─ app/
│  │  ├─ core/
│  │  ├─ dependencies/
│  │  ├─ models/
│  │  ├─ routers/
│  │  ├─ schemas/
│  │  └─ services/
│  ├─ scripts/
│  └─ requirements.txt
├─ frontend/
│  └─ src/
├─ database/
│  └─ schema.sql
├─ .env
├─ .env.example
└─ docker-compose.yml
```

---

## Environment variables

The root `.env` file includes generated random secrets for immediate local use.

Before production deployment, rotate at minimum:

- `SECRET_KEY`
- `QR_HMAC_SECRET`
- `POSTGRES_PASSWORD`

You can also enable optional hardening:

- `USE_REDIS_NONCE_STORE=true`
- `ENFORCE_IP_RESTRICTION=true`

---

## Run the full stack with Docker (recommended)

From project root, run:

`docker compose up -d --build`

Optional (include Redis profile too):

`docker compose --profile optional up -d --build`

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- PostgreSQL: `localhost:5432`

Stop services:

`docker compose down`

### Seed demo users (optional)

`docker compose exec backend python scripts/seed_data.py`

Demo credentials after seeding:

- Teacher: `teacher1 / Teacher@123`
- Student: `student1 / Student@123`

---

## Run without Docker (alternative)

### Backend

From `backend`, install requirements and run:

`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Frontend

From `frontend`, install dependencies and run:

`npm run dev`

---

## API overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Teacher

- `POST /api/sessions/start`
- `POST /api/sessions/{session_id}/stop`
- `GET /api/sessions/{session_id}/qr-token`
- `GET /api/sessions/{session_id}/attendance`

### Student

- `POST /api/attendance/scan`
- `GET /api/students/me/attendance-percentage`

---

## Security notes

- JWT access tokens are signed with `SECRET_KEY`
- QR token signatures use dedicated `QR_HMAC_SECRET`
- QR token validation uses constant-time signature compare
- Session and token expiry are enforced server-side
- Duplicate attendance is blocked by both logic and DB unique constraint
- Device ID consistency is enforced per student
