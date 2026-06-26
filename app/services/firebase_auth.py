import time
import requests
import jwt
from app.core.config import settings

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com"
_certs_cache = {}
_certs_expire = 0

def get_google_public_keys():
    global _certs_cache, _certs_expire
    now = time.time()
    if not _certs_cache or now > _certs_expire:
        try:
            res = requests.get(GOOGLE_CERTS_URL, timeout=10)
            if res.ok:
                _certs_cache = res.json()
                _certs_expire = now + 3600  # Caché por 1 hora
        except Exception:
            pass
    return _certs_cache

def verify_firebase_id_token(id_token: str) -> dict:
    project_id = settings.firebase_project_id
    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID no está configurado en el servidor.")

    # 1. Obtener la clave pública (kid) del header
    try:
        unverified_header = jwt.get_unverified_header(id_token)
        kid = unverified_header.get("kid")
    except Exception as e:
        raise ValueError(f"Formato de token inválido: {str(e)}")

    public_keys = get_google_public_keys()
    if not public_keys or kid not in public_keys:
        raise ValueError("La clave pública de firma de Firebase no se encuentra disponible o es inválida.")

    public_key_pem = public_keys[kid]

    # 2. Decodificar y verificar la firma y claims del token
    try:
        decoded = jwt.decode(
            id_token,
            public_key_pem,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise ValueError("El token de Firebase ha expirado.")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Token de Firebase inválido: {str(e)}")
