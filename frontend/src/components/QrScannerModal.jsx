import { useEffect, useRef, useState } from "react";

function QrScannerModal({ open, onClose, onScanned }) {
    const regionIdRef = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
    const scannerRef = useRef(null);
    const [status, setStatus] = useState("");
    const [retryTick, setRetryTick] = useState(0);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let isUnmounted = false;
        let scanHandled = false;

        const startScanner = async () => {
            if (!navigator?.mediaDevices?.getUserMedia) {
                setStatus("This browser does not support camera access.");
                return;
            }

            setStatus("Opening camera...");

            const { Html5Qrcode } = await import("html5-qrcode");

            const scanner = new Html5Qrcode(regionIdRef.current);
            scannerRef.current = scanner;

            const isSmallScreen = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
            const qrboxSize = isSmallScreen ? 220 : 260;

            const scanConfig = {
                fps: 10,
                qrbox: { width: qrboxSize, height: qrboxSize },
                aspectRatio: 1,
                disableFlip: true,
                rememberLastUsedCamera: true,
            };
            const onScanSuccess = async (decodedText) => {
                if (scanHandled) {
                    return;
                }
                scanHandled = true;
                setStatus("QR detected. Finalizing...");

                try {
                    await scanner.stop();
                } catch {
                    // no-op: some browsers can fail on rapid stop sequences
                }

                try {
                    await scanner.clear();
                } catch {
                    // no-op: clear may fail if scanner already cleared
                }

                if (!isUnmounted) {
                    onScanned(decodedText);
                    onClose();
                }
            };

            const onScanFailure = () => {
                if (!isUnmounted) {
                    setStatus("Scanning...");
                }
            };

            try {
                // Warm up permission prompt first; improves iOS/Safari camera listing.
                const warmupStream = await navigator.mediaDevices.getUserMedia({ video: true });
                warmupStream.getTracks().forEach((track) => track.stop());

                const cameras = await Html5Qrcode.getCameras().catch(() => []);
                const backCamera = cameras.find((cam) => /back|rear|environment/i.test(cam.label || ""));
                const fallbackCamera = cameras[0] || null;

                const attempts = [
                    { facingMode: { exact: "environment" } },
                    { facingMode: { ideal: "environment" } },
                    backCamera ? { deviceId: { exact: backCamera.id } } : null,
                    fallbackCamera ? { deviceId: { exact: fallbackCamera.id } } : null,
                ].filter(Boolean);

                let started = false;
                let lastError = null;

                for (const cameraConfig of attempts) {
                    try {
                        await scanner.start(cameraConfig, scanConfig, onScanSuccess, onScanFailure);
                        started = true;
                        break;
                    } catch (attemptError) {
                        lastError = attemptError;
                    }
                }

                if (!started) {
                    throw lastError || new Error("Unable to start camera scanner.");
                }

                if (!isUnmounted) {
                    setStatus("Scanning...");
                }
            } catch {
                if (isUnmounted) {
                    return;
                }
                setStatus("Camera couldn't start. Check browser camera permission and tap Retry Camera.");
            }
        };

        startScanner();

        return () => {
            isUnmounted = true;
            const scanner = scannerRef.current;
            scannerRef.current = null;

            if (scanner) {
                scanner.stop().catch(() => { }).finally(() => {
                    scanner.clear().catch(() => { });
                });
            }
        };
    }, [open, onClose, onScanned, retryTick]);

    if (!open) {
        return null;
    }

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="QR Scanner">
            <div className="modal-card">
                <div className="modal-header">
                    <h3>Scan Attendance QR</h3>
                    <div className="teacher-actions-row">
                        <button type="button" className="secondary-btn" onClick={() => setRetryTick((v) => v + 1)}>
                            Retry Camera
                        </button>
                        <button type="button" className="secondary-btn" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>

                <p className="muted-text">{status}</p>

                <div className="qr-reader-wrap">
                    <div id={regionIdRef.current} />
                </div>
            </div>
        </div>
    );
}

export default QrScannerModal;
