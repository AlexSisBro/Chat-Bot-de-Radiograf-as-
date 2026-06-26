from pydantic import BaseModel

from typing import Optional

class AnalyzeRequest(BaseModel):
    image_base64: str
    description: str = ""

class ChatRequest(BaseModel):
    session_id: int
    message: str
    analysis_id: Optional[int] = None