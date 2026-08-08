import { authFetch } from '@/core/utils/authFetch';
import { config } from '@/config/env';

const BASE = `${config.apiUrl}/flashcards`;

export interface ReviewResult {
  flashcard_id: string;
  ef: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
}

export interface DeckData {
  id: string;
  name: string;
  description?: string;
  specialty?: string;
  teacher_id?: string;
  class_ids?: string[];
  class_names?: string[];
  total: number;
  due_count: number;
  created_at?: string;
}

export interface CardData {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hint?: string;
  difficulty?: string;
  tags?: string[];
}

/** Lista decks com due_count calculado via SM-2 */
export async function fetchDecks(): Promise<DeckData[]> {
  const res = await authFetch(`${BASE}/decks`);
  if (!res.ok) throw new Error('Erro ao buscar decks');
  return res.json();
}

/** Cards devidos (nunca revisados ou vencidos) de um deck */
export async function fetchDueCards(deckId: string): Promise<CardData[]> {
  const res = await authFetch(`${BASE}/decks/${deckId}/cards`);
  if (!res.ok) throw new Error('Erro ao buscar cards');
  return res.json();
}

/** Todos os cards ativos de um deck */
export async function fetchAllCards(deckId: string): Promise<CardData[]> {
  const res = await authFetch(`${BASE}/decks/${deckId}/cards/all`);
  if (!res.ok) throw new Error('Erro ao buscar cards');
  return res.json();
}

