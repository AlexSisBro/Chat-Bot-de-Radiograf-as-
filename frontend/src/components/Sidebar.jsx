import React from 'react';
import { MessageSquare, Plus, LogOut, User, Activity, Trash2, Sun, Moon } from 'lucide-react';

export default function Sidebar({ sessions, activeSessionId, onSelectSession, onNewSession, userEmail, onLogout, onDeleteSession, theme, onToggleTheme }) {
  return (
    <div style={{...styles.sidebar, background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRight: '1px solid var(--glass-border)'}}>
      {/* Header */}
      <div style={styles.header}>
        <Activity size={24} color="var(--brand-primary)" />
        <span style={styles.headerText} className="gradient-text">Radiología AI</span>
      </div>

      {/* Action Button */}
      <button onClick={onNewSession} style={styles.newChatBtn}>
        <Plus size={18} />
        Nueva Consulta
      </button>

      {/* Session List */}
      <div style={styles.sessionListContainer}>
        <div style={styles.listLabel}>Historial de Consultas</div>
        <div style={styles.sessionList}>
          {sessions.length === 0 ? (
            <div style={styles.emptyList}>No hay consultas iniciadas</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  ...styles.sessionItem,
                  backgroundColor: activeSessionId === session.id ? 'var(--bg-tertiary)' : 'transparent',
                  borderColor: activeSessionId === session.id ? 'var(--session-active-border)' : 'transparent',
                }}
              >
                <MessageSquare size={16} color={activeSessionId === session.id ? 'var(--brand-primary)' : 'var(--text-muted)'} />
                <span style={styles.sessionTitle}>Consulta #{session.id}</span>
                <span style={styles.sessionDate}>
                  {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Eliminar consulta"
                  style={styles.deleteBtn}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {/* Theme toggle */}
        <button onClick={onToggleTheme} style={styles.themeBtn} title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
          {theme === 'dark' ? <Sun size={16} color="var(--accent-amber)" /> : <Moon size={16} color="var(--brand-secondary)" />}
        </button>

        <div style={styles.userInfo}>
          <User size={16} color="var(--brand-secondary)" />
          <span style={styles.userEmail} title={userEmail}>{userEmail}</span>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Cerrar Sesión">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '280px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 15px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
    padding: '0 5px',
  },
  headerText: {
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
  },
  newChatBtn: {
    width: '100%',
    padding: '12px',
    background: 'var(--new-chat-btn-bg)',
    border: '1px solid var(--new-chat-btn-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--brand-primary)',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
    marginBottom: '24px',
  },
  sessionListContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  listLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    marginBottom: '10px',
    padding: '0 5px',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingRight: '2px',
  },
  emptyList: {
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '20px',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    border: '1px solid transparent',
    color: 'var(--text-primary)',
    position: 'relative',
  },
  sessionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  sessionDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'var(--transition-fast)',
    opacity: 0.5,
  },
  footer: {
    marginTop: '20px',
    borderTop: '1px solid var(--glass-border)',
    paddingTop: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  themeBtn: {
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    padding: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'var(--transition-fast)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
    overflow: 'hidden',
  },
  userEmail: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition-fast)',
    flexShrink: 0,
  }
};
