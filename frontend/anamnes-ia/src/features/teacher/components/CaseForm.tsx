import React, { useState } from 'react';
import { X, Lightbulb, Check } from 'lucide-react';
import type { CaseFormData, CaseCreate, CaseUpdate, CaseInfo, ClassInfo } from '../types/teacher';
import { createCase, updateCase, assignCase } from '../services/teacherService';
import { SUGGESTIONS_DATA, type Suggestions } from '../data/suggestionsData';
import ChipInput from './ChipInput';
import ExamSuggestionsModal from './ExamSuggestionsModal';

interface CaseFormProps {
  classes: ClassInfo[];
  onCaseCreated: (newCase: CaseInfo) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
  editingCase?: CaseInfo;
}

type Step = 'form' | 'preview' | 'saving';

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
- HPP / Especificações: ${f.especificidades || 'Nenhuma'}
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

const CaseForm: React.FC<CaseFormProps> = ({ classes, onCaseCreated, onClose, showToast, editingCase }) => {
  const isEditing = !!editingCase;
  const [step, setStep] = useState<Step>(isEditing ? 'preview' : 'form');
  const [form, setForm] = useState<CaseFormData>(
    editingCase?.form_data ? (editingCase.form_data as unknown as CaseFormData) : INITIAL_FORM
  );
  const [generatedPrompt, setGeneratedPrompt] = useState(editingCase?.patient_prompt ?? '');
  const [generatedTitle, setGeneratedTitle] = useState(editingCase?.title ?? '');
  const [generatedSummary, setGeneratedSummary] = useState(editingCase?.summary ?? '');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [publishNow, setPublishNow] = useState(editingCase?.published ?? false);
  const [showExamSuggestions, setShowExamSuggestions] = useState(false);

  const up = <K extends keyof CaseFormData>(key: K, value: CaseFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePrompt = () => {
    if (!form.patologia.trim() || !form.queixa_principal.trim()) {
      showToast('Preencha ao menos Patologia e Queixa Principal.');
      return;
    }
    if (!form.persona_nome.trim()) {
      showToast('O Nome do paciente é obrigatório.');
      return;
    }
    setGeneratedPrompt(buildPrompt(form));
    setGeneratedTitle(buildTitle(form));
    setGeneratedSummary(buildSummary(form));
    setStep('preview');
  };

  const handleSave = async () => {
    if (!generatedTitle.trim()) { showToast('Preencha o título.'); return; }
    setStep('saving');
    try {
      const payload: CaseCreate | CaseUpdate = {
        title: generatedTitle.trim(),
        specialty: form.especialidade.trim() || undefined,
        difficulty: form.dificuldade,
        summary: generatedSummary.trim() || undefined,
        patient_prompt: generatedPrompt.trim(),
        form_data: form as unknown as Record<string, unknown>,
        published: publishNow,
        visibility: 'turma',
      };

      let savedCase: CaseInfo;
      if (isEditing && editingCase) {
        savedCase = await updateCase(editingCase.id, payload as CaseUpdate);
      } else {
        savedCase = await createCase(payload as CaseCreate);
        if (selectedClassId) {
          try { await assignCase(savedCase.id, selectedClassId); }
          catch { showToast('Caso salvo, mas erro ao atribuir à turma.'); }
        }
      }

      onCaseCreated(savedCase);
      showToast(`Caso "${generatedTitle}" ${isEditing ? 'atualizado' : 'salvo'} com sucesso!`);
      onClose();
    } catch {
      showToast(`Erro ao ${isEditing ? 'atualizar' : 'salvar'} caso.`);
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
          title={isEditing ? 'Editar Caso Clínico' : 'Criar Caso Clínico'}
          subtitle="Preencha os parâmetros. O prompt do paciente será gerado automaticamente."
          onClose={onClose}
        />

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Dados Clínicos */}
          <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">Dados Clínicos</div>

          <div className="grid grid-cols-2 gap-3">
            <Field 
              label="Patologia *" 
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
                placeholder="Ex: Infarto agudo do miocárdio" 
              />
            </Field>
            <Field label="Especialidade">
              <select className={twInput} value={form.especialidade} onChange={e => up('especialidade', e.target.value)}>
                <option value="">Selecione uma especialidade</option>
                {Object.keys(SUGGESTIONS_DATA.categories).sort().map(cat => (
                  <option key={cat} value={cat}>
                    {SPECIALTY_EMOJIS[cat] || '📋'} {cat}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field 
            label="QP — Queixa Principal *" 
            hasSuggestions 
            fieldKey="queixa_principal"
            currentSpecialty={form.especialidade}
            currentValue={form.queixa_principal}
            currentPatologia={form.patologia}
            onSuggestionSelect={val => up('queixa_principal', val)}
          >
            <input className={twInput} value={form.queixa_principal} onChange={e => up('queixa_principal', e.target.value)} placeholder="Ex: Dor no peito há 2 horas" />
          </Field>

          <Field 
            label="Sintomas associados" 
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
              placeholder="Digite e dê Enter (ex: Febre, Cansaço...)" 
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label="Exame físico" 
              hasSuggestions 
              fieldKey="exame_fisico"
              currentSpecialty={form.especialidade}
              currentValue={form.exame_fisico}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('exame_fisico', val)}
              onLightbulbClick={() => setShowExamSuggestions(true)}
              showExploration
            >
              <ChipInput 
                value={form.exame_fisico} 
                onChange={val => up('exame_fisico', val)} 
                placeholder="Ex: PA 120/80, Ausculta cardíaca..." 
              />
            </Field>
            <Field 
              label="Exames complementares" 
              hasSuggestions 
              fieldKey="exames"
              currentSpecialty={form.especialidade}
              currentValue={form.exames}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('exames', val)}
              showExploration
            >
              <ChipInput 
                value={form.exames} 
                onChange={val => up('exames', val)} 
                placeholder="Ex: Hemograma, Raio-X..." 
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label="HPP / Especificações" 
              hasSuggestions 
              fieldKey="especificidades"
              currentSpecialty={form.especialidade}
              currentValue={form.especificidades}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('especificidades', val)}
              showExploration
            >
              <ChipInput value={form.especificidades} onChange={val => up('especificidades', val)} placeholder="Ex: Alergia a AAS, Marcapasso..." />
            </Field>
            <Field label="Dificuldade">
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
              label="Histórico familiar" 
              hasSuggestions 
              fieldKey="historico_familiar"
              currentSpecialty={form.especialidade}
              currentValue={form.historico_familiar}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('historico_familiar', val)}
              showExploration
            >
              <ChipInput value={form.historico_familiar} onChange={val => up('historico_familiar', val)} placeholder="Pai com IAM, Diabetes na família..." />
            </Field>
            <Field 
              label="Hábitos de vida" 
              hasSuggestions 
              fieldKey="habitos"
              currentSpecialty={form.especialidade}
              currentValue={form.habitos}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('habitos', val)}
              showExploration
            >
              <ChipInput value={form.habitos} onChange={val => up('habitos', val)} placeholder="Tabagismo, Sedentarismo..." />
            </Field>
          </div>

          <hr className="border-0 border-t border-[#f0edf8]" />

          {/* Persona do Paciente */}
          <div className="text-[11px] font-extrabold text-[#9893b0] uppercase tracking-widest">Persona do Paciente</div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field 
              label="Nome *" 
            >
              <input className={twInput} value={form.persona_nome} onChange={e => up('persona_nome', e.target.value)} placeholder="Ex: Carlos Alberto" />
            </Field>
            <Field label="Idade">
              <input className={twInput} value={form.persona_idade} onChange={e => up('persona_idade', e.target.value)} placeholder="Ex: 58" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <Field label="Profissão">
              <input className={twInput} value={form.persona_profissao} onChange={e => up('persona_profissao', e.target.value)} placeholder="Ex: Motorista de caminhão" />
            </Field>
            <Field 
              label="Estado emocional" 
              hasSuggestions 
              fieldKey="persona_emocional"
              currentSpecialty={form.especialidade}
              currentValue={form.persona_emocional}
              currentPatologia={form.patologia}
              onSuggestionSelect={val => up('persona_emocional', val)}
            >
              <ChipInput value={form.persona_emocional} onChange={val => up('persona_emocional', val)} placeholder="Ex: Ansioso, Irritado..." />
            </Field>
          </div>

          <Field 
            label="Contexto social" 
            hasSuggestions 
            fieldKey="persona_contexto"
            currentSpecialty={form.especialidade}
            currentValue={form.persona_contexto}
            currentPatologia={form.patologia}
            onSuggestionSelect={val => up('persona_contexto', val)}
          >
            <ChipInput value={form.persona_contexto} onChange={val => up('persona_contexto', val)} placeholder="Casado, Mora com os pais..." />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={twBtnGho} onClick={onClose}>Cancelar</button>
            <button type="button" className={twBtnPri} onClick={handleGeneratePrompt}>Gerar Prompt →</button>
          </div>
        </div>

        <ExamSuggestionsModal
          isOpen={showExamSuggestions}
          onClose={() => setShowExamSuggestions(false)}
          patologia={form.patologia}
          currentItems={form.exame_fisico}
          onSelectItem={(item) => {
            const current = form.exame_fisico || '';
            if (!current.toLowerCase().includes(item.toLowerCase())) {
              up('exame_fisico', current ? `${current}, ${item}` : item);
            }
          }}
          onAutoFill={(items) => {
            let current = form.exame_fisico || '';
            items.forEach(item => {
              if (!current.toLowerCase().includes(item.toLowerCase())) {
                current = current ? `${current}, ${item}` : item;
              }
            });
            up('exame_fisico', current);
          }}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: PREVIEW DO PROMPT
  // ══════════════════════════════════════════════════════════════
  return (
    <>
      <ModalHeader
        title={isEditing ? 'Editar & Salvar' : 'Revisar & Salvar'}
        subtitle="Prompt gerado com base no formulário. Edite se necessário."
        onClose={onClose}
        disabled={step === 'saving'}
      />

      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Título">
            <input className={twInput} value={generatedTitle} onChange={e => setGeneratedTitle(e.target.value)} disabled={step === 'saving'} />
          </Field>
          <Field label="Especialidade">
            <select className={twInput} value={form.especialidade} onChange={e => up('especialidade', e.target.value)} disabled={step === 'saving'}>
              <option value="">Selecione uma especialidade</option>
              {Object.keys(SUGGESTIONS_DATA.categories).sort().map(cat => (
                <option key={cat} value={cat}>
                  {SPECIALTY_EMOJIS[cat] || '📋'} {cat}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Resumo (visível para o aluno)">
          <textarea className={twInput} rows={2} value={generatedSummary} onChange={e => setGeneratedSummary(e.target.value)} disabled={step === 'saving'} />
        </Field>

        <Field label="Prompt do Paciente Virtual">
          <textarea
            className={`${twInput} font-mono text-[12px] leading-relaxed`}
            rows={14}
            value={generatedPrompt}
            onChange={e => setGeneratedPrompt(e.target.value)}
            disabled={step === 'saving'}
          />
        </Field>

        <hr className="border-0 border-t border-[#f0edf8]" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Atribuir a turma">
            <select className={twInput} value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={step === 'saving'}>
              <option value="">Nenhuma (atribuir depois)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2.5 cursor-pointer pt-5">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={e => setPublishNow(e.target.checked)}
              className="w-4 h-4 accent-[#844AF5]"
              disabled={step === 'saving'}
            />
            <span className="text-sm font-medium text-[#374151]">Publicar imediatamente</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={twBtnGho} onClick={() => setStep('form')} disabled={step === 'saving'}>
            ← Voltar ao formulário
          </button>
          <button type="button" className={twBtnPri} onClick={handleSave} disabled={step === 'saving'}>
            {step === 'saving' ? 'Salvando...' : 'Salvar Caso'}
          </button>
        </div>
      </div>
    </>
  );
};

export default CaseForm;
