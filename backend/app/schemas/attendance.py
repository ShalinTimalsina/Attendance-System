from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttendanceScanRequest(BaseModel):
    qr_token: str = Field(min_length=10)
    device_id: str = Field(min_length=3, max_length=255)


class AttendanceResponse(BaseModel):
    id: int
    session_id: int
    student_id: int
    marked_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AttendanceListItem(BaseModel):
    attendance_id: int
    student_id: int
    username: str
    full_name: str
    marked_at: datetime
    device_id: str
    ip_address: str | None = None


class AttendancePercentageResponse(BaseModel):
    student_id: int
    attended_sessions: int
    total_sessions: int
    percentage: float
