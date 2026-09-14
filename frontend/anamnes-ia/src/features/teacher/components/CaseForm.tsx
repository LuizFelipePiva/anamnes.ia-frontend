import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileImage, X, Lightbulb, Check } from 'lucide-react';
import type { CaseFormData, SoapWeights, CaseCreate, CaseUpdate, CaseInfo, ClassInfo } from '../types/teacher';
import { createCase, updateCase, assignCase } from '../services/teacherService';
import { ExamPicker, fetchCaseExams, saveCaseExams } from '@/features/case';
import { SPECIALTIES, specialtyLabel } from '@/shared/utils/specialties';
import ChipInput from './ChipInput';
import { SUGGESTIONS_DATA, type Suggestions } from '../data/suggestionsData';
import ExamModal from '@/shared/components/ExamModal';
import ComplementaryExamModal from '@/shared/components/ComplementaryExamModal';

interface CaseFormProps {
  classes: ClassInfo[];
  onCaseCreated: (newCase: CaseInfo) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  editingCase?: CaseInfo;
}

type Step = 'form' | 'preview' | 'saving';
type AvailabilityMode = 'permanent' | 'days';
type AvailabilityScope = 'case' | 'class';

const DEFAULT_SOAP_WEIGHTS: SoapWeights = { S: 25, O: 25, A: 25, P: 25 };

const INITIAL_FORM: CaseFormData = {
  patologia: '',  queixa_principal: '',  sintomas: '',
  especificidades: '',
  exames: '',
  exame_fisico: '',
  historico_familiar: '',
  habitos: '',
  dificuldade: 'Intermediário',
  especialidade: '',
  persona_nome: '',
  persona_idade: '',
  persona_profissao: '',
  persona_emocional: '',
  persona_contexto: '',
  soap_weights: { ...DEFAULT_SOAP_WEIGHTS },
};

function buildPrompt(f: CaseFormData): string {
  return `Você é ${f.persona_nome || 'um(a) paciente'}, ${f.persona_idade ? f.persona_idade + ' anos' : 'idade não informada'}, ${f.persona_profissao || 'profissão não informada'}.

PERSONALIDADE E COMPORTAMENTO:
- Estado emocional: ${f.persona_emocional || 'Neutro'}
- Contexto social: ${f.persona_contexto || 'Não especificado'}
- Fale como uma pessoa REAL, usando linguagem simples e coloquial
- NÃO use termos médicos — descreva tudo do seu ponto de vista como paciente
- Revele informações GRADUALMENTE, apenas quando perguntado(a) diretamente
- Demonstre emoções condizentes com seu estado emocional

QUADRO CLÍNICO (você NÃO sabe esses termos, apenas sente os sintomas):
- Patologia real: ${f.patologia}
- Queixa principal (o que te fez vir ao médico): ${f.queixa_principal}
- Sintomas associados (descreva com suas palavras quando perguntado): ${f.sintomas || 'Não informado'}
- Especificidades relevantes: ${f.especificidades || 'Nenhuma'}
- Exame físico: ${f.exame_fisico || 'Não informado'}
- Exames que podem ser solicitados: ${f.exames || 'Não especificado'}

HISTÓRICO:
- Histórico familiar: ${f.historico_familiar || 'Não informado'}
- Hábitos de vida: ${f.habitos || 'Não informado'}

REGRAS:
- NUNCA diga seu diagnóstico ou termos técnicos
- Se perguntado algo que não sabe, diga que não sabe
- Seja consistente com suas respostas anteriores
- Nível de dificuldade para o estudante: ${f.dificuldade}`;
}

function buildTitle(f: CaseFormData): string {
  return f.persona_nome.trim() || 'Novo Caso Clínico';
}

function buildSummary(f: CaseFormData): string {
  const parts: string[] = [];
  if (f.persona_nome) parts.push(f.persona_nome);
  if (f.persona_idade) parts.push(`${f.persona_idade} anos`);
  if (f.persona_profissao) parts.push(f.persona_profissao);
  const who = parts.length ? parts.join(', ') : 'Paciente';
  return `${who}. Queixa principal: ${f.queixa_principal || 'não informada'}. Nível: ${f.dificuldade}.`;
}

