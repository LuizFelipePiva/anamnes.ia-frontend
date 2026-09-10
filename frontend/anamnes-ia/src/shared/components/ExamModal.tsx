import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Suggestions, ExameFisicoSistema } from '../../features/teacher/data/suggestionsData';

// Removed unused Finding interface

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  pathologyData: Suggestions | null;
  onFindingsSelected: (findings: string[]) => void;
  selectedItems: string[];
  customExameFisico?: string;
  /**
   * O modo de consulta é usado no chat do aluno. O construtor permite que o
   * professor descreva os achados que ficarão disponíveis naquele caso.
   */
  mode?: 'consultation' | 'case-builder';
}

interface SubCategory {
  key: string;
  label: string;
  icon: string;
}

const SYSTEM_SUBCATEGORIES: Record<string, SubCategory[]> = {
  inspecao: [
    { key: 'geral', label: 'Estado Geral', icon: '👤' },
    { key: 'cabeca', label: 'Cabeça e Pescoço', icon: '🗣️' },
    { key: 'torax', label: 'Tórax', icon: '🫁' },
    { key: 'abdome', label: 'Abdômen', icon: '🤲' },
    { key: 'dorso', label: 'Dorso', icon: '🔙' },
    { key: 'pernas', label: 'Pernas / MMII', icon: '🦵' },
    { key: 'bracos', label: 'Braços / MMSS', icon: '💪' },
    { key: 'pele', label: 'Pele e Anexos', icon: '🖐️' },
  ],
  cardiovascular: [
    { key: 'inspecao', label: 'Inspeção', icon: '👁️' },
    { key: 'palpacao', label: 'Palpação', icon: '🤲' },
    { key: 'ausculta', label: 'Ausculta', icon: '🩺' },
    { key: 'pulsos', label: 'Pulsos Periféricos', icon: '💓' },
    { key: 'sinais', label: 'Sinais Vitais', icon: '📊' },
  ],
  respiratorio: [
    { key: 'inspecao', label: 'Inspeção', icon: '👁️' },
    { key: 'palpacao', label: 'Palpação / Frêmito', icon: '🤲' },
    { key: 'percussao', label: 'Percussão', icon: '🔨' },
    { key: 'ausculta', label: 'Ausculta', icon: '🩺' },
    { key: 'sinais', label: 'Sinais Vitais', icon: '📊' },
  ],
  'abdômen': [
    { key: 'inspecao', label: 'Inspeção', icon: '👁️' },
    { key: 'ausculta', label: 'Ausculta', icon: '🩺' },
    { key: 'percussao', label: 'Percussão', icon: '🔨' },
    { key: 'palpacao', label: 'Palpação Superficial e Profunda', icon: '🤲' },
    { key: 'orgaos', label: 'Órgãos (Fígado, Baço, Rins)', icon: '🫘' },
  ],
  neurologico: [
    { key: 'consciencia', label: 'Nível de Consciência', icon: '🧠' },
    { key: 'pares_cranianos', label: 'Pares Cranianos', icon: '👁️' },
    { key: 'motricidade', label: 'Motricidade / Força', icon: '💪' },
    { key: 'sensibilidade', label: 'Sensibilidade', icon: '🖐️' },
    { key: 'reflexos', label: 'Reflexos', icon: '🔨' },
    { key: 'meningeos', label: 'Sinais Meníngeos', icon: '⚠️' },
    { key: 'marcha', label: 'Marcha e Equilíbrio', icon: '🚶' },
  ],
};

const FALLBACK_SUBCATEGORIES: SubCategory[] = [
  { key: 'geral', label: 'Estado Geral', icon: '👤' },
  { key: 'inspecao', label: 'Inspeção', icon: '👁️' },
  { key: 'palpacao', label: 'Palpação', icon: '🤲' },
  { key: 'ausculta', label: 'Ausculta', icon: '🩺' },
  { key: 'percussao', label: 'Percussão', icon: '🔨' },
];

type CaseExamArea = {
  key: string;
  label: string;
  icon: string;
  assessments: SubCategory[];
};

