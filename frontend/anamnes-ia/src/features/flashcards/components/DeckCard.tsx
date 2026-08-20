import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, BookOpen, Sparkles, GraduationCap } from 'lucide-react';
import type { Deck } from '../types';
import { specialtyLabel } from '@/shared/utils/specialties';

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: Deck['source'] }) {
  const { t } = useTranslation('flashcards');
  const icons = {
    ai:     <Sparkles size={9} />,
    case:   <GraduationCap size={9} />,
    soap:   <BookOpen size={9} />,
    manual: <Layers size={9} />,
  };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
      {icons[source]}{t(`card.source.${source}`)}
    </span>
  );
}

// ── DeckCard ──────────────────────────────────────────────────────────────────

export interface DeckCardProps {
  deck: Deck;
  onClick: () => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, onClick }) => {
  const { t } = useTranslation('flashcards');
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ paddingRight: 16, paddingBottom: 14 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Stack layer 3 — furthest back */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          backgroundColor: deck.color,
          opacity: 0.32,
          zIndex: 0,
          transform: hovered
            ? 'translate(14px, 9px) rotate(5.5deg)'
            : 'translate(11px, 7px) rotate(4deg)',
          transition: 'transform 0.26s ease',
        }}
      />
      {/* Stack layer 2 — middle */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          backgroundColor: deck.color,
          opacity: hovered ? 0.7 : 0.56,
          zIndex: 1,
          transform: hovered
            ? 'translate(7px, 4.5px) rotate(2.8deg)'
            : 'translate(5.5px, 3px) rotate(2deg)',
          transition: 'transform 0.26s ease, opacity 0.26s ease',
        }}
      />
      {/* Main card */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden p-5 flex flex-col gap-4"
        style={{
          backgroundColor: deck.color,
          transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
          boxShadow: hovered
            ? `0 14px 40px ${deck.color}66`
            : `0 4px 20px ${deck.color}44`,
          transition: 'transform 0.26s ease, box-shadow 0.26s ease',
        }}
      >
        {/* Shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 10% 10%, rgba(255,255,255,.14), transparent 65%)' }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 90% 100%, rgba(0,0,0,.16), transparent 65%)' }}
        />

        {/* Row 1: icon + source badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: 'rgba(255,255,255,.18)' }}
          >
            {deck.icon}
          </div>
          <SourceBadge source={deck.source} />
        </div>

        {/* Row 2: name + specialty */}
        <div className="relative z-10">
          <h3 className="text-[19px] font-extrabold text-white leading-tight tracking-tight">{deck.name}</h3>
          <p className="text-[12px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,.55)' }}>
            {specialtyLabel(deck.specialty)}
          </p>
        </div>

        {/* Divider */}
        <div className="relative z-10 w-full h-px" style={{ backgroundColor: 'rgba(255,255,255,.15)' }} />

        {/* Row 3: card count + due badge */}
        <div className="relative z-10 flex items-center justify-between">
          <span
            className="flex items-center gap-1.5 text-[12px] font-semibold"
            style={{ color: 'rgba(255,255,255,.65)' }}
          >
            <Layers size={13} style={{ color: 'rgba(255,255,255,.45)' }} />
            {t('card.total', { count: deck.total })}
          </span>
          {deck.due_count > 0 ? (
            <span
              className="text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.25)' }}
            >
              {t('card.due', { count: deck.due_count })}
            </span>
          ) : (
            <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,.45)' }}>
              {t('card.up_to_date')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckCard;
