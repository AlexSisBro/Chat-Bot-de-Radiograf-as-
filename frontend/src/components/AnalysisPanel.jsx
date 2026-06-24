import React, { useState, useEffect } from 'react';
import {
  Upload, FileImage, Clipboard, ArrowRight, Loader2, RefreshCw, History, MessageSquare,
} from 'lucide-react';
import { apiFetch, fetchProtectedImage } from '../api';
import { validateImageFile, IMAGE_ACCEPT } from '../utils/imageValidation';
import StructuredReport from './StructuredReport';

export default function AnalysisPanel({ onDiscussAnalysis, activeSession, onAnalysisSuccess }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientSurname, setPatientSurname] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await apiFetch('/analyze/history');
        if (response.ok) {
          setHistory(await response.json());
        }
      } catch {
        /* sin historial */
      }
    };
    loadHistory();
  }, []);

  // Cargar automáticamente el análisis vinculado a la sesión activa
  useEffect(() => {
    if (!activeSession) return;

    const loadSessionAnalysis = async () => {
      if (activeSession.analysis_id) {
        setLoading(true);
        setError('');
        try {
          const response = await apiFetch(`/analyze/${activeSession.analysis_id}`);
          if (response.ok) {
            const data = await response.json();
            const imageUrl = data.image_filename ? await fetchProtectedImage(data.image_filename) : '';
            setPreviewUrl(imageUrl || '');
            setResult({
              analysis_id: data.id,
              patient_info: data.patient_info,
              image: {
                size: data.image_size,
                processed: data.image_weight,
                saved_as: data.image_filename,
              },
              diagnosis: data.diagnosis,
              urgency: data.urgency,
              structured: data.structured,
            });
            setFile(null);
            setError('');
            if (onDiscussAnalysis) {
              onDiscussAnalysis({
                id: data.id,
                patient_info: data.patient_info,
                urgency: data.urgency,
              });
            }
          } else {
            setError('No se pudo cargar el análisis asociado a esta consulta.');
          }
        } catch (err) {
          setError('Error al cargar la radiografía de esta consulta.');
        } finally {
          setLoading(false);
        }
      } else {
        // Limpiar para poder subir uno nuevo
        setFile(null);
        if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setPatientName('');
        setPatientSurname('');
        setPatientAge('');
        setResult(null);
        setError('');
        if (onDiscussAnalysis) {
          onDiscussAnalysis(null);
        }
      }
    };

    loadSessionAnalysis();
  }, [activeSession?.analysis_id, activeSession?.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar análisis? Esta acción es irreversible.')) return;
    try {
      const res = await apiFetch(`/analyze/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory((prev) => prev.filter((h) => h.id !== id));
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processSelectedFile = (selectedFile, inputEl = null) => {
    const validation = validateImageFile(selectedFile);
    if (!validation.ok) {
      setError(validation.error);
      if (inputEl) inputEl.value = '';
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setResult(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile, e.target);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file || !activeSession?.id) return;
    if (!patientName.trim() || !patientSurname.trim() || !patientAge) {
      setError('Todos los campos del paciente (Nombre, Apellido y Edad) son obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', activeSession.id);
    formData.append('patient_name', patientName.trim());
    formData.append('patient_surname', patientSurname.trim());
    formData.append('patient_age', patientAge);

    try {
      const response = await apiFetch('/analyze/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detail = errData.detail;
        throw new Error(
          typeof detail === 'string' ? detail : 'Error al analizar la imagen. Solo se permiten archivos de imagen.'
        );
      }

      const data = await response.json();
      setResult(data);
      setHistory((prev) => [
        {
          id: data.analysis_id,
          patient_info: data.patient_info,
          image_size: data.image.size,
          image_weight: data.image.processed,
          image_filename: data.image.saved_as,
          diagnosis: data.diagnosis,
          urgency: data.urgency,
          structured: data.structured,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (onAnalysisSuccess) {
        onAnalysisSuccess(data.analysis_id);
      }
      if (onDiscussAnalysis) {
        onDiscussAnalysis({
          id: data.analysis_id,
          patient_info: data.patient_info,
          urgency: data.urgency,
        });
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error en el diagnóstico.');
    } finally {
      setLoading(false);
    }
  };

  const openHistoryItem = async (item) => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);

    const imageUrl = item.image_filename ? await fetchProtectedImage(item.image_filename) : '';
    setPreviewUrl(imageUrl || '');
    setResult({
      analysis_id: item.id,
      patient_info: item.patient_info,
      image: {
        size: item.image_size,
        processed: item.image_weight,
        saved_as: item.image_filename,
      },
      diagnosis: item.diagnosis,
      urgency: item.urgency,
      structured: item.structured,
    });
    setFile(null);
    setError('');
    if (onDiscussAnalysis) {
      onDiscussAnalysis({
        id: item.id,
        patient_info: item.patient_info,
        urgency: item.urgency,
      });
    }
  };

  const isFormIncomplete = !file || loading || !patientName.trim() || !patientSurname.trim() || !patientAge;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <FileImage size={22} color="var(--brand-secondary)" />
        <h2 style={styles.title}>Diagnóstico de Radiografía</h2>
      </div>

      <div style={styles.content}>
        {!result ? (
          <form onSubmit={handleAnalyze} style={styles.form}>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
              style={{
                ...styles.dropzone,
                borderColor: file ? 'var(--brand-secondary)' : 'var(--glass-border)',
                background: file ? 'var(--dropzone-active-bg)' : 'var(--dropzone-bg)',
              }}
            >
              <input
                id="file-input"
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {previewUrl ? (
                <div style={styles.previewContainer}>
                  <img src={previewUrl} alt="Radiografía" style={styles.previewImage} />
                  <div style={styles.fileBadge}>{file?.name || 'Imagen cargada'}</div>
                </div>
              ) : (
                <div style={styles.uploadPlaceholder}>
                  <Upload size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                  <p style={styles.uploadText}>Arrastra tu radiografía aquí o haz clic para buscar</p>
                  <span style={styles.uploadSubtext}>Solo imágenes: JPG, PNG, GIF, BMP, WEBP, TIFF (máx. 15 MB)</span>
                </div>
              )}
            </div>

            {/* Campos obligatorios del paciente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '12px' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Juan"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={loading}
                  style={styles.textInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Apellido *</label>
                <input
                  type="text"
                  placeholder="Ej: Pérez"
                  value={patientSurname}
                  onChange={(e) => setPatientSurname(e.target.value)}
                  disabled={loading}
                  style={styles.textInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Edad *</label>
                <input
                  type="number"
                  placeholder="45"
                  min="0"
                  max="120"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  disabled={loading}
                  style={styles.textInput}
                />
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={isFormIncomplete}
              style={{
                ...styles.submitBtn,
                background: isFormIncomplete ? 'var(--bg-tertiary)' : 'var(--brand-gradient)',
                color: isFormIncomplete ? 'var(--text-muted)' : 'var(--brand-btn-text)',
                cursor: isFormIncomplete ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  Procesando e Interpretando...
                </>
              ) : (
                <>
                  Analizar Radiografía
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div style={styles.resultsContainer}>
            <div style={styles.resultMeta}>
              <div style={styles.metaCol}>
                <span style={styles.metaLabel}>Paciente:</span>
                <span style={styles.metaValue}>{result.patient_info || 'Anónimo'}</span>
              </div>
              <div style={styles.metaCol}>
                <span style={styles.metaLabel}>Imagen:</span>
                <span style={styles.metaValue}>
                  {result.image?.size} ({result.image?.processed})
                </span>
              </div>
            </div>

            {previewUrl && (
              <img src={previewUrl} alt="Radiografía analizada" style={styles.resultImage} />
            )}

            <div style={styles.diagnosisBox}>
              <h3 style={styles.boxTitle}>
                <Clipboard size={16} />
                Informe de Radiología
              </h3>
              <StructuredReport
                structured={result.structured}
                urgency={result.urgency}
                resumenFallback={result.diagnosis}
              />
            </div>

            <div style={{
              background: 'var(--logo-bg)',
              border: '1px solid var(--logo-border)',
              color: 'var(--brand-primary)',
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <MessageSquare size={16} />
              Radiografía vinculada al chat de esta consulta
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1.3,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--panel-bg)',
    borderRight: '1px solid var(--glass-border)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--panel-header-bg)',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  historyBox: {
    marginBottom: '20px',
    padding: '14px 16px',
    background: 'var(--meta-box-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
  },
  historyTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  historyItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '8px 10px',
    background: 'var(--secondary-btn-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: '12px',
    textAlign: 'left',
    width: '100%',
  },
  historyMeta: {
    color: 'var(--text-muted)',
    fontSize: '11px',
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-secondary)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  dropzone: {
    border: '2px dashed var(--glass-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-normal)',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  uploadSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  previewImage: {
    maxHeight: '220px',
    maxWidth: '100%',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--image-shadow)',
    objectFit: 'contain',
  },
  resultImage: {
    maxHeight: '180px',
    maxWidth: '100%',
    borderRadius: 'var(--radius-md)',
    objectFit: 'contain',
    alignSelf: 'center',
    boxShadow: 'var(--image-shadow)',
  },
  fileBadge: {
    fontSize: '12px',
    padding: '4px 12px',
    background: 'var(--badge-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    color: 'var(--text-secondary)',
    maxWidth: '80%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  textInput: {
    padding: '14px 16px',
    background: 'var(--input-field-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  submitBtn: {
    padding: '14px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
  },
  error: {
    color: 'var(--accent-rose)',
    fontSize: '13px',
    background: 'var(--error-bg)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '3px solid var(--accent-rose)',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    animation: 'fadeIn 0.4s ease-out',
  },
  resultMeta: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    background: 'var(--meta-box-bg)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--glass-border)',
  },
  metaCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  diagnosisBox: {
    background: 'var(--diagnosis-box-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    maxHeight: '420px',
    overflowY: 'auto',
  },
  boxTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--brand-secondary)',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  discussBtn: {
    padding: '12px',
    background: 'var(--brand-gradient)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: 'var(--brand-btn-text)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  resetBtn: {
    padding: '12px',
    background: 'var(--secondary-btn-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'var(--transition-fast)',
  },
};