// ─── Tailwind tokens ────────────────────────────────────────────────────────
const twInput  = 'w-full px-3.5 py-2.5 rounded-xl border border-[#e5e2ef] bg-white text-sm text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/20 focus:border-[#7a55ff] transition-all disabled:opacity-60';
const twLabel  = 'text-[11px] font-bold text-[#6b6880] uppercase tracking-widest mb-1 block';
const twBtnPri = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6b35ff] text-white text-sm font-semibold hover:bg-[#5a2ad9] transition-all disabled:opacity-50 cursor-pointer';
const twBtnGho = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#e9e7f6] bg-white text-sm font-semibold text-[#374151] hover:border-[#c4bfea] transition-all disabled:opacity-50 cursor-pointer';

const SPECIALTY_EMOJIS: Record<string, string> = {
  'Clínica Geral': '🩺',
  'Cardiologia': '❤️',
  'Neurologia': '🧠',
  'Pneumologia': '🫁',
  'Gastroenterologia': '🍽️',
  'Hematologia': '🩸',
  'Ortopedia': '🦴',
  'Endocrinologia': '💉',
  'Dermatologia': '🩹',
  'Ginecologia': '♀️',
  'Obstetrícia': '🤰',
  'Infectologia': '🦠',
  'Nefrologia': '🧪',
  'Pediatria': '🧸',
  'Psiquiatria': '🧩',
  'Reumatologia': '💎',
  'Urgência e Emergência': '🚨',
  'Cirurgia Geral': '🔪',
  'Oftalmologia': '👁️',
  'Otorrinolaringologia': '👂',
  'Urologia': '💧',
  'Oncologia': '🎗️'
};

// ─── ModalHeader sub-component ──────────────────────────────────────────────
const ModalHeader = ({ title, subtitle, onClose, disabled }: { title: string; subtitle: string; onClose: () => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0edf8] bg-gradient-to-r from-[#f3f1ff] to-white">
    <div>
      <div className="text-base font-bold text-[#111018]">{title}</div>
      <div className="text-xs text-[#6b6880] mt-0.5">{subtitle}</div>
    </div>
    <button
      className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-all disabled:opacity-50"
      onClick={onClose}
      disabled={disabled}
    >
      <X size={14} />
    </button>
  </div>
);

// ─── Field sub-component ────────────────────────────────────────────────────
const Field = ({ 
  label, 
  children, 
  hasSuggestions, 
  onSuggestionSelect, 
  currentSpecialty, 
  fieldKey, 
  currentValue,
  currentPatologia,
  showExploration, // Nova prop para controlar o botão "Outros"
  onLightbulbClick // Nova prop para sobrescrever a ação da lâmpada
}: { 
  label: string; 
  children: React.ReactNode; 
  hasSuggestions?: boolean; 
  onSuggestionSelect?: (val: string) => void;
  currentSpecialty?: string;
  fieldKey?: string;
  currentValue?: string;
  currentPatologia?: string;
  showExploration?: boolean;
  onLightbulbClick?: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [viewState, setViewState] = useState<'auto' | 'categories' | 'category-detail'>('auto');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setViewState('auto');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getContextSuggestions = () => {
    if (!fieldKey || !currentPatologia) return [];
    
    const selectedPathologies = currentPatologia.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const contextSuggestions: string[] = [];

    selectedPathologies.forEach(p => {
      const entry = Object.entries(SUGGESTIONS_DATA.pathologySpecific).find(([name]) => {
        const n = name.toLowerCase().trim();
        return n.includes(p) || p.includes(n);
      });
      if (entry && entry[1] && (entry[1] as Suggestions)[fieldKey]) {
        const val = (entry[1] as Suggestions)[fieldKey];
        if (Array.isArray(val)) {
          contextSuggestions.push(...(val as string[]));
        }
      }
    });

    return Array.from(new Set(contextSuggestions));
  };

  const getSpecialtySuggestions = () => {
    if (!fieldKey) return [];
    const specClean = currentSpecialty?.replace(/[^\p{L}\s/]/gu, '').trim() || 'Clínica Geral';
    const val = (SUGGESTIONS_DATA.categories[specClean] as Suggestions)?.[fieldKey];
    return Array.isArray(val) ? val : [];
  };

  const getSearchMatches = () => {
    if (!fieldKey || !searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase().trim();
    const matches = new Set<string>();
    Object.values(SUGGESTIONS_DATA.categories).forEach(cat => {
      const list = (cat as Suggestions)[fieldKey];
      if (Array.isArray(list)) {
        list.forEach((v: string) => { if (v.toLowerCase().includes(query)) matches.add(v); });
      }
    });
    return Array.from(matches).sort();
  };

  const handleItemClick = (suggestion: string) => {
    const newContent = currentValue ? (currentValue.includes(suggestion) ? currentValue : currentValue + ', ' + suggestion) : suggestion;
    onSuggestionSelect?.(newContent);
    setShowMenu(false);
    setViewState('auto');
    setSearchTerm('');
  };

  const handleSelectAll = (suggestions: string[]) => {
    let newContent = currentValue || '';
    suggestions.forEach(s => {
      if (!newContent.toLowerCase().includes(s.toLowerCase())) {
        newContent = newContent ? newContent + ', ' + s : s;
      }
    });
    onSuggestionSelect?.(newContent);
    setShowMenu(false);
    setViewState('auto');
    setSearchTerm('');
  };

  const contextSuggestions = getContextSuggestions();
  const specialtySuggestions = getSpecialtySuggestions();
  const showSelectAllVisible = !!fieldKey && fieldKey !== 'patologia' && fieldKey !== 'queixa_principal';

  return (
    <div className="flex flex-col gap-1 relative">
      <div className="flex items-center gap-1.5 min-h-[16px]">
        <span className={twLabel + ' !mb-0'}>{label}</span>
        {hasSuggestions && (
          <button 
            type="button"
            onClick={() => onLightbulbClick ? onLightbulbClick() : setShowMenu(!showMenu)} 
            className={`p-1 rounded-md transition-all ${showMenu ? 'bg-[#7a55ff] text-white' : 'text-[#7a55ff] hover:bg-[#f3f0ff]'}`}
            title="Ver sugestões"
          >
            <Lightbulb size={12} />
          </button>
        )}
      </div>
      
      {children}

      {showMenu && (
        <div 
          ref={menuRef}
          className="absolute z-[100] top-full left-0 mt-1 w-full max-w-[300px] bg-white rounded-xl shadow-xl border border-[#e5e2ef] overflow-hidden py-1 animate-in fade-in slide-in-from-top-2"
        >
          {/* SEARCH BAR */}
          <div className="px-2 py-1.5 border-b border-[#f0edf8] bg-[#fdfcff]">
            <div className="relative">
              <input 
                type="text"
                autoFocus
                className="w-full pl-7 pr-3 py-1.5 bg-[#f5f3fb] border-none text-[12px] rounded-lg focus:ring-1 focus:ring-[#7a55ff]/30 text-[#111018] placeholder-[#9893b0]"
                placeholder={`Buscar em ${label}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9893b0]">
                <Lightbulb size={12} />
              </div>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9893b0] hover:text-[#ff4b4b]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {searchTerm.trim() ? (
            <>
              <div className="px-3 py-1.5 bg-[#fdfcff] border-b border-[#f0edf8]">
                <span className="text-[10px] font-bold text-[#7a55ff] uppercase tracking-wider">Resultados Encontrados</span>
              </div>
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                {getSearchMatches().length > 0 ? (
                  getSearchMatches().map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f0ff] hover:text-[#6b35ff] border-b border-[#f8f7fd] last:border-0 transition-colors"
                      onClick={() => handleItemClick(s)}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-[10px] text-[#9893b0]">
                    Nenhum "{label}" encontrado com este nome.
                  </div>
                )}
              </div>
            </>
          ) : viewState === 'auto' ? (
            <>
              <div className="px-3 py-1.5 border-b border-[#f0edf8] flex items-center justify-between bg-[#fbfaff]">
                <span className="text-[10px] font-bold text-[#9893b0] uppercase">
                  {contextSuggestions.length > 0 ? '✨ Sugestões Contextuais' : '💡 Ideias'}
                </span>
                <button onClick={() => setShowMenu(false)} className="text-[#9893b0] hover:text-[#111018]"><X size={10} /></button>
              </div>
              <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                {(contextSuggestions.length > 0 ? contextSuggestions : specialtySuggestions).map((s: string, i: number) => {
                  const isUsed = currentValue?.toLowerCase().includes(s.toLowerCase());
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-[#f8f7fd] last:border-0 flex items-center justify-between group
                        ${isUsed ? 'bg-[#f0fdf4] text-[#166534]' : 'text-[#374151] hover:bg-[#f3f0ff] hover:text-[#6b35ff]'}`}
                      onClick={() => handleItemClick(s)}
                    >
                      <span className="flex-1">{s}</span>
                      {isUsed && (
                        <span className="flex items-center gap-1 text-[9px] font-bold bg-[#dcfce7] px-1.5 py-0.5 rounded-full text-[#15803d]">
                          <Check size={10} /> USADO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex border-t border-[#f0edf8]">
                {showSelectAllVisible && (contextSuggestions.length > 0 || specialtySuggestions.length > 0) && (
                  <button 
                    onClick={() => handleSelectAll(contextSuggestions.length > 0 ? contextSuggestions : specialtySuggestions)}
                    className="flex-1 px-3 py-2.5 bg-white text-[#16a34a] text-[11px] font-bold uppercase tracking-wider hover:bg-[#f0fdf4] transition-all border-r border-[#f0edf8]"
                  >
                    Marcar Todos ✅
                  </button>
                )}
                {showExploration && (
                  <button 
                    onClick={() => setViewState('categories')}
                    className="flex-1 px-3 py-2.5 bg-[#f5f3ff] text-[#6b35ff] text-[11px] font-bold uppercase tracking-wider hover:bg-[#ede9fe] transition-all"
                  >
                    Outros 🔍
                  </button>
                )}
              </div>
            </>
          ) : viewState === 'categories' ? (
            <>
              <div className="px-3 py-1.5 border-b border-[#f0edf8] flex items-center justify-between bg-[#fbfaff]">
                <span className="text-[10px] font-bold text-[#9893b0] uppercase">Abrindo Gavetas...</span>
                <button onClick={() => setViewState('auto')} className="text-[#6b35ff] text-[10px] font-bold">← Voltar</button>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {Object.keys(SUGGESTIONS_DATA.categories).map((cat: string) => (
                  <button
                    key={cat}
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-xs text-[#374151] hover:bg-[#f3f0ff] border-b border-[#f8f7fd] flex items-center justify-between group"
                    onClick={() => {
                      setSelectedCat(cat);
                      setViewState('category-detail');
                    }}
                  >
                    <span>{cat}</span>
                    <span className="text-[#9893b0] group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b border-[#f0edf8] flex items-center justify-between bg-[#fbfaff]">
                <span className="text-[10px] font-bold text-[#9893b0] uppercase">{selectedCat}</span>
                <button onClick={() => setViewState('categories')} className="text-[#6b35ff] text-[10px] font-bold">← Voltar</button>
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                {fieldKey && selectedCat && (SUGGESTIONS_DATA.categories[selectedCat] as Suggestions)?.[fieldKey] ? (
                  ((SUGGESTIONS_DATA.categories[selectedCat] as Suggestions)[fieldKey] as string[]).map((s: string, i: number) => {
                    const isUsed = currentValue?.toLowerCase().includes(s.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-[#f8f7fd] last:border-0 flex items-center justify-between group
                          ${isUsed ? 'bg-[#f0fdf4] text-[#166534]' : 'text-[#374151] hover:bg-[#f3f0ff] hover:text-[#6b35ff]'}`}
                        onClick={() => handleItemClick(s)}
                      >
                        <span className="flex-1">{s}</span>
                        {isUsed && (
                          <span className="flex items-center gap-1 text-[9px] font-bold bg-[#dcfce7] px-1.5 py-0.5 rounded-full text-[#15803d]">
                            <Check size={10} /> USADO
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-center text-xs text-[#9893b0]">Sem sugestões nesta gaveta.</div>
                )}
              </div>

              {showSelectAllVisible && selectedCat && (SUGGESTIONS_DATA.categories[selectedCat] as Suggestions)?.[fieldKey] && (
                <button 
                  onClick={() => handleSelectAll((SUGGESTIONS_DATA.categories[selectedCat] as Suggestions)[fieldKey] as string[])}
                  className="w-full px-3 py-2.5 bg-white text-[#16a34a] text-[11px] font-bold uppercase tracking-wider hover:bg-[#f0fdf4] transition-all border-t border-[#f0edf8]"
                >
                  Marcar Todos da Categoria ✅
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const VerticalSlider: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const getValueFromY = (clientY: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    return Math.round(Math.max(0, Math.min(1, ratio)) * 100 / 20) * 20;
  };

  const startDrag = (clientY: number) => {
    onChange(getValueFromY(clientY));
    const onMove = (e: MouseEvent) => onChange(getValueFromY(e.clientY));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className="flex justify-center py-2">
      {/* Hit area: 9px padding top/bottom covers the ball at 0% and 100% */}
      <div
        className="relative cursor-pointer select-none"
        style={{ width: 20, paddingTop: 9, paddingBottom: 9 }}
        onMouseDown={e => { e.preventDefault(); startDrag(e.clientY); }}
        onTouchStart={e => onChange(getValueFromY(e.touches[0].clientY))}
        onTouchMove={e => { e.preventDefault(); onChange(getValueFromY(e.touches[0].clientY)); }}
      >
        {/* Track — ref here for accurate coordinate calculation */}
        <div
          ref={trackRef}
          className="relative rounded-full bg-[#f0edf8]"
          style={{ width: 10, height: 72, margin: '0 auto' }}
        >
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full bg-[#6b35ff]"
            style={{ height: `${pct}%`, transition: 'height 80ms ease' }}
          />
          {/* Step tick marks at 20/40/60/80 */}
          {[20, 40, 60, 80].map(s => (
            <div
              key={s}
              className="absolute left-0 right-0 pointer-events-none"
              style={{ bottom: `${s}%`, height: 1, background: 'rgba(255,255,255,0.55)' }}
            />
          ))}
          {/* Ball — overflows track vertically at extremes */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white border-2 border-[#6b35ff] pointer-events-none"
            style={{
              width: 18, height: 18,
              bottom: `calc(${pct}% - 9px)`,
              transition: 'bottom 80ms ease',
              boxShadow: '0 1px 4px rgba(107,53,255,.35)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const CaseForm: React.FC<CaseFormProps> = ({ classes, onCaseCreated, onClose, showToast, editingCase }) => {
  const { t } = useTranslation('teacher');
  // Os textos dos exames vivem no namespace `case`, junto do resto da feature
  // (SPEC-014) — o professor e o aluno compartilham os rótulos de modalidade.
  const { t: tCase } = useTranslation('case');
  const isEditing = !!editingCase;
  const [step, setStep] = useState<Step>(isEditing ? 'preview' : 'form');
  const [form, setForm] = useState<CaseFormData>(() => {
    if (editingCase?.form_data) {
      const fd = editingCase.form_data as unknown as CaseFormData;
      return { ...INITIAL_FORM, ...fd, soap_weights: fd.soap_weights ?? { ...DEFAULT_SOAP_WEIGHTS } };
    }
    return INITIAL_FORM;
  });
  const [generatedPrompt, setGeneratedPrompt] = useState(editingCase?.patient_prompt ?? '');
  const [generatedTitle, setGeneratedTitle] = useState(editingCase?.title ?? '');
  const [generatedSummary, setGeneratedSummary] = useState(editingCase?.summary ?? '');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [publishNow, setPublishNow] = useState(editingCase?.published ?? false);
  const [availabilityMode, setAvailabilityMode] = useState<AvailabilityMode>(
    editingCase?.available_until ? 'days' : 'permanent'
  );
  const [availabilityDays, setAvailabilityDays] = useState<number>(7);
  // Edit mode: use a date string directly to avoid recalculating from days
  const [availabilityDate, setAvailabilityDate] = useState<string>(
    editingCase?.available_until ? new Date(editingCase.available_until).toISOString().slice(0, 10) : ''
  );
  const [availabilityScope, setAvailabilityScope] = useState<AvailabilityScope>('case');

  // Exames complementares (SPEC-014). Ficam em estado local e só são
  // persistidos depois do save: na criação o caso ainda não tem `id`, então
  // não há a que anexar enquanto o professor preenche o formulário.
  const [showPhysicalExamModal, setShowPhysicalExamModal] = useState(false);
  const [showComplementaryExamModal, setShowComplementaryExamModal] = useState(false);
  const [examsChanged, setExamsChanged] = useState(false);
  const [examIds, setExamIds] = useState<string[]>([]);
  const [showExamPicker, setShowExamPicker] = useState(false);

  useEffect(() => {
    if (!editingCase) return;
    let alive = true;
    // Falha ao carregar não bloqueia a edição do caso — o professor reanexa se
    // precisar, e travar o formulário inteiro por causa disso seria pior.
    fetchCaseExams(editingCase.id)
      .then(assets => { if (alive) setExamIds(assets.map(a => a.id)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [editingCase]);

  const up = <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const soapWeightsTotal = Object.values(form.soap_weights ?? DEFAULT_SOAP_WEIGHTS).reduce((a, b) => a + b, 0);

  const updateWeight = (letter: keyof SoapWeights, value: string | number) => {
    const num = Math.max(0, Math.min(100, typeof value === 'number' ? value : (Number(value) || 0)));
    setForm(prev => ({ ...prev, soap_weights: { ...prev.soap_weights, [letter]: num } }));
  };

  const redistributeRemaining = () => {
    const weights = form.soap_weights ?? DEFAULT_SOAP_WEIGHTS;
    const remaining = 100 - soapWeightsTotal;
    if (remaining === 0) return;
    const emptyLetters = (['S', 'O', 'A', 'P'] as const).filter(l => weights[l] === 0);
    if (emptyLetters.length === 0) return;
    const share = Math.floor(remaining / emptyLetters.length);
    const leftover = remaining - share * emptyLetters.length;
    const updated = { ...weights };
    emptyLetters.forEach((l, i) => { updated[l] = share + (i === emptyLetters.length - 1 ? leftover : 0); });
    setForm(prev => ({ ...prev, soap_weights: updated }));
  };

  const selectedItems = (value: string = '') => (value.includes('\n') ? value.split('\n') : value.split(','))
    .map(item => item.trim())
    .filter(Boolean);

  const examSummary = (value: string | undefined, emptyLabel: string) => {
    const items = selectedItems(value);
    if (!items.length) return emptyLabel;
    return items.length === 1 ? items[0] : `${items.length} itens selecionados`;
  };

  const handleGeneratePrompt = () => {
    if (!form.patologia.trim() || !form.queixa_principal.trim()) {
      showToast(t('caseForm.err_clinical_required'));
      return;
    }
    if (!form.persona_nome.trim()) {
      showToast(t('caseForm.err_name_required'));
      return;
    }
    if (soapWeightsTotal !== 100) {
      showToast(t('caseForm.err_soap_sum', { total: soapWeightsTotal }));
      return;
    }
    setGeneratedPrompt(buildPrompt(form));
    setGeneratedTitle(buildTitle(form));
    setGeneratedSummary(buildSummary(form));
    setStep('preview');
  };

  const handleSave = async () => {
    if (!generatedTitle.trim()) { showToast(t('caseForm.err_title_required')); return; }
    setStep('saving');
    try {
      let computedAvailableUntil: string | null;
      if (isEditing) {
        if (availabilityMode === 'days' && !availabilityDate) {
          showToast(t('caseForm.err_expiry_required'));
          setStep('preview');
          return;
        }
        // Fim do dia em UTC, consistente com os prazos de atribuição do backend (T23:59:59)
        computedAvailableUntil = availabilityMode === 'days'
          ? new Date(`${availabilityDate}T23:59:59Z`).toISOString()
          : null;
      } else {
        computedAvailableUntil = availabilityMode === 'days'
          ? new Date(Date.now() + availabilityDays * 24 * 60 * 60 * 1000).toISOString()
          : null;
      }
      const applyToClass = !isEditing && Boolean(selectedClassId) && availabilityMode === 'days' && availabilityScope === 'class';
      const payload: CaseCreate | CaseUpdate = {
        title: generatedTitle.trim(),
        specialty: form.especialidade.trim() || undefined,
        difficulty: form.dificuldade,
        summary: generatedSummary.trim() || undefined,
        patient_prompt: generatedPrompt.trim(),
        form_data: form as unknown as Record<string, unknown>,
        published: publishNow,
        visibility: 'turma',
        available_until: applyToClass ? null : computedAvailableUntil,
      };

      let savedCase: CaseInfo;
      if (isEditing && editingCase) {
        savedCase = await updateCase(editingCase.id, payload as CaseUpdate);
      } else {
        savedCase = await createCase(payload as CaseCreate);
        if (selectedClassId) {
          try {
            const dueDate = applyToClass && computedAvailableUntil
              ? computedAvailableUntil.slice(0, 10)
              : undefined;
            await assignCase(savedCase.id, selectedClassId, dueDate);
          }
          catch { showToast(t('caseForm.err_assign')); }
        }
      }

      // Depois do caso existir: agora há um `id` a que anexar. Falha aqui não
      // desfaz o caso salvo — o professor reabre e reanexa, que é bem menos
      // custoso do que perder o prompt que acabou de escrever.
      if (examsChanged) {
        try { await saveCaseExams(savedCase.id, examIds); }
        catch { showToast(t('caseForm.err_exams')); }
      }

      onCaseCreated(savedCase);
      showToast(isEditing
        ? t('caseForm.updated_success', { title: generatedTitle })
        : t('caseForm.saved_success', { title: generatedTitle }));
      onClose();
    } catch {
      showToast(isEditing ? t('caseForm.err_update') : t('caseForm.err_save'));
      setStep('preview');
    }
  };

  // ══════════════════════════════════════════════════════════════
  // STEP 1: FORMULÁRIO
  // ══════════════════════════════════════════════════════════════
  if (step === 'form') {
    return (
      <>
        <ModalHeader
          title={isEditing ? t('caseForm.edit_title') : t('caseForm.create_title')}
          subtitle={t('caseForm.form_subtitle')}
          onClose={onClose}
        />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Dados Clínicos */}
          <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">{t('caseForm.section_clinical')}</div>

          <div className="grid grid-cols-2 gap-3">
            <Field 
              label={t('caseForm.pathology')} 
              hasSuggestions 
              fieldKey="patologia"
              currentSpecialty={form.especialidade}
              currentValue={form.patologia}
              onSuggestionSelect={val => up('patologia', val)}
              showExploration
            >
              <ChipInput 
                value={form.patologia} 
                onChange={val => up('patologia', val)} 
                placeholder={t('caseForm.pathology_placeholder')} 
              />
            </Field>
            <Field label={t('caseForm.specialty')}>
              <select className={twInput} value={form.especialidade} onChange={e => up('especialidade', e.target.value)}>
                <option value="">{t('caseForm.select_specialty')}</option>
                {Object.keys(SUGGESTIONS_DATA.categories).sort().map(cat => (
                  <option key={cat} value={cat}>
                    {SPECIALTY_EMOJIS[cat] || '📋'} {cat}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field 
            label={t('caseForm.chief_complaint')} 
            hasSuggestions 
            fieldKey="queixa_principal"
            currentSpecialty={form.especialidade}
            currentValue={form.queixa_principal}
            currentPatologia={form.patologia}
            onSuggestionSelect={val => up('queixa_principal', val)}
          >
            <input className={twInput} value={form.queixa_principal} onChange={e => up('queixa_principal', e.target.value)} placeholder={t('caseForm.chief_complaint_placeholder')} />
          </Field>

          <Field 
            label={t('caseForm.symptoms')} 
            hasSuggestions 
            fieldKey="sintomas"
            currentSpecialty={form.especialidade}
            currentValue={form.sintomas}
            currentPatologia={form.patologia}
            onSuggestionSelect={val => up('sintomas', val)}
            showExploration
          >
            <ChipInput 
              value={form.sintomas} 
              onChange={val => up('sintomas', val)} 
              placeholder={t('caseForm.symptoms_placeholder')} 
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label={t('caseForm.physical_exam')}
            >
              <div className="rounded-xl border border-[#e5e2ef] bg-white p-3">
                <p className="min-h-10 text-xs leading-relaxed text-[#6b6880]">{examSummary(form.exame_fisico, 'Nenhum exame definido')}</p>
                <button type="button" className={`${twBtnPri} mt-2 w-full`} onClick={() => setShowPhysicalExamModal(true)}>
                  Abrir exame físico
                </button>
              </div>
            </Field>
            <Field 
              label={t('caseForm.exams')}
            >
              <div className="rounded-xl border border-[#e5e2ef] bg-white p-3">
                <p className="min-h-10 text-xs leading-relaxed text-[#6b6880]">{examSummary(form.exames, 'Nenhum exame definido')}</p>
                <button type="button" className={`${twBtnPri} mt-2 w-full`} onClick={() => setShowComplementaryExamModal(true)}>
                  Abrir exames
                </button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label={t('caseForm.specifics')} 
              hasSuggestions 
              fieldKey="especificidades"
              currentSpecialty={form.especialidade}
              currentValue={form.especificidades}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('especificidades', val)}
              showExploration
            >
              <ChipInput value={form.especificidades} onChange={val => up('especificidades', val)} placeholder={t('caseForm.specifics_placeholder')} />
            </Field>
            <Field label={t('caseForm.difficulty')}>
              <select className={twInput} value={form.dificuldade} onChange={e => up('dificuldade', e.target.value)}>
                <option value="Básico">Básico</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
              </select>
            </Field>
          </div>

          {/* Duplicated HPP block removed */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label={t('caseForm.family_history')} 
              hasSuggestions 
              fieldKey="historico_familiar"
              currentSpecialty={form.especialidade}
              currentValue={form.historico_familiar}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('historico_familiar', val)}
              showExploration
            >
              <ChipInput value={form.historico_familiar} onChange={val => up('historico_familiar', val)} placeholder={t('caseForm.family_history_placeholder')} />
            </Field>
            <Field 
              label={t('caseForm.habits')} 
              hasSuggestions 
              fieldKey="habitos"
              currentSpecialty={form.especialidade}
              currentValue={form.habitos}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('habitos', val)}
              showExploration
            >
              <ChipInput value={form.habitos} onChange={val => up('habitos', val)} placeholder={t('caseForm.habits_placeholder')} />
            </Field>
          </div>

          <hr className="border-0 border-t border-[#f0edf8]" />

          {/* Persona do Paciente */}
          <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">{t('caseForm.section_persona')}</div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label={t('caseForm.name')} 
            >
              <input className={twInput} value={form.persona_nome} onChange={e => up('persona_nome', e.target.value)} placeholder={t('caseForm.name_placeholder')} />
            </Field>
            <Field label={t('caseForm.age')}>
              <input className={twInput} value={form.persona_idade} onChange={e => up('persona_idade', e.target.value)} placeholder={t('caseForm.age_placeholder')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field label={t('caseForm.profession')}>
              <input className={twInput} value={form.persona_profissao} onChange={e => up('persona_profissao', e.target.value)} placeholder={t('caseForm.profession_placeholder')} />
            </Field>
            <Field 
              label={t('caseForm.emotional_state')} 
              hasSuggestions 
              fieldKey="persona_emocional"
              currentSpecialty={form.especialidade}
              currentValue={form.persona_emocional}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('persona_emocional', val)}
            >
              <ChipInput value={form.persona_emocional} onChange={val => up('persona_emocional', val)} placeholder={t('caseForm.emotional_state_placeholder')} />
            </Field>
          </div>

          <Field 
            label={t('caseForm.social_context')} 
            hasSuggestions 
            fieldKey="persona_contexto"
            currentSpecialty={form.especialidade}
            currentValue={form.persona_contexto}
            currentPatologia={form.patologia}
            onSuggestionSelect={val => up('persona_contexto', val)}
          >
            <ChipInput value={form.persona_contexto} onChange={val => up('persona_contexto', val)} placeholder={t('caseForm.social_context_placeholder')} />
          </Field>

          {/* Pesos da Avaliação SOAP */}
          <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">{t('caseForm.section_soap')}</div>
          <div className="grid grid-cols-4 gap-2">
            {(['S', 'O', 'A', 'P'] as const).map(letter => {
              const labels: Record<string, string> = { S: t('caseForm.soap_s'), O: t('caseForm.soap_o'), A: t('caseForm.soap_a'), P: t('caseForm.soap_p') };
              const w = form.soap_weights?.[letter] ?? 25;
              return (
                <div key={letter} className="flex flex-col items-center gap-1">
                  <span className={twLabel + ' text-center'}>{letter}</span>
                  <span className="text-[10px] text-[#9893b0] font-medium -mt-1 mb-0.5">{labels[letter]}</span>
                  <div className="relative w-full">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={`${twInput} pr-6 text-center`}
                      value={w}
                      onChange={e => updateWeight(letter, e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#9893b0] pointer-events-none">%</span>
                  </div>
                  <VerticalSlider value={w} onChange={v => updateWeight(letter, v)} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            {(() => {
              const weights = form.soap_weights ?? DEFAULT_SOAP_WEIGHTS;
              const remaining = 100 - soapWeightsTotal;
              const emptyCount = (['S', 'O', 'A', 'P'] as const).filter(l => weights[l] === 0).length;
              return remaining > 0 && emptyCount > 0 ? (
                <button
                  type="button"
                  onClick={redistributeRemaining}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b35ff] hover:text-[#5a2ad9] transition-colors"
                >
                  <span className="w-4 h-4 rounded-full bg-[#f0edf8] flex items-center justify-center text-[10px] font-bold">↕</span>
                  {t('caseForm.redistribute', { value: `+${remaining}` })}
                </button>
              ) : <span />;
            })()}
            <span className={`text-xs font-semibold ${soapWeightsTotal === 100 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {t('caseForm.soap_total', { total: soapWeightsTotal })}{' '}
              {soapWeightsTotal === 100 ? '✓' : soapWeightsTotal < 100 ? t('caseForm.soap_missing', { count: 100 - soapWeightsTotal }) : t('caseForm.soap_over', { count: soapWeightsTotal - 100 })}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={twBtnGho} onClick={onClose}>{t('actions.cancel')}</button>
            <button type="button" className={twBtnPri} onClick={handleGeneratePrompt}>{t('caseForm.generate_prompt')}</button>
          </div>
        </div>
        <ExamModal
          isOpen={showPhysicalExamModal}
          onClose={() => setShowPhysicalExamModal(false)}
          pathologyData={null}
          mode="case-builder"
          selectedItems={selectedItems(form.exame_fisico)}
          onFindingsSelected={items => up('exame_fisico', items.join('\n'))}
        />
        <ComplementaryExamModal
          isOpen={showComplementaryExamModal}
          onClose={() => setShowComplementaryExamModal(false)}
          selectedItems={selectedItems(form.exames)}
          onExamsSelected={items => up('exames', items.join('\n'))}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: PREVIEW DO PROMPT
  // ══════════════════════════════════════════════════════════════
  if (showExamPicker) {
    // Substitui o conteúdo do modal em vez de abrir um segundo overlay: dois
    // modais empilhados brigam por foco e por tecla Esc.
    return (
      <div className="px-6 py-5">
        <ExamPicker
          initialSelectedIds={examIds}
          onSave={(ids) => { setExamIds(ids); setExamsChanged(true); setShowExamPicker(false); }}
          onClose={() => setShowExamPicker(false)}
        />
      </div>
    );
  }

  return (
    <>
      <ModalHeader
        title={isEditing ? t('caseForm.preview_edit_title') : t('caseForm.preview_create_title')}
        subtitle={t('caseForm.preview_subtitle')}
        onClose={onClose}
        disabled={step === 'saving'}
      />

      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('caseForm.title_label')}>
            <input className={twInput} value={generatedTitle} onChange={e => setGeneratedTitle(e.target.value)} disabled={step === 'saving'} />
          </Field>
          <Field label={t('caseForm.specialty')}>
            <select className={twInput} value={form.especialidade} onChange={e => up('especialidade', e.target.value)} disabled={step === 'saving'}>
              <option value="">{t('caseForm.select_specialty')}</option>
              {Array.from(new Set([...SPECIALTIES.map(s => s.key), ...Object.keys(SPECIALTY_EMOJIS)])).map(key => ({ key, emoji: SPECIALTY_EMOJIS[key] ?? SPECIALTIES.find(s => s.key === key)?.emoji })).map(s => (
                <option key={s.key} value={s.key}>{s.emoji} {specialtyLabel(s.key)}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('caseForm.summary_label')}>
          <textarea className={twInput} rows={2} value={generatedSummary} onChange={e => setGeneratedSummary(e.target.value)} disabled={step === 'saving'} />
        </Field>

        <Field label={t('caseForm.prompt_label')}>
          <textarea
            className={`${twInput} font-mono text-[12px] leading-relaxed`}
            rows={14}
            value={generatedPrompt}
            onChange={e => setGeneratedPrompt(e.target.value)}
            disabled={step === 'saving'}
          />
        </Field>

        <hr className="border-0 border-t border-[#f0edf8]" />

        {/* Exames complementares (SPEC-014) */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[#6b6880]">
            {examIds.length > 0
              ? tCase('exams.picker.attached', { count: examIds.length })
              : tCase('exams.picker.none_attached')}
          </span>
          <button
            type="button"
            className={twBtnGho}
            onClick={() => setShowExamPicker(true)}
            disabled={step === 'saving'}
          >
            <FileImage size={14} />
            {tCase('exams.picker.attach')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!isEditing && (
            <Field label={t('caseForm.assign_class')}>
              <select className={twInput} value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={step === 'saving'}>
                <option value="">{t('caseForm.assign_none')}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </Field>
          )}
          <label className={`flex items-center gap-2.5 cursor-pointer ${isEditing ? '' : 'pt-5'}`}>
            <input
              type="checkbox"
              checked={publishNow}
              onChange={e => setPublishNow(e.target.checked)}
              className="w-4 h-4 accent-[#844AF5]"
              disabled={step === 'saving'}
            />
            <span className="text-sm font-medium text-[#374151]">{t('caseForm.publish_now')}</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('caseForm.availability')}>
            <select
              className={twInput}
              value={availabilityMode}
              onChange={e => setAvailabilityMode(e.target.value as AvailabilityMode)}
              disabled={step === 'saving'}
            >
              <option value="permanent">{t('caseForm.availability_permanent')}</option>
              <option value="days">{isEditing ? t('caseForm.availability_expire_date') : t('caseForm.availability_expire_days')}</option>
            </select>
          </Field>
          {isEditing ? (
            <Field label={t('caseForm.expiry_date')}>
              <input
                className={twInput}
                type="date"
                value={availabilityDate}
                onChange={e => setAvailabilityDate(e.target.value)}
                disabled={step === 'saving' || availabilityMode === 'permanent'}
                min={new Date().toISOString().slice(0, 10)}
              />
            </Field>
          ) : (
            <Field label={t('caseForm.days_range')}>
              <input
                className={twInput}
                type="number"
                min={1}
                max={30}
                value={availabilityDays}
                onChange={e => setAvailabilityDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                disabled={step === 'saving' || availabilityMode === 'permanent'}
              />
            </Field>
          )}
        </div>

        {selectedClassId && availabilityMode === 'days' && !isEditing && (
          <Field label={t('caseForm.apply_expiry')}>
            <select
              className={twInput}
              value={availabilityScope}
              onChange={e => setAvailabilityScope(e.target.value as AvailabilityScope)}
              disabled={step === 'saving'}
            >
              <option value="case">{t('caseForm.apply_expiry_case')}</option>
              <option value="class">{t('caseForm.apply_expiry_class')}</option>
            </select>
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={twBtnGho} onClick={() => setStep('form')} disabled={step === 'saving'}>
            {t('caseForm.back_to_form')}
          </button>
          <button type="button" className={twBtnPri} onClick={handleSave} disabled={step === 'saving'}>
            {step === 'saving' ? t('caseForm.saving') : t('caseForm.save_case')}
          </button>
        </div>
      </div>
    </>
  );
};

export default CaseForm;
