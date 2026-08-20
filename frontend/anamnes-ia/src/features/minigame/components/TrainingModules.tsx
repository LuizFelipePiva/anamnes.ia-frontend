import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BASE_URL = 'https://anamnes-ia-mainpage-exam-pro.base44.app';

interface ModuleStats {
  bestScore: number | null;
  bestAccuracy: number | null;
  gamesPlayed: number;
}

interface TrainingModule {
  title: string;
  description: string;
  route: string;
  gradient: string;
  stats: ModuleStats;
}

const modules: TrainingModule[] = [
  {
    title: 'Regiões Abdominais',
    description: 'Aprenda as 9 regiões anatômicas do abdome',
    route: '/AbdominalGame',
    gradient: 'from-[#18c39a] to-[#12a37f]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
  {
    title: 'Focos Cardíacos',
    description: 'Identifique os pontos de ausculta cardíaca',
    route: '/CardiacFociGame',
    gradient: 'from-[#f04b87] to-[#d63a70]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
  {
    title: 'Ausculta Pulmonar',
    description: 'Identifique sons respiratórios e suas patologias',
    route: '/AuscultationPulmonar',
    gradient: 'from-[#8f7bff] to-[#7a55ff]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
  {
    title: 'Ausculta Cardíaca',
    description: 'Reconheça bulhas, sopros e ritmos cardíacos',
    route: '/AuscultationCardiaca',
    gradient: 'from-[#f04678] to-[#d63060]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
  {
    title: 'Musculatura Extraocular',
    description: 'Identifique músculos extraoculares e nervos cranianos afetados',
    route: '/ExtraocularGame',
    gradient: 'from-[#8a5bff] to-[#6b35ff]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
  {
    title: 'Nervos Periféricos',
    description: 'Nervos periféricos, dermátomos, plexos e síndromes de compressão',
    route: '/NeuroPeripheralGame',
    gradient: 'from-[#18c39a] to-[#12a37f]',
    stats: { bestScore: null, bestAccuracy: null, gamesPlayed: 0 },
  },
];

import { useNavigate } from 'react-router-dom';

const TrainingModules: React.FC = () => {
  const navigate = useNavigate();

  const handleCardClick = (route: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      window.open(`${window.location.origin}/play${route}`, '_blank', 'noopener');
    } else {
      navigate(`/play${route}`);
    }
  };

  const handleCardKeyDown = (route: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/play${route}`);
    }
  };

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
    <section className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
          EXAME FÍSICO
        </h2>
      </div>

      <div className="relative">
        {canPrev && (
          <button type="button" onClick={scrollPrev} aria-label="Anterior"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95">
            <ChevronLeft size={16} />
          </button>
        )}
        {canNext && (
          <button type="button" onClick={scrollNext} aria-label="Próximo"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-20 w-9 h-9 rounded-full bg-white shadow-[0_4px_16px_rgba(19,12,45,.18)] border border-[#ede8ff] text-[#7a55ff] flex items-center justify-center transition-all duration-200 hover:bg-[#7a55ff] hover:text-white hover:shadow-[0_6px_20px_rgba(122,85,255,.35)] hover:scale-110 active:scale-95">
            <ChevronRight size={16} />
          </button>
        )}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
        {modules.map((mod) => {
          const hasStats = mod.stats.gamesPlayed > 0;
          const barWidth = hasStats
            ? Math.min(100, Math.round((mod.stats.gamesPlayed / 25) * 100))
            : 0;

          return (
            <div
              key={mod.route}
              className="min-w-[220px] w-[220px] flex-shrink-0 rounded-2xl overflow-hidden bg-white hover:-translate-y-1 active:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none flex flex-col outline-none focus-visible:ring-4 focus-visible:ring-[#7a55ff]/20 border border-[#f0edf8]"
              onClick={(e) => handleCardClick(mod.route, e)}
              onKeyDown={(e) => handleCardKeyDown(mod.route, e)}
              role="link"
              tabIndex={0}
              aria-label={mod.title}
            >
              {/* Topo colorido */}
              <div className={`relative bg-gradient-to-b ${mod.gradient} px-5 pt-5 pb-6 text-white min-h-[180px] flex flex-col justify-between`}>
                <div className="absolute inset-0 bg-[radial-gradient(900px_220px_at_30%_0%,rgba(255,255,255,.14),transparent_60%)] pointer-events-none" />
                <div className="relative z-10">
                  <h3 className="text-[22px] font-[850] leading-[1.18] tracking-tight mb-2">
                    {mod.title}
                  </h3>
                  <p className="text-[13px] font-medium opacity-95 leading-snug">
                    {mod.description}
                  </p>
                </div>
              </div>

              {/* Parte inferior */}
              {hasStats ? (
                <div className="px-4 py-3 bg-white flex flex-col gap-2">
                  {mod.stats.bestScore !== null && (
                    <div className="flex items-center justify-between text-[13px] text-[#454554]">
                      <span>Melhor Pontuação</span>
                      <strong className="font-extrabold text-[#11111a]">{mod.stats.bestScore}</strong>
                    </div>
                  )}
                  {mod.stats.bestAccuracy !== null && (
                    <div className="flex items-center justify-between text-[13px] text-[#454554]">
                      <span>Melhor Precisão</span>
                      <strong className="font-extrabold text-[#11111a]">{mod.stats.bestAccuracy}%</strong>
                    </div>
                  )}
                  <div className="mt-2 text-[12px] text-[#6a6a78]">
                    Jogos Jogados {mod.stats.gamesPlayed}
                    <div className="w-full h-[7px] bg-[#e9e7f6] rounded-full mt-2 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white/20 to-transparent"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: '#6b35ff',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 bg-white min-h-[112px] flex items-center justify-center text-center text-[#6c6c78] text-[13px] leading-relaxed">
                  Comece a jogar para acompanhar seu progresso
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrainingModules;
