import { API_BASE_URL } from './config';
import { auth } from './firebase';

/**
 * Obtiene un Firebase ID Token fresco para el usuario actual.
 * Firebase renueva el token automáticamente si está próximo a expirar.
 */
async function getFirebaseToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(/* forceRefresh= */ false);
  } catch {
    return null;
  }
}

export async function authHeaders(extra = {}) {
  const token = await getFirebaseToken();
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(path, options = {}) {
  const headers = await authHeaders(options.headers || {});

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    let detail = "Token inválido o expirado";
    try {
      const errorData = await response.clone().json();
      detail = errorData.detail || detail;
    } catch (e) {}
    
    alert("Error de autenticación con el servidor:\n\n" + detail);
    
    // Token inválido: forzar cierre de sesión
    await auth.signOut();
    window.location.reload();
  }

  return response;
}

export async function fetchProtectedImage(filename) {
  if (!filename) return null;
  const response = await apiFetch(`/analyze/images/${encodeURIComponent(filename)}`);
  if (!response.ok) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
