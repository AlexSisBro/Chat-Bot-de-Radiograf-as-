import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import AnalysisPanel from './components/AnalysisPanel';
import MedicalDisclaimer from './components/MedicalDisclaimer';
import { apiFetch } from './api';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('radiografia_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [linkedAnalysis, setLinkedAnalysis] = useState(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('radiografia_theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('radiografia_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('radiografia_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setLinkedAnalysis(null);
    localStorage.removeItem('radiografia_user');
  };

  useEffect(() => {
    if (!user?.access_token) return;

    const fetchSessions = async () => {
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
      }
    };

    fetchSessions();
  }, [user]);

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
    if (!user?.access_token) return;
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
      const response = await apiFetch(`/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

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

  const handleDiscussAnalysis = (analysis) => {
    setLinkedAnalysis(analysis);
  };

  const handleSendMessage = async (text) => {
    if (!activeSessionId) return;

    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
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

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const handleAnalysisSuccess = (analysisId) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, analysis_id: analysisId } : s))
    );
  };

  if (!user?.access_token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appLayout}>
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        userEmail={user.email}
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
};
