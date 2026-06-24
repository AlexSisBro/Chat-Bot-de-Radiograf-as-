import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config';

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existing = document.querySelector('script[data-google-gsi]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el servicio de Google'));
    document.head.appendChild(script);
  });
}

export function useGoogleAuth({ onLogin }) {
  const buttonRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onLoginRef = useRef(onLogin);
  const [oauthState, setOauthState] = useState('');

  useEffect(() => {
    onLoginRef.current = onLogin;
  }, [onLogin]);

  const fetchOAuthState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/auth/google-state`);
      if (res.ok) {
        const data = await res.json();
        setOauthState(data.state || '');
      }
    } catch {
      // Silently fail, will retry on next attempt
    }
  }, []);

  useEffect(() => {
    fetchOAuthState();
    const interval = setInterval(fetchOAuthState, 300000); // Refresh state every 5 min
    return () => clearInterval(interval);
  }, [fetchOAuthState]);

  const handleCredential = useCallback(async (response) => {
    if (!response?.credential) {
      setError('No se recibió credencial de Google.');
      return;
    }

    if (!oauthState) {
      setError('Estado de seguridad no disponible. Intente de nuevo.');
      await fetchOAuthState();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/chat/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential, state: oauthState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error al autenticar con Google.');
      }

      // Fetch new state for next login
      await fetchOAuthState();
      onLoginRef.current(data);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google.');
      await fetchOAuthState();
    } finally {
      setLoading(false);
    }
  }, [oauthState, fetchOAuthState]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const configRes = await fetch(`${API_BASE_URL}/chat/auth/google-config`);
        if (!configRes.ok) return;

        const config = await configRes.json();
        if (!config.enabled || !config.client_id) return;

        await loadGoogleScript();
        if (cancelled || !buttonRef.current) return;

        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        if (cancelled || !buttonRef.current) return;

        const hostWidth = Math.floor(buttonRef.current.getBoundingClientRect().width) || 348;

        window.google.accounts.id.initialize({
          client_id: config.client_id,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
          locale: 'es',
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(hostWidth, 400),
          locale: 'es',
        });

        if (!cancelled) setEnabled(true);
      } catch {
        if (!cancelled) setError('Google Sign-In no está disponible.');
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [handleCredential]);

  return { buttonRef, enabled, loading, error, setError };
}
