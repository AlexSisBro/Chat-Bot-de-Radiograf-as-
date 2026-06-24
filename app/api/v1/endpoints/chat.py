from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.core.deps import get_db, get_current_user, get_owned_session
from app.core.rate_limit import check_rate_limit
from app.core.security import create_access_token
from app.models.orm import ChatSession, ChatMessage, User
from app.models.request import UserRegister, UserLogin, GoogleLoginRequest, ChatRequest
from app.models.response import AuthResponse, ChatSessionResponse, ChatMessageResponse, ChatResponse
from app.services.session_manager import (
    register_user,
    authenticate_user,
    get_or_create_google_user,
    create_chat_session,
    save_chat_message,
    get_session_history,
    get_user_analysis,
    build_analysis_context,
)
from app.services.gemini_service import chat_response
from app.services.google_oauth import verify_google_id_token, generate_oauth_state

router = APIRouter(prefix="/chat", tags=["💬 Chat Bot"])


def _auth_response(user: User) -> dict:
    token = create_access_token(user.id, user.email)
    return {
        "id": user.id,
        "email": user.email,
        "access_token": token,
        "token_type": "bearer",
    }


@router.post("/register", response_model=AuthResponse)
def register_endpoint(payload: UserRegister, db: Session = Depends(get_db)):
    raise HTTPException(status_code=403, detail="Registro deshabilitado. Use autenticación de Google (Gmail).")


@router.post("/login", response_model=AuthResponse)
def login_endpoint(payload: UserLogin, db: Session = Depends(get_db)):
    raise HTTPException(status_code=403, detail="Inicio de sesión deshabilitado. Use autenticación de Google (Gmail).")


@router.get("/auth/google-config")
def google_auth_config():
    client_id = settings.google_client_id
    return {
        "enabled": bool(client_id),
        "client_id": client_id,
    }


@router.get("/auth/google-state")
def google_oauth_state():
    state = generate_oauth_state()
    return {"state": state}


@router.post("/google-login", response_model=AuthResponse)
def google_login_endpoint(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        idinfo = verify_google_id_token(payload.id_token, state=payload.state)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=401, detail="Token de Google inválido o expirado")

    user = get_or_create_google_user(db, email=idinfo["email"])
    return _auth_response(user)


@router.post("/sessions", response_model=ChatSessionResponse)
def create_session_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_chat_session(db, user_id=current_user.id)


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_user_sessions_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_owned_session(session_id, current_user, db)

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@router.delete("/sessions/{session_id}")
def delete_session_endpoint(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(session_id, current_user, db)

    # Delete all chat messages associated with the session
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()

    # If the session has an associated radiography analysis, delete it and its stored image
    if session.analysis_id:
        from app.models.orm import RadiographyAnalysis
        analysis = db.query(RadiographyAnalysis).filter(RadiographyAnalysis.id == session.analysis_id).first()
        if analysis:
            try:
                import os
                from app.services.image_service import UPLOADS_DIR
                file_path = os.path.join(UPLOADS_DIR, analysis.image_filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception:
                pass
            db.delete(analysis)

    # Finally, delete the session itself
    db.delete(session)
    db.commit()

    return {"success": True, "message": f"Consulta #{session_id} eliminada correctamente"}


@router.post("/message", response_model=ChatResponse)
async def send_message_endpoint(
    request: Request,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_rate_limit(
        request,
        scope=f"chat:{current_user.id}",
        max_calls=settings.rate_limit_chat_per_minute,
        window_seconds=60,
    )

    session = get_owned_session(payload.session_id, current_user, db)

    if not session.analysis_id:
        raise HTTPException(
            status_code=400,
            detail="No hay ninguna radiografía asociada a esta consulta. Debe subir una radiografía primero."
        )

    analysis = get_user_analysis(db, current_user.id, session.analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Análisis de radiografía no encontrado")
    analysis_context = build_analysis_context(analysis)

    history = get_session_history(db, session_id=payload.session_id)
    save_chat_message(db, session_id=payload.session_id, role="user", content=payload.message)

    try:
        reply_text = await chat_response(history, payload.message, analysis_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el servicio de IA: {str(e)}")

    bot_msg = save_chat_message(db, session_id=payload.session_id, role="model", content=reply_text)

    return {
        "success": True,
        "reply": reply_text,
        "message": bot_msg,
    }
