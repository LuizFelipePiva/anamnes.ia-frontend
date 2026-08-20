// src/components/teacher/EngagementRing.tsx
// Componente de anel de engajamento circular

import React from 'react';
import { useTranslation } from 'react-i18next';

interface EngagementRingProps {
  percentage: number;
  label?: string;
  status?: 'ok' | 'warn' | 'danger';
}

const pillMap: Record<string, string> = {
  ok: 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700',
  warn: 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700',
  danger: 'px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700',
};

const EngagementRing: React.FC<EngagementRingProps> = ({
  percentage,
  label,
  status = 'ok',
}) => {
  const { t } = useTranslation('teacher');
  const statusLabels: Record<string, string> = {
    ok: t('charts.engagement_high'),
    warn: t('charts.engagement_mid'),
    danger: t('charts.engagement_low'),
  };
  return (
  <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]">
      <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{t('charts.engagement')}</span>
      <span className={pillMap[status]}>{statusLabels[status]}</span>
    </div>
    <div className="p-5 flex items-center justify-center">
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#eee"
            strokeWidth="3"
          />
          <path
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#844AF5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black text-xl text-slate-800">{percentage}%</span>
          <span className="text-[10px] font-bold text-slate-400">{label ?? t('charts.active')}</span>
        </div>
      </div>
    </div>
  </div>
  );
};

export default EngagementRing;
