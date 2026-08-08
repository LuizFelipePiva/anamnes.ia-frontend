// src/features/teacher/components/PerformanceChart.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateSmoothPath, generateAreaPath } from '@/features/teacher/utils/chartUtils';

interface PerformanceChartProps {
  data: number[];
  title?: string;
  maxGrade?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  maxGrade = 100,
}) => {
  const { t } = useTranslation('teacher');
  const resolvedTitle = title ?? t('charts.class_avg_evolution');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartHeight = 120;
  const chartWidth  = 500;
  const PAD_TOP     = 40; // espaço reservado para tooltip de hover

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * chartWidth;
    const y = PAD_TOP + chartHeight - (value / maxGrade) * chartHeight;
    return [x, y] as [number, number];
  });

  const smoothLine = generateSmoothPath(points);
  const areaPath   = generateAreaPath(points, PAD_TOP + chartHeight);

  const currentValue = hoveredIndex !== null
    ? data[hoveredIndex].toFixed(1)
    : data[data.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-[#e9e7f6] shadow-[0_10px_22px_rgba(19,12,45,.10)] overflow-hidden lg:col-span-2">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0edf8]">
        <span className="text-[11px] font-semibold text-[#6b6880] uppercase tracking-widest">{resolvedTitle}</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0edf8] text-[#6b6880]">
          {t('charts.last_weeks', { count: data.length })}
        </span>
      </div>

      <div className="px-5 py-4 relative pb-0">
        <div className="absolute top-4 left-5">
          <div className="text-[10px] text-[#9893b0] font-bold uppercase tracking-wider">{t('charts.current_avg')}</div>
          <div className="text-3xl font-black text-[#111018]">{currentValue}</div>
        </div>

        <div className="w-full overflow-hidden mt-2" style={{ height: chartHeight + PAD_TOP }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight + PAD_TOP}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="perfChartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#844AF5" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#844AF5" stopOpacity="0" />
              </linearGradient>
              <filter id="perfShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#844AF5" floodOpacity="0.3" />
              </filter>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <line key={ratio} x1="0" y1={PAD_TOP + chartHeight * ratio} x2={chartWidth} y2={PAD_TOP + chartHeight * ratio} stroke="#f1f5f9" strokeWidth="1" />
            ))}

            <path d={areaPath} fill="url(#perfChartGradient)" stroke="none" />
            <path d={smoothLine} fill="none" stroke="#844AF5" strokeWidth="3" strokeLinecap="round" filter="url(#perfShadow)" />

            {data.map((val, i) => {
              const x = (i / (data.length - 1)) * chartWidth;
              const y = PAD_TOP + chartHeight - (val / maxGrade) * chartHeight;
              const isHovered = hoveredIndex === i;

              return (
                <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
                  {isHovered && (
                    <line x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + chartHeight} stroke="#844AF5" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                  )}
                  <rect x={x - 20} y={PAD_TOP} width={40} height={chartHeight} fill="transparent" />
                  <circle cx={x} cy={y} r={isHovered ? 6 : 4} fill="#fff" stroke="#844AF5" strokeWidth={isHovered ? 3 : 2} style={{ transition: 'all 0.2s ease' }} />
                  {isHovered && (
                    <g transform={`translate(${x}, ${y - 15})`}>
                      <rect x="-18" y="-22" width="36" height="22" rx="6" fill="#1e293b" />
                      <text x="0" y="-7" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">{val}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between mt-2 px-2 text-[10px] font-bold text-[#9893b0] uppercase pb-3">
          <span>{t('charts.week_short', { n: 1 })}</span>
          <span>{t('charts.week_short', { n: Math.ceil(data.length / 2) })}</span>
          <span>{t('charts.week_short', { n: data.length })}</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
