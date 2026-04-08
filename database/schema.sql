-- PostgreSQL schema for Attendance System

CREATE TYPE user_role AS ENUM ('student', 'teacher');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    registered_device_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    teacher_ip VARCHAR(64),
    session_type VARCHAR(20),
    course_code VARCHAR(32),
    course_title VARCHAR(120),
    audience_label VARCHAR(120),
    target_sections VARCHAR(255),
    topic VARCHAR(255),
    notes VARCHAR(500),
    ended_at TIMESTAMPTZ
);

CREATE TABLE attendances (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64),
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_session_teacher_id ON attendance_sessions(teacher_id);
CREATE INDEX idx_session_expires_at ON attendance_sessions(expires_at);
CREATE INDEX idx_attendance_session_id ON attendances(session_id);
CREATE INDEX idx_attendance_student_id ON attendances(student_id);
