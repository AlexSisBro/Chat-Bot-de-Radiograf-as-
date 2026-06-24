import { API_BASE_URL } from './config';

export function getStoredAuth() {
  const raw = localStorage.getItem('radiografia_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function authHeaders(extra = {}) {
  const auth = getStoredAuth();
  const headers = { ...extra };
  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }
  return headers;
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });

  if (response.status === 401) {
    localStorage.removeItem('radiografia_user');
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
