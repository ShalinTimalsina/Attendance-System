from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SessionType(str, Enum):
    solo = "solo"
    lecture = "lecture"
    tutorial = "tutorial"
    practical = "practical"


class SessionCreateRequest(BaseModel):
    duration_minutes: int = Field(default=2, ge=1, le=180)
    session_type: SessionType = SessionType.lecture
    course_code: str | None = Field(default=None, min_length=2, max_length=32)
    course_title: str | None = Field(default=None, min_length=2, max_length=120)
    audience_label: str | None = Field(default=None, min_length=2, max_length=120)
    target_sections: str | None = Field(default=None, max_length=255)
    topic: str | None = Field(default=None, min_length=2, max_length=255)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator(
        "course_code",
        "course_title",
        "audience_label",
        "target_sections",
        "topic",
        "notes",
        mode="before",
    )
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("target_sections")
    @classmethod
    def normalize_target_sections(cls, value: str | None) -> str | None:
        if not value:
            return None
        sections = [item.strip() for item in value.split(",") if item.strip()]
        if not sections:
            return None
        return ",".join(dict.fromkeys(sections))


class SessionResponse(BaseModel):
    id: int
    teacher_id: int
    started_at: datetime
    expires_at: datetime
    is_active: bool
    ended_at: datetime | None = None
    duration_minutes: int = 0
    session_type: SessionType | None = None
    course_code: str | None = None
    course_title: str | None = None
    audience_label: str | None = None
    target_sections: str | None = None
    topic: str | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class QRTokenResponse(BaseModel):
    session_id: int
    token: str
    generated_at: datetime
    expires_in_seconds: int
