from collections import defaultdict
from time import time
import threading
import ipaddress
import re

from fastapi import HTTPException, Request

_buckets: dict[str, list[float]] = defaultdict(list)
_buckets_lock = threading.Lock()

_IPV4_REGEX = re.compile(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")
_IPV6_REGEX = re.compile(r"^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$")


def _validate_ip(ip: str) -> str:
    if not ip or ip == "unknown":
        return "unknown"
    ip = ip.strip()
    if _IPV4_REGEX.match(ip) or _IPV6_REGEX.match(ip):
        try:
            ipaddress.ip_address(ip)
            return ip
        except ValueError:
            pass
    return "unknown"


def check_rate_limit(
    request: Request,
    scope: str,
    max_calls: int,
    window_seconds: int,
) -> None:
    client_ip = _validate_ip(request.client.host if request.client else "unknown")
    key = f"{client_ip}:{scope}"
    now = time()
    window_start = now - window_seconds

    with _buckets_lock:
        _buckets[key] = [timestamp for timestamp in _buckets[key] if timestamp > window_start]

        if len(_buckets[key]) >= max_calls:
            raise HTTPException(
                status_code=429,
                detail="Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
            )

        _buckets[key].append(now)

        if len(_buckets) > 10000:
            cutoff = now - 3600
            keys_to_delete = [
                k for k, v in _buckets.items()
                if not any(ts > cutoff for ts in v)
            ]
            for k in keys_to_delete:
                del _buckets[k]
