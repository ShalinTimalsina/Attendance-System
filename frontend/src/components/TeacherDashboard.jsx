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
    const [lastAttendanceSync, setLastAttendanceSync] = useState(null);
    const [sessionType, setSessionType] = useState("lecture");
    const [durationMinutes, setDurationMinutes] = useState(2);
    const [targetSections, setTargetSections] = useState("");
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
                setLastAttendanceSync(Date.now());
            } catch (err) {
                if (!active) {
                    return;
                }
                // Keep live polling silent to avoid noisy UX while network fluctuates.
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
            target_sections: targetSections.trim() || null,
            notes: notes.trim() || null,
        };

        try {
            const { data } = await api.post("/sessions/start", payload);
            setSession(data);
            const attendanceResponse = await api.get(`/sessions/${data.id}/attendance`);
            setAttendance(attendanceResponse.data);
            setLastAttendanceSync(Date.now());
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
            setLastAttendanceSync(Date.now());
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to fetch attendance list");
        }
    };

    return (
        <div className="dashboard-grid">
            <section className="card">
                <h2>Teacher Control Panel</h2>
                <p className="muted-text">
                    Select session type and duration, then optionally add section and notes before starting attendance.
                </p>

                {sessionIsActive && qrToken ? (
                    <div className="teacher-live-qr">
                        <div className="teacher-live-qr-code">
                            <QRCodeCanvas value={qrToken} size={160} includeMargin />
                        </div>
                        <div className="teacher-live-qr-meta">
                            <p>
                                <strong>Live QR Ready</strong>
                            </p>
                            <p className="muted-text">
                                Session #{session?.id} · {sessionSecondsLeft}s left · token refresh {qrExpiresIn}s
                            </p>
                            <p className="muted-text">Students can scan directly from this QR.</p>
                            <textarea readOnly value={qrToken} rows={3} />
                        </div>
                    </div>
                ) : null}

                <form className="stack-form teacher-session-form" onSubmit={startSession}>
                    <div className="session-form-grid">
                        <label>
                            Session Type
                            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
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
                            Section (optional)
                            <input
                                value={targetSections}
                                onChange={(e) => setTargetSections(e.target.value)}
                                placeholder="e.g. A10 or A10,A11"
                            />
                        </label>
                    </div>

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
                        {session.session_type ? (
                            <p>
                                <strong>Session Type:</strong> {session.session_type}
                            </p>
                        ) : null}

                        {session.target_sections ? (
                            <p>
                                <strong>Section:</strong> {session.target_sections}
                            </p>
                        ) : null}
                        {session.notes ? (
                            <p>
                                <strong>Notes:</strong> {session.notes}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <p className="muted-text">No active session yet.</p>
                )}

                {error ? <p className="error-text">{error}</p> : null}
                {message ? <p className="success-text">{message}</p> : null}
            </section>

            <section className="card">
                <h2>Attendance List</h2>
                <p className="muted-text">
                    {sessionIsActive
                        ? `Live updates every 3 seconds${lastAttendanceSync ? ` · Last sync ${new Date(lastAttendanceSync).toLocaleTimeString()}` : ""
                        }`
                        : "Start a session to receive live attendance updates."}
                </p>
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

                <button className="secondary-btn" onClick={refreshAttendance}>
                    Refresh now (optional)
                </button>
            </section>
        </div>
    );
}

export default TeacherDashboard;
