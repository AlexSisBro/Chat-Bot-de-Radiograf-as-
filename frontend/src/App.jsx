import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import AnalysisPanel from './components/AnalysisPanel';
import MedicalDisclaimer from './components/MedicalDisclaimer';
import { apiFetch } from './api';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function App() {
  // firebaseUser: null (loading) | false (no auth) | FirebaseUser object
  const [firebaseUser, setFirebaseUser] = useState(undefined);

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [linkedAnalysis, setLinkedAnalysis] = useState(null);
  
  // ── NUEVO: Estado para controlar la carga inicial de sesiones de la API ──
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [theme, setTheme] = useState(
    () => localStorage.getItem('radiografia_theme') || 'dark'
  );

  // ── Tema ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('radiografia_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // ── Firebase Auth State ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user ?? false);
      if (!user) {
        // Limpiar estado al cerrar sesión
        setSessions([]);
        setActiveSessionId(null);
        setMessages([]);
        setLinkedAnalysis(null);
        setSessionsLoading(true); // Resetear bandera al salir
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOut(auth);
  };

  // ── Cargar sesiones al autenticarse ──────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser) return;

    const fetchSessions = async () => {
      setSessionsLoading(true); // Iniciamos carga de datos de la API
      try {
        const response = await apiFetch('/chat/sessions');
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
          if (data.length > 0) {
            setActiveSessionId(data[0].id);
          } else {
            await handleNewSession();
          }
        }
      } catch (err) {
        console.error('Error al cargar sesiones:', err);
      } finally {
        setSessionsLoading(false); // Finaliza la carga pase lo que pase
      }
    };

    fetchSessions();
  }, [firebaseUser]);

  // ── Cargar mensajes al cambiar sesión activa ──────────────────────────────
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await apiFetch(`/chat/sessions/${activeSessionId}/messages`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Error al cargar mensajes:', err);
      }
    };

    fetchMessages();
  }, [activeSessionId]);

  const handleNewSession = async () => {
    if (!firebaseUser) return;
    try {
      const response = await apiFetch('/chat/sessions', { method: 'POST' });
      if (response.ok) {
        const newSession = await response.json();
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error('Error al crear nueva consulta:', err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      const response = await apiFetch(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
            await handleNewSession();
          }
        }
      }
    } catch (err) {
      console.error('Error al eliminar consulta:', err);
    }
  };

  const handleDiscussAnalysis = (analysis) => setLinkedAnalysis(analysis);

  const handleSendMessage = async (text) => {
    if (!activeSessionId) return;

    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await apiFetch('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSessionId,
          message: text,
          analysis_id: linkedAnalysis?.id ?? null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.created_at !== userMsg.created_at);
          return [
            ...filtered,
            { role: 'user', content: text, created_at: new Date().toISOString() },
            data.message,
          ];
        });
      }
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAnalysisSuccess = (analysisId) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, analysis_id: analysisId } : s))
    );
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // ── Render ────────────────────────────────────────────────────────────────
  // MODIFICADO: Mientras se comprueba auth O se descargan las sesiones iniciales, mantenemos el Spinner de carga estable
  if (firebaseUser === undefined || (firebaseUser && sessionsLoading)) {
    return (
      <div style={styles.splashLoader}>
        <div style={styles.splashSpinner} />
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen onLogin={() => { /* onAuthStateChanged manejará el estado */ }} />;
  }

  return (
    <div style={styles.appLayout}>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        userEmail={firebaseUser.email}
        onLogout={handleLogout}
        onDeleteSession={handleDeleteSession}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <div style={styles.mainColumn}>
        <div style={styles.workspace}>
          <AnalysisPanel
            onDiscussAnalysis={handleDiscussAnalysis}
            activeSession={activeSession}
            onAnalysisSuccess={handleAnalysisSuccess}
          />
          <ChatPanel
            sessionId={activeSessionId}
            messages={messages}
            loading={chatLoading}
            onSendMessage={handleSendMessage}
            linkedAnalysis={linkedAnalysis}
            onClearLinkedAnalysis={() => setLinkedAnalysis(null)}
          />
        </div>
        <MedicalDisclaimer />
      </div>
    </div>
  );
}

const styles = {
  appLayout: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-primary)',
    transition: 'background-color 0.3s ease, color 0.3s ease',
  },
  mainColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  workspace: {
    flex: 1,
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
  },
  splashLoader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: 'var(--bg-primary)',
  },
  splashSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--glass-border)',
    borderTop: '3px solid var(--brand-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};