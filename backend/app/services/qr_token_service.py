import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis_client import get_redis_client


def _b64_url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64_url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


class QRTokenService:
    @staticmethod
    def _sign(payload_b64: str) -> str:
        signature = hmac.new(
            settings.qr_hmac_secret.encode("utf-8"),
            payload_b64.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return _b64_url_encode(signature)

    @staticmethod
    def _nonce_key(session_id: int, nonce: str) -> str:
        return f"attendance:qr_nonce:{session_id}:{nonce}"

    @staticmethod
    def _store_nonce(payload: dict[str, Any]) -> None:
        client = get_redis_client()
        if not client:
            return

        key = QRTokenService._nonce_key(payload["session_id"], payload["nonce"])
        try:
            client.setex(key, settings.qr_token_ttl_seconds, "1")
        except Exception:
            # Fail-open when optional Redis is unavailable.
            return

    @staticmethod
    def _validate_nonce(payload: dict[str, Any]) -> None:
        client = get_redis_client()
        if not client:
            return

        key = QRTokenService._nonce_key(payload["session_id"], payload["nonce"])
        try:
            exists = client.get(key)
            if not exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="QR token is invalid, expired, or already used",
                )
        except HTTPException:
            raise
        except Exception:
            # Fail-open when optional Redis is unavailable.
            return

    @staticmethod
    def generate(session_id: int) -> tuple[str, dict[str, Any]]:
        payload = {
            "session_id": session_id,
            "timestamp": int(time.time()),
            "nonce": secrets.token_urlsafe(10),
        }
        payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        payload_b64 = _b64_url_encode(payload_json)
        signature_b64 = QRTokenService._sign(payload_b64)
        token = f"{payload_b64}.{signature_b64}"

        if settings.use_redis_nonce_store:
            QRTokenService._store_nonce(payload)

        return token, payload

    @staticmethod
    def validate(token: str) -> dict[str, Any]:
        try:
            payload_b64, signature_b64 = token.split(".", maxsplit=1)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed QR token") from exc

        if not payload_b64 or not signature_b64:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed QR token")

        expected_signature = QRTokenService._sign(payload_b64)
        if not hmac.compare_digest(signature_b64, expected_signature):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR token signature")

        try:
            payload = json.loads(_b64_url_decode(payload_b64))
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed QR token payload") from exc

        if not isinstance(payload, dict):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed QR token payload")

        required_keys = {"session_id", "timestamp", "nonce"}
        if not required_keys.issubset(payload):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token missing required fields")

        try:
            session_id = int(payload["session_id"])
            timestamp = int(payload["timestamp"])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR token field types") from exc

        nonce = payload.get("nonce")
        if not isinstance(nonce, str) or len(nonce) < 8:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR token nonce")

        payload["session_id"] = session_id
        payload["timestamp"] = timestamp
        payload["nonce"] = nonce

        now = int(time.time())
        max_future_clock_skew_seconds = 2
        if timestamp > now + max_future_clock_skew_seconds:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token timestamp is invalid")

        age = now - timestamp
        if age < 0 or age > settings.qr_token_ttl_seconds:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR token expired")

        if settings.use_redis_nonce_store:
            QRTokenService._validate_nonce(payload)

        return payload
