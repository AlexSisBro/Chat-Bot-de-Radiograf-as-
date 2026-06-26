from pydantic import BaseModel, Field

from typing import Optional

class AnalyzeRequest(BaseModel):
    image_base64: str
    description: str = ""

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    id_token: str
    state: str = Field(..., min_length=16, max_length=64)

class ChatRequest(BaseModel):
    session_id: int
    message: str
    analysis_id: Optional[int] = None

class FirebaseLoginRequest(BaseModel):
    id_token: str
    username: Optional[str] = None