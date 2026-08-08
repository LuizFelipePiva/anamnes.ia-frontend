import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { MainMenu } from '@/shared/components';
import {
  ChevronLeft, ChevronRight, RotateCcw,
  Brain, Heart, Stethoscope, Activity, BookOpen, GraduationCap, Plus,
} from 'lucide-react';
import logoImg from '@/assets/anamnesia_logo.png';
import { specialtyColor } from '@/shared/utils/specialties';
import DeckCard from '../components/DeckCard';
import type { Deck, Flashcard } from '../types';
import type { DeckData, CardData } from '../services/flashcardService';
import { submitReview, fetchDecks, fetchDueCards, fetchAllCards } from '../services/flashcardService';
import { useAuth } from '@/features/auth';


// ── Adapters ────────────────────────────────────────────────────────────────


function deckIcon(specialty?: string): React.ReactNode {
  switch (specialty) {
    case 'Cardiologia':  return <Heart size={20} />;
    case 'Pneumologia':  return <Activity size={20} />;
    case 'Neurologia':   return <Brain size={20} />;
    case 'Infectologia': return <Stethoscope size={20} />;
    default:             return <BookOpen size={20} />;
  }
}

function mapDeck(d: DeckData): Deck {
  return {
    id:          d.id,
    name:        d.name,
    specialty:   d.specialty ?? 'Geral',
    source:      (d.class_ids && d.class_ids.length > 0) ? 'case' : d.teacher_id ? 'manual' : 'ai',
    cards:       [],
    color:       specialtyColor(d.specialty),
    icon:        deckIcon(d.specialty),
    due_count:   d.due_count,
    total:       d.total,
    class_ids:   d.class_ids ?? [],
    class_names: d.class_names ?? [],
  };
}

function mapCard(c: CardData): Flashcard {
  return { id: c.id, front: c.front, back: c.back, hint: c.hint };
}

// ── Deck Skeleton ─────────────────────────────────────────────────────────────

function DeckSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-52 rounded-2xl bg-[#e8e5f0] animate-pulse" />
      ))}
    </div>
  );
}

// ── Flip Card ────────────────────────────────────────────────────────────────

