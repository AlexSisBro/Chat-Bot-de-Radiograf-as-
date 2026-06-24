from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import engine
from app.core.deps import get_db
from app.models.orm import User, ChatSession, ChatMessage

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    chat_count = db.query(ChatSession).count()
    msg_count = db.query(ChatMessage).count()
    
    return {
        "status": "Radiología ChatBot ✅",
        "database": "OK",
        "users": user_count,
        "chats": chat_count,
        "messages": msg_count,
        "gemini_model": "Listo para usar"
    }