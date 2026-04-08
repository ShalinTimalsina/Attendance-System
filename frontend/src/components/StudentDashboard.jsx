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

    const parseAttendanceError = (err) => {
        const detail = err?.response?.data?.detail || "Unable to mark attendance";

        if (detail === "Student already marked present") {
            return "Attendance already marked for this session. No need to scan again. ✅";
        }
        if (detail === "Device ID mismatch") {
            return "This account is linked to a different device ID. Use your original device ID.";
        }
        if (detail === "QR token expired") {
            return "QR expired. Ask your teacher to keep the QR open and scan again quickly.";
        }

        return detail;
    };

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
        if (busy) {
            return;
        }

        if (!deviceId.trim() || deviceId.trim().length < 3) {
            setError("Enter a valid device ID (at least 3 characters) before submitting attendance.");
            setMessage("");
            return;
        }

        setBusy(true);
        setError("");
        setMessage("");

        try {
            await api.post("/attendance/scan", {
                qr_token: token,
                device_id: deviceId.trim(),
            });
            localStorage.setItem("device_id", deviceId.trim());
            setMessage("Attendance marked successfully. Thank you! ✅");
            setQrToken("");
            await loadStats();
        } catch (err) {
            setError(parseAttendanceError(err));
        } finally {
            setBusy(false);
        }
    };

    const submitAttendance = async (event) => {
        event.preventDefault();
        await markAttendance(qrToken);
    };

    const handleScanned = async (decodedText) => {
        setError("");
        setQrToken(decodedText);

        if (autoSubmitAfterScan && deviceId.trim().length >= 3) {
            await markAttendance(decodedText);
            return;
        }

        if (autoSubmitAfterScan && deviceId.trim().length < 3) {
            setError("QR captured, but device ID is missing. Enter device ID and tap Mark Attendance.");
            return;
        }

        setMessage("QR captured successfully. Tap Mark Attendance to submit.");
    };

    return (
        <div className="dashboard-grid single">
            <section className="card">
                <h2>Student Attendance</h2>
                <p className="muted-text">
                    Scan the live QR from your teacher, then submit the decoded token below.
                </p>

                {error ? <p className="error-text status-banner">{error}</p> : null}
                {message ? <p className="success-text status-banner">{message}</p> : null}

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

                    <p className="muted-text">
                        Tip: keep the same device ID every time to avoid device mismatch errors.
                    </p>

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
