from pydantic import BaseModel, Field
from typing import Literal


class StructuredAnalysis(BaseModel):
    hallazgos_normales: list[str] = Field(default_factory=list)
    hallazgos_anormales: list[str] = Field(default_factory=list)
    diagnostico_diferencial: list[str] = Field(default_factory=list)
    urgencia: Literal["baja", "media", "alta"] = "baja"
    recomendaciones: list[str] = Field(default_factory=list)
    resumen: str = ""


ANALYSIS_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "hallazgos_normales": {"type": "array", "items": {"type": "string"}},
        "hallazgos_anormales": {"type": "array", "items": {"type": "string"}},
        "diagnostico_diferencial": {"type": "array", "items": {"type": "string"}},
        "urgencia": {"type": "string", "enum": ["baja", "media", "alta"]},
        "recomendaciones": {"type": "array", "items": {"type": "string"}},
        "resumen": {"type": "string"},
    },
    "required": [
        "hallazgos_normales",
        "hallazgos_anormales",
        "diagnostico_diferencial",
        "urgencia",
        "recomendaciones",
        "resumen",
    ],
}


def format_structured_report(data: StructuredAnalysis, patient_info: str = "") -> str:
    lines = ["INFORME DE RADIOGRAFÍA"]
    if patient_info:
        lines.append(f"Paciente: {patient_info}")
    lines.append(f"Urgencia: {data.urgencia.upper()}")
    lines.append("")
    lines.append(f"Resumen: {data.resumen}")
    lines.append("")
    lines.append("Hallazgos normales:")
    if data.hallazgos_normales:
        lines.extend(f"- {item}" for item in data.hallazgos_normales)
    else:
        lines.append("- Ninguno reportado")
    lines.append("")
    lines.append("Hallazgos anormales:")
    if data.hallazgos_anormales:
        lines.extend(f"- {item}" for item in data.hallazgos_anormales)
    else:
        lines.append("- Ninguno reportado")
    lines.append("")
    lines.append("Diagnóstico diferencial:")
    if data.diagnostico_diferencial:
        lines.extend(f"- {item}" for item in data.diagnostico_diferencial)
    else:
        lines.append("- Pendiente de correlación clínica")
    lines.append("")
    lines.append("Recomendaciones:")
    if data.recomendaciones:
        lines.extend(f"- {item}" for item in data.recomendaciones)
    else:
        lines.append("- Seguimiento clínico")
    return "\n".join(lines)
