from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attendance import Attendance
from app.models.session import AttendanceSession
from app.models.user import User
from app.schemas.attendance import AttendanceListItem, AttendancePercentageResponse, AttendanceScanRequest
from app.services.qr_token_service import QRTokenService


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AttendanceService:
    @staticmethod
    def mark_attendance(
        db: Session,
        student: User,
        payload: AttendanceScanRequest,
        client_ip: str | None,
    ) -> Attendance:
        token_payload = QRTokenService.validate(payload.qr_token)
        session_id = int(token_payload["session_id"])

        session_obj = db.get(AttendanceSession, session_id)
        if not session_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found")
        if session_obj.expires_at <= utc_now():
            session_obj.is_active = False
            db.add(session_obj)
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance session is invalid or expired")
        if not session_obj.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance session is invalid or expired")

        if settings.enforce_ip_restriction and session_obj.teacher_ip and client_ip != session_obj.teacher_ip:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="IP restriction check failed")

        duplicate = db.scalar(
            select(Attendance).where(Attendance.session_id == session_id, Attendance.student_id == student.id)
        )
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student already marked present")

        if student.registered_device_id and student.registered_device_id != payload.device_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device ID mismatch")
        if not student.registered_device_id:
            student.registered_device_id = payload.device_id
            db.add(student)

        attendance = Attendance(
            session_id=session_id,
            student_id=student.id,
            device_id=payload.device_id,
            ip_address=client_ip,
        )
        db.add(attendance)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student already marked present",
            ) from exc
        db.refresh(attendance)
        return attendance

    @staticmethod
    def get_session_attendance(db: Session, session_id: int, teacher_id: int) -> list[AttendanceListItem]:
        session_obj = db.scalar(
            select(AttendanceSession).where(
                AttendanceSession.id == session_id,
                AttendanceSession.teacher_id == teacher_id,
            )
        )
        if not session_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

        rows = db.execute(
            select(Attendance, User)
            .join(User, User.id == Attendance.student_id)
            .where(Attendance.session_id == session_id)
            .order_by(Attendance.marked_at.asc())
        ).all()

        return [
            AttendanceListItem(
                attendance_id=attendance.id,
                student_id=student.id,
                username=student.username,
                full_name=student.full_name,
                marked_at=attendance.marked_at,
                device_id=attendance.device_id,
                ip_address=attendance.ip_address,
            )
            for attendance, student in rows
        ]

    @staticmethod
    def get_student_percentage(db: Session, student_id: int) -> AttendancePercentageResponse:
        now = utc_now()

        total_sessions = db.scalar(
            select(func.count(AttendanceSession.id)).where(AttendanceSession.expires_at <= now)
        )
        attended_sessions = db.scalar(
            select(func.count(Attendance.id))
            .join(AttendanceSession, AttendanceSession.id == Attendance.session_id)
            .where(
                Attendance.student_id == student_id,
                AttendanceSession.expires_at <= now,
            )
        )

        total = int(total_sessions or 0)
        attended = int(attended_sessions or 0)
        percentage = round((attended / total) * 100, 2) if total else 0.0

        return AttendancePercentageResponse(
            student_id=student_id,
            attended_sessions=attended,
            total_sessions=total,
            percentage=percentage,
        )
