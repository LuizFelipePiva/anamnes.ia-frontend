/**
 * SPEC-013 §6.7 — pendências rápidas.
 * Só flashcards nesta entrega: os módulos de exame físico não têm estado de
 * conclusão persistido, e a spec proíbe inventar número.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Layers } from 'lucide-react';

interface Props {
  /** Soma de `due_count` dos decks; 0 esconde o bloco inteiro. */
  dueFlashcards: number;
  onFlashcards: () => void;
}

const PendingCard: React.FC<Props> = ({ dueFlashcards, onFlashcards }) => {
  const { t } = useTranslation('common');
  if (dueFlashcards <= 0) return null;

  return (
    <section
      data-testid="card-pending"
      className="rounded-2xl bg-white border border-[#f0eeff] shadow-[0_4px_18px_rgba(19,12,45,.07)] px-5 py-4 flex flex-col gap-3"
    >
      <h2 className="text-[11px] font-extrabold tracking-[.16em] text-[#7a55ff] uppercase m-0 pl-3 border-l-[3px] border-[#7a55ff]">
        {t('home.pending.title')}
      </h2>
      <button
        type="button"
        data-testid="pending-flashcards"
        onClick={onFlashcards}
        className="w-full flex items-center gap-3 text-left rounded-xl px-2 py-2 -mx-2 transition-colors hover:bg-[#faf9ff]"
      >
        <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#7a55ff] text-white flex items-center justify-center">
          <Layers size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-[#20202a]">{t('home.pending.flashcards')}</span>
          <span className="block text-[11px] text-[#9a9aab]">
            {t('home.pending.flashcards_meta', { count: dueFlashcards })}
          </span>
        </span>
        <ArrowRight size={14} className="text-[#b0aac8] flex-shrink-0" />
      </button>
    </section>
  );
};

export default PendingCard;
