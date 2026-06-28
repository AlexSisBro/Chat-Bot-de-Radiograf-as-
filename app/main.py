from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import firebase_admin
from firebase_admin import credentials

from app.core.config import settings
from app.core.database import engine, run_sqlite_migrations
from app.models.orm import Base
from app.api.v1.endpoints import analyze, chat, health

# 1. Definimos la app UNA SOLA VEZ
app = FastAPI(title="Radiografia Chat Bot", version="1.1")

# 2. Inicialización de Firebase
@app.on_event("startup")
async def startup_event():
    if not firebase_admin._apps:
        # Asegúrate de que el archivo firebase-key.json esté en la raíz de C:\Proyetos\Radiografia-ChatBot\
        cred = credentials.Certificate("firebase-key.json")
        firebase_admin.initialize_app(cred)
        print("Firebase inicializado correctamente")

# 3. Base de datos
Base.metadata.create_all(bind=engine)
run_sqlite_migrations()

# 4. Configuración de CORS
if settings.environment == "production":
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["Authorization", "Content-Type", "Accept"]
else:
    allow_methods = ["*"]
    allow_headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=allow_methods,
    allow_headers=allow_headers,
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if settings.environment == "production" and exc.status_code >= 500:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": "Error interno del servidor"},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    if settings.environment == "production":
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Datos de entrada inválidos"},
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if settings.environment == "production":
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor"},
        )
    raise exc


app.include_router(analyze.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Radiología ChatBot",
        "status": "online",
        "docs": "/docs",
    }
