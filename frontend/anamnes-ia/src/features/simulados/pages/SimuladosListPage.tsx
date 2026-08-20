import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, X, Search, Play } from 'lucide-react';
import {
  createSimulado,
  fetchFilterOptions,
  countAvailableQuestions,
  fetchSimulados,
  fetchMyAttempts,
} from '../services/simuladosService';
import type { SimuladoCreate, SimuladoFilterOptions, Simulado, SimuladoAttemptSummary } from '../types/simulado';
import { MainMenu } from '@/shared/components';
import './SimuladosListPage.css';

type PanelType = 'esp' | 'tema' | 'inst' | 'ger' | null;

const defaultForm: SimuladoCreate = {
  title: 'Simulado Personalizado',
  specialties: [],
  bancas: [],
  temas: [],
  subtemas: [],
  anos: [],
  num_questions: 10,
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
  const [opts, setOpts] = useState<SimuladoFilterOptions>({
    specialties: [],
    temas_por_especialidade: {},
    bancas: [],
    subtemas: [],
    anos: []
  });
  
  const [form, setForm] = useState<SimuladoCreate>(defaultForm);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [drillEsp, setDrillEsp] = useState<string | null>(null);
  
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [attempts, setAttempts] = useState<SimuladoAttemptSummary[]>([]);
  
  // Meter state
  const [availCount, setAvailCount] = useState<number>(0);
  const [shownCount, setShownCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  
  // Panel states
  const [searchEsp, setSearchEsp] = useState('');
  const [searchTema, setSearchTema] = useState('');
  const [searchInst, setSearchInst] = useState('');
  const [letterEsp, setLetterEsp] = useState<string>('');

  useEffect(() => {
    fetchFilterOptions().then(data => {
      setOpts(data);
      // Initial count without filters (should return all questions)
      countAvailableQuestions({}).then(res => {
        setAvailCount(res.count);
        setShownCount(res.count);
      });
    }).catch(console.error);

    Promise.all([fetchSimulados(), fetchMyAttempts()]).then(([sims, atts]) => {
      setSimulados(sims);
      setAttempts(atts);
    }).catch(console.error);
  }, []);

  // Debounced count update
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingCount(true);
      countAvailableQuestions(form).then(res => {
        setAvailCount(res.count);
        
        // Auto-adjust num_questions if available is less
        if (form.num_questions && res.count > 0 && form.num_questions > res.count) {
          setForm(prev => ({ ...prev, num_questions: res.count }));
        } else if (res.count > 0 && form.num_questions === 0) {
          setForm(prev => ({ ...prev, num_questions: Math.min(10, res.count) }));
        }

        // Animated counter
        let start = shownCount;
        const end = res.count;
        if (start === end) {
          setLoadingCount(false);
          return;
        }
        
        const duration = 380;
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / duration);
          const v = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3)));
          setShownCount(v);
          if (k < 1) requestAnimationFrame(step);
          else setLoadingCount(false);
        };
        requestAnimationFrame(step);

      }).catch(() => setLoadingCount(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [form.specialties, form.temas, form.bancas, form.anos]);

  // Handlers
  const toggleSet = (field: 'specialties' | 'bancas' | 'temas' | 'anos', val: any) => {
    setForm(prev => {
      const arr = prev[field] as any[];
      const isSelected = arr.includes(val);
      const nextArr = isSelected ? arr.filter(x => x !== val) : [...arr, val];
      
      const newForm = { ...prev, [field]: nextArr };
      
      // Cascading logic
      if (field === 'specialties' && isSelected) {
        // Removed an specialty -> remove its temas
        const temasOfEsp = opts.temas_por_especialidade[val as string] || [];
        newForm.temas = (newForm.temas || []).filter(t => !temasOfEsp.includes(t));
      }
      if (field === 'temas' && !isSelected) {
        // Added a tema -> ensure its specialty is added
        if (drillEsp && !newForm.specialties!.includes(drillEsp)) {
          newForm.specialties = [...(newForm.specialties || []), drillEsp];
        }
      }
      
      return newForm;
    });
  };

  const removeFilter = (field: keyof SimuladoCreate, val: any) => {
    toggleSet(field as any, val);
  };

  const handleCreate = async () => {
    if (availCount === 0) return;
    try {
      const sim = await createSimulado({
        ...form,
        title: `Simulado - ${new Date().toLocaleDateString()}`,
        num_questions: form.num_questions || 10
      });
      navigate(`/simulados/${sim.id}/run`);
    } catch (e) {
      alert('Erro ao criar simulado');
    }
  };

  // UI Helpers
  const espLetters = Array.from(new Set(opts.specialties.map(e => e[0].toUpperCase())));
  const filteredEsps = opts.specialties.filter(e => 
    (!searchEsp || e.toLowerCase().includes(searchEsp.toLowerCase())) &&
    (!letterEsp || e[0].toUpperCase() === letterEsp)
  );

  const temasOfDrill = drillEsp ? (opts.temas_por_especialidade[drillEsp] || []) : [];
  const filteredTemas = temasOfDrill.filter(t => !searchTema || t.toLowerCase().includes(searchTema.toLowerCase()));

  const filteredBancas = opts.bancas.filter(b => !searchInst || b.toLowerCase().includes(searchInst.toLowerCase()));
  
  const completedAttempts = attempts.filter(a => a.status === 'completed');

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
        <div className="sl-page">
          <div className="sl-wrap">
            
            {/* Header simplificado (sem rail) */}
            <div className="sl-phead">
              <div style={{ marginTop: 12 }}>
                <h1 className="sl-h1">Configurar simulado</h1>
                <p className="sl-sub">Escolha o que quer treinar. O contador do banco atualiza a cada filtro — você vê quantas questões sobraram antes de começar.</p>
              </div>
            </div>

            {/* Histórico de tentativas finalizadas */}
            {completedAttempts.length > 0 && (
              <div className="sl-attempts-section" style={{ marginTop: 24 }}>
                <p className="sl-section-title">Seu Histórico ({completedAttempts.length})</p>
                <div className="sl-attempts-list">
                  {completedAttempts.slice(0, 5).map(att => {
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
                            {sim?.title ?? 'Simulado Gerado'}
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

            {/* Meter */}
            <div className="sl-meter" style={{ marginTop: completedAttempts.length > 0 ? 32 : 12 }}>
          <div className="sl-meter-top">
            <div className="sl-meter-num">
              <b style={{ opacity: loadingCount ? 0.6 : 1 }}>{shownCount}</b>
              <i>/ {opts.specialties.length > 0 ? '???' : '0'}</i> 
            </div>
            <div className="sl-meter-lbl"><b>questões disponíveis</b>no banco com os filtros atuais</div>
            
            <div className="sl-meter-chips">
              {(form.specialties || []).map(e => (
                <span key={e} className="sl-fchip"><em>área</em> {e} <button onClick={() => removeFilter('specialties', e)}><X size={12}/></button></span>
              ))}
              {(form.temas || []).map(t => (
                <span key={t} className="sl-fchip"><em>tema</em> {t} <button onClick={() => removeFilter('temas', t)}><X size={12}/></button></span>
              ))}
              {(form.bancas || []).map(b => (
                <span key={b} className="sl-fchip"><em>banca</em> {b} <button onClick={() => removeFilter('bancas', b)}><X size={12}/></button></span>
              ))}
              {(form.anos || []).map(a => (
                <span key={a} className="sl-fchip"><em>ano</em> {a} <button onClick={() => removeFilter('anos', a)}><X size={12}/></button></span>
              ))}
              {!(form.specialties?.length || form.temas?.length || form.bancas?.length || form.anos?.length) && (
                <span className="sl-fchip none">nenhum filtro — banco inteiro</span>
              )}
            </div>
          </div>
          <div className="sl-bar">
            {/* Fake progress bar dots to simulate DB volume */}
            {Array.from({ length: 150 }).map((_, i) => (
              <i key={i} className={i < (shownCount / 10) ? 'f' : (availCount === 0 ? 'z' : '')} style={{ transitionDelay: `${(i%20)*15}ms` }} />
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="sl-steps">
          <button className={`sl-step ${form.specialties?.length ? 'done' : ''}`} onClick={() => setActivePanel('esp')}>
            <span className="sl-step-n">1</span>
            <span>
              <span className="sl-step-t">Especialidades e temas</span>
              <span className="sl-step-d">Filtre por grande área e afunile por tema</span>
            </span>
            <span className="sl-step-v">
              <span className={`sl-pill ${form.specialties?.length ? 'act' : ''}`}>
                {form.specialties?.length ? `${form.specialties.length} área(s)` : 'todas'}
              </span>
              <span className="sl-chev"><ChevronRight size={17} /></span>
            </span>
          </button>

          <button className={`sl-step ${form.bancas?.length ? 'done' : ''}`} onClick={() => setActivePanel('inst')}>
            <span className="sl-step-n">2</span>
            <span>
              <span className="sl-step-t">Instituições</span>
              <span className="sl-step-d">Banca de origem da prova</span>
            </span>
            <span className="sl-step-v">
              <span className={`sl-pill ${form.bancas?.length ? 'act' : ''}`}>
                {form.bancas?.length ? `${form.bancas.length} banca(s)` : 'todas'}
              </span>
              <span className="sl-chev"><ChevronRight size={17} /></span>
            </span>
          </button>

          <button className="sl-step done" onClick={() => setActivePanel('ger')}>
            <span className="sl-step-n">3</span>
            <span>
              <span className="sl-step-t">Ajustes gerais</span>
              <span className="sl-step-d">Ano da prova, e quantidade de questões</span>
            </span>
            <span className="sl-step-v">
              <span className="sl-pill act">{form.num_questions} questões</span>
              <span className="sl-chev"><ChevronRight size={17} /></span>
            </span>
          </button>
        </div>

        <div className="sl-launch">
          <button className="sl-btn" onClick={handleCreate} disabled={availCount === 0}>
            Iniciar simulado
            <Play size={16} fill="currentColor" style={{ marginLeft: 6 }} />
          </button>
          <span className="sl-launch-note">
            {availCount === 0 
              ? 'Nenhuma questão passa nesses filtros — remova um chip acima.'
              : `${form.num_questions} de ${availCount} disponíveis · sem tempo limite`}
          </span>
        </div>
      </div>

      {/* Scrim */}
      <div className={`sl-scrim ${activePanel ? 'on' : ''}`} onClick={() => setActivePanel(null)} />

      {/* Panel 1: Especialidades */}
      <aside className={`sl-panel ${activePanel === 'esp' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button className="sl-back" onClick={() => setActivePanel(null)}><ChevronRight size={20} /></button>
            <div><div className="sl-p-crumb">Etapa 1 de 3</div><div className="sl-p-title">Especialidades</div></div>
          </div>
        </div>
        <div className="sl-p-body">
          <div className="sl-search">
            <Search size={16} />
            <input placeholder="Buscar especialidade" value={searchEsp} onChange={e => setSearchEsp(e.target.value)} />
          </div>
          <div className="sl-alpha">
            <button className={!letterEsp ? 'on' : ''} onClick={() => setLetterEsp('')}>Todos</button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => (
              <button key={L} disabled={!espLetters.includes(L)} className={letterEsp === L ? 'on' : ''} onClick={() => setLetterEsp(prev => prev === L ? '' : L)}>{L}</button>
            ))}
          </div>
          <button className="sl-selall" onClick={() => {
            if (form.specialties?.length === opts.specialties.length) setForm(p => ({...p, specialties: [], temas: []}));
            else setForm(p => ({...p, specialties: [...opts.specialties]}));
          }}>
            <span className={`sl-cbx ${form.specialties?.length === opts.specialties.length && opts.specialties.length > 0 ? 'on' : form.specialties?.length ? 'half' : ''}`}><Check size={14} /></span>
            <span>Selecionar todas as especialidades</span>
          </button>
          
          <div className="sl-list">
            {filteredEsps.map(e => {
              const on = form.specialties?.includes(e);
              const tCount = opts.temas_por_especialidade[e]?.length || 0;
              const tSelCount = opts.temas_por_especialidade[e]?.filter(t => form.temas?.includes(t)).length || 0;
              
              return (
                <div key={e} className={`sl-row ${on ? 'sel' : ''}`}>
                  <span className={`sl-cbx ${on ? 'on' : ''}`} onClick={() => toggleSet('specialties', e)}><Check size={14} /></span>
                  <span className="sl-row-main" onClick={() => toggleSet('specialties', e)}>
                    <span className="sl-row-t">{e}</span>
                    <span className="sl-row-d">{tCount} tema(s) {tSelCount > 0 ? `· ${tSelCount} selecionado(s)` : ''}</span>
                  </span>
                  <button className="sl-drill" onClick={(ev) => { ev.stopPropagation(); setDrillEsp(e); setActivePanel('tema'); }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
            {filteredEsps.length === 0 && <div className="sl-row empty"><span className="sl-row-main">Nada encontrado</span></div>}
          </div>
        </div>
        <div className="sl-p-foot">
          <span className="sl-cnt"><b>{availCount}</b> questões nesta seleção</span>
          <button className="sl-btn ghost" onClick={() => setForm(p => ({...p, specialties: [], temas: []}))}>Limpar</button>
          <button className="sl-btn" onClick={() => setActivePanel(null)}>Concluir</button>
        </div>
      </aside>

      {/* Panel 1.1: Temas */}
      <aside className={`sl-panel ${activePanel === 'tema' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button className="sl-back" style={{ transform: 'rotate(180deg)' }} onClick={() => setActivePanel('esp')}><ChevronRight size={20} /></button>
            <div><div className="sl-p-crumb">{drillEsp}</div><div className="sl-p-title">Temas</div></div>
          </div>
        </div>
        <div className="sl-p-body">
          <div className="sl-search">
            <Search size={16} />
            <input placeholder="Buscar tema" value={searchTema} onChange={e => setSearchTema(e.target.value)} />
          </div>
          
          <button className="sl-selall" onClick={() => {
            const allTemas = opts.temas_por_especialidade[drillEsp!] || [];
            const isAllSelected = allTemas.every(t => form.temas?.includes(t));
            if (isAllSelected) {
              setForm(p => ({ ...p, temas: (p.temas || []).filter(t => !allTemas.includes(t)) }));
            } else {
              setForm(p => ({ ...p, temas: Array.from(new Set([...(p.temas || []), ...allTemas])) }));
              if (!form.specialties?.includes(drillEsp!)) {
                setForm(p => ({ ...p, specialties: [...(p.specialties || []), drillEsp!] }));
              }
            }
          }}>
            <span className="sl-cbx"><Check size={14} /></span>
            <span>Selecionar tudo de {drillEsp}</span>
          </button>

          <div className="sl-list">
            {filteredTemas.map(t => {
              const on = form.temas?.includes(t);
              return (
                <div key={t} className={`sl-row ${on ? 'sel' : ''}`} onClick={() => toggleSet('temas', t)}>
                  <span className={`sl-cbx ${on ? 'on' : ''}`}><Check size={14} /></span>
                  <span className="sl-row-main"><span className="sl-row-t">{t}</span></span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sl-p-foot">
          <button className="sl-btn" onClick={() => setActivePanel('esp')}>Voltar aos filtros</button>
        </div>
      </aside>

      {/* Panel 2: Instituições */}
      <aside className={`sl-panel ${activePanel === 'inst' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button className="sl-back" onClick={() => setActivePanel(null)}><ChevronRight size={20} /></button>
            <div><div className="sl-p-crumb">Etapa 2 de 3</div><div className="sl-p-title">Bancas</div></div>
          </div>
        </div>
        <div className="sl-p-body">
          <div className="sl-search">
            <Search size={16} />
            <input placeholder="Buscar banca" value={searchInst} onChange={e => setSearchInst(e.target.value)} />
          </div>
          <div className="sl-list">
            {filteredBancas.map(b => {
              const on = form.bancas?.includes(b);
              return (
                <div key={b} className={`sl-row ${on ? 'sel' : ''}`} onClick={() => toggleSet('bancas', b)}>
                  <span className={`sl-cbx ${on ? 'on' : ''}`}><Check size={14} /></span>
                  <span className="sl-row-main"><span className="sl-row-t">{b}</span></span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sl-p-foot">
          <span className="sl-cnt"><b>{availCount}</b> questões disponíveis</span>
          <button className="sl-btn" onClick={() => setActivePanel(null)}>Concluir</button>
        </div>
      </aside>

      {/* Panel 3: Ajustes gerais */}
      <aside className={`sl-panel ${activePanel === 'ger' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button className="sl-back" onClick={() => setActivePanel(null)}><ChevronRight size={20} /></button>
            <div><div className="sl-p-crumb">Etapa 3 de 3</div><div className="sl-p-title">Ajustes gerais</div></div>
          </div>
        </div>
        <div className="sl-p-body">
          <div className="sl-grp-h">Ano da prova</div>
          <div className="sl-opts">
            <button className={`sl-opt ${!form.anos?.length ? 'on' : ''}`} onClick={() => setForm(p => ({...p, anos: []}))}>Todos os anos</button>
            {opts.anos.map(a => (
              <button key={a} className={`sl-opt ${form.anos?.includes(a) ? 'on' : ''}`} onClick={() => toggleSet('anos', a)}>{a}</button>
            ))}
          </div>

          <div className="sl-grp-h">Quantidade de questões</div>
          <div className="sl-stepper">
            <span className="sl-qty-lbl">Múltipla escolha<small>disponíveis: <b>{availCount}</b></small></span>
            <div className="sl-qty">
              <button onClick={() => setForm(p => ({ ...p, num_questions: Math.max(1, (p.num_questions||10) - 1) }))}>−</button>
              <span>{form.num_questions}</span>
              <button onClick={() => setForm(p => ({ ...p, num_questions: Math.min(availCount, (p.num_questions||10) + 1) }))}>+</button>
            </div>
          </div>
        </div>
        <div className="sl-p-foot">
          <span className="sl-cnt">Total selecionado: <b>{form.num_questions}</b></span>
          <button className="sl-btn" onClick={() => setActivePanel(null)}>Concluir</button>
        </div>
      </aside>
    </div>
      </main>
    </div>
  );
};

export default SimuladosListPage;
