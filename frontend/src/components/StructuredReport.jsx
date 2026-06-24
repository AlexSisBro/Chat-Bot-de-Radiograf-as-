import React from 'react';

const URGENCY_STYLES = {
  alta: { label: 'ALTA / CRÍTICA', color: 'var(--accent-rose)', bg: 'rgba(244, 63, 94, 0.12)' },
  media: { label: 'MEDIA / OBSERVACIÓN', color: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.12)' },
  baja: { label: 'BAJA / RUTINA', color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.12)' },
};

function Section({ title, items }) {
  if (!items?.length) return null;
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      <ul style={styles.list}>
        {items.map((item, idx) => (
          <li key={idx} style={styles.listItem}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function getUrgencyStyle(urgency) {
  return URGENCY_STYLES[urgency] || { label: 'INDETERMINADA', color: 'var(--text-muted)', bg: 'var(--badge-bg)' };
}

export default function StructuredReport({ structured, urgency, resumenFallback }) {
  if (!structured) {
    return (
      <div style={styles.fallback}>
        {(resumenFallback || '').split('\n').map((line, idx) => (
          <p key={idx} style={styles.paragraph}>{line}</p>
        ))}
      </div>
    );
  }

  const urgencyStyle = getUrgencyStyle(urgency || structured.urgencia);

  return (
    <div style={styles.container}>
      <div style={{ ...styles.urgencyBadge, backgroundColor: urgencyStyle.bg, color: urgencyStyle.color }}>
        Urgencia: {urgencyStyle.label}
      </div>

      {structured.resumen && (
        <div style={styles.summaryBox}>
          <h4 style={styles.sectionTitle}>Resumen</h4>
          <p style={styles.paragraph}>{structured.resumen}</p>
        </div>
      )}

      <Section title="Hallazgos normales" items={structured.hallazgos_normales} />
      <Section title="Hallazgos anormales" items={structured.hallazgos_anormales} />
      <Section title="Diagnóstico diferencial" items={structured.diagnostico_diferencial} />
      <Section title="Recomendaciones" items={structured.recomendaciones} />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  urgencyBadge: {
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: '700',
  },
  summaryBox: {
    padding: '12px 14px',
    background: 'var(--meta-box-bg)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--glass-border)',
  },
  section: {
    padding: '0 2px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--brand-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '8px',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
  },
  listItem: {
    fontSize: '13.5px',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  paragraph: {
    fontSize: '13.5px',
    lineHeight: 1.6,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  fallback: {
    maxHeight: '380px',
    overflowY: 'auto',
  },
};
