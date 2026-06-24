import os
import io
from PIL import Image

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/tiff",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"}

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_DIMENSION = 8192  # pixels

BLOCKED_MIME_PREFIXES = ("application/", "text/", "video/", "audio/", "model/")


def _has_image_magic(data: bytes) -> bool:
    if len(data) < 12:
        return False
    if data[:3] == b"\xff\xd8\xff":
        return True
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return True
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return True
    if data[:2] == b"BM":
        return True
    if data[:4] in (b"II*\x00", b"MM\x00*"):
        return True
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False


def _validate_dimensions(image: Image.Image) -> tuple[int, int]:
    width, height = image.size
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise ValueError(f"Dimensiones exceden el máximo permitido ({MAX_DIMENSION}px).")
    if width == 0 or height == 0:
        raise ValueError("Imagen con dimensiones inválidas.")
    return width, height


def validate_image_upload(filename: str | None, content_type: str | None, contents: bytes) -> tuple[int, int, str]:
    if not contents:
        raise ValueError("El archivo está vacío.")

    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise ValueError("La imagen supera el tamaño máximo permitido (15 MB).")

    extension = os.path.splitext(filename or "")[1].lower()
    if extension and extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Extensión no permitida ({extension}). Solo imágenes: JPG, PNG, GIF, BMP, WEBP, TIFF."
        )

    mime = (content_type or "").lower().strip()
    if mime:
        if any(mime.startswith(prefix) for prefix in BLOCKED_MIME_PREFIXES):
            raise ValueError("Tipo de archivo no permitido. Solo se aceptan imágenes.")
        if mime.startswith("image/") and mime not in ALLOWED_MIME_TYPES:
            raise ValueError("Formato de imagen no soportado. Use JPG, PNG, GIF, BMP, WEBP o TIFF.")
        if not mime.startswith("image/"):
            raise ValueError("Tipo de archivo no permitido. Solo se aceptan imágenes.")

    if not extension and not mime.startswith("image/"):
        raise ValueError("Solo se permiten archivos de imagen.")

    if not _has_image_magic(contents):
        raise ValueError("El contenido del archivo no corresponde a una imagen válida.")

    try:
        image = Image.open(io.BytesIO(contents))
        image.verify()
        image = Image.open(io.BytesIO(contents))
        width, height = _validate_dimensions(image)
        original_mode = image.mode
        return width, height, original_mode
    except ValueError:
        raise
    except Exception:
        raise ValueError("El archivo no es una imagen válida o está dañado.")
