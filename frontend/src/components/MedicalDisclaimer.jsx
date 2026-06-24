import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function MedicalDisclaimer() {
  return (
    <div style={styles.bar}>
      <AlertTriangle size={14} color="var(--accent-amber)" />
      <span>
        Herramienta de apoyo educativo. No sustituye el diagnóstico ni la atención de un profesional de la salud.
      </span>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--panel-header-bg)',
    borderTop: '1px solid var(--glass-border)',
    textAlign: 'center',
    flexShrink: 0,
  },
};
