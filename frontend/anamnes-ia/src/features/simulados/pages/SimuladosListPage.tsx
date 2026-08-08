import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, BookOpen, Trash2, ChevronRight, Clock, ChevronLeft } from 'lucide-react';
import {
  fetchSimulados,
  createSimulado,
  deleteSimulado,
  fetchMyAttempts,
} from '../services/simuladosService';
import type { Simulado, SimuladoAttemptSummary, SimuladoCreate } from '../types/simulado';
import { SPECIALTIES } from '@/shared/utils/specialties';
import './SimuladosListPage.css';

const NUM_OPTIONS = [10, 20, 30, 40, 60];

const defaultForm: SimuladoCreate = {
  title: '',
  description: '',
  specialty: null,
  num_questions: 40,
  visibility: 'privado',
};

function scoreColor(score: number): string {
  if (score >= 70) return 'good';
  if (score >= 50) return 'mid';
  return 'bad';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const SimuladosListPage: React.FC = () => {
  const navigate = useNavigate();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [attempts, setAttempts] = useState<SimuladoAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SimuladoCreate>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [sims, atts] = await Promise.all([fetchSimulados(), fetchMyAttempts()]);
      setSimulados(sims);
      setAttempts(atts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar simulados');
    }
    setLoading(false);
  }

  function handleFieldChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'num_questions' ? Number(value) : value || null,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createSimulado(form);
      setSimulados(prev => [created, ...prev]);
      setShowForm(false);
      setForm(defaultForm);
      navigate(`/simulados/${created.id}/run`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar simulado');
    }
    setCreating(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm('Remover este simulado?')) return;
    try {
      await deleteSimulado(id);
      setSimulados(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover simulado');
    }
  }

  // Agrupar tentativas por simulado_id para exibir histórico rápido
  const attemptsMap = attempts.reduce<Record<string, SimuladoAttemptSummary[]>>((acc, a) => {
    if (!acc[a.simulado_id]) acc[a.simulado_id] = [];
    acc[a.simulado_id].push(a);
    return acc;
  }, {});

  const completedAttempts = attempts.filter(a => a.status === 'completed');

  return (
    <div className="sl-page">
      {/* Header */}
      <div className="sl-header">
        <button
          className="sl-back-btn"
          onClick={() => navigate('/mainpage')}
          title="Voltar ao menu"
        >
          <ChevronLeft size={15} /> Menu
        </button>
        <h1 className="sl-title">
          <span style={{ marginRight: '0.5rem' }}>📝</span> Simulados
        </h1>
        <p className="sl-subtitle">
          Pratique com questões do banco em sessões cronometradas e veja seu desempenho ao final.
        </p>
      </div>

      {error && <div className="sl-error-msg">{error}</div>}

      {/* Formulário de criação */}
      {!showForm ? (
        <div style={{ maxWidth: 900, margin: '0 auto 2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            id="btn-novo-simulado"
            className="sl-btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            Novo Simulado
          </button>
        </div>
      ) : (
        <div className="sl-create-card">
          <p className="sl-create-title">
            <Plus size={18} color="var(--accent-color)" />
            Criar Novo Simulado
          </p>
          <form onSubmit={handleCreate}>
            <div className="sl-form-grid">
              <div className="sl-field sl-field-full">
                <label htmlFor="sim-title">Título do simulado</label>
                <input
                  id="sim-title"
                  name="title"
                  type="text"
                  placeholder="Ex: Cardiologia — Revisão Geral"
                  value={form.title ?? ''}
                  onChange={handleFieldChange}
                  required
                />
              </div>

              <div className="sl-field">
                <label htmlFor="sim-specialty">Especialidade</label>
                <select
                  id="sim-specialty"
                  name="specialty"
                  value={form.specialty ?? ''}
                  onChange={handleFieldChange}
                >
                  <option value="">Todas as especialidades</option>
                  {SPECIALTIES.map(s => (
                    <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
                  ))}
                </select>
              </div>

              <div className="sl-field">
                <label htmlFor="sim-num">Número de questões</label>
                <select
                  id="sim-num"
                  name="num_questions"
                  value={form.num_questions}
                  onChange={handleFieldChange}
                >
                  {NUM_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} questões</option>
                  ))}
                </select>
              </div>

              <div className="sl-field sl-field-full">
                <label htmlFor="sim-desc">Descrição (opcional)</label>
                <textarea
                  id="sim-desc"
                  name="description"
                  rows={2}
                  placeholder="Descreva o objetivo deste simulado..."
                  value={form.description ?? ''}
                  onChange={handleFieldChange}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="sl-form-actions" style={{ gap: '0.75rem', display: 'flex' }}>
              <button
                type="button"
                className="sl-btn-danger"
                style={{ marginRight: 'auto', border: 'none', color: 'var(--text-muted)' }}
                onClick={() => { setShowForm(false); setForm(defaultForm); }}
              >
                Cancelar
              </button>
              <button
                id="btn-criar-simulado"
                type="submit"
                className="sl-btn-primary"
                disabled={creating || !form.title?.trim()}
              >
                {creating ? 'Criando...' : '🚀 Iniciar Simulado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de simulados */}
      {loading ? (
        <div className="sl-loading">
          <div className="sl-spinner" />
          <span>Carregando simulados...</span>
        </div>
      ) : simulados.length === 0 ? (
        <div className="sl-empty">
          <div className="sl-empty-icon"><ClipboardList size={48} strokeWidth={1.5} /></div>
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>Nenhum simulado ainda</p>
          <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Crie seu primeiro simulado acima e comece a praticar!
          </p>
        </div>
      ) : (
        <>
          <p className="sl-section-title">Meus Simulados ({simulados.length})</p>
          <div className="sl-grid">
            {simulados.map(s => {
              const simAttempts = attemptsMap[s.id] ?? [];
              const completed = simAttempts.filter(a => a.status === 'completed');
              const lastCompleted = completed[0];
              const inProgress = simAttempts.find(a => a.status === 'in_progress');

              return (
                <div
                  key={s.id}
                  className="sl-card"
                  onClick={() => navigate(`/simulados/${s.id}/run`)}
                  role="button"
                  aria-label={`Abrir simulado ${s.title}`}
                >
                  <div className="sl-card-header">
                    <h3 className="sl-card-title">{s.title}</h3>
                    <button
                      className="sl-btn-danger"
                      onClick={(e) => handleDelete(s.id, e)}
                      title="Remover simulado"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="sl-card-meta">
                    {s.specialty && (
                      <span className="sl-badge primary">{s.specialty}</span>
                    )}
                    {!s.specialty && (
                      <span className="sl-badge muted">Todas especialidades</span>
                    )}
                    {s.class_id && (
                      <span className="sl-badge assigned">📚 Turma</span>
                    )}
                  </div>

                  {s.description && (
                    <p className="sl-card-desc">{s.description}</p>
                  )}

                  <div className="sl-card-footer">
                    <span className="sl-card-questions">
                      <BookOpen size={13} />
                      {s.num_questions} questões
                    </span>

                    {inProgress && (
                      <span className="sl-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                        <Clock size={11} style={{ marginRight: 3 }} />
                        Em andamento
                      </span>
                    )}
                    {!inProgress && lastCompleted && (
                      <span className={`sl-attempt-score ${scoreColor(lastCompleted.score ?? 0)}`}
                        style={{ fontSize: '0.85rem' }}>
                        Último: {lastCompleted.score}%
                      </span>
                    )}
                    {!inProgress && !lastCompleted && (
                      <span className="sl-badge muted">
                        <ChevronRight size={12} /> Iniciar
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Histórico de tentativas finalizadas */}
      {completedAttempts.length > 0 && (
        <div className="sl-attempts-section">
          <p className="sl-section-title">Histórico ({completedAttempts.length})</p>
          <div className="sl-attempts-list">
            {completedAttempts.slice(0, 10).map(att => {
              const sim = simulados.find(s => s.id === att.simulado_id);
              return (
                <div
                  key={att.id}
                  className="sl-attempt-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/simulados/${att.simulado_id}/report/${att.id}`)}
                >
                  <div className="sl-attempt-info">
                    <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      {sim?.title ?? 'Simulado'}
                    </span>
                    <span className="sl-attempt-date">{formatDate(att.started_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`sl-attempt-score ${scoreColor(att.score ?? 0)}`}>
                      {att.score}% ({att.num_correct}/{att.num_total})
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimuladosListPage;