function FlipCard({ card, flipped, onFlip }: { card: Flashcard; flipped: boolean; onFlip: () => void }) {
  const { t } = useTranslation('flashcards');
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1000px', minHeight: 220 }}
      onClick={onFlip}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: 220,
        }}
      >
        {/* Frente */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-white border border-[#ebe8f5] shadow-[0_4px_24px_rgba(122,85,255,.1)]"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-[11px] font-bold tracking-[.15em] text-[#9893b0] uppercase mb-4">{t('review.question')}</p>
          <p className="text-[18px] sm:text-[20px] font-bold text-[#111018] text-center leading-snug">{card.front}</p>
          {card.hint && (
            <p className="mt-4 text-[12px] text-[#b0aac8] italic text-center">💡 {card.hint}</p>
          )}
          <p className="mt-6 text-[11px] text-[#c4bfda]">{t('review.reveal')}</p>
        </div>
        {/* Verso */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 rounded-2xl bg-[#faf9ff] border border-[#ebe8f5] shadow-[0_4px_24px_rgba(122,85,255,.1)]"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-[11px] font-bold tracking-[.15em] text-[#9893b0] uppercase mb-4">{t('review.answer')}</p>
          <p className="text-[16px] sm:text-[18px] font-medium text-[#111018] text-center leading-relaxed">{card.back}</p>
        </div>
      </div>
    </div>
  );
}

// ── Review Session (Anki-style) ───────────────────────────────────────────────

type Rating = 'again' | 'hard' | 'good' | 'easy';

// Labels/hints vêm do dicionário (`review.ratings.*`); aqui só a ordem e o estilo.
const RATING_BUTTONS: { rating: Rating; className: string }[] = [
  { rating: 'again', className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { rating: 'hard',  className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { rating: 'good',  className: 'bg-[#f3f1ff] text-[#7a55ff] border-[#d6cffa] hover:bg-[#ece8ff]' },
  { rating: 'easy',  className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
];

function ReviewSession({ deck, onBack }: { deck: Deck; onBack: () => void }) {
  const { t } = useTranslation('flashcards');
  const initialTotal = deck.cards.length;
  const [queue,   setQueue]   = useState<Flashcard[]>([...deck.cards]);
  const [flipped, setFlipped] = useState(false);
  const [stats,   setStats]   = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [doneCount, setDoneCount] = useState(0);

  const card = queue[0];
  const done = queue.length === 0;

  const handleRating = (r: Rating) => {
    setStats(prev => ({ ...prev, [r]: prev[r] + 1 }));

    if (card.id && !card.id.startsWith('mock-')) {
      submitReview(card.id, r).catch(() => {});
    }

    setFlipped(false);

    if (r === 'again') {
      // Recoloca o card no final da fila (como Anki faz)
      setTimeout(() => setQueue(q => [...q.slice(1), q[0]]), 200);
    } else {
      setDoneCount(n => n + 1);
      setTimeout(() => setQueue(q => q.slice(1)), 200);
    }
  };

  const progressPct = initialTotal > 0 ? (doneCount / initialTotal) * 100 : 0;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center text-4xl">🎉</div>
        <div>
          <h2 className="text-[24px] font-extrabold text-[#111018]">{t('review.done.title')}</h2>
          <p className="text-[#9893b0] text-sm mt-1">
            <Trans
              t={t}
              i18nKey="review.done.subtitle"
              count={initialTotal}
              values={{ deck: deck.name }}
              components={[<span key="0" />, <strong key="1" />]}
            />
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center text-sm font-semibold">
          {stats.again > 0 && (
            <span className="bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-200">{t('review.done.stat_again', { count: stats.again })}</span>
          )}
          <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-200">{t('review.done.stat_hard', { count: stats.hard })}</span>
          <span className="bg-[#f3f1ff] text-[#7a55ff] px-4 py-2 rounded-xl border border-[#d6cffa]">{t('review.done.stat_good', { count: stats.good })}</span>
          <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200">{t('review.done.stat_easy', { count: stats.easy })}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setQueue([...deck.cards]); setFlipped(false); setStats({ again: 0, hard: 0, good: 0, easy: 0 }); setDoneCount(0); }}
            className="px-5 py-2.5 rounded-xl bg-[#f3f1ff] text-[#7a55ff] text-sm font-bold hover:bg-[#ece8ff] transition-colors flex items-center gap-2">
            <RotateCcw size={14} /> {t('review.done.review_again')}
          </button>
          <button onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-[#7a55ff] text-white text-sm font-bold hover:bg-[#6040e0] transition-colors">
            {t('review.done.back_to_decks')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[#9893b0] hover:text-[#7a55ff] text-sm font-semibold transition-colors">
          <ChevronLeft size={16} /> {deck.name}
        </button>
        {/* Contadores Anki-style */}
        <div className="flex items-center gap-3 text-[12px] font-bold">
          {stats.again > 0 && (
            <span className="text-red-500">{stats.again} ↺</span>
          )}
          <span className="text-[#7a55ff]">{t('review.remaining', { count: Math.max(0, initialTotal - doneCount) })}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[#f0edf8] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#844AF5] to-[#6b35ff] rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Card */}
      <FlipCard card={card} flipped={flipped} onFlip={() => setFlipped(f => !f)} />

      {/* Botões Anki-style */}
      {flipped && (
        <div className="grid grid-cols-4 gap-2 animate-[fadeIn_.2s_ease]">
          {RATING_BUTTONS.map(({ rating, className }) => (
            <button
              key={rating}
              onClick={() => handleRating(rating)}
              className={`flex flex-col items-center py-3 px-2 rounded-xl border text-sm font-bold transition-colors ${className}`}
            >
              <span>{t(`review.ratings.${rating}`)}</span>
              <span className="text-[10px] font-normal opacity-70 mt-0.5">{t(`review.ratings.${rating}_hint`)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pular */}
      <div className="flex items-center justify-center gap-4 text-[12px] text-[#6b5ea8]">
        <button
          onClick={() => { setFlipped(false); setTimeout(() => setQueue(q => [...q.slice(1), q[0]]), 150); }}
          className="flex items-center gap-1 hover:text-[#7a55ff] font-medium transition-colors"
        >
          {t('review.skip')} <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FlashcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('flashcards');
  const { user } = useAuth();
  const [decks, setDecks]             = useState<Deck[]>([]);
  const [loading, setLoading]         = useState(true);
  // Guarda a chave do dicionário (não o texto) para o erro reagir à troca de idioma.
  const [error, setError]             = useState<'error_decks' | 'error_cards' | null>(null);
  const [activeDeck, setActiveDeck]   = useState<Deck | null>(null);
  const [pendingDeck, setPendingDeck] = useState<string | null>(null);

  const loadDecks = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDecks()
      .then(data => setDecks(data.map(mapDeck)))
      .catch(() => setError('error_decks'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  const handleDeckClick = useCallback(async (deck: Deck) => {
    if (pendingDeck) return;
    setPendingDeck(deck.id);
    try {
      let rawCards = await fetchDueCards(deck.id);
      if (rawCards.length === 0) rawCards = await fetchAllCards(deck.id);
      setActiveDeck({ ...deck, cards: rawCards.map(mapCard) });
    } catch {
      setError('error_cards');
    } finally {
      setPendingDeck(null);
    }
  }, [pendingDeck]);

  const totalDue = decks.reduce((s, d) => s + d.due_count, 0);

  return (
    <div className="min-h-screen bg-[#f7f6fa] text-[#20202a] w-full">
      {/* Aurora */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0"
        style={{ background: [
          'radial-gradient(ellipse 65% 55% at 0% 0%, rgba(138,91,255,0.18) 0%, transparent 70%)',
          'radial-gradient(ellipse 50% 45% at 100% 0%, rgba(99,179,237,0.13) 0%, transparent 70%)',
        ].join(', ') }} />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(122,85,255,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full relative z-10">
        <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen z-30"><MainMenu /></aside>
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-md"><MainMenu mobile /></header>
        <div className="hidden lg:block w-20" />

        <main className="w-full relative">
          <div className="lg:hidden h-16 w-full" />

          {/* Header faixa */}
          <div className="w-full bg-[#1a1730]">
            <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <button onClick={() => navigate('/mainpage')} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <img src={logoImg} alt="ANAMNES.IA" className="h-9 w-auto object-contain" />
                <div>
                  <p className="text-[16px] font-bold text-white leading-none">{t('header.title')}</p>
                  <p className="text-[10px] text-[#9b8fff] font-semibold tracking-[.15em] uppercase mt-0.5">{t('header.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {totalDue > 0 && (
                  <span className="text-[12px] font-bold bg-[#844AF5] text-white px-3 py-1.5 rounded-full">
                    {t('header.due_today', { count: totalDue })}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (user?.role === 'teacher') {
                      navigate('/teacherpage', { state: { view: 'flashcards' } });
                    } else {
                      navigate('/student', { state: { tab: 'flashcards' } });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold rounded-xl transition-colors"
                >
                  <Plus size={13} />
                  {t('header.create')}
                </button>
              </div>
            </div>
          </div>

          {/* Onda */}
          <div aria-hidden="true" className="w-full -mt-px overflow-hidden leading-none">
            <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 sm:h-14">
              <path d="M0,0 C360,56 1080,0 1440,40 L1440,0 L0,0 Z" fill="#1a1730" />
            </svg>
          </div>

          <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
            {activeDeck ? (
              <ReviewSession deck={activeDeck} onBack={() => { setActiveDeck(null); loadDecks(); }} />
            ) : (
              <div className="flex flex-col gap-8">
                {/* Seção título */}
                <div>
                  <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase pl-3 border-l-[3px] border-[#7a55ff]">
                    {t('decks.section_title')}
                  </h2>
                  {!loading && !error && (
                    <p className="text-[13px] text-[#9893b0] mt-1">
                      {t('decks.summary', { count: decks.length, cards: decks.reduce((s, d) => s + d.total, 0) })}
                    </p>
                  )}
                </div>

                {/* Grid de decks */}
                {loading && <DeckSkeleton />}
                {error && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <p className="text-[#9893b0] text-sm">{t(`decks.${error}`)}</p>
                    <button
                      onClick={loadDecks}
                      className="text-sm text-[#7a55ff] font-bold hover:underline"
                    >
                      {t('decks.retry')}
                    </button>
                  </div>
                )}
                {!loading && !error && (() => {
                  const freeDecks = decks.filter(d => !d.class_ids?.length);

                  // Agrupa decks por turma, mantendo ordem de inserção
                  const classSectionMap = new Map<string, { name: string; decks: Deck[] }>();
                  for (const deck of decks) {
                    deck.class_ids?.forEach((cid, i) => {
                      const cname = deck.class_names?.[i] ?? t('decks.class_fallback');
                      if (!classSectionMap.has(cid)) classSectionMap.set(cid, { name: cname, decks: [] });
                      classSectionMap.get(cid)!.decks.push(deck);
                    });
                  }
                  const classSections = [...classSectionMap.values()];

                  if (decks.length === 0) {
                    return (
                      <p className="text-center text-[#9893b0] py-12 text-sm">
                        {t('decks.empty')}
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-10">
                      {/* Decks livres */}
                      {freeDecks.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-[#7a55ff]" />
                            <span className="text-[11px] font-extrabold tracking-[.14em] text-[#7a55ff] uppercase">{t('decks.free')}</span>
                            <span className="text-[11px] text-[#9893b0] ml-1">{t('decks.free_hint')}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {freeDecks.map(deck => (
                              <div key={deck.id} className={pendingDeck === deck.id ? 'opacity-60 pointer-events-none' : ''}>
                                <DeckCard deck={deck} onClick={() => handleDeckClick(deck)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decks por turma */}
                      {classSections.map(section => (
                        <div key={section.name} className="flex flex-col gap-4">
                          <div className="flex items-center gap-2">
                            <GraduationCap size={14} className="text-[#844AF5]" />
                            <span className="text-[11px] font-extrabold tracking-[.14em] text-[#844AF5] uppercase">{section.name}</span>
                            <span className="text-[11px] text-[#9893b0] ml-1">{t('decks.class_hint')}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {section.decks.map(deck => (
                              <div key={deck.id} className={pendingDeck === deck.id ? 'opacity-60 pointer-events-none' : ''}>
                                <DeckCard deck={deck} onClick={() => handleDeckClick(deck)} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default FlashcardsPage;
