# Radiografía Chat Bot

Portal médico con chat clínico asistido por IA y análisis de radiografías usando Google Gemini.

## Requisitos

- Python 3.11+
- Node.js 18+
- Clave de API de [Google AI Studio](https://aistudio.google.com/apikey)

## Configuración

1. Copia el archivo de entorno:

```bash
copy .env.example .env
```

2. Edita `.env` y agrega tu `GEMINI_API_KEY` y `GOOGLE_CLIENT_ID` (para OAuth).

### Google OAuth (opcional)

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crea un proyecto.
2. Configura la pantalla de consentimiento OAuth (usuarios externos si aplica).
3. Crea credenciales **OAuth 2.0 → ID de cliente → Aplicación web**.
4. En **Orígenes autorizados de JavaScript** agrega:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
5. Copia el **Client ID** a `.env` como `GOOGLE_CLIENT_ID=...`
6. Reinicia backend y frontend.

## Backend (FastAPI)

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Importante:** usa siempre el Python del `venv`. Si ves `ModuleNotFoundError`, no estás en el entorno virtual.

Atajo en Windows: doble clic en `run-backend.bat` o:

```powershell
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

API disponible en `http://127.0.0.1:8000` — documentación en `/docs`.

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`.

Opcional: crea `frontend/.env` con:

```
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## Funciones

- Registro e inicio de sesión con JWT
- Inicio de sesión con Google OAuth (verificación real del ID token)
- Chat clínico con historial por sesiones
- Subida y análisis de radiografías (solo imágenes: JPG, PNG, GIF, BMP, WEBP, TIFF, máx. 15 MB)
- Historial de análisis guardado por usuario (respuesta estructurada JSON)
- Imágenes protegidas con autenticación JWT
- Chat vinculado a análisis de radiografía
- Rate limiting en análisis y mensajes de chat
- Tema claro y oscuro

## Aviso

Esta herramienta es de apoyo educativo. No sustituye el diagnóstico de un profesional de la salud.
