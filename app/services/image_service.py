import base64
import io
import os
import uuid
from datetime import datetime
from typing import Tuple

from PIL import Image

from app.core.config import settings
from app.utils.image_validation import validate_image_upload


UPLOADS_DIR = os.path.join("app", "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

MAX_DIMENSION = 2048
JPEG_QUALITY = 90


def process_image(contents: bytes, filename: str, content_type: str) -> Tuple[str, str, dict]:
    width, height, original_mode = validate_image_upload(filename, content_type, contents)

    image = Image.open(io.BytesIO(contents))

    if image.mode != "RGB":
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        else:
            image = image.convert("RGB")

    if max(width, height) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(width, height)
        new_size = (int(width * ratio), int(height * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    saved_filename = f"{timestamp}_{unique_id}.jpg"
    save_path = os.path.join(UPLOADS_DIR, saved_filename)

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    jpeg_bytes = output.getvalue()

    image.save(save_path, format="JPEG", quality=JPEG_QUALITY, optimize=True)

    image_b64 = base64.b64encode(jpeg_bytes).decode()
    image_size = f"{width}x{height}"

    meta = {
        "original": f"{len(contents) / 1024:.1f}KB",
        "processed": f"{len(jpeg_bytes) / 1024:.1f}KB",
        "size": image_size,
        "converted_from": original_mode,
        "saved_as": saved_filename,
    }

    return image_b64, saved_filename, meta