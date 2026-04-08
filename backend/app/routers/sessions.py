from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceListItem
from app.schemas.session import QRTokenResponse, SessionCreateRequest, SessionResponse
from app.services.attendance_service import AttendanceService
from app.services.qr_token_service import QRTokenService
from app.services.session_service import SessionService


router = APIRouter(prefix="/sessions", tags=["Sessions"])


def build_session_response(session_obj) -> SessionResponse:
    response_payload = SessionResponse.model_validate(session_obj)
    response_payload.duration_minutes = max(
        1,
        int((session_obj.expires_at - session_obj.started_at).total_seconds() // 60),
    )
    return response_payload


@router.post("/start", response_model=SessionResponse)
def start_session(
    request: Request,
    payload: SessionCreateRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher)),
) -> SessionResponse:
    teacher_ip = request.client.host if request.client else None
    request_payload = payload or SessionCreateRequest(duration_minutes=settings.session_ttl_minutes)
    session_obj = SessionService.create_session(db, current_user.id, teacher_ip, request_payload)
    return build_session_response(session_obj)


@router.post("/{session_id}/stop", response_model=SessionResponse)
def stop_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher)),
) -> SessionResponse:
    session_obj = SessionService.stop_session(db, current_user.id, session_id)
    return build_session_response(session_obj)


@router.get("/{session_id}/qr-token", response_model=QRTokenResponse)
def get_qr_token(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher)),
) -> QRTokenResponse:
    session_obj = SessionService.get_teacher_session(db, current_user.id, session_id)
    SessionService.assert_session_valid(db, session_obj)

    token, token_payload = QRTokenService.generate(session_id=session_obj.id)
    generated_at = datetime.fromtimestamp(token_payload["timestamp"], tz=timezone.utc)

    return QRTokenResponse(
        session_id=session_obj.id,
        token=token,
        generated_at=generated_at,
        expires_in_seconds=settings.qr_token_ttl_seconds,
    )


@router.get("/{session_id}/attendance", response_model=list[AttendanceListItem])
def get_session_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.teacher)),
) -> list[AttendanceListItem]:
    return AttendanceService.get_session_attendance(db, session_id, current_user.id)
