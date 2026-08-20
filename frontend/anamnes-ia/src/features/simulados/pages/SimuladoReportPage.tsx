import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle, XCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { fetchReport } from '../services/simuladosService';
import type { SimuladoReport, SimuladoReportQuestion } from '../types/simulado';
import { MainMenu } from '@/shared/components';
import './SimuladoReportPage.css';

type Filter = 'all' | 'correct' | 'incorrect';

function scoreClass(score: number): string {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'mid';
  return 'bad';
}

function scoreEmoji(score: number): string {
  if (score >= 80) return '🏆';
  if (score >= 60) return '✅';
  if (score >= 40) return '📊';
  return '💪';
}

function formatTime(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s}s`;
}

const QuestionItem: React.FC<{ q: SimuladoReportQuestion; index: number }> = ({ q, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rp-question-item ${q.is_correct ? 'correct' : 'incorrect'}`}>
      <div
        className="rp-qi-header"
        onClick={() => setExpanded(e => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="rp-qi-number">Questão {index + 1}</span>
        <span className="rp-qi-result" style={{ flex: 1, marginLeft: '0.5rem' }} />
        <span className={`rp-qi-result ${q.is_correct ? 'correct' : 'incorrect'}`}>
          {q.is_correct
            ? <><CheckCircle size={14} /> Certa</>
            : <><XCircle size={14} /> Errada</>
          }
        </span>
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </div>

      <div className="rp-qi-statement" onClick={() => setExpanded(e => !e)}>
        {q.statement}
      </div>

      {expanded && (
        <div className="rp-qi-body">
          {q.image_url && (
            <img
              src={q.image_url}
              alt="Referência"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: '0.5rem', marginBottom: '0.75rem' }}
            />
          )}

          <div className="rp-options-mini">
            {Object.entries(q.options).map(([key, text]) => {
              const isCorrect = key === q.correct_answer;
              const isSelected = key === q.selected_answer;

              let cls = 'neutral';
              if (isCorrect) cls = 'correct-ans';
              else if (isSelected && !isCorrect) cls = 'wrong-sel';

              return (
                <div key={key} className={`rp-option-mini ${cls}`}>
                  <span className="rp-option-key">{key}.</span>
                  <span>
                    {text}
                    {isCorrect && <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>✓ Gabarito</span>}
                    {isSelected && !isCorrect && <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>← Sua resposta</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {q.explanation && (
            <div className="rp-explanation">
              <strong>Explicação</strong>
              <p>{q.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SimuladoReportPage: React.FC = () => {
  const { simuladoId, attemptId } = useParams<{ simuladoId: string; attemptId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<SimuladoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!simuladoId || !attemptId) return;
    fetchReport(simuladoId, attemptId)
      .then(setReport)
      .catch(err => setError(err instanceof Error ? err.message : 'Erro ao carregar relatório'))
      .finally(() => setLoading(false));
  }, [simuladoId, attemptId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="rp-loading">
          <div className="rp-spinner" />
          <span>Calculando resultado...</span>
        </div>
      );
    }

    if (error || !report) {
      return (
        <div className="rp-page">
          <button className="rp-back-btn" onClick={() => navigate('/simulados')}>
            <ChevronLeft size={15} /> Voltar
          </button>
          <p style={{ color: '#ef4444', textAlign: 'center' }}>{error ?? 'Relatório não encontrado'}</p>
        </div>
      );
    }

    const sc = scoreClass(report.score);
    const numIncorrect = report.num_total - report.num_correct;

    const filtered: SimuladoReportQuestion[] =
      filter === 'all'
        ? report.questions
        : report.questions.filter(q => filter === 'correct' ? q.is_correct : !q.is_correct);

    return (
      <div className="rp-page">
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="rp-back-btn" onClick={() => navigate('/simulados')}>
            <ChevronLeft size={15} /> Voltar para Simulados
          </button>
        </div>

      {/* Summary card */}
      <div className="rp-summary-card">
        <h1 className="rp-title">{report.simulado_title}</h1>
        <p className="rp-subtitle">Resultado do Simulado</p>

        <div className={`rp-score-circle ${sc}`}>
          <span className="rp-score-pct">{report.score}%</span>
          <span className="rp-score-label">Acerto</span>
        </div>

        <div className="rp-stats-row">
          <div className="rp-stat">
            <span className="rp-stat-val correct">{report.num_correct}</span>
            <span className="rp-stat-label">Certas</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat-val incorrect">{numIncorrect}</span>
            <span className="rp-stat-label">Erradas</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat-val">{report.num_total}</span>
            <span className="rp-stat-label">Total</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat-val" style={{ fontSize: '1.1rem' }}>
              {formatTime(report.time_spent_seconds)}
            </span>
            <span className="rp-stat-label">Tempo</span>
          </div>
        </div>

        <p style={{ fontSize: '1.5rem', marginTop: '1.25rem', marginBottom: 0 }}>
          {scoreEmoji(report.score)}
        </p>

        <div className="rp-cta-row">
          <button
            id="btn-novo-simulado-apos-relatorio"
            className="rp-btn-primary"
            onClick={() => navigate('/simulados')}
          >
            <RotateCcw size={15} /> Novo Simulado
          </button>
          <button
            className="rp-btn-secondary"
            onClick={() => navigate(`/simulados/${simuladoId}/run`)}
          >
            Repetir este Simulado
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rp-filters">
        {(['all', 'correct', 'incorrect'] as Filter[]).map(f => (
          <button
            key={f}
            id={`filter-${f}`}
            className={`rp-filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && `Todas (${report.questions.length})`}
            {f === 'correct' && `✓ Certas (${report.num_correct})`}
            {f === 'incorrect' && `✗ Erradas (${numIncorrect})`}
          </button>
        ))}
      </div>

      {/* Questions list */}
      <div className="rp-questions-list">
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
            Nenhuma questão neste filtro.
          </p>
        ) : (
          filtered.map((q) => (
            <QuestionItem
              key={q.question_id}
              q={q}
              index={report.questions.indexOf(q)}
            />
          ))
        )}
      </div>
      </div>
    );
  };

  return (
    <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full bg-[#f7f6fa]">
      <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
        <MainMenu />
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
        <MainMenu mobile />
      </header>
      <div className="hidden lg:block w-20 bg-[#1a1730]" />
      <main className="w-full relative">
        <div className="lg:hidden h-16 w-full" />
        {renderContent()}
      </main>
    </div>
  );
};

export default SimuladoReportPage;
