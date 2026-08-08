import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flag, CheckCircle } from 'lucide-react';
import {
  startAttempt,
  recordAnswer,
  finishAttempt,
  fetchSimulado,
} from '../services/simuladosService';
import type { Simulado, SimuladoQuestion } from '../types/simulado';
import './SimuladoRunPage.css';

export const SimuladoRunPage: React.FC = () => {
  const { simuladoId } = useParams<{ simuladoId: string }>();
  const navigate = useNavigate();

  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SimuladoQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  // answers: { questionId -> selectedOption }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // saving: set of questionIds currently being saved to backend
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!simuladoId) return;
    init(simuladoId);
  }, [simuladoId]);

  async function init(id: string) {
    setLoading(true);
    try {
      const [sim, attempt] = await Promise.all([
        fetchSimulado(id),
        startAttempt(id),
      ]);
      setSimulado(sim);
      setAttemptId(attempt.attempt_id);
      setQuestions(attempt.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar simulado');
    }
    setLoading(false);
  }

  const handleSelect = useCallback(async (optionKey: string) => {
    if (!attemptId || !simuladoId) return;
    const question = questions[currentIdx];
    if (!question) return;

    // Atualiza UI imediatamente (optimistic)
    setAnswers(prev => ({ ...prev, [question.id]: optionKey }));

    // Persiste no backend
    setSaving(prev => new Set(prev).add(question.id));
    try {
      await recordAnswer(simuladoId, attemptId, question.id, optionKey);
    } catch (err) {
      console.warn('Erro ao salvar resposta:', err);
    } finally {
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
  }, [questions, currentIdx, attemptId, simuladoId]);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, questions.length - 1)));
  }, [questions.length]);

  async function handleFinish() {
    if (!simuladoId || !attemptId || finishing) return;
    setFinishing(true);
    setShowConfirm(false);
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const report = await finishAttempt(simuladoId, attemptId, elapsed);
      navigate(`/simulados/${simuladoId}/report/${report.attempt_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar simulado');
      setFinishing(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="sr-loading">
        <div className="sr-spinner" />
        <p>Preparando simulado...</p>
      </div>
    );
  }

  if (error || !simulado || questions.length === 0) {
    return (
      <div className="sr-error">
        <p style={{ fontSize: '2rem' }}>⚠️</p>
        <p style={{ fontWeight: 600 }}>{error ?? 'Simulado sem questões'}</p>
        <button
          className="sr-btn-secondary"
          onClick={() => navigate('/simulados')}
        >
          Voltar
        </button>
      </div>
    );
  }

  const current = questions[currentIdx];
  const selectedForCurrent = answers[current.id];
  const answeredCount = Object.keys(answers).length;
  const progressPct = (answeredCount / questions.length) * 100;
  const isLast = currentIdx === questions.length - 1;

  return (
    <div className="sr-page">
      {/* Topbar */}
      <div className="sr-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <button
            className="sr-btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => navigate('/mainpage')}
            title="Voltar ao menu principal"
          >
            <ChevronLeft size={15} /> Menu
          </button>
          <button
            className="sr-btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => navigate('/simulados')}
            title="Voltar para lista de simulados"
          >
            Simulados
          </button>
        </div>
        <span className="sr-topbar-title">{simulado.title}</span>
        <span className="sr-counter">
          {answeredCount}/{questions.length} respondidas
        </span>
        <button
          id="btn-finalizar-simulado"
          className="sr-finish-btn"
          onClick={() => setShowConfirm(true)}
          disabled={finishing}
        >
          <Flag size={14} />
          {finishing ? 'Finalizando...' : 'Finalizar'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="sr-progress-wrap">
        <div className="sr-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="sr-main">
        {error && (
          <p style={{
            color: '#ef4444',
            background: 'rgba(239,68,68,0.08)',
            padding: '0.75rem 1rem',
            borderRadius: '0.6rem',
            marginBottom: '1rem',
            fontSize: '0.88rem',
          }}>
            {error}
          </p>
        )}

        {/* Specialty badges */}
        <div className="sr-specialty-row">
          <span className="sr-badge">{current.specialty}</span>
          <span className="sr-badge sub">{current.subspecialty}</span>
        </div>

        {/* Question card */}
        <div className="sr-question-card">
          <p className="sr-question-number">Questão {currentIdx + 1} de {questions.length}</p>
          <p className="sr-question-text">{current.statement}</p>

          {current.image_url && (
            <div className="sr-image-wrap">
              <img src={current.image_url} alt="Referência" className="sr-image" />
            </div>
          )}

          <div className="sr-options">
            {Object.entries(current.options).map(([key, text]) => (
              <button
                key={key}
                id={`option-${key}`}
                className={`sr-option${selectedForCurrent === key ? ' selected' : ''}`}
                onClick={() => handleSelect(key)}
                disabled={saving.has(current.id)}
              >
                <span className="sr-option-key">{key}</span>
                <span className="sr-option-text">{text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="sr-nav-row">
          <button
            id="btn-anterior"
            className="sr-btn-secondary"
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          {!isLast ? (
            <button
              id="btn-proxima"
              className="sr-btn-primary"
              onClick={() => goTo(currentIdx + 1)}
            >
              Próxima <ChevronRight size={16} />
            </button>
          ) : (
            <button
              id="btn-ver-resultado"
              className="sr-btn-primary"
              onClick={() => setShowConfirm(true)}
              disabled={finishing}
            >
              <CheckCircle size={16} />
              {finishing ? 'Finalizando...' : 'Ver Resultado'}
            </button>
          )}
        </div>

        {/* Minimap */}
        <div style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            Navegação rápida
          </p>
          <div className="sr-minimap">
            {questions.map((q, i) => (
              <button
                key={q.id}
                className={`sr-minimap-dot${i === currentIdx ? ' current' : answers[q.id] ? ' answered' : ''}`}
                onClick={() => goTo(i)}
                title={`Questão ${i + 1}${answers[q.id] ? ' ✓' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirm && (
        <div className="sr-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="sr-modal" onClick={e => e.stopPropagation()}>
            <h3>Finalizar simulado?</h3>
            <p>
              Você respondeu <strong>{answeredCount}</strong> de{' '}
              <strong>{questions.length}</strong> questões.
              {answeredCount < questions.length && (
                <span style={{ color: '#f59e0b', display: 'block', marginTop: '0.3rem' }}>
                  ⚠️ {questions.length - answeredCount} questão(ões) sem resposta serão contadas como erradas.
                </span>
              )}
            </p>
            <div className="sr-modal-actions">
              <button
                className="sr-btn-secondary"
                onClick={() => setShowConfirm(false)}
              >
                Continuar
              </button>
              <button
                id="btn-confirmar-finalizar"
                className="sr-btn-primary"
                onClick={handleFinish}
                disabled={finishing}
              >
                {finishing ? 'Finalizando...' : '✓ Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimuladoRunPage;
