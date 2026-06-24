import os
import re
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.core.rate_limit import check_rate_limit
from app.models.analysis_schema import format_structured_report
from app.models.orm import User, RadiographyAnalysis, ChatSession
from app.models.response import AnalysisResponse, AnalyzeResultResponse
from app.models.serializers import serialize_analysis
from app.services.gemini_service import analyze_image_structured
from app.services.session_manager import save_radiography_analysis, get_user_analyses, get_user_analysis
from app.services.image_service import process_image, UPLOADS_DIR
from app.utils.image_validation import validate_image_upload, ALLOWED_MIME_TYPES

router = APIRouter(prefix="/analyze", tags=["📸 Radiografías"])

_PATIENT_INFO_MAX_LEN = 500
_PATIENT_INFO_SAFE_REGEX = re.compile(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.,:;()_@]{0,500}$")


def _safe_filename(filename: str) -> str:
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    return filename


def _sanitize_patient_info(info: str) -> str:
    if not info:
        return ""
    info = info.strip()[:_PATIENT_INFO_MAX_LEN]
    if not _PATIENT_INFO_SAFE_REGEX.match(info):
        return re.sub(r"[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.,:;()_@]", "", info)[:_PATIENT_INFO_MAX_LEN]
    return info


@router.post("/", response_model=AnalyzeResultResponse)
async def analyze_xray(
    request: Request,
    session_id: int = Form(..., description="ID de la sesión de consulta"),
    patient_name: str = Form(..., description="Nombre del paciente"),
    patient_surname: str = Form(..., description="Apellido del paciente"),
    patient_age: int = Form(..., description="Edad del paciente"),
    file: UploadFile = File(..., description="Archivo de imagen (JPG, PNG, GIF, BMP, WEBP, TIFF)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_rate_limit(
        request,
        scope=f"analyze:{current_user.id}",
        max_calls=settings.rate_limit_analyze_per_minute,
        window_seconds=60,
    )

    # Validar sesión y propiedad
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de consulta no encontrada")

    if session.analysis_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Esta consulta ya tiene una radiografía asociada. Cree una nueva consulta para analizar otra imagen."
        )

    patient_name = patient_name.strip()
    patient_surname = patient_surname.strip()
    if not patient_name or not patient_surname:
        raise HTTPException(status_code=400, detail="Nombre y Apellido son campos obligatorios")
    if patient_age < 0:
        raise HTTPException(status_code=400, detail="La edad debe ser un número positivo")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos de imagen: JPG, PNG, GIF, BMP, WEBP, TIFF."
        )

    contents = await file.read()

    try:
        validate_image_upload(file.filename, file.content_type, contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    safe_patient_info = f"Nombre: {patient_name}, Apellido: {patient_surname}, Edad: {patient_age} años"

    try:
        image_b64, saved_filename, image_meta = process_image(contents, file.filename, file.content_type)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "El archivo no es una imagen válida o está dañado")

    image_size = image_meta["size"]
    structured = await analyze_image_structured(image_b64, safe_patient_info, image_size)
    diagnosis_text = format_structured_report(structured, safe_patient_info)

    record = save_radiography_analysis(
        db,
        user_id=current_user.id,
        patient_info=safe_patient_info,
        image_filename=saved_filename,
        image_size=image_meta["size"],
        image_weight=image_meta["processed"],
        diagnosis=diagnosis_text,
        urgency=structured.urgencia,
        structured=structured,
    )

    # Vincular a la sesión
    session.analysis_id = record.id
    db.commit()
    db.refresh(session)

    return {
        "success": True,
        "analysis_id": record.id,
        "image": image_meta,
        "patient_info": safe_patient_info,
        "diagnosis": diagnosis_text,
        "urgency": structured.urgencia,
        "structured": structured.model_dump(),
    }


@router.get("/history", response_model=List[AnalysisResponse])
def get_analysis_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = get_user_analyses(db, user_id=current_user.id)
    return [serialize_analysis(record) for record in records]


@router.get("/images/{filename}")
def get_analysis_image(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    safe_name = _safe_filename(filename)

    record = (
        db.query(RadiographyAnalysis)
        .filter(
            RadiographyAnalysis.image_filename == safe_name,
            RadiographyAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    file_path = os.path.join(UPLOADS_DIR, safe_name)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Archivo no disponible")

    return FileResponse(file_path, media_type="image/jpeg", filename=safe_name)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis_detail(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_user_analysis(db, current_user.id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    return serialize_analysis(record)


@router.patch("/history/{analysis_id}/hide", response_model=AnalysisResponse)
def hide_analysis(
    analysis_id: int,
    hidden: bool = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_user_analysis(db, current_user.id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    record.hidden = bool(hidden)
    db.commit()
    db.refresh(record)
    return serialize_analysis(record)


@router.delete("/history/{analysis_id}")
def delete_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_user_analysis(db, current_user.id, analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")

    # Prevent deletion if linked to an active chat session
    linked_session = db.query(ChatSession).filter(ChatSession.analysis_id == analysis_id).first()
    if linked_session:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la radiografía porque está vinculada a una sesión de chat. Elimine la sesión primero."
        )

    # attempt to remove stored image
    try:
        file_path = os.path.join(UPLOADS_DIR, record.image_filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
    except Exception:
        pass

    db.delete(record)
    db.commit()

    return {"success": True, "message": f"Análisis #{analysis_id} eliminado correctamente"}