const STANDARD_ASSESSMENTS: SubCategory[] = [
  { key: 'ectoscopia', label: 'Ectoscopia', icon: '👁️' },
  { key: 'ausculta', label: 'Ausculta', icon: '🩺' },
  { key: 'percussao', label: 'Percussão', icon: '🔨' },
  { key: 'palpacao', label: 'Palpação', icon: '🤲' },
  { key: 'exames_especiais', label: 'Exames especiais', icon: '✨' },
];

const EXTREMITIES_ASSESSMENTS = STANDARD_ASSESSMENTS.filter(
  assessment => assessment.key !== 'ausculta' && assessment.key !== 'percussao',
);

const CASE_EXAM_AREAS: CaseExamArea[] = [
  { key: 'torax_anterior', label: 'Tórax anterior', icon: '🫁', assessments: STANDARD_ASSESSMENTS },
  { key: 'torax_posterior', label: 'Tórax posterior', icon: '🔙', assessments: STANDARD_ASSESSMENTS },
  { key: 'abdominal', label: 'Abdominal', icon: '🫄', assessments: STANDARD_ASSESSMENTS },
  { key: 'extremidades', label: 'Extremidades', icon: '🦵', assessments: EXTREMITIES_ASSESSMENTS },
  { key: 'exames_especiais', label: 'Exames especiais', icon: '🧪', assessments: STANDARD_ASSESSMENTS },
];

const SPECIAL_EXAM_AREAS: CaseExamArea[] = [
  { key: 'membros_superiores', label: 'Membros superiores', icon: '💪', assessments: STANDARD_ASSESSMENTS },
  { key: 'membros_inferiores', label: 'Membros inferiores', icon: '🦵', assessments: STANDARD_ASSESSMENTS },
];

interface CaseBuilderExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFindingsSelected: (findings: string[]) => void;
  initialSelectedItems: string[];
}

/**
 * Fluxo usado na criação de casos. Ele mantém a aparência da modal do chat,
 * mas troca o ponto de vista: o professor registra o que o aluno encontrará.
 */
