# Full-Stack Attendance System

A production-style attendance application with:

- **Backend:** FastAPI + SQLAlchemy ORM + JWT auth
- **Frontend:** React (Vite) with in-browser QR camera scanner
- **Database:** PostgreSQL
- **Deployment:** Docker Compose + GitHub Actions CI/CD to AWS EC2
- **Optional hardening:** Redis-backed QR nonce storage + IP restriction

## Features Implemented

- JWT-based authentication with role support (`student`, `teacher`)
- **Teacher session builder** with configurable metadata:
  - session type (`solo`, `lecture`, `tutorial`, `practical`)
  - course code/title
  - audience label + grouped target sections (e.g., `A10,A11,A12`)
  - topic, notes, and custom duration (1–180 minutes)
  - explicit start and stop controls
- **Dynamic signed QR token endpoint:**
  - payload includes `session_id`, `timestamp`, `nonce`
  - signed using HMAC-SHA256
  - token TTL = 5 seconds (configurable)
- **Student attendance scan flow** validates:
  - token signature + token expiry
  - session validity + session expiry
  - duplicate marking prevention
  - device ID consistency per student
  - optional IP restriction enforcement
- **In-browser QR camera scanner** (lazy-loaded, no manual copy-paste)
- Attendance stored in PostgreSQL
- Teacher can view attendance list per session with metadata
- Student can view attendance percentage
- Clean architecture (`routers`, `services`, `models`, `schemas`, `dependencies`)

---

## Project Structure

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
│  ├─ Dockerfile
│  ├─ .dockerignore
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ TeacherDashboard.jsx
│  │  │  ├─ StudentDashboard.jsx
│  │  │  └─ QrScannerModal.jsx
│  │  ├─ api/
│  │  └─ styles.css
│  ├─ Dockerfile
│  └─ .dockerignore
├─ database/
│  └─ schema.sql
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
├─ .env
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ AI_HANDOFF_CONTEXT.md
└─ README.md
```

---

## Environment Variables

The root `.env` file is **git-ignored** for security.

**`.env.example`** is the template for all developers. It must only contain placeholders for secrets.

```env
# Replace these with your own values:
SECRET_KEY=generate_a_new_secret_key_with_32_random_characters
QR_HMAC_SECRET=generate_a_new_qr_hmac_secret_with_32_random_characters
POSTGRES_PASSWORD=change_me_to_strong_password

# Keep localhost for local development:
FRONTEND_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
```

**For EC2 deployment**, replace `localhost` with your AWS public IP:

```env
FRONTEND_ORIGIN=http://YOUR_EC2_PUBLIC_IP:5173
VITE_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:8000/api
```

---

## Run the Full Stack with Docker (Recommended)

From project root:

`docker compose up -d --build`

Optional (include Redis profile):

`docker compose --profile optional up -d --build`

Services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Stop services:

`docker compose down`

### Seed Demo Users (Optional)

`docker compose exec backend python scripts/seed_data.py`

Demo credentials:

- Teacher: `teacher1 / Teacher@123`
- Student: `student1 / Student@123`

---

## AWS EC2 Deployment (GitHub Actions CI/CD)

### Prerequisites

1. **Clone repo to EC2** (one-time setup)
2. Install Docker and Docker Compose on EC2
3. Create `.env` from `.env.example` on EC2 and update public-IP-based URLs
4. Add GitHub secrets:
   - `SSH_HOST`
   - `SSH_PRIVATE_KEY`
5. Configure EC2 security group:
   - `22` (SSH, restricted)
   - `5173` (frontend)
   - `8000` (backend)
   - Keep `5432` and `6379` closed publicly

### Deploy

Push to `main` branch. The workflow will:

1. SSH into EC2
2. Fetch latest code
3. Reset to `origin/main`
4. Rebuild and run containers

---

## Run Without Docker (Alternative)

### Backend

From `backend/`:

`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

### Frontend

From `frontend/`:

`npm run dev`

---

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Teacher Sessions

- `POST /api/sessions/start`
- `POST /api/sessions/{session_id}/stop`
- `GET /api/sessions/{session_id}/qr-token`
- `GET /api/sessions/{session_id}/attendance`

### Student Attendance

- `POST /api/attendance/scan`
- `GET /api/students/me/attendance-percentage`

---

## Security Notes

- JWT access tokens are signed with `SECRET_KEY`
- QR token signatures use dedicated `QR_HMAC_SECRET`
- QR validation uses constant-time signature comparison
- Session and token expiry are enforced server-side
- Duplicate attendance is blocked by app logic + DB unique constraint
- Device ID consistency is enforced per student
- Containers run as non-root users

---
