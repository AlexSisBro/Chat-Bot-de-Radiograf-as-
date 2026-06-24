import json

from app.models.analysis_schema import StructuredAnalysis
from app.models.orm import RadiographyAnalysis
from app.models.response import AnalysisResponse, StructuredAnalysisResponse


def serialize_analysis(record: RadiographyAnalysis) -> AnalysisResponse:
    structured = None
    if record.structured_data:
        try:
            data = StructuredAnalysis.model_validate_json(record.structured_data)
            structured = StructuredAnalysisResponse(**data.model_dump())
        except (json.JSONDecodeError, ValueError):
            structured = None

    return AnalysisResponse(
        id=record.id,
        patient_info=record.patient_info or "",
        image_filename=record.image_filename,
        image_size=record.image_size or "",
        image_weight=record.image_weight or "",
        diagnosis=record.diagnosis,
        urgency=record.urgency or "baja",
        structured=structured,
        hidden=bool(getattr(record, 'hidden', False)),
        created_at=record.created_at,
    )
