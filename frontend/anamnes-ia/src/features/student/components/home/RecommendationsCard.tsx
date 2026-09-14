/**
 * SPEC-013 §6.3 — "Recomendado pra você".
 * Até 4 linhas clicáveis; cada uma explica por que está ali. Sem dado suficiente
 * em nenhum motor, mostra o empty state (nunca um card vazio).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Flame, GraduationCap, Hourglass } from 'lucide-react';
import { specialtyLabel } from '@/shared/utils/specialties';
import type { RecoKind, Recommendation } from '../../utils/studyPlan';

const ICONS: Record<RecoKind, React.ComponentType<{ size?: number }>> = {
  weak: AlertTriangle,
  stale: Hourglass,
  class: GraduationCap,
  streak: Flame,
};

/** Uma cor por motor — a mesma paleta já usada no app (§3 da spec). Via token
 *  `--tone-*`/`--accent-color`, que o tema escuro redefine dessaturado. */
const COLORS: Record<RecoKind, string> = {
  weak: 'var(--tone-pink)',
  stale: 'var(--tone-amber)',
  class: 'var(--accent-color)',
  streak: 'var(--tone-green)',
};

interface Props {
  items: Recommendation[];
  /** Cota diária esgotada: os cards continuam visíveis, mas inertes. */
  disabled: boolean;
  onSelect: (reco: Recommendation) => void;
  onExplore: () => void;
}

const RecommendationsCard: React.FC<Props> = ({ items, disabled, onSelect, onExplore }) => {
  const { t } = useTranslation('common');

  return (
    // Título **dentro** do card, como os blocos da sidebar — o header fica com
    // padding próprio e a lista sangra até a borda (hover de linha inteira).
    <section className="w-full rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] overflow-hidden">
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 mx-5 my-4 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.reco.title')}
      </h2>

      {items.length === 0 ? (
        <div
          data-testid="reco-empty"
          className="px-6 pb-6 flex flex-col items-center gap-3 text-center"
        >
          <p className="text-[13px] text-[#6b6b7b]">{t('home.reco.empty')}</p>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#844AF5] to-[#6b35ff] text-white text-[12px] font-bold hover:opacity-90 transition-all"
          >
            {t('home.reco.empty_cta')} <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="border-t border-[var(--card-divide)] divide-y divide-[var(--card-divide)]">
          {items.map(reco => {
            const Icon = ICONS[reco.kind];
            const color = COLORS[reco.kind];
            // `count` só entra quando o motivo tem contagem: passar `count` para
            // uma chave sem formas plurais faz o i18next procurar `_other` e cair
            // no fallback em silêncio.
            const raw = reco.reasonValues;
            const counted = typeof raw.attempts === 'number' ? raw.attempts
              : typeof raw.days === 'number' ? raw.days
              : null;
            const values = counted === null ? raw : { ...raw, count: counted };
            return (
              <button
                key={reco.caseId}
                type="button"
                data-testid="reco-card"
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => onSelect(reco)}
                className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-[#faf9ff] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold tracking-[.12em] uppercase" style={{ color }}>
                    {t(`home.reco.${reco.kind}_label`)}
                  </span>
                  <span className="block text-[14px] font-bold text-[#20202a] truncate">{reco.title}</span>
                  <span className="block text-[12px] text-[#9a9aab] truncate">
                    {t(`home.reco.${reco.kind}`, values)}
                    {reco.specialty ? ` · ${specialtyLabel(reco.specialty)}` : ''}
                  </span>
                </span>
                <span className="flex-shrink-0 text-[12px] font-bold text-[#7a55ff] flex items-center gap-1">
                  {disabled ? t('home.limit_reached') : t('home.reco.cta')}
                  {!disabled && <ArrowRight size={13} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecommendationsCard;
