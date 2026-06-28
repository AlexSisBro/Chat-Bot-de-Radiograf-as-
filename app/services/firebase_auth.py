from firebase_admin import auth
from app.core.config import settings

def verify_firebase_id_token(id_token: str) -> dict:
    try:
        
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
        
    except auth.ExpiredIdTokenError:
        raise ValueError("El token de Firebase ha expirado.")
    except Exception as e:
        raise ValueError(f"Token de Firebase inválido: {str(e)}")
