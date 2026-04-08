from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.session import AttendanceSession
from app.schemas.session import SessionCreateRequest


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SessionService:
    @staticmethod
    def create_session(
        db: Session,
        teacher_id: int,
        teacher_ip: str | None,
        payload: SessionCreateRequest,
    ) -> AttendanceSession:
        now = utc_now()
        existing_active = db.scalar(
            select(AttendanceSession)
            .where(
                AttendanceSession.teacher_id == teacher_id,
                AttendanceSession.is_active.is_(True),
                AttendanceSession.expires_at > now,
            )
            .order_by(AttendanceSession.started_at.desc())
        )
        if existing_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have an active attendance session. Stop it before creating a new one.",
            )

        expires_at = now + timedelta(minutes=payload.duration_minutes)

        session = AttendanceSession(
            teacher_id=teacher_id,
            started_at=now,
            expires_at=expires_at,
            is_active=True,
            teacher_ip=teacher_ip,
            session_type=payload.session_type.value,
            course_code=payload.course_code,
            course_title=payload.course_title,
            audience_label=payload.audience_label,
            target_sections=payload.target_sections,
            topic=payload.topic,
            notes=payload.notes,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_teacher_session(db: Session, teacher_id: int, session_id: int) -> AttendanceSession:
        session_obj = db.scalar(
            select(AttendanceSession).where(
                AttendanceSession.id == session_id,
                AttendanceSession.teacher_id == teacher_id,
            )
        )
        if not session_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return session_obj

    @staticmethod
    def assert_session_valid(db: Session, session_obj: AttendanceSession) -> None:
        if not session_obj.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is inactive")

        now = utc_now()
        if session_obj.expires_at <= now:
            session_obj.is_active = False
            if not session_obj.ended_at:
                session_obj.ended_at = now
            db.add(session_obj)
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has expired")

    @staticmethod
    def stop_session(db: Session, teacher_id: int, session_id: int) -> AttendanceSession:
        session_obj = SessionService.get_teacher_session(db, teacher_id, session_id)

        if session_obj.is_active:
            now = utc_now()
            session_obj.is_active = False
            session_obj.ended_at = now
            db.add(session_obj)
            db.commit()
            db.refresh(session_obj)

        return session_obj
