from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.client_ip import extract_client_ip
from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceResponse, AttendanceScanRequest
from app.services.attendance_service import AttendanceService


router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/scan", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def scan_qr_and_mark_attendance(
    payload: AttendanceScanRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
) -> AttendanceResponse:
    client_ip = extract_client_ip(request)
    attendance = AttendanceService.mark_attendance(
        db=db,
        student=current_user,
        payload=payload,
        client_ip=client_ip,
    )
    return AttendanceResponse.model_validate(attendance)
