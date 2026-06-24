export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
];

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];

export const IMAGE_ACCEPT =
  '.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif,image/jpeg,image/png,image/gif,image/bmp,image/webp,image/tiff';

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;

const BLOCKED_TYPE_PREFIXES = ['application/', 'text/', 'video/', 'audio/'];

export function validateImageFile(file) {
  if (!file) {
    return { ok: false, error: 'No se seleccionó ningún archivo.' };
  }

  const name = file.name || '';
  const extension = name.includes('.') ? `.${name.split('.').pop().toLowerCase()}` : '';

  if (extension && !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      error: `Extensión no permitida (${extension}). Solo imágenes: JPG, PNG, GIF, BMP, WEBP, TIFF.`,
    };
  }

  const mime = (file.type || '').toLowerCase();
  if (mime) {
    if (BLOCKED_TYPE_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
      return { ok: false, error: 'Solo se permiten archivos de imagen. No PDF ni documentos.' };
    }
    if (!mime.startsWith('image/') || !ALLOWED_IMAGE_TYPES.includes(mime)) {
      return {
        ok: false,
        error: 'Formato no soportado. Use JPG, PNG, GIF, BMP, WEBP o TIFF.',
      };
    }
  } else if (!extension) {
    return { ok: false, error: 'No se pudo identificar el formato. Use una imagen válida.' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: 'La imagen supera el tamaño máximo permitido (15 MB).' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'El archivo está vacío.' };
  }

  return { ok: true };
}
