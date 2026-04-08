import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import api from "../api/client";

function TeacherDashboard() {
    const [session, setSession] = useState(null);
    const [qrToken, setQrToken] = useState("");
    const [qrExpiresIn, setQrExpiresIn] = useState(0);
    const [attendance, setAttendance] = useState([]);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [clock, setClock] = useState(Date.now());
    const [sessionType, setSessionType] = useState("lecture");
    const [durationMinutes, setDurationMinutes] = useState(2);
    const [courseCode, setCourseCode] = useState("");
    const [courseTitle, setCourseTitle] = useState("");
    const [audienceLabel, setAudienceLabel] = useState("");
    const [targetSections, setTargetSections] = useState("");
    const [topic, setTopic] = useState("");
    const [notes, setNotes] = useState("");

    const sessionSecondsLeft = useMemo(() => {
        if (!session) {
            return 0;
        }
        const expiresAt = new Date(session.expires_at).getTime();
        const now = clock;
        return Math.max(0, Math.floor((expiresAt - now) / 1000));
    }, [session, clock]);

    const sessionIsActive = useMemo(() => {
        return Boolean(session && session.is_active && sessionSecondsLeft > 0);
    }, [session, sessionSecondsLeft]);

    useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!session || !session.is_active) {
            return undefined;
        }

        let active = true;

        const loadQr = async () => {
            const expiresAt = new Date(session.expires_at).getTime();
            if (Date.now() >= expiresAt) {
                setQrToken("");
                return;
            }

            try {
                const { data } = await api.get(`/sessions/${session.id}/qr-token`);
                if (!active) return;
                setQrToken(data.token);
                setQrExpiresIn(data.expires_in_seconds);
            } catch (err) {
                if (!active) return;
                const detail = err?.response?.data?.detail || "Unable to load QR token";
                setError(detail);
                if (detail === "Session is inactive" || detail === "Session has expired") {
                    setSession((previous) => (previous ? { ...previous, is_active: false } : previous));
                    setQrToken("");
                }
            }
        };

        loadQr();
        const interval = setInterval(loadQr, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [session]);

    useEffect(() => {
        if (!session || !sessionIsActive) {
            return undefined;
        }

        let active = true;

        const loadAttendanceLive = async () => {
            try {
                const { data } = await api.get(`/sessions/${session.id}/attendance`);
                if (!active) {
                    return;
                }
                setAttendance(data);
            } catch (err) {
                if (!active) {
                    return;
                }
                const detail = err?.response?.data?.detail || "Unable to fetch attendance list";
                setError(detail);
            }
        };

        loadAttendanceLive();
        const interval = setInterval(loadAttendanceLive, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [session, sessionIsActive]);

    const startSession = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setAttendance([]);
        setQrToken("");

        const payload = {
            duration_minutes: Number(durationMinutes),
            session_type: sessionType,
            course_code: courseCode.trim() || null,
            course_title: courseTitle.trim() || null,
            audience_label: audienceLabel.trim() || null,
            target_sections: targetSections.trim() || null,
            topic: topic.trim() || null,
            notes: notes.trim() || null,
        };

        try {
            const { data } = await api.post("/sessions/start", payload);
            setSession(data);
            const attendanceResponse = await api.get(`/sessions/${data.id}/attendance`);
            setAttendance(attendanceResponse.data);
            setMessage("Session started. QR token refreshes automatically every few seconds.");
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to start session");
        }
    };

    const stopSession = async () => {
        if (!session) {
            return;
        }

        setError("");
        setMessage("");

        try {
            const { data } = await api.post(`/sessions/${session.id}/stop`);
            setSession(data);
            setQrToken("");
            setMessage("Session stopped. Students can no longer mark attendance for this session.");
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to stop session");
        }
    };

    const refreshAttendance = async () => {
        if (!session) {
            return;
        }
        setError("");
        try {
            const { data } = await api.get(`/sessions/${session.id}/attendance`);
            setAttendance(data);
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to fetch attendance list");
        }
    };

    return (
        <div className="dashboard-grid">
            <section className="card">
                <h2>Teacher Control Panel</h2>
                <p className="muted-text">
                    Configure class details, select session mode, and target sections before starting attendance.
                </p>

                <form className="stack-form teacher-session-form" onSubmit={startSession}>
                    <div className="session-form-grid">
                        <label>
                            Session Type
                            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                                <option value="solo">Solo</option>
                                <option value="lecture">Lecture</option>
                                <option value="tutorial">Tutorial</option>
                                <option value="practical">Practical</option>
                            </select>
                        </label>

                        <label>
                            Duration (minutes)
                            <input
                                type="number"
                                min={1}
                                max={180}
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            Course Code
                            <input
                                value={courseCode}
                                onChange={(e) => setCourseCode(e.target.value)}
                                placeholder="e.g. CS201"
                            />
                        </label>

                        <label>
                            Course Title
                            <input
                                value={courseTitle}
                                onChange={(e) => setCourseTitle(e.target.value)}
                                placeholder="e.g. Data Structures"
                            />
                        </label>

                        <label>
                            Audience Label
                            <input
                                value={audienceLabel}
                                onChange={(e) => setAudienceLabel(e.target.value)}
                                placeholder="e.g. Group 1 or A10"
                            />
                        </label>

                        <label>
                            Target Sections
                            <input
                                value={targetSections}
                                onChange={(e) => setTargetSections(e.target.value)}
                                placeholder="e.g. A10,A11,A12"
                            />
                        </label>
                    </div>

                    <label>
                        Topic
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Week 4 - Trees"
                        />
                    </label>

                    <label>
                        Notes (optional)
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Any additional instructions"
                        />
                    </label>

                    <div className="teacher-actions-row">
                        <button type="submit" disabled={sessionIsActive}>
                            {sessionIsActive ? "Session Active" : "Start Session"}
                        </button>
                        <button type="button" className="secondary-btn" onClick={stopSession} disabled={!sessionIsActive}>
                            Stop Session
                        </button>
                    </div>
                </form>

                {session ? (
                    <div className="session-box">
                        <p>
                            <strong>Session ID:</strong> {session.id}
                        </p>
                        <p>
                            <strong>Status:</strong> {sessionIsActive ? "Active" : "Stopped / Expired"}
                        </p>
                        <p>
                            <strong>Session expires in:</strong> {sessionSecondsLeft}s
                        </p>
                        <p>
                            <strong>Planned duration:</strong> {session.duration_minutes || 0} min
                        </p>
                        <p>
                            <strong>QR token TTL:</strong> {qrExpiresIn}s
                        </p>

                        {(session.course_code || session.course_title || session.session_type) && (
                            <p>
                                <strong>Class:</strong> {session.course_code || "-"}
                                {session.course_title ? ` — ${session.course_title}` : ""} ({session.session_type || "-"})
                            </p>
                        )}
                        {session.audience_label ? (
                            <p>
                                <strong>Audience:</strong> {session.audience_label}
                            </p>
                        ) : null}
                        {session.target_sections ? (
                            <p>
                                <strong>Target Sections:</strong> {session.target_sections}
                            </p>
                        ) : null}
                        {session.topic ? (
                            <p>
                                <strong>Topic:</strong> {session.topic}
                            </p>
                        ) : null}
                        {session.notes ? (
                            <p>
                                <strong>Notes:</strong> {session.notes}
                            </p>
                        ) : null}

                        {sessionIsActive && qrToken ? (
                            <div className="qr-wrapper">
                                <QRCodeCanvas value={qrToken} size={220} includeMargin />
                                <p className="muted-text">If camera scan is unavailable, copy this token manually:</p>
                                <textarea readOnly value={qrToken} rows={4} />
                            </div>
                        ) : <p className="muted-text">QR is unavailable for inactive/expired sessions.</p>}

                        <button className="secondary-btn" onClick={refreshAttendance}>
                            Refresh attendance list
                        </button>
                    </div>
                ) : (
                    <p className="muted-text">No active session yet.</p>
                )}

                {error ? <p className="error-text">{error}</p> : null}
                {message ? <p className="success-text">{message}</p> : null}
            </section>

            <section className="card">
                <h2>Attendance List</h2>
                {attendance.length === 0 ? (
                    <p className="muted-text">No students marked yet.</p>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Marked At</th>
                                    <th>Device ID</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendance.map((row) => (
                                    <tr key={row.attendance_id}>
                                        <td>
                                            {row.full_name} <span className="muted-text">({row.username})</span>
                                        </td>
                                        <td>{new Date(row.marked_at).toLocaleString()}</td>
                                        <td>{row.device_id}</td>
                                        <td>{row.ip_address || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default TeacherDashboard;
