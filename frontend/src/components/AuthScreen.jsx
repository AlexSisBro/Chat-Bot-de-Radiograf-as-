import React, { useState, useEffect } from 'react';
import {
  Activity, Key, Mail, User as UserIcon, ArrowRight, Loader2, AlertCircle, Sun, Moon,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from 'firebase/auth';

export default function AuthScreen({ onLogin }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('radiografia_theme') || 'dark'
  );

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('radiografia_theme', theme);
  }, [theme]);

  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Email / Password ──────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isRegistering && !username.trim()) {
      setError('Por favor, ingresa un nombre de usuario.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let credential;
      if (isRegistering) {
        credential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        await updateProfile(credential.user, { displayName: username.trim() });
      } else {
        credential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      }
      onLogin(credential.user);
    } catch (err) {
      console.error("Error en Email/Password Auth:", err);
      setError(mapFirebaseError(err));
      alert("Error de Email/Password Auth:\n\n" + (err.message || err.code || err));
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In (Popup con Fallback a Redirección) ─────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      // 1. Intentar Popup (Recomendado para localhost)
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        onLogin(result.user);
      }
    } catch (err) {
      console.warn("Popup bloqueado o falló, intentando redirección...", err);
      // 2. Si falla por políticas restrictivas del navegador, usar Redirección
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error("Error en Google Sign-In:", redirectErr);
        setError(mapFirebaseError(redirectErr));
        alert("Error de Google Auth:\n\n" + (redirectErr.message || redirectErr.code || redirectErr));
        setGoogleLoading(false);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navBrand}>
          <Activity size={22} color="var(--brand-primary)" style={{ marginRight: '8px' }} />
          <span style={styles.navBrandText} className="gradient-text">Radiología ChatBot</span>
        </div>
        <div style={styles.navActions}>
          <button
            type="button"
            onClick={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))}
            style={styles.navThemeToggle}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark'
              ? <Sun size={18} color="var(--accent-amber)" />
              : <Moon size={18} color="var(--brand-secondary)" />}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={styles.contentLayout}>
        {/* Columna izquierda — descripción */}
        <div style={styles.infoColumn}>
          <h2 style={styles.infoTitle}>
            Diagnóstico de Radiografías{' '}
            <span className="gradient-text">por Inteligencia Artificial</span>
          </h2>
          <p style={styles.infoDescription}>
            Plataforma clínica avanzada que integra modelos de aprendizaje profundo para el análisis
            inmediato de imágenes radiológicas y asistencia interactiva en la toma de decisiones médicas.
          </p>

          <div style={styles.featureList}>
            {[
              {
                icon: <Activity size={20} color="var(--brand-primary)" />,
                title: 'Análisis Radiológico Instantáneo',
                text: 'Interpretación inteligente de imágenes para generar reportes estructurados de hallazgos y niveles de urgencia.',
              },
              {
                icon: <Key size={20} color="var(--brand-primary)" />,
                title: 'Asistente Clínico AI',
                text: 'Chatbot de última generación que responde preguntas y ofrece recomendaciones contextualizadas al diagnóstico.',
              },
              {
                icon: <Mail size={20} color="var(--brand-primary)" />,
                title: 'Acceso Seguro',
                text: 'Autenticación avanzada que protege el acceso a tus consultas y reportes médicos.',
              },
            ].map(({ icon, title, text }) => (
              <div key={title} style={styles.featureItem}>
                <div style={styles.featureIconWrapper}>{icon}</div>
                <div>
                  <h4 style={styles.featureTitle}>{title}</h4>
                  <p style={styles.featureText}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha — tarjeta de auth */}
        <div style={styles.cardColumn}>
          <div className="glass-panel" style={styles.card}>
            <div style={styles.logoContainer}>
              <h1 style={styles.title}>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h1>
              <p style={styles.subtitle}>Portal de Asistencia y Diagnóstico por Inteligencia Artificial</p>
            </div>

            {/* ─── Google Sign-In ─── */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={styles.googleBtn}
            >
              {googleLoading ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <GoogleIcon />
              )}
              <span>{googleLoading ? 'Conectando con Google…' : 'Continuar con Google'}</span>
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>o con tu correo</span>
              <span style={styles.dividerLine} />
            </div>

            {/* ─── Formulario Email / Password ─── */}
            <form onSubmit={handleSubmit} style={styles.form}>
              {isRegistering && (
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Usuario</label>
                  <div style={styles.inputWrapper}>
                    <UserIcon size={18} color="var(--text-muted)" style={styles.inputIcon} />
                    <input
                      type="text"
                      placeholder="Nombre de usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      style={styles.textInput}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={styles.inputGroup}>
                <label style={styles.label}>Correo Electrónico</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} color="var(--text-muted)" style={styles.inputIcon} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={styles.textInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña</label>
                <div style={styles.inputWrapper}>
                  <Key size={18} color="var(--text-muted)" style={styles.inputIcon} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={styles.textInput}
                    required
                  />
                </div>
              </div>

              {error && (
                <div style={styles.error}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading || googleLoading} style={styles.submitBtn}>
                {loading ? (
                  <><Loader2 size={18} className="spinner" /> Procesando…</>
                ) : (
                  <>{isRegistering ? 'Registrarse' : 'Ingresar'}<ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div style={styles.switchModeContainer}>
              <span style={styles.switchModeText}>
                {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta aún?'}
              </span>
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                style={styles.switchModeBtn}
              >
                {isRegistering ? 'Inicia Sesión' : 'Regístrate aquí'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ── Mapeo de errores de Firebase ─────────────────────────────────────────────
function mapFirebaseError(err) {
  const map = {
    'auth/email-already-in-use': 'El correo electrónico ya está registrado.',
    'auth/invalid-email': 'El correo electrónico no es válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-credential': 'Correo electrónico o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
    'auth/popup-blocked': 'El navegador bloqueó el popup. Permite ventanas emergentes e intenta de nuevo.',
    'auth/cancelled-popup-request': 'La operación fue cancelada.',
  };
  return map[err.code] || err.message || 'Ocurrió un error en la autenticación.';
}

// ── Estilos ──────────────────────────────────────────────────────────────────
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
  navBrand: { display: 'flex', alignItems: 'center' },
  navBrandText: { fontSize: '18px', fontWeight: '700', letterSpacing: '-0.02em' },
  navActions: { display: 'flex', alignItems: 'center', gap: '8px' },
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
  featureList: { display: 'flex', flexDirection: 'column', gap: '20px' },
  featureItem: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
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
  featureTitle: { fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' },
  featureText: { fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' },
  cardColumn: { flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: '320px' },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '36px',
    borderRadius: 'var(--radius-lg)',
    animation: 'fadeIn 0.5s ease-out',
    textAlign: 'center',
  },
  logoContainer: { marginBottom: '24px' },
  title: { fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '13px 16px',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    marginBottom: '4px',
  },
  divider: {
    margin: '20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--glass-border)',
  },
  dividerText: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '14px' },
  textInput: {
    width: '100%',
    padding: '14px 16px 14px 44px',
    background: 'var(--input-field-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  submitBtn: {
    marginTop: '10px',
    padding: '14px',
    background: 'var(--brand-gradient)',
    color: 'var(--brand-btn-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--accent-rose)',
    fontSize: '13px',
    background: 'var(--error-bg)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '3px solid var(--accent-rose)',
  },
  switchModeContainer: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  switchModeText: { fontSize: '13px', color: 'var(--text-muted)' },
  switchModeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--brand-primary)',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
