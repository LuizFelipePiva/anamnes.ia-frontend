/**
 * SPEC-013 §6.4 — domínio por especialidade.
 * Barras horizontais ordenadas do mais fraco para o mais forte: a lista existe
 * para acionar o aluno, não para premiar.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { specialtyLabel } from '@/shared/utils/specialties';
import type { MasteryRow } from '../../utils/studyPlan';

/* Tokens, não hex: a cor vem de `--tone-*` (`index.css`), que o tema escuro
   redefine dessaturada. Estilo inline não é alcançado pelos overrides de
   classe do modo escuro, então o token é a única via. */
const BAND_COLORS: Record<MasteryRow['band'], string> = {
  low: 'var(--tone-pink)',
  mid: 'var(--tone-amber)',
  high: 'var(--tone-green)',
};

const MasteryCard: React.FC<{ rows: MasteryRow[] }> = ({ rows }) => {
  const { t } = useTranslation('common');
  if (rows.length === 0) return null;

  return (
    <section
      data-testid="card-mastery"
      className="rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] px-5 py-4 flex flex-col gap-3"
    >
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.mastery.title')}
      </h2>
      <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
        {rows.map(row => (
          <li key={row.specialty} className="flex items-center gap-2.5">
            <span className="w-[92px] flex-shrink-0 text-[11px] font-semibold text-[#6b6b7b] truncate">
              {specialtyLabel(row.specialty)}
            </span>
            <span
              role="progressbar"
              aria-valuenow={row.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('home.mastery.aria', { specialty: specialtyLabel(row.specialty), score: row.score })}
              className="flex-1 h-2 rounded-full bg-[#f0eeff] overflow-hidden"
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${row.score}%`, backgroundColor: BAND_COLORS[row.band] }}
              />
            </span>
            <span className="w-8 text-right text-[11px] font-extrabold text-[#20202a]">{row.score}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MasteryCard;
