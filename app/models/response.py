from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    id: int
    email: str
    access_token: str
    token_type: str = "bearer"

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    analysis_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    success: bool
    reply: str
    message: ChatMessageResponse


class StructuredAnalysisResponse(BaseModel):
    hallazgos_normales: list[str]
    hallazgos_anormales: list[str]
    diagnostico_diferencial: list[str]
    urgencia: str
    recomendaciones: list[str]
    resumen: str


class AnalysisResponse(BaseModel):
    id: int
    patient_info: str
    image_filename: str
    image_size: str
    image_weight: str
    diagnosis: str
    urgency: str = "baja"
    structured: Optional[StructuredAnalysisResponse] = None
    hidden: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class AnalyzeResultResponse(BaseModel):
    success: bool
    analysis_id: int
    image: dict
    patient_info: str
    diagnosis: str
    urgency: str
    structured: StructuredAnalysisResponse
