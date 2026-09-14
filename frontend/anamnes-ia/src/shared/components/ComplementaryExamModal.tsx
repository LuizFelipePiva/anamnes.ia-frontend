import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Plus, X } from 'lucide-react';
import { BsFileEarmarkMedical } from 'react-icons/bs';

interface ComplementaryExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the case builder confirms its selection. */
  onExamsSelected?: (exams: string[]) => void;
  selectedItems?: string[];
  suggestedItems?: string[];
}

type ComplementaryExamCategory = {
  key: string;
  label: string;
  icon: string;
  items: string[];
};

const EXAM_CATEGORIES: ComplementaryExamCategory[] = [
  {
    key: 'laboratoriais',
    label: 'Laboratoriais',
    icon: '🧫',
    items: ['Hemograma completo', 'Função renal', 'Eletrólitos', 'Glicemia', 'Proteína C reativa (PCR)', 'Coagulograma'],
  },
  {
    key: 'imagem',
    label: 'Imagem',
    icon: '🩻',
    items: ['Raio-X', 'Ultrassonografia', 'Tomografia computadorizada', 'Ressonância magnética', 'Ecocardiograma'],
  },
  {
    key: 'funcionais',
    label: 'Funcionais e à beira-leito',
    icon: '📈',
    items: ['Eletrocardiograma (ECG)', 'Oximetria de pulso', 'Gasometria arterial', 'Espirometria', 'Teste ergométrico'],
  },
  {
    key: 'procedimentos',
    label: 'Procedimentos diagnósticos',
    icon: '🔬',
    items: ['Endoscopia', 'Colonoscopia', 'Biópsia', 'Punção lombar', 'Análise de líquido sinovial'],
  },
];

const ComplementaryExamModal: React.FC<ComplementaryExamModalProps> = ({
  isOpen,
  onClose,
  onExamsSelected,
  selectedItems: initialSelectedItems = [],
  suggestedItems = [],
}) => {
  const { t: tUi } = useTranslation('common');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>(initialSelectedItems);
  const [customExam, setCustomExam] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategoryKey(null);
      setSelectedItems(initialSelectedItems);
      setCustomExam('');
    }
  }, [isOpen, initialSelectedItems]);

  const selectedCategory = useMemo(
    () => EXAM_CATEGORIES.find(category => category.key === selectedCategoryKey) ?? null,
    [selectedCategoryKey],
  );

  if (!isOpen) return null;

  const toggleExam = (exam: string) => {
    setSelectedItems(items => items.includes(exam)
      ? items.filter(item => item !== exam)
      : [...items, exam]);
  };

  const addCustomExam = () => {
    const normalized = customExam.trim();
    if (!normalized) return;
    setSelectedItems(items => items.some(item => item.toLowerCase() === normalized.toLowerCase())
      ? items
      : [...items, normalized]);
    setCustomExam('');
  };

  const confirmed = () => {
    onExamsSelected?.(selectedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f1115] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2D4993]/30 bg-[#2D4993]/20 text-[#82a1f5]">
              <BsFileEarmarkMedical size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{tUi('clinical_tools.additional_tests')}</h2>
              <p className="mt-1 text-sm text-gray-400">{tUi('clinical_tools.select_case_tests')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-red-500/20 hover:text-red-400"
            aria-label="Fechar exames complementares"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            {!selectedCategory ? (
              <>
                {suggestedItems.length > 0 && (
                  <section className="mb-6 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-violet-200">{tUi('clinical_tools.pathology_suggestions')}</h3>
                      <p className="mt-0.5 text-xs text-violet-200/60">{tUi('clinical_tools.toggle_suggestion')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedItems.map(item => {
                        const selected = selectedItems.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleExam(item)}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
                              selected
                                ? 'border-violet-400/60 bg-violet-500/30 text-white'
                                : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {selected && <CheckCircle2 className="mr-1.5 inline-block h-3.5 w-3.5" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <p className="mb-4 text-sm font-medium text-gray-300">Escolha uma categoria de exame</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {EXAM_CATEGORIES.map(category => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategoryKey(category.key)}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:border-violet-500/40 hover:bg-white/10"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-2xl">
                        {category.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-gray-100 group-hover:text-white">{category.label}</span>
                        <span className="mt-1 block text-xs text-gray-500">{category.items.length} {tUi('clinical_tools.common_options')}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-600 transition-colors group-hover:text-violet-400" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryKey(null)}
                  className="mb-5 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" /> {tUi('clinical_tools.back_categories')}
                </button>
                <div className="mb-6 flex items-center gap-3">
                  <span className="text-3xl">{selectedCategory.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedCategory.label}</h3>
                    <p className="text-sm text-gray-400">{tUi('clinical_tools.select_student_tests')}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedCategory.items.map(item => {
                    const selected = selectedItems.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleExam(item)}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition-all ${
                          selected
                            ? 'border-violet-400/60 bg-violet-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                          selected ? 'bg-violet-500 text-white' : 'border-2 border-gray-600'
                        }`}>
                          {selected && <CheckCircle2 size={12} />}
                        </span>
                        {item}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-6 border-t border-white/5 pt-5">
              <label className="text-sm font-medium text-gray-200" htmlFor="custom-complementary-exam">Adicionar outro exame</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="custom-complementary-exam"
                  value={customExam}
                  onChange={event => setCustomExam(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCustomExam();
                    }
                  }}
                  placeholder="Ex.: Doppler venoso de membros inferiores"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={addCustomExam}
                  disabled={!customExam.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-100">Exames selecionados</h3>
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">{selectedItems.length}</span>
            </div>
            {selectedItems.length ? (
              <ul className="mt-4 space-y-2">
                {selectedItems.map(item => (
                  <li key={item} className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-gray-300">
                    <span className="flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => toggleExam(item)}
                      className="h-5 w-5 flex-shrink-0 rounded text-gray-500 transition hover:bg-red-500/20 hover:text-red-300"
                      aria-label={`Remover ${item}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-gray-500">{tUi('clinical_tools.no_tests')}</p>
            )}
          </aside>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-white/5 bg-white/[0.02] p-6">
          <p className="text-xs text-gray-500">{tUi('clinical_tools.tests_available')}</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-400 transition hover:text-white">
              Cancelar
            </button>
            <button type="button" onClick={confirmed} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500">
              Salvar exames
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplementaryExamModal;
