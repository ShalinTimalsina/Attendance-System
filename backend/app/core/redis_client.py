from typing import Any

from app.core.config import settings

try:
    import redis
except ImportError:  # pragma: no cover
    redis = None  # type: ignore[assignment]


_redis_client: Any | None = None


def get_redis_client() -> Any | None:
    global _redis_client

    if not settings.use_redis_nonce_store:
        return None
    if redis is None:
        return None

    if _redis_client is None:
        _redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client
