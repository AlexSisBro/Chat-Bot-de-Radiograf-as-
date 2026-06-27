from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.orm import User, ChatSession
from app.services.firebase_auth import verify_firebase_id_token

security_scheme = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = verify_firebase_id_token(credentials.credentials)
        firebase_uid: str = payload.get("sub") or payload.get("uid", "")
        email: str = payload.get("email", "")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de Firebase inválido o expirado: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not firebase_uid or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no contiene uid o email",
        )

    # Upsert: crear usuario si no existe, basado en el email de Firebase
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash=None)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def get_owned_session(session_id: int, user: User, db: Session) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session
