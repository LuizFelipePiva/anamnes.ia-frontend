import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Image as ImageIcon, Upload, ArrowLeft } from 'lucide-react';
import {
  adminFetchQuestions,
  adminCreateQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminImportQuestions,
  adminUploadQuestionImage,
} from '@/features/questoes';
import type { QuestionBankItem } from '@/features/questoes';
import { useToast } from '@/core/hooks/useToast';
import { ToastContainer } from '@/shared/components/ui';
import { SPECIALTIES, specialtyLabel } from '@/shared/utils/specialties';
import './QuestionsAdminPage.css';

export const QuestionsAdminPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, hideToast } = useToast();

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [statement, setStatement] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0].key);
  const [subspecialty, setSubspecialty] = useState('');
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<Record<string, string>>({ A: '', B: '', C: '', D: '' });
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      setQuestions(await adminFetchQuestions());
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const handleOptionChange = (key: string, value: string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const openFormForNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openFormForEdit = (q: QuestionBankItem) => {
    setEditingId(q.id);
    setStatement(q.statement);
    setSpecialty(q.specialty);
    setSubspecialty(q.subspecialty);
    setExplanation(q.explanation || '');
    setOptions(q.options || { A: '', B: '', C: '', D: '' });
    setCorrectAnswer(q.correct_answer);
    setExistingImageUrl(q.image_url);
    setImageFile(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = existingImageUrl;

      // Upload image if a new one is selected
      if (imageFile) {
        imageUrl = await adminUploadQuestionImage(imageFile);
      }

      const payload = {
        statement,
        options,
        correct_answer: correctAnswer,
        explanation,
        specialty,
        subspecialty,
        image_url: imageUrl
      };

      if (editingId) {
        const updated = await adminUpdateQuestion(editingId, payload);
        setQuestions(prev => prev.map(q => (q.id === editingId ? updated : q)));
        showToast(t('questions.toast_updated'), 'success');
      } else {
        const created = await adminCreateQuestion(payload);
        setQuestions(prev => [created, ...prev]);
        showToast(t('questions.toast_created'), 'success');
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving question:', error);
      showToast(error instanceof Error ? error.message : t('questions.error_save'), 'error');
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setStatement('');
    setExplanation('');
    setSubspecialty('');
    setOptions({ A: '', B: '', C: '', D: '' });
    setCorrectAnswer('A');
    setImageFile(null);
    setExistingImageUrl(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('questions.delete_confirm'))) return;

    try {
      await adminDeleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      showToast(t('questions.toast_deleted'), 'success');
    } catch (error) {
      console.error('Error deleting:', error);
      showToast(error instanceof Error ? error.message : t('questions.error_delete'), 'error');
    }
  };

  // Import JSON Logic
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const itemsToImport: Record<string, unknown>[] = Array.isArray(json) ? json : [json];

        // Normalização pt-BR/en e validação acontecem no backend
        const { imported } = await adminImportQuestions(itemsToImport);

        showToast(t('questions.toast_imported', { count: imported }), 'success');
        fetchQuestions();
      } catch (err) {
        console.error('Error parsing/importing JSON:', err);
        showToast(err instanceof Error ? err.message : t('questions.error_import'), 'error');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'questions-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-q-container">
      <ToastContainer toasts={toasts} onDismiss={hideToast} />

      <div className="admin-q-header">
        <div className="admin-q-breadcrumb">
          <button className="admin-q-btn-back-panel" onClick={() => navigate('/admin')}>
            <ArrowLeft size={16} /> {t('questions.back_panel')}
          </button>
        </div>

        <div className="admin-q-header-main">
          <h1>{t('questions.title')}</h1>
          <p className="admin-q-header-subtitle">{t('questions.subtitle')}</p>

          <div className="admin-q-actions">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportJson}
              style={{ display: 'none' }}
            />
            <button
              className="admin-q-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload size={18} style={{ marginRight: 6 }} /> {importing ? t('questions.importing') : t('questions.import')}
            </button>
            <button
              className="admin-q-btn-secondary"
              onClick={handleExportJson}
            >
              <ArrowLeft size={18} style={{ transform: 'rotate(180deg)', marginRight: 6 }} /> {t('questions.export')}
            </button>
            <button className="admin-q-btn-primary" onClick={() => showForm ? setShowForm(false) : openFormForNew()}>
              <Plus size={18} /> {showForm ? t('questions.cancel') : t('questions.new')}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="admin-q-form" onSubmit={handleSubmit}>
            <h3>{editingId ? t('questions.form_title_edit') : t('questions.form_title_new')}</h3>

            <div className="admin-q-form-row">
              <div className="admin-q-form-group">
                <label>{t('questions.specialty')}</label>
                <select required value={specialty} onChange={e => setSpecialty(e.target.value)}>
                  {/* mantém visível um valor legado que não esteja nas 14 canônicas */}
                  {!SPECIALTIES.some(s => s.key === specialty) && (
                    <option value={specialty}>{specialty}</option>
                  )}
                  {SPECIALTIES.map(s => (
                    <option key={s.key} value={s.key}>{s.emoji} {specialtyLabel(s.key)}</option>
                  ))}
                </select>
              </div>
              <div className="admin-q-form-group">
                <label>{t('questions.subspecialty')}</label>
                <input required value={subspecialty} onChange={e => setSubspecialty(e.target.value)} />
              </div>
            </div>

            <div className="admin-q-form-group">
              <label>{t('questions.statement')}</label>
              <textarea required rows={4} value={statement} onChange={e => setStatement(e.target.value)} />
            </div>

            <div className="admin-q-options-container">
              <label>{t('questions.options')}</label>
              {['A', 'B', 'C', 'D'].map(key => (
                <div key={key} className="admin-q-option-row">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswer === key}
                    onChange={() => setCorrectAnswer(key)}
                  />
                  <span className="admin-q-option-label">{key})</span>
                  <input
                    required={Object.keys(options).length === 4}
                    className="admin-q-option-input"
                    value={options[key] || ''}
                    onChange={e => handleOptionChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="admin-q-form-group">
              <label>{t('questions.explanation')}</label>
              <textarea rows={3} value={explanation} onChange={e => setExplanation(e.target.value)} />
            </div>

            <div className="admin-q-form-group">
              <label><ImageIcon size={18} style={{ marginRight: 8 }} />{t('questions.image')}</label>
              {existingImageUrl && (
                <div style={{ marginBottom: 10 }}>
                  <img src={existingImageUrl} alt={t('questions.image_current_alt')} style={{ height: 100, borderRadius: 8, border: '1px solid var(--border-main)' }} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('questions.image_current_hint')}</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} />
            </div>

            <button type="submit" className="admin-q-btn-submit" disabled={submitting}>
              {submitting ? t('questions.submit_saving') : (editingId ? t('questions.submit_update') : t('questions.submit_create'))}
            </button>
          </form>
        )}

        {loading ? (
          <p>{t('questions.loading')}</p>
        ) : (
          <div className="admin-q-list">
            {questions.length === 0 ? (
              <p className="admin-q-empty">{t('questions.empty')}</p>
            ) : (
              questions.map(q => (
                <div key={q.id} className="admin-q-card">
                  <div className="admin-q-card-header">
                    <span className="admin-q-badge">{specialtyLabel(q.specialty)}</span>
                    <span className="admin-q-badge secondary">{q.subspecialty}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      <button className="admin-q-btn-icon" onClick={() => openFormForEdit(q)} title={t('questions.edit')}>
                        <Edit2 size={16} />
                      </button>
                      <button className="admin-q-btn-icon delete" onClick={() => handleDelete(q.id)} title={t('questions.delete')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="admin-q-statement">{q.statement}</p>
                  <div className="admin-q-correct-answer">
                    <strong>{t('questions.correct_answer')}</strong> {q.correct_answer}) {q.options[q.correct_answer]}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionsAdminPage;
