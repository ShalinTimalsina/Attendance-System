import { useEffect, useRef, useState } from "react";

function QrScannerModal({ open, onClose, onScanned }) {
    const regionIdRef = useRef(`qr-reader-${Math.random().toString(16).slice(2)}`);
    const scannerRef = useRef(null);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        let isUnmounted = false;
        let scanHandled = false;

        const startScanner = async () => {
            setStatus("Requesting camera permission...");

            const { Html5Qrcode } = await import("html5-qrcode");

            const scanner = new Html5Qrcode(regionIdRef.current);
            scannerRef.current = scanner;

            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    async (decodedText) => {
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
                    },
                    () => {
                        if (!isUnmounted) {
                            setStatus("Scanning...");
                        }
                    }
                );

                if (!isUnmounted) {
                    setStatus("Scanning...");
                }
            } catch (error) {
                if (isUnmounted) {
                    return;
                }
                setStatus(error?.message || "Unable to access camera. Check browser permission and device camera.");
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
    }, [open, onClose, onScanned]);

    if (!open) {
        return null;
    }

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="QR Scanner">
            <div className="modal-card">
                <div className="modal-header">
                    <h3>Scan Attendance QR</h3>
                    <button type="button" className="secondary-btn" onClick={onClose}>
                        Close
                    </button>
                </div>

                <p className="muted-text">{status}</p>

                <div className="qr-reader-wrap">
                    <div id={regionIdRef.current} />
                </div>

                <p className="muted-text">Tip: allow camera permission when prompted by the browser.</p>
            </div>
        </div>
    );
}

export default QrScannerModal;
