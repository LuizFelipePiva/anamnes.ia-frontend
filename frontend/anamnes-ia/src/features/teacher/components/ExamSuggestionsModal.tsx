import React, { useState, useMemo } from 'react';
import { X, Lightbulb, Zap, Check } from 'lucide-react';
import { SUGGESTIONS_DATA, type ExameFisicoSistema } from '../data/suggestionsData';

interface ExamSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patologia: string;
  onAutoFill: (findings: string[]) => void;
  onSelectItem: (item: string) => void;
  currentItems: string;
}

const EXAM_CATEGORIES = [
  { key: 'geral', label: 'Estado Geral', icon: '👤', color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/20' },
  { key: 'inspecao', label: 'Ectoscopia / Inspeção', icon: '👁️', color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/20' },
  { key: 'cardiovascular', label: 'Cardiovascular', icon: '❤️', color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/20' },
  { key: 'respiratorio', label: 'Respiratório', icon: '🫁', color: 'from-sky-500/20 to-sky-600/10', border: 'border-sky-500/20' },
  { key: 'abdome', label: 'Abdômen', icon: '🤲', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20' },
  { key: 'neurologico', label: 'Neurológico', icon: '🧠', color: 'from-teal-500/20 to-teal-600/10', border: 'border-teal-500/20' },
  { key: 'musculoesqueletico', label: 'Osteomuscular', icon: '🦴', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20' },
];

const ExamSuggestionsModal: React.FC<ExamSuggestionsModalProps> = ({
  isOpen,
  onClose,
  patologia,
  onAutoFill,
  onSelectItem,
  currentItems,
}) => {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const patologiaData = useMemo(() => {
    if (!patologia) return null;
    const selectedPathologies = patologia.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const allFindings: Record<string, ExameFisicoSistema[]> = {};

    selectedPathologies.forEach(p => {
      const entry = Object.entries(SUGGESTIONS_DATA.pathologySpecific).find(([name]) => {
        const n = name.toLowerCase().trim();
        return n.includes(p) || p.includes(n);
      });
      if (entry && entry[1]?.exame_fisico) {
        Object.entries(entry[1].exame_fisico as Record<string, ExameFisicoSistema[]>).forEach(([key, items]) => {
          if (!allFindings[key]) allFindings[key] = [];
          allFindings[key].push(...items);
        });
      }
    });

    return allFindings;
  }, [patologia]);

  const toggleCat = (key: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAutoFill = () => {
    if (!patologiaData) return;
    const findings: string[] = [];
    Object.values(patologiaData).forEach(items => {
      items.forEach(item => {
        const text = item.achado ? `${item.item}: ${item.achado}` : item.item;
        if (!findings.includes(text)) findings.push(text);
      });
    });
    onAutoFill(findings);
  };

  const isItemUsed = (itemText: string) => {
    return (currentItems || '').toLowerCase().includes(itemText.toLowerCase());
  };

  const handleItemClick = (item: ExameFisicoSistema) => {
    const text = item.achado ? `${item.item}: ${item.achado}` : item.item;
    onSelectItem(text);
  };

  const totalFindings = patologiaData
    ? Object.values(patologiaData).reduce((acc, items) => acc + items.length, 0)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Lightbulb size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Sugestões de Exame Físico</h3>
              <p className="text-sm text-gray-400">
                {patologia
                  ? `Baseado em: ${patologia}`
                  : 'Selecione uma patologia para sugestões contextuais'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Auto-fill button */}
        {patologiaData && totalFindings > 0 && (
          <div className="p-4 border-b border-white/5">
            <button
              onClick={handleAutoFill}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 font-bold hover:from-amber-500/30 hover:to-amber-600/20 transition-all"
            >
              <Zap size={18} />
              Preencher todos os exames físicos automaticamente ({totalFindings} achados)
            </button>
          </div>
        )}

        {/* Categories */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-3">
            {EXAM_CATEGORIES.map(cat => {
              const findings = patologiaData?.[cat.key] || [];
              const isExpanded = expandedCats.has(cat.key);

              return (
                <div key={cat.key} className="rounded-2xl border border-white/10 overflow-hidden">
                  <button
                    onClick={() => toggleCat(cat.key)}
                    className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${cat.color} transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div className="text-left">
                        <span className="text-sm font-bold text-white">{cat.label}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {findings.length > 0 ? `${findings.length} achados` : 'Sem dados específicos'}
                        </span>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="bg-white/5 p-3 space-y-1.5">
                      {findings.length > 0 ? (
                        findings.map((finding: ExameFisicoSistema, idx: number) => {
                          const text = finding.achado ? `${finding.item}: ${finding.achado}` : finding.item;
                          const used = isItemUsed(text);

                          return (
                            <button
                              key={idx}
                              onClick={() => handleItemClick(finding)}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-start gap-3 ${
                                used
                                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                                  : 'bg-white/5 border border-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className={`mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                                used ? 'bg-emerald-500 text-white' : 'border border-gray-500'
                              }`}>
                                {used && <Check size={10} />}
                              </div>
                              <div className="flex-1">
                                <span className={`text-sm ${used ? 'text-emerald-300' : 'text-gray-300'}`}>
                                  {text}
                                </span>
                                {used && (
                                  <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                    USADO
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Sem achados específicos para esta patologia nesta categoria.
                        </div>
                      )}

                      {findings.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newItems = findings.map((f: ExameFisicoSistema) => f.achado ? `${f.item}: ${f.achado}` : f.item);
                            onAutoFill(newItems);
                          }}
                          className="w-full mt-2 px-3 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-all"
                        >
                          + Adicionar todos desta categoria
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSuggestionsModal;
