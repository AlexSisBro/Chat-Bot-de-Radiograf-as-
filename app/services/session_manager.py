import json

from sqlalchemy.orm import Session

from app.models.orm import User, ChatSession, ChatMessage, RadiographyAnalysis
from app.models.analysis_schema import StructuredAnalysis, format_structured_report
from typing import Optional


def get_or_create_user(db: Session, email: str) -> User:
    """Retrieve an existing user by email, or create a new one (Firebase-authenticated)."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def create_chat_session(db: Session, user_id: int) -> ChatSession:
    session = ChatSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def save_chat_message(db: Session, session_id: int, role: str, content: str) -> ChatMessage:
    message = ChatMessage(session_id=session_id, role=role, content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def save_radiography_analysis(
    db: Session,
    user_id: int,
    patient_info: str,
    image_filename: str,
    image_size: str,
    image_weight: str,
    diagnosis: str,
    urgency: str,
    structured: StructuredAnalysis,
) -> RadiographyAnalysis:
    record = RadiographyAnalysis(
        user_id=user_id,
        patient_info=patient_info or "",
        image_filename=image_filename,
        image_size=image_size,
        image_weight=image_weight,
        diagnosis=diagnosis,
        urgency=urgency,
        structured_data=structured.model_dump_json(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_user_analyses(db: Session, user_id: int, limit: int = 20) -> list[RadiographyAnalysis]:
    return (
        db.query(RadiographyAnalysis)
        .filter(RadiographyAnalysis.user_id == user_id, RadiographyAnalysis.hidden == False)
        .order_by(RadiographyAnalysis.created_at.desc())
        .limit(limit)
        .all()
    )


def get_user_analysis(db: Session, user_id: int, analysis_id: int) -> Optional[RadiographyAnalysis]:
    return (
        db.query(RadiographyAnalysis)
        .filter(RadiographyAnalysis.id == analysis_id, RadiographyAnalysis.user_id == user_id)
        .first()
    )


def get_latest_user_analysis(db: Session, user_id: int) -> Optional[RadiographyAnalysis]:
    return (
        db.query(RadiographyAnalysis)
        .filter(RadiographyAnalysis.user_id == user_id)
        .order_by(RadiographyAnalysis.created_at.desc())
        .first()
    )


def build_analysis_context(analysis: RadiographyAnalysis) -> str:
    if analysis.structured_data:
        try:
            structured = StructuredAnalysis.model_validate_json(analysis.structured_data)
            return format_structured_report(structured, analysis.patient_info)
        except Exception:
            pass
    return analysis.diagnosis


def get_session_history(db: Session, session_id: int, limit: int = 15) -> list[str]:
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )

    messages.reverse()

    formatted_history = []
    for msg in messages:
        prefix = "Paciente" if msg.role == "user" else "Asistente"
        formatted_history.append(f"{prefix}: {msg.content}")

    return formatted_history
