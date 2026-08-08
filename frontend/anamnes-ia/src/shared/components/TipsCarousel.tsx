import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Emoji + sufixo das chaves `tips.<slug>_title` / `tips.<slug>_text` em `common` */
const tips = [
  { icon: '💬', slug: 'open_questions' },
  { icon: '⚠️', slug: 'allergies' },
  { icon: '📋', slug: 'documentation' },
  { icon: '🩺', slug: 'opqa' },
  { icon: '🧠', slug: 'context' },
] as const;

const TipsCarousel: React.FC = () => {
  const { t } = useTranslation('common');
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start' });
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  useEffect(() => {
    if (!emblaApi) return;
    const update = () => { setCanPrev(emblaApi.canScrollPrev()); setCanNext(emblaApi.canScrollNext()); };
    emblaApi.on('select', update);
    emblaApi.on('reInit', update);
    update();
    return () => { emblaApi.off('select', update); emblaApi.off('reInit', update); };
  }, [emblaApi]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
          {t('tips.title')}
        </h2>
      </div>
      <div className="relative">
        {canPrev && (
          <button type="button" onClick={scrollPrev} aria-label={t('actions.prev')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95">
            <ChevronLeft size={16} />
          </button>
        )}
        {canNext && (
          <button type="button" onClick={scrollNext} aria-label={t('actions.next')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95">
            <ChevronRight size={16} />
          </button>
        )}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 pb-3">
            {tips.map(tip => (
              <div
                key={tip.slug}
                className="flex-[0_0_220px] rounded-2xl bg-gradient-to-br from-[#7a55ff] to-[#5a2ad9] text-white p-5 flex flex-col gap-2 hover:-translate-y-0.5 transition-transform duration-200"
              >
                <span className="text-2xl leading-none">{tip.icon}</span>
                <p className="text-[13px] font-bold leading-snug">{t(`tips.${tip.slug}_title`)}</p>
                <p className="text-[12px] opacity-85 leading-relaxed">{t(`tips.${tip.slug}_text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipsCarousel;