/**
 * SPEC-013 §6.8 — perfil SOAP.
 * Mesmas barras do domínio por especialidade (§6.4), com as 4 dimensões em
 * ordem canônica S/O/A/P: aqui a ordem é didática, não do mais fraco ao mais
 * forte — o aluno lê o método na sequência em que aprendeu.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SoapRow } from '../../utils/studyPlan';

/* Tokens `--tone-*` (`index.css`) em vez de hex: o tema escuro os redefine
   dessaturados, e estilo inline escapa dos overrides de classe. */
const BAND_COLORS: Record<SoapRow['band'], string> = {
  low: 'var(--tone-pink)',
  mid: 'var(--tone-amber)',
  high: 'var(--tone-green)',
};

const SoapCard: React.FC<{ rows: SoapRow[]; attempts: number }> = ({ rows, attempts }) => {
  const { t } = useTranslation('common');
  if (rows.length === 0) return null;

  return (
    <section
      data-testid="card-soap"
      className="rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] px-5 py-4 flex flex-col gap-3"
    >
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.soap.title')}
      </h2>
      <ul className="flex flex-col gap-2.5 m-0 p-0 list-none">
        {rows.map(row => (
          <li key={row.dim} className="flex items-center gap-2.5">
            <span className="w-[92px] flex-shrink-0 text-[11px] font-semibold text-[#6b6b7b] truncate">
              {t(`home.soap.dim.${row.dim}`)}
            </span>
            <span
              role="progressbar"
              aria-valuenow={row.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('home.soap.aria', { dimension: t(`home.soap.dim.${row.dim}`), score: row.score })}
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
      <p className="text-[11px] text-[#9a9aab] m-0">
        {t('home.soap.footer', { count: attempts })}
      </p>
    </section>
  );
};

export default SoapCard;
