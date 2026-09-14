/**
 * SPEC-013 §6.5 — sequência de estudo.
 * Sete quadrados (segunda→domingo da semana corrente). A cor não é o único
 * sinal: cada quadrado carrega `aria-label` com o dia e o estado (§9).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Streak } from '../../utils/studyPlan';

interface Props {
  streak: Streak;
  /** Referência da semana; a página passa `new Date()`. */
  now: Date;
}

/** Segunda-feira 00:00 da semana de `now` — mesma convenção do módulo puro. */
function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const StreakCard: React.FC<Props> = ({ streak, now }) => {
  const { t, i18n } = useTranslation('common');
  const weekStart = startOfWeek(now);
  const todayIndex = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - weekStart.getTime()) / 86_400_000);
  // Nomes dos dias vêm do Intl no idioma ativo — não são 7 chaves de dicionário.
  const dayName = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });

  return (
    <section
      data-testid="card-streak"
      className="rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] px-5 py-4 flex flex-col gap-3"
    >
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.streak.title')}
      </h2>
      <div className="flex items-center gap-1.5">
        {streak.week.map((done, i) => {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          const label = dayName.format(day);
          return (
            <span
              key={i}
              aria-label={t(done ? 'home.streak.day_done' : 'home.streak.day_empty', { day: label })}
              title={label}
              className={`flex-1 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold ${
                done ? 'bg-[#18c39a] text-white' : 'bg-[#f0eeff] text-[#b0aac8]'
              } ${i === todayIndex ? 'ring-2 ring-[#7a55ff]' : ''}`}
            >
              {label.slice(0, 1).toUpperCase()}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-[#9a9aab] m-0">
        {t('home.streak.footer', { count: streak.current, best: streak.best })}
      </p>
    </section>
  );
};

export default StreakCard;
