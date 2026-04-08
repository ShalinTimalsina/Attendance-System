from ipaddress import ip_address

from fastapi import Request


def _normalize_ip(value: str | None) -> str | None:
    if not value:
        return None

    candidate = value.strip()
    if not candidate:
        return None

    # [IPv6]:port
    if candidate.startswith("["):
        closing = candidate.find("]")
        if closing > 0:
            candidate = candidate[1:closing]

    # IPv4:port
    elif candidate.count(":") == 1:
        host, maybe_port = candidate.rsplit(":", 1)
        if maybe_port.isdigit():
            candidate = host

    try:
        ip_address(candidate)
        return candidate
    except ValueError:
        return None


def extract_client_ip(request: Request) -> str | None:
    headers = request.headers

    # Prefer Cloudflare's client IP header when present.
    candidates: list[str | None] = [headers.get("cf-connecting-ip"), headers.get("true-client-ip")]

    forwarded_for = headers.get("x-forwarded-for")
    if forwarded_for:
        candidates.extend(part.strip() for part in forwarded_for.split(","))

    candidates.append(headers.get("x-real-ip"))
    candidates.append(request.client.host if request.client else None)

    for candidate in candidates:
        resolved = _normalize_ip(candidate)
        if resolved:
            return resolved

    return None