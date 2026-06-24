import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, FileImage } from 'lucide-react';
import { getUrgencyStyle } from './StructuredReport';

export default function ChatPanel({
  sessionId,
  messages,
  loading,
  onSendMessage,
  linkedAnalysis,
  onClearLinkedAnalysis,
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Render text with basic markdown formatting (**bold**, newlines)
  const formatMessageText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      // Reemplazar **negrita** por <strong>negrita</strong>
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const formattedLine = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} style={{ color: 'var(--brand-primary)', fontWeight: '700' }}>{part}</strong>;
        }
        return part;
      });

      // Manejar viñetas
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li key={idx} style={{ marginLeft: '20px', marginBottom: '4px', listStyleType: 'disc' }}>
            {formattedLine.slice(1)}
          </li>
        );
      }

      return (
        <p key={idx} style={{ marginBottom: '8px', lineHeight: '1.6' }}>
          {formattedLine}
        </p>
      );
    });
  };

  if (!sessionId) {
    return (
      <div style={styles.emptyState}>
        <Bot size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h3>No hay sesión de chat activa</h3>
        <p>Selecciona una consulta en la barra lateral o crea una nueva para comenzar.</p>
      </div>
    );
  }

  return (
    <div style={styles.chatContainer}>
      {/* Header */}
      <div style={styles.chatHeader}>
        <div>
          <h2 style={styles.chatTitle}>Asistente Clínico AI</h2>
          <div style={styles.chatSubtitle}>
            {linkedAnalysis ? 'Consulta vinculada a radiografía' : 'Listo para responder'}
          </div>
        </div>
      </div>

      {linkedAnalysis && (
        <div
          style={{
            ...styles.linkedBanner,
            backgroundColor: getUrgencyStyle(linkedAnalysis.urgency).bg,
            borderColor: getUrgencyStyle(linkedAnalysis.urgency).color,
          }}
        >
          <FileImage size={16} color={getUrgencyStyle(linkedAnalysis.urgency).color} />
          <span style={styles.linkedText}>
            Análisis #{linkedAnalysis.id}
            {linkedAnalysis.patient_info ? ` · ${linkedAnalysis.patient_info}` : ''}
          </span>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {!linkedAnalysis ? (
          <div style={styles.welcomePrompt}>
            <Bot size={32} color="var(--brand-primary)" style={{ marginBottom: '12px' }} />
            <h4>Esperando Radiografía</h4>
            <p>Suba una imagen de radiografía en el panel central para iniciar la consulta.</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.welcomePrompt}>
            <Bot size={32} color="var(--brand-primary)" style={{ marginBottom: '12px' }} />
            <h4>¿En qué puedo asistirte hoy?</h4>
            <p>Puedes hacerme preguntas sobre el diagnóstico de la radiografía vinculada.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                style={{
                  ...styles.messageWrapper,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    background: isUser ? 'var(--brand-gradient)' : 'var(--bot-bubble-bg)',
                    border: isUser ? 'none' : '1px solid var(--glass-border)',
                    borderBottomRightRadius: isUser ? '4px' : '14px',
                    borderBottomLeftRadius: isUser ? '14px' : '4px',
                    color: isUser ? 'var(--brand-btn-text)' : 'var(--text-primary)',
                  }}
                >
                  <div style={styles.bubbleHeader}>
                    {isUser ? (
                      <span style={{ ...styles.roleName, color: 'var(--user-role-text)' }}>Usuario</span>
                    ) : (
                      <span style={{ ...styles.roleName, color: 'var(--brand-primary)' }}>Asistente AI</span>
                    )}
                    <span style={{ ...styles.messageTime, color: isUser ? 'var(--user-bubble-time)' : 'var(--text-muted)' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={styles.bubbleText}>
                    {formatMessageText(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {loading && (
          <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.messageBubble, background: 'var(--bot-bubble-typing)', border: '1px solid var(--glass-border)' }}>
              <div style={styles.typingIndicator}>
                <span className="typing-dot" style={{ ...styles.dot, animationDelay: '0s' }}></span>
                <span className="typing-dot" style={{ ...styles.dot, animationDelay: '0.2s' }}></span>
                <span className="typing-dot" style={{ ...styles.dot, animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} style={styles.inputForm}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={!linkedAnalysis ? "Suba una radiografía para habilitar el chat..." : (loading ? "Pensando respuesta..." : "Escribe tu consulta médica...")}
          disabled={loading || !linkedAnalysis}
          style={styles.textInput}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading || !linkedAnalysis}
          style={{
            ...styles.sendButton,
            background: (!inputText.trim() || loading || !linkedAnalysis) ? 'var(--bg-tertiary)' : 'var(--brand-gradient)',
            color: (!inputText.trim() || loading || !linkedAnalysis) ? 'var(--text-muted)' : 'var(--brand-btn-text)',
            cursor: (!inputText.trim() || loading || !linkedAnalysis) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}

const styles = {
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--panel-bg)',
  },
  chatHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--panel-header-bg)',
  },
  chatTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  chatSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  linkedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 24px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  linkedText: {
    flex: 1,
    fontWeight: '500',
  },

  messagesContainer: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  welcomePrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
    padding: '40px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
    animation: 'fadeIn 0.3s ease-out',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: '14px',
    fontSize: '14.5px',
  },
  bubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '6px',
  },
  roleName: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  messageTime: {
    fontSize: '10px',
  },
  bubbleText: {
    wordBreak: 'break-word',
  },
  inputForm: {
    padding: '20px 24px',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    gap: '12px',
    background: 'var(--panel-footer-bg)',
  },
  textInput: {
    flex: 1,
    padding: '14px 18px',
    background: 'var(--input-field-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  sendButton: {
    padding: '0 16px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--brand-primary)',
    display: 'inline-block',
    animation: 'dotBounce 1.2s infinite ease-in-out',
  }
};
