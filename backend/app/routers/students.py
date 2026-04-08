from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.attendance import AttendancePercentageResponse
from app.services.attendance_service import AttendanceService


router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me/attendance-percentage", response_model=AttendancePercentageResponse)
def get_my_attendance_percentage(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
) -> AttendancePercentageResponse:
    return AttendanceService.get_student_percentage(db, current_user.id)
