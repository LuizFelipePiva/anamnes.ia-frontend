import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  ClipboardList
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

const ExamModal: React.FC<ExamModalProps> = ({ 
  isOpen, 
  onClose, 
  pathologyData, 
  onFindingsSelected,
  selectedItems: initialSelectedItems = [],
  customExameFisico
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
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Exame Físico Dirigido</h3>
              <p className="text-sm text-gray-500">
                {!selectedSistema
                  ? 'Selecione os sistemas para realizar as manobras'
                  : !selectedSubCategory
                  ? `${currentSistema?.label} — Escolha a manobra/região`
                  : `${currentSistema?.label} — ${subCategories.find(sc => sc.key === selectedSubCategory)?.label}`}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Level 1: System Selection */}
          {!selectedSistema ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {sistemas.map((s) => {
                const specific = achadosPorSistema[s.key] || [];
                const defaults = [
                  { item: 'Estado geral preservado', normal: true },
                  { item: 'Sinais vitais estáveis', normal: true }
                ];
                
                const extraInspecao = s.key === 'inspecao' 
                  ? [...(achadosPorSistema['geral'] || []), ...(achadosPorSistema['dermatologico'] || [])]
                  : [];
                
                const combinedSpecific = [...specific, ...extraInspecao];
                
                const uniqueItems = new Set([
                  ...defaults.map(d => d.item.toLowerCase()),
                  ...combinedSpecific.map(sp => sp.item.toLowerCase())
                ]);
                
                const totalCount = uniqueItems.size;
                
                return (
                  <button
                    key={s.key}
                    onClick={() => handleSelectSistema(s.key)}
                    className={`group relative flex items-center gap-5 p-6 rounded-2xl border ${s.border} ${s.bg} ${s.hover} transition-all duration-300 text-left overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/5 transition-transform group-hover:scale-110 duration-300`}>
                      {s.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">{s.label}</h4>
                      <p className="text-sm text-gray-400 mt-1">{totalCount} procedimentos de exame</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                );
              })}
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
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-violet-400 font-bold">{selectedItems.length}</span> achados selecionados para o SOAP
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2"
            >
              Salvar Exame
              <CheckCircle2 size={18} />
            </button>
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
