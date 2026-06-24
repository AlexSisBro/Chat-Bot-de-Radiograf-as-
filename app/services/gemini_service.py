import json

import google.generativeai as genai

from app.core.config import settings
from app.models.analysis_schema import ANALYSIS_JSON_SCHEMA, StructuredAnalysis, format_structured_report

genai.configure(api_key=settings.gemini_api_key)

MEDICAL_SYSTEM_INSTRUCTION = """Eres un asistente clínico de apoyo en radiología y medicina general.
Responde en español, con claridad y empatía.
REGLA CRÍTICA: Solo debes responder preguntas que estén relacionadas directamente con la radiografía analizada provista en el CONTEXTO y sus detalles clínicos.
Si el usuario hace preguntas ajenas a la radiografía o intenta hablar de otros temas no relacionados con este análisis clínico, responde amablemente indicando que solo estás autorizado para hablar sobre la radiografía de esta consulta.
No sustituyes el diagnóstico de un médico: indica siempre que la evaluación presencial es necesaria.
Si detectas urgencia, recomienda atención inmediata."""

chat_model = genai.GenerativeModel(settings.gemini_model, system_instruction=MEDICAL_SYSTEM_INSTRUCTION)

vision_generation_config = genai.GenerationConfig(
    response_mime_type="application/json",
    response_schema=ANALYSIS_JSON_SCHEMA,
)
vision_model = genai.GenerativeModel(
    settings.gemini_model,
    generation_config=vision_generation_config,
)


async def analyze_image_structured(image_base64: str, patient_info: str, image_size: str) -> StructuredAnalysis:
    prompt = f"""Analiza esta radiografía médica como radiólogo experto.
Paciente: {patient_info or 'No especificado'}
Dimensiones: {image_size}

Responde únicamente en JSON con hallazgos_normales, hallazgos_anormales, diagnostico_diferencial,
urgencia (baja/media/alta), recomendaciones y resumen breve en español."""

    response = vision_model.generate_content([
        prompt,
        {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}},
    ])

    try:
        payload = json.loads(response.text)
        return StructuredAnalysis.model_validate(payload)
    except Exception:
        return StructuredAnalysis(
            hallazgos_anormales=["No se pudo estructurar el análisis automáticamente"],
            resumen=response.text[:500] if response.text else "Análisis no disponible",
            urgencia="media",
            recomendaciones=["Consultar con un radiólogo presencialmente"],
        )


async def chat_response(
    session_history: list[str],
    new_message: str,
    analysis_context: str | None = None,
) -> str:
    parts = []
    if analysis_context:
        parts.append(
            "CONTEXTO DE RADIOGRAFÍA VINCULADA AL CHAT (usa esta información para responder):\n"
            f"{analysis_context}"
        )
    if session_history:
        parts.append("HISTORIAL DE CONVERSACIÓN:\n" + "\n".join(session_history[-10:]))
    parts.append(f"Paciente: {new_message}")

    response = chat_model.generate_content("\n\n".join(parts))
    return response.text
