import React, { useState, useEffect } from 'react';
import { Activity, Key, Mail, ArrowRight, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

export default function AuthScreen({ onLogin }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('radiografia_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('radiografia_theme', theme);
  }, [theme]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { buttonRef, enabled: googleEnabled, loading: googleLoading, error: googleError } = useGoogleAuth({
    onLogin,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    const endpoint = isRegistering ? '/chat/register' : '/chat/login';

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocurrió un error en la autenticación.');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message || 'Error de conexión. Asegúrate de que el backend esté ejecutándose.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Barra superior redondeada (cápsula) */}
      <div style={styles.navbar}>
        <div style={styles.navBrand}>
          <Activity size={22} color="var(--brand-primary)" style={{ marginRight: '8px' }} />
          <span style={styles.navBrandText} className="gradient-text">Radiología ChatBot</span>
        </div>
        <div style={styles.navActions}>
          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            style={styles.navThemeToggle}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} color="var(--accent-amber)" /> : <Moon size={18} color="var(--brand-secondary)" />}
          </button>
        </div>
      </div>

      {/* Contenedor principal del Layout de pantalla dividida */}
      <div style={styles.contentLayout}>
        {/* Columna izquierda - Descripción de la aplicación */}
        <div style={styles.infoColumn}>
          <h2 style={styles.infoTitle}>
            Diagnóstico de Radiografías <span className="gradient-text">por Inteligencia Artificial</span>
          </h2>
          <p style={styles.infoDescription}>
            Plataforma clínica avanzada que integra modelos de aprendizaje profundo para el análisis inmediato de imágenes radiológicas y asistencia interactiva en la toma de decisiones médicas.
          </p>

          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <div style={styles.featureIconWrapper}>
                <Activity size={20} color="var(--brand-primary)" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Análisis Radiológico Instantáneo</h4>
                <p style={styles.featureText}>Interpretación inteligente de imágenes para generar reportes estructurados de hallazgos y niveles de urgencia.</p>
              </div>
            </div>

            <div style={styles.featureItem}>
              <div style={styles.featureIconWrapper}>
                <Key size={20} color="var(--brand-primary)" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Asistente Clínico AI</h4>
                <p style={styles.featureText}>Chatbot de última generación que responde preguntas y ofrece recomendaciones contextualizadas al diagnóstico.</p>
              </div>
            </div>

            <div style={styles.featureItem}>
              <div style={styles.featureIconWrapper}>
                <Mail size={20} color="var(--brand-primary)" />
              </div>
              <div>
                <h4 style={styles.featureTitle}>Acceso Seguro</h4>
                <p style={styles.featureText}>Autenticación mediante Google OAuth que asegura el acceso controlado exclusivo al personal médico.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Tarjeta de inicio de sesión */}
        <div style={styles.cardColumn}>
          <div className="glass-panel" style={styles.card}>
            <div style={styles.logoContainer}>
              <h1 style={styles.title}>
                Iniciar Sesión
              </h1>
              <p style={styles.subtitle}>Portal de Asistencia y Diagnóstico por Inteligencia Artificial</p>
            </div>

            <div style={{marginBottom: '20px'}}>
              <p style={{color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center'}}>
                Registro e inicio de sesión seguro con tu cuenta de Google.
              </p>
            </div>

            <div style={styles.googleSection}>
              {googleLoading && (
                <div style={styles.googleLoading}>
                  <Loader2 size={18} className="spinner" />
                  <span>Verificando con Google...</span>
                </div>
              )}
              <div ref={buttonRef} style={styles.googleButtonHost} />
              {!googleEnabled && !googleLoading && (
                <div style={styles.googleHintBox}>
                  <p style={styles.googleHintTitle}>Google OAuth no configurado</p>
                  <ol style={styles.googleHintList}>
                    <li>
                      Crea un ID de cliente OAuth en{' '}
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={styles.link}>
                        Google Cloud Console
                      </a>
                      {' '}(tipo: Aplicación web).
                    </li>
                    <li>
                      En <strong>Orígenes autorizados</strong> agrega: <code style={styles.code}>http://localhost:5173</code> y{' '}
                      <code style={styles.code}>http://127.0.0.1:5173</code>
                    </li>
                    <li>
                      Copia el Client ID en <code style={styles.code}>.env</code> del backend:
                      <br />
                      <code style={styles.codeBlock}>GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com</code>
                    </li>
                    <li>Reinicia el backend (uvicorn).</li>
                  </ol>
                  <p style={styles.googleHintNote}>Configura Google OAuth en el backend para habilitar el botón.</p>
                </div>
              )}
              {googleError && (
                <div style={styles.error}>
                  <AlertCircle size={16} />
                  <span>{googleError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    background: 'var(--auth-bg-gradient)',
    padding: '20px',
    boxSizing: 'border-box',
    gap: '20px',
    overflowY: 'auto',
  },
  navbar: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '50px',
    padding: '10px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
  },
  navBrandText: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  navThemeToggle: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'var(--transition-fast)',
  },
  contentLayout: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    width: '100%',
    gap: '40px',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px 20px 20px',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },
  infoColumn: {
    flex: 1.2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'left',
    minWidth: '320px',
    animation: 'fadeIn 0.5s ease-out',
  },
  infoTitle: {
    fontSize: '36px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    marginBottom: '20px',
    letterSpacing: '-0.02em',
  },
  infoDescription: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  featureItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  featureIconWrapper: {
    background: 'var(--logo-bg)',
    border: '1px solid var(--logo-border)',
    borderRadius: '12px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  featureText: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  cardColumn: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    minWidth: '320px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '36px',
    borderRadius: 'var(--radius-lg)',
    animation: 'fadeIn 0.5s ease-out',
    textAlign: 'center',
  },
  logoContainer: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  googleSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    minHeight: '44px',
  },
  googleButtonHost: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '44px',
  },
  googleLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  googleHintBox: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    textAlign: 'left',
    background: 'var(--meta-box-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    width: '100%',
  },
  googleHintTitle: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    fontSize: '13px',
  },
  googleHintList: {
    margin: '0 0 8px 18px',
    padding: 0,
  },
  googleHintNote: {
    margin: 0,
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--brand-secondary)',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '11px',
    background: 'var(--secondary-btn-bg)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  codeBlock: {
    display: 'inline-block',
    marginTop: '6px',
    fontFamily: 'monospace',
    fontSize: '11px',
    background: 'var(--secondary-btn-bg)',
    padding: '6px 8px',
    borderRadius: '4px',
    wordBreak: 'break-all',
  },
};
