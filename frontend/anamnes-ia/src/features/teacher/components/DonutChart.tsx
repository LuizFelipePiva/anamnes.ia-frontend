// src/components/teacher/DonutChart.tsx
// Componente de gráfico Donut para distribuição de casos

import React from 'react';
import { useTranslation } from 'react-i18next';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
}

const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  title,
  centerLabel,
  centerValue,
}) => {
  const { t } = useTranslation('teacher');
  const resolvedTitle = title ?? t('charts.distribution');
  const resolvedCenterLabel = centerLabel ?? t('charts.total');
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  let accumulated = 0;
  const gradientParts = segments
    .map(segment => {
      const start = accumulated;
      const percentage = (segment.value / total) * 100;
      accumulated += percentage;
      return `${segment.color} ${start}% ${accumulated}%`;
    })
    .join(', ');

  return (
    <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]">
        <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{resolvedTitle}</span>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
          {t('charts.demo')}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-6">
          {/* Donut via conic-gradient */}
          <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: `conic-gradient(${gradientParts})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 12,
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="text-center">
                <div className="text-xs font-bold text-slate-400">{resolvedCenterLabel}</div>
                <div className="text-xl font-black text-slate-800">{centerValue ?? total}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 flex-1">
            {segments.map((segment, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-semibold text-slate-700">{segment.label}</span>
                </div>
                <span className="font-bold">
                  {Math.round((segment.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonutChart;
