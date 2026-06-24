from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import secrets
import time

from app.core.config import settings

_oauth_states: dict[str, float] = {}


def generate_oauth_state() -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = time.time()
    _cleanup_expired_states()
    return state


def verify_oauth_state(state: str) -> bool:
    _cleanup_expired_states()
    if state in _oauth_states:
        del _oauth_states[state]
        return True
    return False


def _cleanup_expired_states() -> None:
    now = time.time()
    expired = [k for k, v in _oauth_states.items() if now - v > 600]
    for k in expired:
        del _oauth_states[k]


def verify_google_id_token(token: str, state: str | None = None) -> dict:
    if not settings.google_client_id:
        raise ValueError("Google OAuth no está configurado en el servidor.")

    if state is not None and not verify_oauth_state(state):
        raise ValueError("Estado OAuth inválido o expirado.")

    idinfo = id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.google_client_id,
    )

    issuer = idinfo.get("iss")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Emisor del token de Google no válido.")

    if not idinfo.get("email_verified"):
        raise ValueError("El correo de Google no está verificado.")

    email = idinfo.get("email")
    if not email:
        raise ValueError("No se pudo obtener el correo de Google.")

    if not email.endswith("@gmail.com"):
        raise ValueError("Solo se permite el registro con cuentas de Gmail (@gmail.com).")

    return idinfo
