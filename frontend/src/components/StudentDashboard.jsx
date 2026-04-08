import { useEffect, useMemo, useState } from "react";

import api from "../api/client";
import QrScannerModal from "./QrScannerModal";

function StudentDashboard() {
    const [deviceId, setDeviceId] = useState(() => localStorage.getItem("device_id") || "");
    const [qrToken, setQrToken] = useState("");
    const [stats, setStats] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [autoSubmitAfterScan, setAutoSubmitAfterScan] = useState(true);

    const attendancePercentage = useMemo(() => {
        if (!stats) {
            return "0.00";
        }
        return Number(stats.percentage).toFixed(2);
    }, [stats]);

    const loadStats = async () => {
        try {
            const { data } = await api.get("/students/me/attendance-percentage");
            setStats(data);
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to fetch attendance percentage");
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const markAttendance = async (token) => {
        setBusy(true);
        setError("");
        setMessage("");

        try {
            await api.post("/attendance/scan", {
                qr_token: token,
                device_id: deviceId,
            });
            localStorage.setItem("device_id", deviceId);
            setMessage("Attendance marked successfully. Nice punctuality! ✨");
            setQrToken("");
            await loadStats();
        } catch (err) {
            setError(err?.response?.data?.detail || "Unable to mark attendance");
        } finally {
            setBusy(false);
        }
    };

    const submitAttendance = async (event) => {
        event.preventDefault();
        await markAttendance(qrToken);
    };

    const handleScanned = async (decodedText) => {
        setQrToken(decodedText);

        if (autoSubmitAfterScan && deviceId.trim().length >= 3) {
            await markAttendance(decodedText);
        }
    };

    return (
        <div className="dashboard-grid single">
            <section className="card">
                <h2>Student Attendance</h2>
                <p className="muted-text">
                    Scan the live QR from your teacher, then submit the decoded token below.
                </p>

                <div className="row-actions">
                    <button type="button" onClick={() => setScannerOpen(true)} disabled={busy}>
                        Scan QR with Camera
                    </button>
                    <label className="inline-check">
                        <input
                            type="checkbox"
                            checked={autoSubmitAfterScan}
                            onChange={(e) => setAutoSubmitAfterScan(e.target.checked)}
                            disabled={busy}
                        />
                        Auto-submit after scan
                    </label>
                </div>

                <form onSubmit={submitAttendance} className="stack-form">
                    <label>
                        Device ID
                        <input
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                            placeholder="e.g. my-phone-01"
                            required
                            minLength={3}
                        />
                    </label>

                    <label>
                        QR Token (manual fallback)
                        <textarea
                            value={qrToken}
                            onChange={(e) => setQrToken(e.target.value)}
                            rows={4}
                            placeholder="Paste scanned QR token"
                            required
                        />
                    </label>

                    <button type="submit" disabled={busy}>
                        {busy ? "Submitting..." : "Mark Attendance"}
                    </button>
                </form>

                {error ? <p className="error-text">{error}</p> : null}
                {message ? <p className="success-text">{message}</p> : null}
            </section>

            <section className="card">
                <h2>My Statistics</h2>
                {stats ? (
                    <ul className="stats-list">
                        <li>
                            <strong>Attended Sessions:</strong> {stats.attended_sessions}
                        </li>
                        <li>
                            <strong>Total Sessions:</strong> {stats.total_sessions}
                        </li>
                        <li>
                            <strong>Attendance Percentage:</strong> {attendancePercentage}%
                        </li>
                    </ul>
                ) : (
                    <p className="muted-text">No statistics yet.</p>
                )}

                <button className="secondary-btn" onClick={loadStats}>
                    Refresh stats
                </button>
            </section>

            <QrScannerModal
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScanned={handleScanned}
            />
        </div>
    );
}

export default StudentDashboard;
