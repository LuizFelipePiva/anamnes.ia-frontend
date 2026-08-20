import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, ChevronLeft, Layers, BookOpen,
  X, AlertCircle, Loader2,
} from 'lucide-react';
import type {
  DeckData,
  CardData,
  CardCreatePayload,
} from '@/features/flashcards/services/flashcardService';
import {
  fetchStudentDecks,
  createStudentDeck,
  updateStudentDeck,
  deleteStudentDeck,
  fetchStudentDeckCards,
  createStudentCard,
  updateStudentCard,
  deleteStudentCard,
} from '@/features/flashcards/services/flashcardService';
import { SPECIALTIES, specialtyColor, specialtyLabel } from '@/shared/utils/specialties';

type StudentDeckPayload = { name: string; description?: string; specialty?: string };

// ── Deck Form Modal ───────────────────────────────────────────────────────────

interface DeckModalProps {
  initial?: DeckData;
  onSave: (payload: StudentDeckPayload) => Promise<void>;
  onClose: () => void;
}

function DeckModal({ initial, onSave, onClose }: DeckModalProps) {
  const { t } = useTranslation('student');
  const [name, setName]           = useState(initial?.name ?? '');
  const [description, setDesc]    = useState(initial?.description ?? '');
  const [specialty, setSpecialty] = useState(initial?.specialty ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t('flashcards.deck_modal.name_required')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        specialty: specialty.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('flashcards.save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-[#e9e7f6] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#111018] font-bold text-lg">{initial ? t('flashcards.deck_modal.edit_title') : t('flashcards.deck_modal.new_title')}</h2>
          <button onClick={onClose} className="text-[#9893b0] hover:text-[#111018]"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.deck_modal.name')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('flashcards.deck_modal.name_placeholder')}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm placeholder:text-[#b0abc8] focus:outline-none focus:border-[#844AF5]"
            />
          </div>
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.deck_modal.specialty')}</label>
            <select
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm focus:outline-none focus:border-[#844AF5]"
            >
              <option value="">{t('flashcards.deck_modal.select')}</option>
              {SPECIALTIES.map(s => (
                <option key={s.key} value={s.key}>{s.emoji} {specialtyLabel(s.key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.deck_modal.description')}</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder={t('flashcards.deck_modal.optional')}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm placeholder:text-[#b0abc8] resize-none focus:outline-none focus:border-[#844AF5]"
            />
          </div>
          {error && (
            <p className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle size={14} />{error}
            </p>
          )}
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#e9e7f6] text-[#6b6897] text-sm hover:bg-[#f7f5ff] transition-all">
              {t('flashcards.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#844AF5] text-white text-sm font-semibold hover:bg-[#6b35ff] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? t('flashcards.save') : t('flashcards.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Card Form Modal ───────────────────────────────────────────────────────────

interface CardModalProps {
  initial?: CardData;
  onSave: (payload: CardCreatePayload) => Promise<void>;
  onClose: () => void;
}

function CardModal({ initial, onSave, onClose }: CardModalProps) {
  const [front,      setFront]      = useState(initial?.front ?? '');
  const [back,       setBack]       = useState(initial?.back ?? '');
  const [hint,       setHint]       = useState(initial?.hint ?? '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    (initial?.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
  );
  const { t } = useTranslation('student');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) { setError(t('flashcards.card_modal.front_required')); return; }
    if (!back.trim())  { setError(t('flashcards.card_modal.back_required'));  return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ front: front.trim(), back: back.trim(), hint: hint.trim() || undefined, difficulty });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('flashcards.save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-[#e9e7f6] rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[#111018] font-bold text-lg">{initial ? t('flashcards.card_modal.edit_title') : t('flashcards.card_modal.new_title')}</h2>
          <button onClick={onClose} className="text-[#9893b0] hover:text-[#111018]"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.card_modal.front')}</label>
            <textarea value={front} onChange={e => setFront(e.target.value)} rows={3}
              placeholder={t('flashcards.card_modal.front_placeholder')}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm placeholder:text-[#b0abc8] resize-none focus:outline-none focus:border-[#844AF5]" />
          </div>
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.card_modal.back')}</label>
            <textarea value={back} onChange={e => setBack(e.target.value)} rows={3}
              placeholder={t('flashcards.card_modal.back_placeholder')}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm placeholder:text-[#b0abc8] resize-none focus:outline-none focus:border-[#844AF5]" />
          </div>
          <div>
            <label className="block text-[#6b6897] text-sm mb-1">{t('flashcards.card_modal.hint')}</label>
            <input value={hint} onChange={e => setHint(e.target.value)} placeholder={t('flashcards.card_modal.hint_placeholder')}
              className="w-full bg-[#f7f5ff] border border-[#e9e7f6] rounded-xl px-3 py-2.5 text-[#111018] text-sm placeholder:text-[#b0abc8] focus:outline-none focus:border-[#844AF5]" />
          </div>
          <div>
            <label className="block text-[#6b6897] text-sm mb-2">{t('flashcards.card_modal.difficulty')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button key={d} type="button" onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    difficulty === d
                      ? d === 'easy'   ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : d === 'medium' ? 'bg-amber-50 border-amber-400 text-amber-700'
                      :                  'bg-red-50 border-red-400 text-red-700'
                      : 'border-[#e9e7f6] text-[#9893b0] hover:bg-[#f7f5ff]'
                  }`}>
                  {d === 'easy' ? t('flashcards.card_modal.easy') : d === 'medium' ? t('flashcards.card_modal.medium') : t('flashcards.card_modal.hard')}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle size={14} />{error}</p>
          )}
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#e9e7f6] text-[#6b6897] text-sm hover:bg-[#f7f5ff] transition-all">
              {t('flashcards.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#844AF5] text-white text-sm font-semibold hover:bg-[#6b35ff] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? t('flashcards.save') : t('flashcards.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function ConfirmDelete({ label, onConfirm, onClose }: { label: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const { t } = useTranslation('student');
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-[#e9e7f6] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-[#111018] font-bold text-base mb-2">{t('flashcards.delete.title')}</h3>
        <p className="text-[#6b6897] text-sm mb-5">
          {t('flashcards.delete.body', { label })}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#e9e7f6] text-[#6b6897] text-sm hover:bg-[#f7f5ff] transition-all">
            {t('flashcards.cancel')}
          </button>
          <button onClick={async () => { setLoading(true); await onConfirm(); }} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {t('flashcards.delete.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function StudentFlashcardsView() {
  const { t } = useTranslation('student');
  const [decks,        setDecks]        = useState<DeckData[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  const [deckModal,    setDeckModal]    = useState<{ open: boolean; editing?: DeckData }>({ open: false });
  const [deleteDeck_,  setDeleteDeck_]  = useState<DeckData | null>(null);

  const [selectedDeck, setSelectedDeck]  = useState<DeckData | null>(null);
  const [cards,        setCards]         = useState<CardData[]>([]);
  const [loadingCards, setLoadingCards]  = useState(false);
  const [cardModal,    setCardModal]     = useState<{ open: boolean; editing?: CardData }>({ open: false });
  const [deleteCard_,  setDeleteCard_]   = useState<CardData | null>(null);

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true);
    try {
      setDecks(await fetchStudentDecks());
    } catch {
      // Trata falha de carregamento como lista vazia (ex: migration ainda não aplicada)
      setDecks([]);
    } finally {
      setLoadingDecks(false);
    }
  }, []);

  useEffect(() => { loadDecks(); }, [loadDecks]);

  const loadCards = useCallback(async (deck: DeckData) => {
    setSelectedDeck(deck);
    setLoadingCards(true);
    try {
      setCards(await fetchStudentDeckCards(deck.id));
    } catch {
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  async function handleSaveDeck(payload: StudentDeckPayload) {
    if (deckModal.editing) {
      await updateStudentDeck(deckModal.editing.id, payload);
    } else {
      await createStudentDeck(payload);
    }
    await loadDecks();
    if (selectedDeck && deckModal.editing?.id === selectedDeck.id) {
      setSelectedDeck(prev => prev ? { ...prev, ...payload } : prev);
    }
  }

  async function handleDeleteDeck() {
    if (!deleteDeck_) return;
    await deleteStudentDeck(deleteDeck_.id);
    if (selectedDeck?.id === deleteDeck_.id) setSelectedDeck(null);
    setDeleteDeck_(null);
    await loadDecks();
  }

  async function handleSaveCard(payload: CardCreatePayload) {
    if (!selectedDeck) return;
    if (cardModal.editing) {
      await updateStudentCard(cardModal.editing.id, payload);
    } else {
      await createStudentCard(selectedDeck.id, payload);
    }
    await loadCards(selectedDeck);
    await loadDecks();
  }

  async function handleDeleteCard() {
    if (!deleteCard_ || !selectedDeck) return;
    await deleteStudentCard(deleteCard_.id);
    setDeleteCard_(null);
    await loadCards(selectedDeck);
    await loadDecks();
  }

  return (
    <div className="flex gap-6 h-full min-h-0">

      {/* LEFT: deck list */}
      <div className={`flex flex-col gap-4 ${selectedDeck ? 'hidden md:flex md:w-72 flex-shrink-0' : 'flex-1'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[#111018] font-bold text-lg">{t('flashcards.my_decks')}</h2>
            <p className="text-[#9893b0] text-xs mt-0.5">{t('flashcards.deck_count', { count: decks.length })}</p>
          </div>
          <button
            onClick={() => setDeckModal({ open: true })}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#844AF5] text-white text-xs font-semibold rounded-xl hover:bg-[#6b35ff] transition-all"
          >
            <Plus size={13} /> {t('flashcards.new_deck')}
          </button>
        </div>

        {loadingDecks ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#844AF5]" />
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#844AF5]/10 flex items-center justify-center">
              <Layers size={24} className="text-[#844AF5]" />
            </div>
            <p className="text-[#9893b0] text-sm">{t('flashcards.no_decks')}</p>
            <button onClick={() => setDeckModal({ open: true })} className="text-[#844AF5] text-sm underline">
              {t('flashcards.create_first_deck')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {decks.map(deck => (
              <div
                key={deck.id}
                onClick={() => loadCards(deck)}
                className={`group flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedDeck?.id === deck.id
                    ? 'border-[#844AF5]/60 bg-[#f3f1ff]'
                    : 'border-[#e9e7f6] bg-white hover:bg-[#f7f5ff] hover:border-[#c8c2f0]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${specialtyColor(deck.specialty)}22` }}
                >
                  <BookOpen size={16} style={{ color: specialtyColor(deck.specialty) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#111018] text-sm font-semibold truncate">{deck.name}</p>
                  <p className="text-[#9893b0] text-xs mt-0.5">
                    {deck.specialty ?? t('flashcards.no_specialty')} · {t('flashcards.card_count', { count: deck.total })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setDeckModal({ open: true, editing: deck })}
                    className="p-1.5 rounded-lg text-[#9893b0] hover:text-[#111018] hover:bg-[#f0edf8] transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteDeck_(deck)}
                    className="p-1.5 rounded-lg text-[#9893b0] hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: card editor */}
      {selectedDeck && (
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDeck(null)}
                className="md:hidden p-1.5 rounded-lg text-[#9893b0] hover:text-[#111018] hover:bg-[#f0edf8] transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${specialtyColor(selectedDeck.specialty)}22` }}
              >
                <BookOpen size={15} style={{ color: specialtyColor(selectedDeck.specialty) }} />
              </div>
              <div>
                <h3 className="text-[#111018] font-bold text-base">{selectedDeck.name}</h3>
                <p className="text-[#9893b0] text-xs">{t('flashcards.card_count', { count: cards.length })}</p>
              </div>
            </div>
            <button
              onClick={() => setCardModal({ open: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#844AF5] text-white text-xs font-semibold rounded-xl hover:bg-[#6b35ff] transition-all"
            >
              <Plus size={13} /> {t('flashcards.new_card')}
            </button>
          </div>

          {loadingCards ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[#844AF5]" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#844AF5]/10 flex items-center justify-center">
                <BookOpen size={20} className="text-[#844AF5]" />
              </div>
              <p className="text-[#9893b0] text-sm">{t('flashcards.no_cards')}</p>
              <button onClick={() => setCardModal({ open: true })} className="text-[#844AF5] text-sm underline">
                {t('flashcards.add_first_card')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {cards.map((card, idx) => (
                <div key={card.id} className="group flex gap-3 items-start p-4 rounded-2xl border border-[#e9e7f6] bg-white hover:bg-[#f7f5ff] transition-all">
                  <span className="text-[#9893b0] text-xs font-bold w-5 flex-shrink-0 pt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[#111018] text-sm font-medium leading-snug">{card.front}</p>
                    <p className="text-[#6b6897] text-xs leading-snug">{card.back}</p>
                    {card.hint && <p className="text-[#7a55ff] text-xs italic">💡 {card.hint}</p>}
                    {card.difficulty && (
                      <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                        card.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                        card.difficulty === 'hard' ? 'bg-red-50 text-red-600' :
                                                     'bg-amber-50 text-amber-600'
                      }`}>
                        {card.difficulty === 'easy' ? t('flashcards.card_modal.easy') : card.difficulty === 'hard' ? t('flashcards.card_modal.hard') : t('flashcards.card_modal.medium')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setCardModal({ open: true, editing: card })}
                      className="p-1.5 rounded-lg text-[#9893b0] hover:text-[#111018] hover:bg-[#f0edf8] transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteCard_(card)}
                      className="p-1.5 rounded-lg text-[#9893b0] hover:text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {deckModal.open && (
        <DeckModal initial={deckModal.editing} onSave={handleSaveDeck} onClose={() => setDeckModal({ open: false })} />
      )}
      {deleteDeck_ && (
        <ConfirmDelete label={deleteDeck_.name} onConfirm={handleDeleteDeck} onClose={() => setDeleteDeck_(null)} />
      )}
      {cardModal.open && (
        <CardModal initial={cardModal.editing} onSave={handleSaveCard} onClose={() => setCardModal({ open: false })} />
      )}
      {deleteCard_ && (
        <ConfirmDelete label={deleteCard_.front.slice(0, 60)} onConfirm={handleDeleteCard} onClose={() => setDeleteCard_(null)} />
      )}
    </div>
  );
}
