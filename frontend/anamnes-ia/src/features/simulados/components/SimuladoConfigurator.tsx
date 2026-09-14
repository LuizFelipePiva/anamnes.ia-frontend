import React, { useEffect, useState } from 'react';
import { ChevronRight, Check, Play, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createSimulado,
  countAvailableQuestions,
  fetchFilterOptions,
} from '../services/simuladosService';
import type { SimuladoCreate, SimuladoFilterOptions } from '../types/simulado';
import '../pages/SimuladosListPage.css';

type PanelType = 'esp' | 'tema' | 'inst' | 'ger' | null;

interface SimuladoConfiguratorProps {
  compact?: boolean;
}

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

export const SimuladoConfigurator: React.FC<SimuladoConfiguratorProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const [opts, setOpts] = useState<SimuladoFilterOptions>({
    specialties: [],
    temas_por_especialidade: {},
    bancas: [],
    subtemas: [],
    anos: [],
  });

  const [form, setForm] = useState<SimuladoCreate>(defaultForm);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [drillEsp, setDrillEsp] = useState<string | null>(null);

  const [availCount, setAvailCount] = useState<number>(0);
  const [shownCount, setShownCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);

  const [searchEsp, setSearchEsp] = useState('');
  const [searchTema, setSearchTema] = useState('');
  const [searchInst, setSearchInst] = useState('');
  const [letterEsp, setLetterEsp] = useState<string>('');

  const titleClass = compact
    ? 'mb-0 text-[1.2rem] sm:text-[1.4rem] font-black tracking-[-0.06em] text-[#17181f] leading-none'
    : 'sl-h1';
  const subClass = compact
    ? 'mt-3 mb-6 max-w-[56ch] text-[0.95rem] leading-6 text-[#4d5266]'
    : 'sl-sub';
  const meterTitleClass = compact
    ? 'block text-[#1d1f2b] font-black text-[1.15rem] sm:text-[1.25rem] leading-[1.1] tracking-[-0.05em]'
    : 'sl-meter-title';
  const stepTitleClass = compact
    ? 'block text-[#1b1d24] text-[1rem] sm:text-[1.05rem] font-bold tracking-[-0.03em] leading-tight'
    : 'sl-step-t';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchFilterOptions();
        if (cancelled) return;

        setOpts(data);

        const initialCount = await countAvailableQuestions({});
        if (cancelled) return;

        setAvailCount(initialCount.count);
        setShownCount(initialCount.count);
      } catch (error) {
        console.error(error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadingCount(true);

      countAvailableQuestions(form)
        .then(res => {
          setAvailCount(res.count);

          if (form.num_questions && res.count > 0 && form.num_questions > res.count) {
            setForm(prev => ({ ...prev, num_questions: res.count }));
          } else if (res.count > 0 && form.num_questions === 0) {
            setForm(prev => ({ ...prev, num_questions: Math.min(10, res.count) }));
          }

          const start = shownCount;
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
        })
        .catch(() => setLoadingCount(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [form.specialties, form.temas, form.bancas, form.anos]);

  type FilterField = 'specialties' | 'bancas' | 'temas' | 'anos';

  const toggleSet = (field: FilterField, val: string | number) => {
    setForm(prev => {
      if (field === 'anos') {
        const year = Number(val);
        const arr = prev.anos || [];
        const nextArr = arr.includes(year) ? arr.filter(x => x !== year) : [...arr, year];
        return { ...prev, anos: nextArr };
      }

      const value = String(val);
      const arr = prev[field] || [];
      const isSelected = arr.includes(value);
      const nextArr = isSelected ? arr.filter(x => x !== value) : [...arr, value];
      const newForm: SimuladoCreate = { ...prev, [field]: nextArr };

      // Cascading logic
      if (field === 'specialties' && isSelected) {
        // Removed an specialty -> remove its temas
        const temasOfEsp = opts.temas_por_especialidade[value] || [];
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

  const removeFilter = (field: FilterField, val: string | number) => {
    toggleSet(field, val);
  };

  const handleCreate = async () => {
    if (availCount === 0) return;

    try {
      const sim = await createSimulado({
        ...form,
        title: `Simulado - ${new Date().toLocaleDateString()}`,
        num_questions: form.num_questions || 10,
      });
      navigate(`/simulados/${sim.id}/run`);
    } catch {
      alert('Erro ao criar simulado');
    }
  };

  const espLetters = Array.from(new Set(opts.specialties.map(e => e[0].toUpperCase())));
  const filteredEsps = opts.specialties.filter(
    e =>
      (!searchEsp || e.toLowerCase().includes(searchEsp.toLowerCase())) &&
      (!letterEsp || e[0].toUpperCase() === letterEsp),
  );

  const temasOfDrill = drillEsp ? (opts.temas_por_especialidade[drillEsp] || []) : [];
  const filteredTemas = temasOfDrill.filter(t => !searchTema || t.toLowerCase().includes(searchTema.toLowerCase()));
  const filteredBancas = opts.bancas.filter(b => !searchInst || b.toLowerCase().includes(searchInst.toLowerCase()));

  return (
    <>
      <div className="sl-wrap">
        <h1 className={titleClass}>Configurar simulado</h1>
        <p className={subClass}>
          Escolha o que quer treinar. O contador do banco atualiza a cada filtro —
          <span className="block">você vê quantas questões sobram antes de começar.</span>
        </p>

        <div className="sl-meter">
          <div className="sl-meter-top">
            <div className="sl-meter-num">
              <span className="sl-meter-value" style={{ opacity: loadingCount ? 0.6 : 1 }}>
                {shownCount}
              </span>
              <span className="sl-meter-divider">/</span>
              <span className="sl-meter-total">{availCount}</span>
            </div>

            <div className="sl-meter-lbl">
              <span className={meterTitleClass}>questões disponíveis</span>
              <span className="sl-meter-caption">no banco com os filtros atuais</span>
            </div>

            <div className="sl-meter-chips">
              {(form.specialties || []).length || (form.temas || []).length || (form.bancas || []).length || (form.anos || []).length ? (
                <>
                  {(form.specialties || []).map(e => (
                    <span key={e} className="sl-fchip">
                      <em>área</em> {e} <button type="button" onClick={() => removeFilter('specialties', e)}><X size={12} /></button>
                    </span>
                  ))}
                  {(form.temas || []).map(t => (
                    <span key={t} className="sl-fchip">
                      <em>tema</em> {t} <button type="button" onClick={() => removeFilter('temas', t)}><X size={12} /></button>
                    </span>
                  ))}
                  {(form.bancas || []).map(b => (
                    <span key={b} className="sl-fchip">
                      <em>banca</em> {b} <button type="button" onClick={() => removeFilter('bancas', b)}><X size={12} /></button>
                    </span>
                  ))}
                  {(form.anos || []).map(a => (
                    <span key={a} className="sl-fchip">
                      <em>ano</em> {a} <button type="button" onClick={() => removeFilter('anos', a)}><X size={12} /></button>
                    </span>
                  ))}
                </>
              ) : (
                <span className="sl-fchip none">nenhum filtro — banco inteiro</span>
              )}
            </div>
          </div>

          <div className="sl-bar-line" />
        </div>

        <div className="sl-steps">
          <button
            type="button"
            className={`sl-step ${form.specialties?.length ? 'done' : ''}`}
            onClick={() => setActivePanel('esp')}
          >
            <span className="sl-step-n">1</span>
            <span className="sl-step-copy">
              <span className={stepTitleClass}>Especialidades e temas</span>
              <span className="sl-step-d">Filtre por grande área e afunile por tema</span>
            </span>
            <span className="sl-step-v">
              <span className={`sl-pill ${form.specialties?.length ? 'act' : ''}`}>
                {form.specialties?.length ? `${form.specialties.length} área(s)` : 'todas'}
              </span>
              <span className="sl-chev">
                <ChevronRight size={17} />
              </span>
            </span>
          </button>

          <button
            type="button"
            className={`sl-step ${form.bancas?.length ? 'done' : ''}`}
            onClick={() => setActivePanel('inst')}
          >
            <span className="sl-step-n">2</span>
            <span className="sl-step-copy">
              <span className={stepTitleClass}>Instituições</span>
              <span className="sl-step-d">Banca de origem da prova</span>
            </span>
            <span className="sl-step-v">
              <span className={`sl-pill ${form.bancas?.length ? 'act' : ''}`}>
                {form.bancas?.length ? `${form.bancas.length} banca(s)` : 'todas'}
              </span>
              <span className="sl-chev">
                <ChevronRight size={17} />
              </span>
            </span>
          </button>

          <button type="button" className="sl-step done" onClick={() => setActivePanel('ger')}>
            <span className="sl-step-n">3</span>
            <span className="sl-step-copy">
              <span className={stepTitleClass}>Ajustes gerais</span>
              <span className="sl-step-d">Ano da prova, e quantidade de questões</span>
            </span>
            <span className="sl-step-v">
              <span className="sl-pill act">{form.num_questions} questões</span>
              <span className="sl-chev">
                <ChevronRight size={17} />
              </span>
            </span>
          </button>
        </div>

        <div className="sl-launch">
          <button type="button" className="sl-btn" onClick={handleCreate} disabled={availCount === 0}>
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

      <div className={`sl-scrim ${activePanel ? 'on' : ''}`} onClick={() => setActivePanel(null)} />

      <aside className={`sl-panel ${activePanel === 'esp' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button type="button" className="sl-back" onClick={() => setActivePanel(null)}>
              <ChevronRight size={20} />
            </button>
            <div>
              <div className="sl-p-crumb">Etapa 1 de 3</div>
              <div className="sl-p-title">Especialidades</div>
            </div>
          </div>
        </div>

        <div className="sl-p-body">
          <div className="sl-search">
            <Search size={16} />
            <input
              placeholder="Buscar especialidade"
              value={searchEsp}
              onChange={e => setSearchEsp(e.target.value)}
            />
          </div>

          <div className="sl-alpha">
            <button type="button" className={!letterEsp ? 'on' : ''} onClick={() => setLetterEsp('')}>
              Todos
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => (
              <button
                type="button"
                key={L}
                disabled={!espLetters.includes(L)}
                className={letterEsp === L ? 'on' : ''}
                onClick={() => setLetterEsp(prev => (prev === L ? '' : L))}
              >
                {L}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sl-selall"
            onClick={() => {
              if (form.specialties?.length === opts.specialties.length) setForm(p => ({ ...p, specialties: [], temas: [] }));
              else setForm(p => ({ ...p, specialties: [...opts.specialties] }));
            }}
          >
            <span className={`sl-cbx ${form.specialties?.length === opts.specialties.length && opts.specialties.length > 0 ? 'on' : form.specialties?.length ? 'half' : ''}`}>
              <Check size={14} />
            </span>
            <span>Selecionar todas as especialidades</span>
          </button>

          <div className="sl-list">
            {filteredEsps.map(e => {
              const on = form.specialties?.includes(e);
              const tCount = opts.temas_por_especialidade[e]?.length || 0;
              const tSelCount = opts.temas_por_especialidade[e]?.filter(t => form.temas?.includes(t)).length || 0;

              return (
                <div key={e} className={`sl-row ${on ? 'sel' : ''}`}>
                  <span className={`sl-cbx ${on ? 'on' : ''}`} onClick={() => toggleSet('specialties', e)}>
                    <Check size={14} />
                  </span>
                  <span className="sl-row-main" onClick={() => toggleSet('specialties', e)}>
                    <span className="sl-row-t">{e}</span>
                    <span className="sl-row-d">
                      {tCount} tema(s) {tSelCount > 0 ? `· ${tSelCount} selecionado(s)` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="sl-drill"
                    onClick={ev => {
                      ev.stopPropagation();
                      setDrillEsp(e);
                      setActivePanel('tema');
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
            {filteredEsps.length === 0 && (
              <div className="sl-row empty">
                <span className="sl-row-main">Nada encontrado</span>
              </div>
            )}
          </div>
        </div>

        <div className="sl-p-foot">
          <span className="sl-cnt">
            <b>{availCount}</b> questões nesta seleção
          </span>
          <button type="button" className="sl-btn ghost" onClick={() => setForm(p => ({ ...p, specialties: [], temas: [] }))}>
            Limpar
          </button>
          <button type="button" className="sl-btn" onClick={() => setActivePanel(null)}>
            Concluir
          </button>
        </div>
      </aside>

      <aside className={`sl-panel ${activePanel === 'tema' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button
              type="button"
              className="sl-back"
              style={{ transform: 'rotate(180deg)' }}
              onClick={() => setActivePanel('esp')}
            >
              <ChevronRight size={20} />
            </button>
            <div>
              <div className="sl-p-crumb">{drillEsp}</div>
              <div className="sl-p-title">Temas</div>
            </div>
          </div>
        </div>

        <div className="sl-p-body">
          <div className="sl-search">
            <Search size={16} />
            <input placeholder="Buscar tema" value={searchTema} onChange={e => setSearchTema(e.target.value)} />
          </div>

          <button
            type="button"
            className="sl-selall"
            onClick={() => {
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
            }}
          >
            <span className="sl-cbx">
              <Check size={14} />
            </span>
            <span>Selecionar tudo de {drillEsp}</span>
          </button>

          <div className="sl-list">
            {filteredTemas.map(t => {
              const on = form.temas?.includes(t);

              return (
                <div key={t} className={`sl-row ${on ? 'sel' : ''}`} onClick={() => toggleSet('temas', t)}>
                  <span className={`sl-cbx ${on ? 'on' : ''}`}>
                    <Check size={14} />
                  </span>
                  <span className="sl-row-main">
                    <span className="sl-row-t">{t}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sl-p-foot">
          <button type="button" className="sl-btn" onClick={() => setActivePanel('esp')}>
            Voltar aos filtros
          </button>
        </div>
      </aside>

      <aside className={`sl-panel ${activePanel === 'inst' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button type="button" className="sl-back" onClick={() => setActivePanel(null)}>
              <ChevronRight size={20} />
            </button>
            <div>
              <div className="sl-p-crumb">Etapa 2 de 3</div>
              <div className="sl-p-title">Bancas</div>
            </div>
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
                  <span className={`sl-cbx ${on ? 'on' : ''}`}>
                    <Check size={14} />
                  </span>
                  <span className="sl-row-main">
                    <span className="sl-row-t">{b}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sl-p-foot">
          <span className="sl-cnt">
            <b>{availCount}</b> questões disponíveis
          </span>
          <button type="button" className="sl-btn" onClick={() => setActivePanel(null)}>
            Concluir
          </button>
        </div>
      </aside>

      <aside className={`sl-panel ${activePanel === 'ger' ? 'on' : ''}`}>
        <div className="sl-p-head">
          <div className="sl-p-nav">
            <button type="button" className="sl-back" onClick={() => setActivePanel(null)}>
              <ChevronRight size={20} />
            </button>
            <div>
              <div className="sl-p-crumb">Etapa 3 de 3</div>
              <div className="sl-p-title">Ajustes gerais</div>
            </div>
          </div>
        </div>

        <div className="sl-p-body">
          <div className="sl-grp-h">Ano da prova</div>
          <div className="sl-opts">
            <button type="button" className={`sl-opt ${!form.anos?.length ? 'on' : ''}`} onClick={() => setForm(p => ({ ...p, anos: [] }))}>
              Todos os anos
            </button>
            {opts.anos.map(a => (
              <button
                type="button"
                key={a}
                className={`sl-opt ${form.anos?.includes(a) ? 'on' : ''}`}
                onClick={() => toggleSet('anos', a)}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="sl-grp-h">Quantidade de questões</div>
          <div className="sl-stepper">
            <span className="sl-qty-lbl">
              Múltipla escolha
              <small>
                disponíveis: <b>{availCount}</b>
              </small>
            </span>
            <div className="sl-qty">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, num_questions: Math.max(1, (p.num_questions || 10) - 1) }))}
              >
                −
              </button>
              <span>{form.num_questions}</span>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, num_questions: Math.min(availCount, (p.num_questions || 10) + 1) }))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="sl-p-foot">
          <span className="sl-cnt">
            Total selecionado: <b>{form.num_questions}</b>
          </span>
          <button type="button" className="sl-btn" onClick={() => setActivePanel(null)}>
            Concluir
          </button>
        </div>
      </aside>
    </>
  );
};

export default SimuladoConfigurator;
