from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    @staticmethod
    def register_user(db: Session, payload: RegisterRequest) -> User:
        existing_user = db.scalar(
            select(User).where(or_(User.username == payload.username, User.email == payload.email))
        )
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")

        user = User(
            username=payload.username,
            email=payload.email,
            full_name=payload.full_name,
            password_hash=get_password_hash(payload.password),
            role=payload.role,
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username or email already exists",
            ) from exc
        db.refresh(user)
        return user

    @staticmethod
    def authenticate(db: Session, payload: LoginRequest) -> TokenResponse:
        user = db.scalar(select(User).where(User.username == payload.username))
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

        token = create_access_token(
            subject=user.username,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        )
        return TokenResponse(access_token=token, role=user.role, user_id=user.id)