/** Envia avaliação de um card → SM-2 calcula próxima revisão */
export async function submitReview(
  flashcardId: string,
  rating: 'again' | 'hard' | 'good' | 'easy',
): Promise<ReviewResult> {
  const res = await authFetch(`${BASE}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flashcard_id: flashcardId, rating }),
  });
  if (!res.ok) throw new Error('Erro ao registrar revisão');
  return res.json();
}

// ── Teacher CRUD ──────────────────────────────────────────────────────────────

export interface DeckCreatePayload {
  name: string;
  description?: string;
  specialty?: string;
  class_ids?: string[];
}

export interface CardCreatePayload {
  front: string;
  back: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

/** Lista os decks do professor autenticado */
export async function fetchTeacherDecks(): Promise<DeckData[]> {
  const res = await authFetch(`${BASE}/teacher/decks`);
  if (!res.ok) throw new Error('Erro ao buscar decks');
  return res.json();
}

/** Cria um novo deck */
export async function createDeck(payload: DeckCreatePayload): Promise<DeckData> {
  const res = await authFetch(`${BASE}/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar deck');
  return res.json();
}

/** Atualiza um deck */
export async function updateDeck(deckId: string, payload: Partial<DeckCreatePayload>): Promise<DeckData> {
  const res = await authFetch(`${BASE}/decks/${deckId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao atualizar deck');
  return res.json();
}

/** Remove um deck e todos os seus cards */
export async function deleteDeck(deckId: string): Promise<void> {
  const res = await authFetch(`${BASE}/decks/${deckId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover deck');
}

/** Lista todos os cards de um deck (modo gerenciamento) */
export async function fetchDeckCardsManage(deckId: string): Promise<CardData[]> {
  const res = await authFetch(`${BASE}/decks/${deckId}/cards/manage`);
  if (!res.ok) throw new Error('Erro ao buscar cards');
  return res.json();
}

/** Cria um card num deck */
export async function createCard(deckId: string, payload: CardCreatePayload): Promise<CardData> {
  const res = await authFetch(`${BASE}/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar card');
  return res.json();
}

/** Atualiza um card */
export async function updateCard(cardId: string, payload: Partial<CardCreatePayload>): Promise<CardData> {
  const res = await authFetch(`${BASE}/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao atualizar card');
  return res.json();
}

/** Remove um card */
export async function deleteCard(cardId: string): Promise<void> {
  const res = await authFetch(`${BASE}/cards/${cardId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover card');
}

// ── Student CRUD — Decks e Cards pessoais ────────────────────────────────────

const STUDENT_BASE = `${config.apiUrl}/flashcards/student`;

export async function fetchStudentDecks(): Promise<DeckData[]> {
  const res = await authFetch(`${STUDENT_BASE}/decks`);
  if (!res.ok) throw new Error('Erro ao buscar decks');
  return res.json();
}

export async function createStudentDeck(payload: Omit<DeckCreatePayload, 'class_ids'>): Promise<DeckData> {
  const res = await authFetch(`${STUDENT_BASE}/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar deck');
  return res.json();
}

export async function updateStudentDeck(deckId: string, payload: Omit<Partial<DeckCreatePayload>, 'class_ids'>): Promise<DeckData> {
  const res = await authFetch(`${STUDENT_BASE}/decks/${deckId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao atualizar deck');
  return res.json();
}

export async function deleteStudentDeck(deckId: string): Promise<void> {
  const res = await authFetch(`${STUDENT_BASE}/decks/${deckId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover deck');
}

export async function fetchStudentDeckCards(deckId: string): Promise<CardData[]> {
  const res = await authFetch(`${STUDENT_BASE}/decks/${deckId}/cards`);
  if (!res.ok) throw new Error('Erro ao buscar cards');
  return res.json();
}

export async function createStudentCard(deckId: string, payload: CardCreatePayload): Promise<CardData> {
  const res = await authFetch(`${STUDENT_BASE}/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao criar card');
  return res.json();
}

export async function updateStudentCard(cardId: string, payload: Partial<CardCreatePayload>): Promise<CardData> {
  const res = await authFetch(`${STUDENT_BASE}/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erro ao atualizar card');
  return res.json();
}

export async function deleteStudentCard(cardId: string): Promise<void> {
  const res = await authFetch(`${STUDENT_BASE}/cards/${cardId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover card');
}

// ── Admin CRUD (acesso total) ─────────────────────────────────────────────────

/** Admin: lista todos os decks do sistema */
export async function fetchAdminDecks(): Promise<DeckData[]> {
  const res = await authFetch(`${BASE}/admin/decks`);
  if (!res.ok) throw new Error('Erro ao buscar decks');
  return res.json();
}

/** Admin: cria um deck */
export async function adminCreateDeck(payload: DeckCreatePayload): Promise<DeckData> {
  const res = await authFetch(`${BASE}/admin/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar deck'); }
  return res.json();
}

/** Admin: atualiza qualquer deck */
export async function adminUpdateDeck(deckId: string, payload: Partial<DeckCreatePayload>): Promise<DeckData> {
  const res = await authFetch(`${BASE}/admin/decks/${deckId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail ?? 'Erro ao atualizar deck'); }
  return res.json();
}

/** Admin: remove qualquer deck */
export async function adminDeleteDeck(deckId: string): Promise<void> {
  const res = await authFetch(`${BASE}/admin/decks/${deckId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover deck');
}

/** Admin: lista cards de qualquer deck */
export async function adminFetchDeckCards(deckId: string): Promise<CardData[]> {
  const res = await authFetch(`${BASE}/admin/decks/${deckId}/cards/manage`);
  if (!res.ok) throw new Error('Erro ao buscar cards');
  return res.json();
}

/** Admin: cria card em qualquer deck */
export async function adminCreateCard(deckId: string, payload: CardCreatePayload): Promise<CardData> {
  const res = await authFetch(`${BASE}/admin/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail ?? 'Erro ao criar card'); }
  return res.json();
}

/** Admin: atualiza qualquer card */
export async function adminUpdateCard(cardId: string, payload: Partial<CardCreatePayload>): Promise<CardData> {
  const res = await authFetch(`${BASE}/admin/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail ?? 'Erro ao atualizar card'); }
  return res.json();
}

/** Admin: remove qualquer card */
export async function adminDeleteCard(cardId: string): Promise<void> {
  const res = await authFetch(`${BASE}/admin/cards/${cardId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao remover card');
}

// ── Geração automática de flashcards via IA ───────────────────────────────────

export interface FlashcardGenerateResult {
  deck_id: string;
  deck_name: string;
  cards_created: number;
  specialty: string | null;
}

/**
 * Gera flashcards automaticamente via GPT a partir de uma conversa de anamnese.
 * Cria um novo deck pessoal ou adiciona a um deck existente (existing_deck_id).
 */
export async function generateFlashcardsFromConversation(
  conversationId: string,
  deckName: string,
  existingDeckId?: string,
): Promise<FlashcardGenerateResult> {
  const res = await authFetch(`${BASE}/generate-from-conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      deck_name: deckName,
      existing_deck_id: existingDeckId ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Erro ao gerar flashcards');
  }
  return res.json();
}
