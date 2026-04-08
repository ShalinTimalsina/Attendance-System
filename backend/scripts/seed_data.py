from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.database import engine


def seed_users() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        users_to_seed = [
            {
                "username": "teacher1",
                "email": "teacher1@example.com",
                "full_name": "Teacher One",
                "password": "Teacher@123",
                "role": UserRole.teacher,
            },
            {
                "username": "student1",
                "email": "student1@example.com",
                "full_name": "Student One",
                "password": "Student@123",
                "role": UserRole.student,
            },
        ]

        for user_data in users_to_seed:
            existing = db.scalar(select(User).where(User.username == user_data["username"]))
            if existing:
                continue

            db.add(
                User(
                    username=user_data["username"],
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    password_hash=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                )
            )
        db.commit()
        print("Seed complete: demo users are ready.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