const CaseBuilderExamModal: React.FC<CaseBuilderExamModalProps> = ({
  isOpen,
  onClose,
  onFindingsSelected,
  initialSelectedItems,
}) => {
  const [selectedAreaKey, setSelectedAreaKey] = useState<string | null>(null);
  const [selectedSpecialAreaKey, setSelectedSpecialAreaKey] = useState<string | null>(null);
  const [selectedAssessmentKey, setSelectedAssessmentKey] = useState<string | null>(null);
  const [finding, setFinding] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelectedItems);

  useEffect(() => {
    if (isOpen) {
      setSelectedAreaKey(null);
      setSelectedSpecialAreaKey(null);
      setSelectedAssessmentKey(null);
      setFinding('');
      setSelectedItems(initialSelectedItems);
    }
  }, [isOpen, initialSelectedItems]);

  if (!isOpen) return null;

  const selectedArea = CASE_EXAM_AREAS.find(area => area.key === selectedAreaKey) ?? null;
  const selectedSpecialArea = SPECIAL_EXAM_AREAS.find(area => area.key === selectedSpecialAreaKey) ?? null;
  const activeArea = selectedSpecialArea ?? selectedArea;
  const selectedAssessment = activeArea?.assessments.find(
    assessment => assessment.key === selectedAssessmentKey,
  ) ?? null;

  const returnToPreviousStep = () => {
    if (selectedAssessmentKey) {
      setSelectedAssessmentKey(null);
      setFinding('');
      return;
    }
    if (selectedSpecialAreaKey) {
      setSelectedSpecialAreaKey(null);
      return;
    }
    setSelectedAreaKey(null);
  };

  const addFinding = () => {
    if (!activeArea || !selectedAssessment || !finding.trim()) return;

    const item = `${activeArea.label} — ${selectedAssessment.label}: ${finding.trim()}`;
    setSelectedItems(current => current.includes(item) ? current : [...current, item]);
    setFinding('');
    setSelectedAssessmentKey(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f1115] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Exame físico</h2>
            <p className="mt-1 text-sm text-gray-400">
              Defina os achados que o aluno poderá obter em cada etapa do exame.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-red-500/20 hover:text-red-400"
            aria-label="Fechar exame físico"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {!selectedArea ? (
              <>
                <p className="mb-4 text-sm font-medium text-gray-300">Selecione uma área para continuar</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CASE_EXAM_AREAS.map(area => (
                    <button
                      key={area.key}
                      type="button"
                      onClick={() => setSelectedAreaKey(area.key)}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-violet-500/40 hover:bg-white/10"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-2xl">
                        {area.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-gray-100 group-hover:text-white">{area.label}</span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {area.key === 'extremidades'
                            ? 'Ectoscopia, palpação e exames especiais'
                            : area.key === 'exames_especiais'
                              ? 'Membros superiores e inferiores'
                              : 'Cinco etapas de avaliação'}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-600 transition-colors group-hover:text-violet-400" />
                    </button>
                  ))}
                </div>
              </>
            ) : selectedArea.key === 'exames_especiais' && !selectedSpecialArea ? (
              <>
                <button type="button" onClick={returnToPreviousStep} className="mb-5 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                  <ChevronRight className="h-4 w-4 rotate-180" /> Voltar para áreas
                </button>
                <h3 className="text-xl font-bold text-white">Exames especiais</h3>
                <p className="mt-1 text-sm text-gray-400">Escolha o segmento a ser avaliado.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {SPECIAL_EXAM_AREAS.map(area => (
                    <button
                      key={area.key}
                      type="button"
                      onClick={() => setSelectedSpecialAreaKey(area.key)}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-violet-500/40 hover:bg-white/10"
                    >
                      <span className="text-3xl">{area.icon}</span>
                      <span className="flex-1 text-sm font-bold text-gray-100">{area.label}</span>
                      <ChevronRight className="h-5 w-5 text-gray-600 transition-colors group-hover:text-violet-400" />
                    </button>
                  ))}
                </div>
              </>
            ) : !selectedAssessment ? (
              <>
                <button type="button" onClick={returnToPreviousStep} className="mb-5 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                  <ChevronRight className="h-4 w-4 rotate-180" /> Voltar
                </button>
                <div className="mb-6 flex items-center gap-3">
                  <span className="text-3xl">{activeArea?.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeArea?.label}</h3>
                    <p className="text-sm text-gray-400">Selecione a etapa da avaliação.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeArea?.assessments.map(assessment => (
                    <button
                      key={assessment.key}
                      type="button"
                      onClick={() => setSelectedAssessmentKey(assessment.key)}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-violet-500/40 hover:bg-white/10"
                    >
                      <span className="text-2xl">{assessment.icon}</span>
                      <span className="flex-1 text-sm font-bold text-gray-100">{assessment.label}</span>
                      <ChevronRight className="h-5 w-5 text-gray-600 transition-colors group-hover:text-violet-400" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={returnToPreviousStep} className="mb-5 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white">
                  <ChevronRight className="h-4 w-4 rotate-180" /> Voltar para avaliações
                </button>
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{activeArea?.label}</p>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedAssessment.label}</h3>
                  <p className="mt-2 text-sm text-gray-400">Descreva o achado esperado para este caso clínico.</p>
                </div>
                <label className="mt-5 block text-sm font-medium text-gray-200" htmlFor="case-exam-finding">
                  Achado ou resultado esperado
                </label>
                <textarea
                  id="case-exam-finding"
                  value={finding}
                  onChange={event => setFinding(event.target.value)}
                  rows={5}
                  autoFocus
                  placeholder="Ex.: murmúrio vesicular diminuído em base direita"
                  className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={addFinding}
                  disabled={!finding.trim()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircle2 size={17} /> Adicionar avaliação
                </button>
              </>
            )}
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-100">Achados definidos</h3>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">{selectedItems.length}</span>
            </div>
            {selectedItems.length ? (
              <ul className="mt-4 space-y-2">
                {selectedItems.map(item => (
                  <li key={item} className="flex gap-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-gray-300">
                    <span className="flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedItems(items => items.filter(selected => selected !== item))}
                      className="h-5 w-5 flex-shrink-0 rounded text-gray-500 transition hover:bg-red-500/20 hover:text-red-300"
                      aria-label={`Remover ${item}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-gray-500">Nenhum achado foi definido ainda.</p>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/5 bg-white/[0.02] p-6">
          <p className="text-xs text-gray-500">Os achados serão associados ao caso e apresentados no exame do aluno.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-400 transition hover:text-white">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { onFindingsSelected(selectedItems); onClose(); }}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
            >
              Salvar exame físico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamModal: React.FC<ExamModalProps> = ({ 
  isOpen, 
  onClose, 
  pathologyData, 
  onFindingsSelected,
  selectedItems: initialSelectedItems = [],
  customExameFisico,
  mode = 'consultation',
}) => {
  const [selectedSistema, setSelectedSistema] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelectedItems);
  const [testedSubCategories, setTestedSubCategories] = useState<Set<string>>(new Set());
  const [shakingSub, setShakingSub] = useState<string | null>(null);
  const [flashingSub, setFlashingSub] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSistema(null);
      setSelectedSubCategory(null);
      setTestedSubCategories(new Set());
      setShakingSub(null);
      setFlashingSub(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedItems(initialSelectedItems);
    }
  }, [isOpen, initialSelectedItems]);

  const handleSelectSistema = (key: string) => {
    setSelectedSistema(key);
    setSelectedSubCategory(null);
  };

  const handleSelectSubCategory = (key: string) => {
    const findings = getFindingsForSub(key);
    const hasFindings = findings.length > 0;

    if (!hasFindings) {
      setShakingSub(key);
      setFlashingSub(key);
      setTestedSubCategories(prev => new Set(prev).add(key));
      setTimeout(() => setShakingSub(null), 600);
      setTimeout(() => setFlashingSub(null), 1200);
      return;
    }

    setSelectedSubCategory(key);
    setTestedSubCategories(prev => new Set(prev).add(key));
  };

  const handleBack = () => {
    if (selectedSubCategory) {
      setSelectedSubCategory(null);
    } else {
      setSelectedSistema(null);
    }
  };

  const toggleItem = (item: string) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const handleConfirm = () => {
    onFindingsSelected(selectedItems);
    onClose();
  };

  const sistemas = useMemo(() => {
    const base = [
      { key: 'inspecao', label: 'Ectoscopia / Inspeção', icon: '👤', color: 'bg-indigo-500', hover: 'hover:bg-indigo-600/10', border: 'border-indigo-500/20', bg: 'bg-indigo-500/5' },
      { key: 'cardiovascular', label: 'Sistema Cardiovascular', icon: '❤️', color: 'bg-rose-500', hover: 'hover:bg-rose-600/10', border: 'border-rose-500/20', bg: 'bg-rose-500/5' },
      { key: 'respiratorio', label: 'Sistema Respiratório', icon: '🫁', color: 'bg-sky-500', hover: 'hover:bg-sky-600/10', border: 'border-sky-500/20', bg: 'bg-sky-500/5' },
      { key: 'abdômen', label: 'Sistema Gastrointestinal', icon: '🍕', color: 'bg-amber-500', hover: 'hover:bg-amber-600/10', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
      { key: 'neurologico', label: 'Sistema Neurológico', icon: '🧠', color: 'bg-teal-500', hover: 'hover:bg-teal-600/10', border: 'border-teal-500/20', bg: 'bg-teal-500/5' },
    ];
    if (customExameFisico && typeof customExameFisico === 'string' && customExameFisico.trim().length > 0) {
      base.unshift({ key: 'achados_caso', label: 'Achados do Professor', icon: '⭐', color: 'bg-yellow-500', hover: 'hover:bg-yellow-600/10', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' });
    }
    return base;
  }, [customExameFisico]);

  const achadosPorSistema = useMemo(() => {
    const base = pathologyData?.exame_fisico ? JSON.parse(JSON.stringify(pathologyData.exame_fisico)) : {};
    if (customExameFisico && typeof customExameFisico === 'string' && customExameFisico.trim().length > 0) {
      const items = customExameFisico.split(',').map(s => s.trim()).filter(Boolean);
      base['achados_caso'] = items.map((item: string) => ({
        item: item,
        normal: false,
        achado: ''
      }));
    }
    return base;
  }, [pathologyData, customExameFisico]);



  const subCategories = useMemo(() => {
    if (!selectedSistema) return [];
    
    if (selectedSistema === 'achados_caso') {
      return [{ key: 'achados_caso', label: 'Todos os Achados', icon: '⭐' }];
    }

    const defined = SYSTEM_SUBCATEGORIES[selectedSistema];
    if (defined) return defined;

    const dataKeys = Object.keys(achadosPorSistema);
    if (dataKeys.length > 0) {
      return dataKeys.map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        icon: '📋',
      }));
    }

    return FALLBACK_SUBCATEGORIES;
  }, [selectedSistema, achadosPorSistema]);

  const getFindingsForSub = React.useCallback((subKey: string) => {
    const exact = achadosPorSistema[subKey];
    if (exact && exact.length > 0) return exact;

    const keyword = subKey.toLowerCase().replace(/_/g, ' ');
    const results: ExameFisicoSistema[] = [];
    const seen = new Set<string>();

    for (const findings of Object.values(achadosPorSistema)) {
      if (!Array.isArray(findings)) continue;
      for (const f of findings as ExameFisicoSistema[]) {
        const itemLower = f.item.toLowerCase();
        if (itemLower.includes(keyword) && !seen.has(f.item)) {
          results.push(f);
          seen.add(f.item);
        }
      }
    }

    return results;
  }, [achadosPorSistema]);

  const findingsForSubCategory = useMemo(() => {
    if (!selectedSistema || !selectedSubCategory) return [];
    return getFindingsForSub(selectedSubCategory);
  }, [selectedSistema, selectedSubCategory, getFindingsForSub]);

  if (mode === 'case-builder') {
    return (
      <CaseBuilderExamModal
        isOpen={isOpen}
        onClose={onClose}
        onFindingsSelected={onFindingsSelected}
        initialSelectedItems={initialSelectedItems}
      />
    );
  }

  if (!isOpen) return null;

  const currentSistema = sistemas.find(s => s.key === selectedSistema);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl bg-[#0f1115] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Exame físico</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione a etapa que deseja registrar</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all duration-200 flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Level 1: System Selection */}
          {!selectedSistema ? (
            <div className="space-y-3">
              {sistemas.map((s) => (
                <button
                  key={s.key}
                  onClick={() => handleSelectSistema(s.key)}
                  className="w-full group flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl group-hover:bg-white/10 transition-colors">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {s.label}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Selecione para explorar os achados
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          ) : !selectedSubCategory ? (
            /* Level 2: Sub-Category / Maneuver Selection */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button 
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Voltar para sistemas
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl border border-white/5">
                  {currentSistema?.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{currentSistema?.label}</h3>
                  <p className="text-sm text-gray-400">Selecione a manobra ou região para examinar</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subCategories.map((sub) => {
                  const subFindings = getFindingsForSub(sub.key);
                  const hasFindings = subFindings.length > 0;
                  const isTested = testedSubCategories.has(sub.key);
                  const isShaking = shakingSub === sub.key;
                  const isFlashing = flashingSub === sub.key;

                  return (
                    <button
                      key={sub.key}
                      onClick={() => handleSelectSubCategory(sub.key)}
                      className={`group relative flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left ${
                        isFlashing
                          ? 'border-yellow-400/80 bg-yellow-500/20 ring-2 ring-yellow-400/50 scale-105'
                          : isTested && !hasFindings
                          ? 'border-white/5 bg-white/3 opacity-40'
                          : isTested && hasFindings
                          ? 'border-violet-500/30 bg-violet-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30'
                      } ${isShaking ? 'animate-shake' : ''}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border transition-colors ${
                        isFlashing
                          ? 'bg-yellow-500/30 border-yellow-400/40'
                          : isTested && !hasFindings
                          ? 'bg-white/5 border-white/5'
                          : 'bg-violet-500/10 border-violet-500/20 group-hover:bg-violet-500/20'
                      }`}>
                        {sub.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-bold transition-colors ${
                          isFlashing ? 'text-yellow-300' : isTested && !hasFindings ? 'text-gray-600' : 'text-gray-100 group-hover:text-white'
                        }`}>{sub.label}</h4>
                        <p className={`text-xs mt-0.5 ${
                          isFlashing ? 'text-yellow-400' : isTested && !hasFindings ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {isFlashing
                            ? '⚠️ Sem alterações nesta manobra'
                            : isTested && !hasFindings
                            ? '✓ Já verificado — sem alterações'
                            : hasFindings
                            ? `${subFindings.length} achados`
                            : 'Sem achados específicos'}
                        </p>
                      </div>
                      {!isFlashing && (
                        <ChevronRight className={`w-4 h-4 transition-colors ${
                          isTested && !hasFindings ? 'text-gray-700' : 'text-gray-600 group-hover:text-violet-400'
                        }`} />
                      )}
                      {isFlashing && (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Level 3: Findings Selection */
            <div className="flex flex-col lg:flex-row flex-1 gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="lg:w-1/3">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                  <button 
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition mb-6"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Voltar para manobras
                  </button>
                  
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-4 border border-white/5">
                    {currentSistema?.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{currentSistema?.label}</h3>
                  <p className="text-sm text-violet-400 font-medium mb-2">{subCategories.find(sc => sc.key === selectedSubCategory)?.label}</p>
                  <p className="text-sm text-gray-400">Verifique os achados clínicos e selecione aqueles presentes no exame do seu paciente.</p>
                </div>
              </div>
              
              <div className="lg:w-2/3">
                <div className="grid grid-cols-1 gap-3">
                  {findingsForSubCategory.length > 0 ? (
                    findingsForSubCategory.map((finding: ExameFisicoSistema, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => toggleItem(finding.item)}
                        className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left ${
                          selectedItems.includes(finding.item)
                            ? 'bg-violet-500/20 border-violet-500/50 text-white shadow-lg shadow-violet-500/10'
                            : 'bg-white/2 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          selectedItems.includes(finding.item)
                            ? 'bg-violet-500 text-white'
                            : 'border-2 border-gray-600'
                        }`}>
                          {selectedItems.includes(finding.item) && <CheckCircle2 size={12} />}
                        </div>
                        <div className="flex-1">
                          <span className="block text-sm font-medium">{finding.item}</span>
                          {finding.achado && (
                            <span className="block text-xs text-gray-500 mt-1">{finding.achado}</span>
                          )}
                          <div className="mt-2 flex items-center gap-2 opacity-60">
                            {finding.normal ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Achado Normal</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase">Patológico</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-12 text-center rounded-3xl border border-dashed border-white/5">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                      <h4 className="text-lg font-bold text-gray-400">Nenhum achado encontrado</h4>
                      <p className="text-sm text-gray-500">Esta manobra/região não possui achados específicos para esta patologia.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex items-center justify-between">
          {!selectedSistema ? (
            <p className="text-xs text-gray-400">
              Ao clicar em uma opção, o sistema abre os campos específicos dessa etapa do exame físico.
            </p>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-violet-400 font-bold">{selectedItems.length}</span> achados selecionados para o SOAP
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
            >
              {!selectedSistema ? 'Fechar' : 'Cancelar'}
            </button>
            {selectedSistema && (
              <button 
                onClick={handleConfirm}
                className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2"
              >
                Salvar Exame
                <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ExamModal;
