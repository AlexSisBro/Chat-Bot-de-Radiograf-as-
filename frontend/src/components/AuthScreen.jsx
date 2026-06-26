import React, { useState, useEffect } from 'react';
import { Activity, Key, Mail, User as UserIcon, ArrowRight, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

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

  const [username, setUsername] = useState('');
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
    if (isRegistering && !username.trim()) {
      setError('Por favor, ingresa un nombre de usuario.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let userCredential;
      if (isRegistering) {
        // 1. Crear usuario en Firebase
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        // 2. Guardar el nombre de usuario en el perfil de Firebase
        await updateProfile(userCredential.user, {
          displayName: username.trim()
        });
      } else {
        // Iniciar sesión en Firebase
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      }

      // 3. Obtener el Firebase ID Token
      const idToken = await userCredential.user.getIdToken();

      // 4. Enviar el ID Token al backend para obtener la sesión local
      const response = await fetch(`${API_BASE_URL}/chat/firebase-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
          username: isRegistering ? username.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al sincronizar sesión con el servidor.');
      }

      onLogin(data);
    } catch (err) {
      // Formatear errores comunes de Firebase
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'El correo electrónico ya está registrado.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El correo electrónico no es válido.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Correo electrónico o contraseña incorrectos.';
      }
      setError(msg || 'Ocurrió un error en la autenticación.');
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
                <p style={styles.featureText}>Autenticación avanzada que protege el acceso a tus consultas y reportes médicos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Tarjeta de inicio de sesión / Registro */}
        <div style={styles.cardColumn}>
          <div className="glass-panel" style={styles.card}>
            <div style={styles.logoContainer}>
              <h1 style={styles.title}>
                {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h1>
              <p style={styles.subtitle}>Portal de Asistencia y Diagnóstico por Inteligencia Artificial</p>
            </div>

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

              <button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    Procesando...
                  </>
                ) : (
                  <>
                    {isRegistering ? 'Registrarse' : 'Ingresar'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerText}>o continuar con</span>
            </div>

            {/* Google OAuth Option */}
            <div style={styles.googleSection}>
              {googleLoading && (
                <div style={styles.googleLoading}>
                  <Loader2 size={18} className="spinner" />
                  <span>Verificando con Google...</span>
                </div>
              )}
              <div ref={buttonRef} style={styles.googleButtonHost} />
              {googleError && (
                <div style={styles.error}>
                  <AlertCircle size={16} />
                  <span>{googleError}</span>
                </div>
              )}
            </div>

            {/* Cambiar de Modo (Login/Registro) */}
            <div style={styles.switchModeContainer}>
              <span style={styles.switchModeText}>
                {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta aún?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
  },
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
  divider: {
    margin: '20px 0',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerText: {
    background: 'var(--bg-secondary)',
    padding: '0 10px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    zIndex: 1,
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
  switchModeText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  switchModeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--brand-primary)',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
};
