from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.models.base import Base
from app.routers import attendance, auth, sessions, students


def apply_lightweight_schema_updates() -> None:
    statements = [
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS session_type VARCHAR(20)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS course_code VARCHAR(32)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS course_title VARCHAR(120)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS audience_label VARCHAR(120)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS target_sections VARCHAR(255)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS topic VARCHAR(255)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS notes VARCHAR(500)",
        "ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ",
    ]

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        apply_lightweight_schema_updates()

    @app.get("/health", tags=["health"])
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(sessions.router, prefix=settings.api_prefix)
    app.include_router(attendance.router, prefix=settings.api_prefix)
    app.include_router(students.router, prefix=settings.api_prefix)

    return app


app = create_app()
