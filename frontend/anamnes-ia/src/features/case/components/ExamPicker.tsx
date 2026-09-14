/**
 * Seletor de exames complementares do professor (SPEC-014).
 *
 * Divisão de responsabilidade: o picker **lê** o catálogo e cuida da seleção;
 * quem persiste é o pai, via `onSave`. O motivo é o fluxo de criação — o caso
 * ainda não tem `id` enquanto o professor preenche o formulário, então o
 * componente não teria o que passar para a API. O pai decide: salvar agora
 * (edição) ou logo após criar o caso.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AudioLines, Maximize2, Play, Search, X } from 'lucide-react';

import { fetchMedicalAssets } from '../services/examService';
import type { MedicalAsset } from '../types/exams';
import { MAX_EXAMS_PER_CASE, filterAssets } from '../utils/examLabel';

interface ExamPickerProps {
  /** Exames já anexados ao caso, na ordem persistida. */
  initialSelectedIds?: string[];
  onSave: (assetIds: string[]) => void | Promise<void>;
  onClose: () => void;
}

const twInput = 'w-full px-3.5 py-2.5 rounded-xl border border-[#e5e2ef] bg-white text-sm text-[#111018] focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/20 focus:border-[#7a55ff] transition-all';
const twBtnPri = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6b35ff] text-white text-sm font-semibold hover:bg-[#5a2ad9] transition-all disabled:opacity-50 cursor-pointer';
const twBtnGho = 'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#e9e7f6] bg-white text-sm font-semibold text-[#374151] hover:border-[#c4bfea] transition-all cursor-pointer';

const ExamPicker: React.FC<ExamPickerProps> = ({ initialSelectedIds = [], onSave, onClose }) => {
  const { t } = useTranslation('case');

  const [assets, setAssets] = useState<MedicalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('');
  // Array, não Set: a ordem de seleção é o que vira `position` no banco.
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  const [saving, setSaving] = useState(false);
  // Asset em preview (lightbox). `null` = fechado.
  const [preview, setPreview] = useState<MedicalAsset | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMedicalAssets()
      .then((data) => { if (alive) setAssets(data); })
      .catch(() => { if (alive) setAssets([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const modalities = useMemo(
    () => [...new Set(assets.map((a) => a.modality).filter(Boolean))].sort(),
    [assets],
  );

  const visible = useMemo(
    () => filterAssets(assets, query, modality),
    [assets, query, modality],
  );

  // Esc fecha o preview. Só enquanto aberto: um listener permanente roubaria o
  // Esc do modal que hospeda o picker.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const atLimit = selected.length >= MAX_EXAMS_PER_CASE;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : prev.length >= MAX_EXAMS_PER_CASE ? prev : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-bold text-[#111018]">{t('exams.picker.title')}</div>
        <button
          type="button"
          aria-label={t('exams.viewer.close')}
          className="w-7 h-7 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-all"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      {/* Empilha no celular: busca + select lado a lado deixariam os dois
          estreitos demais para ler o que está digitado. */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9893b0]" />
          <input
            className={`${twInput} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('exams.picker.search_placeholder')}
            aria-label={t('exams.picker.search_placeholder')}
          />
        </div>
        <select
          className={`${twInput} sm:w-56 flex-shrink-0`}
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          aria-label={t('exams.picker.all_modalities')}
        >
          <option value="">{t('exams.picker.all_modalities')}</option>
          {modalities.map((slug) => (
            <option key={slug} value={slug}>{t(`exams.modality.${slug}`, { defaultValue: slug })}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
        <span className="text-[#6b6880] font-semibold">
          {t('exams.picker.selected', { n: selected.length, max: MAX_EXAMS_PER_CASE })}
        </span>
        {atLimit && (
          <span className="text-amber-600 font-semibold">
            {t('exams.picker.limit_reached', { max: MAX_EXAMS_PER_CASE })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pr-1">
        {visible.map((asset) => {
          const isSelected = selected.includes(asset.id);
          // Só os NÃO selecionados travam no limite: desmarcar precisa continuar
          // possível, senão o professor fica preso na própria escolha.
          const disabled = atLimit && !isSelected;
          // "Visualizar" numa ausculta seria mentira para quem usa leitor de
          // tela — é justamente quem mais depende do rótulo estar certo.
          const previewLabel = t(
            asset.media_type === 'audio' ? 'exams.picker.listen' : 'exams.picker.preview',
            { name: asset.display_name },
          );
          return (
            // O card deixou de ser um único botão: a miniatura abre o preview e o
            // resto alterna a seleção. Botão dentro de botão é HTML inválido, daí
            // o wrapper ser um `div` que só carrega a moldura.
            <div
              key={asset.id}
              className={`flex gap-2.5 items-center p-2 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[#6b35ff] bg-[#f3f1ff]'
                  : 'border-[#e9e7f6] bg-white hover:border-[#c4bfea]'
              } ${disabled ? 'opacity-40' : ''}`}
            >
              {asset.url && (
                <button
                  type="button"
                  // Ampliar não é selecionar: continua clicável no limite, senão o
                  // professor não consegue conferir o que já não pode anexar.
                  onClick={() => setPreview(asset)}
                  aria-label={previewLabel}
                  title={previewLabel}
                  className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[#f5f3fb] cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#7a55ff]/40"
                >
                  {asset.media_type === 'audio' ? (
                    // Áudio não tem quadro para mostrar: uma <img> apontando para
                    // o .mp3 renderiza o ícone de imagem quebrada e passa a
                    // impressão de asset defeituoso.
                    <span className="w-full h-full flex items-center justify-center text-[#6b35ff]">
                      <AudioLines size={20} />
                    </span>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.display_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Só no hover/foco: a lupa permanente competiria com a imagem
                      em 14×14 e o professor deixaria de reconhecer o exame. */}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                    {asset.media_type === 'audio' ? <Play size={14} /> : <Maximize2 size={14} />}
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggle(asset.id)}
                className={`flex flex-col gap-0.5 min-w-0 flex-1 text-left self-stretch justify-center ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className="text-xs font-bold text-[#111018] truncate w-full">{asset.display_name}</span>
                <span className="text-[11px] text-[#6b6880] truncate w-full">
                  {t(`exams.modality.${asset.modality}`, { defaultValue: asset.modality })}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {!loading && visible.length === 0 && (
        <div className="text-xs text-[#6b6880] py-6 text-center">{t('exams.picker.empty')}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={twBtnGho} onClick={onClose}>
          {t('exams.picker.cancel')}
        </button>
        <button type="button" className={twBtnPri} onClick={handleSave} disabled={saving}>
          {t('exams.picker.save')}
        </button>
      </div>

      {/* Portal para o <body>: o picker mora dentro do modal do CaseForm, e um
          `fixed` aninhado ali herdaria os limites e o recorte daquele card. */}
      {preview && createPortal(
        <div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={preview.display_name}
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#e9e7f6]">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#111018] break-words">{preview.display_name}</div>
                <div className="text-[11px] text-[#6b6880]">
                  {t(`exams.modality.${preview.modality}`, { defaultValue: preview.modality })}
                </div>
              </div>
              <button
                type="button"
                aria-label={t('exams.viewer.close')}
                onClick={() => setPreview(null)}
                className="w-8 h-8 rounded-lg bg-[#f5f3fb] text-[#6b6880] flex items-center justify-center hover:bg-[#ede8f9] transition-all shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {preview.url ? (
                preview.media_type === 'audio' ? (
                  // `preload="metadata"`: sem isso o Chrome baixa a ausculta
                  // inteira ao abrir o preview, e o professor que só folheia o
                  // catálogo paga o download de cada exame que espia.
                  <audio
                    src={preview.url}
                    controls
                    preload="metadata"
                    aria-label={preview.display_name}
                    className="w-full"
                  />
                ) : preview.media_type === 'video' ? (
                  <video
                    src={preview.url}
                    controls
                    className="w-full max-h-[65vh] rounded-xl bg-black"
                  />
                ) : (
                  // `object-contain` + teto de altura: exame em pé (radiografia)
                  // estouraria a tela se coubesse pela largura.
                  <img
                    src={preview.url}
                    alt={preview.display_name}
                    className="w-full max-h-[65vh] object-contain rounded-xl bg-[#f5f3fb]"
                  />
                )
              ) : (
                <div className="text-xs text-[#6b6880] py-6 text-center">{t('exams.viewer.unavailable')}</div>
              )}

              {preview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {preview.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-lg bg-[#f5f3fb] text-[11px] text-[#6b6880]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Selecionar direto do preview: sem isto o professor fecha o modal
                só para clicar no card que acabou de olhar. */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#e9e7f6]">
              <button
                type="button"
                className={twBtnGho}
                onClick={() => setPreview(null)}
              >
                {t('exams.viewer.close')}
              </button>
              <button
                type="button"
                className={twBtnPri}
                disabled={atLimit && !selected.includes(preview.id)}
                onClick={() => { toggle(preview.id); setPreview(null); }}
              >
                {selected.includes(preview.id)
                  ? t('exams.picker.unselect')
                  : t('exams.picker.select')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default ExamPicker;
