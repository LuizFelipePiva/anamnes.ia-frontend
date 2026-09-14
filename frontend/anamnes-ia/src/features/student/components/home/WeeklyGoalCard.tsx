/**
 * SPEC-013 §6.6 — meta da semana.
 * `done` mostra o número real; a barra satura em 100% (7 de 5 é "meta batida",
 * não 140% de barra).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GoalProgress } from '../../utils/studyPlan';

const WeeklyGoalCard: React.FC<{ goal: GoalProgress }> = ({ goal }) => {
  const { t } = useTranslation('common');

  return (
    <section
      data-testid="card-goal"
      className="rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] px-5 py-4 flex flex-col gap-3"
    >
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.goal.title')}
      </h2>
      <p className="text-[13px] font-semibold text-[#20202a] m-0">
        {t('home.goal.progress', { count: goal.done, goal: goal.goal })}
      </p>
      <span
        role="progressbar"
        aria-valuenow={goal.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('home.goal.aria', { pct: goal.pct })}
        className="block h-2.5 rounded-full bg-[#f0eeff] overflow-hidden"
      >
        <span
          className="block h-full rounded-full bg-gradient-to-r from-[#844AF5] to-[#6b35ff]"
          style={{ width: `${goal.pct}%` }}
        />
      </span>
    </section>
  );
};

export default WeeklyGoalCard;
