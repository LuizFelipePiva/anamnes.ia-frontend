import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth';
import { MainMenu } from '@/shared/components';
import {
  generateFlashcardsFromConversation,
  fetchStudentDecks,
  type DeckData,
} from '@/features/flashcards';

type Msg = { id: string; role: string; content: string; timestamp: string };
type Conversation = { id: string; title?: string | null; thread_id?: string; created_at?: string };
type EvaluationData = {
  attempt_id: string;
  score: number | null;
  feedback: string | null;
  duration_seconds: number | null;
  status: string;
};
type SoapFields = { S: string; O: string; A: string; P: string };

/** Extrai conteúdo SOAP das mensagens e retorna mensagens filtradas (sem SOAP/avaliação) */
type ProcessedMessages = {
  filtered: Msg[];
  soap: SoapFields | null;
  extractedEval: EvaluationData | null;
};

/** Extrai conteúdo SOAP e avaliação das mensagens e retorna mensagens filtradas */
function processSoapMessages(messages: Msg[]): ProcessedMessages {
  let soapRaw: string | null = null;
  let cutIndex = messages.length; // default: show all
  let extractedEval: EvaluationData | null = null;

  for (let i = 0; i < messages.length; i++) {
    const content = messages[i].content;

    // Caso livre: mensagem do avaliador contém o SOAP no final
    if (content.includes('[MODO AVALIADOR')) {
      const soapMatch = content.match(/SOAP do aluno:\s*\n?([\s\S]+)$/);
      if (soapMatch) soapRaw = soapMatch[1].trim();
      cutIndex = i;

      // A próxima mensagem (assistant) contém o JSON de avaliação
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        try {
          let raw = messages[i + 1].content.trim();
          if (raw.startsWith('```')) {
            raw = raw.split('\n').slice(1).join('\n').replace(/```\s*$/, '');
          }
          const parsed = JSON.parse(raw);
          extractedEval = {
            attempt_id: 'free-case',
            score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
            feedback: parsed.feedback || null,
            duration_seconds: null,
            status: 'completed',
          };
        } catch {
          // GPT não retornou JSON válido
        }
      }
      break;
    }

    // Caso professor: marcador explícito
    if (content.startsWith('[SOAP_SUBMISSION]')) {
      soapRaw = content.replace('[SOAP_SUBMISSION]', '').trim();
      cutIndex = i;
      break;
    }
  }

  // Remove first auto message (patient_prompt) — it's an invisible system instruction
  const raw = messages.slice(0, cutIndex);
  const filtered = raw.length > 0 && raw[0].role === 'user' ? raw.slice(1) : raw;

  if (!soapRaw) return { filtered, soap: null, extractedEval };

  // Parse S: ... O: ... A: ... P: ...
  const sMatch = soapRaw.match(/S:\s*([\s\S]*?)(?=\nO:|$)/);
  const oMatch = soapRaw.match(/O:\s*([\s\S]*?)(?=\nA:|$)/);
  const aMatch = soapRaw.match(/A:\s*([\s\S]*?)(?=\nP:|$)/);
  const pMatch = soapRaw.match(/P:\s*([\s\S]*)$/);

  const soap: SoapFields = {
    S: sMatch?.[1]?.trim() || '',
    O: oMatch?.[1]?.trim() || '',
    A: aMatch?.[1]?.trim() || '',
    P: pMatch?.[1]?.trim() || '',
  };

  return { filtered, soap, extractedEval };
}

export default function ConversationView() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [soapData, setSoapData] = useState<SoapFields | null>(null);
  const [showEvalPopup, setShowEvalPopup] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Flashcard generation modal state ────────────────────────────────────────
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [flashcardDeckName, setFlashcardDeckName] = useState('');
  const [existingDecks, setExistingDecks] = useState<DeckData[]>([]);
  const [duplicateDeck, setDuplicateDeck] = useState<DeckData | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardSuccess, setFlashcardSuccess] = useState<{ deckName: string; count: number } | null>(null);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/conversations/${conversationId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${res.status}`);
        }
        const body = await res.json();
        if (!mounted) return;
        const loadedMessages: Msg[] = body.messages ?? [];
        const { filtered, soap, extractedEval } = processSoapMessages(loadedMessages);
        setConversation(body.conversation ?? null);
        setMessages(filtered);
        setEvaluation(body.evaluation ?? extractedEval ?? null);
        setSoapData(soap);
      } catch (err) {
        console.error('Failed to load conversation', err);
        setConversation(null);
        setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [conversationId, token]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const openFlashcardModal = async () => {
    const suggested = t('flashcard_modal.suggested_deck', {
      title: conversation?.title ?? t('flashcard_modal.default_anamnesis'),
    });
    setFlashcardDeckName(suggested);
    setFlashcardSuccess(null);
    setFlashcardError(null);
    setDuplicateDeck(null);
    setShowFlashcardModal(true);
    try {
      const decks = await fetchStudentDecks();
      setExistingDecks(decks);
    } catch {
      setExistingDecks([]);
    }
  };

  const handleGenerateFlashcards = async (existingDeckId?: string) => {
    if (!conversationId || !flashcardDeckName.trim()) return;

    // Check for duplicate only when not explicitly reusing
    if (!existingDeckId) {
      const match = existingDecks.find(
        (d) => d.name.trim().toLowerCase() === flashcardDeckName.trim().toLowerCase(),
      );
      if (match) {
        setDuplicateDeck(match);
        return;
      }
    }

    setGeneratingFlashcards(true);
    setFlashcardError(null);
    setDuplicateDeck(null);
    try {
      const result = await generateFlashcardsFromConversation(
        conversationId,
        flashcardDeckName.trim(),
        existingDeckId,
      );
      setFlashcardSuccess({ deckName: result.deck_name, count: result.cards_created });
    } catch (err) {
      setFlashcardError(err instanceof Error ? err.message : t('flashcard_modal.error'));
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#615B6D] flex flex-col sm:flex-row overflow-hidden">
        <div className="hidden sm:block h-full flex-shrink-0">
          <MainMenu />
        </div>
        <div className="sm:hidden w-full fixed top-0 left-0 z-30">
          <MainMenu mobile />
        </div>
        <div className="sm:hidden h-14 w-full flex-shrink-0" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#393542] rounded-2xl shadow-xl p-5 w-full max-w-3xl h-[80vh] flex flex-col animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center justify-center mb-4">
              <div className="h-7 bg-[#4a4556] rounded-lg w-2/3" />
            </div>
            {/* Messages skeleton */}
            <div className="flex-1 flex flex-col gap-3 px-2 overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-12 rounded-xl bg-[#4a4556] max-w-[65%] ${i % 2 === 0 ? 'self-start' : 'self-end'}`}
                />
              ))}
            </div>
            {/* Footer skeleton */}
            <div className="mt-3 flex justify-center gap-3">
              <div className="h-10 w-32 bg-[#4a4556] rounded-xl" />
              <div className="h-10 w-36 bg-[#4a4556] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-screen bg-[#615B6D] flex flex-col sm:flex-row overflow-hidden">
        <div className="hidden sm:block h-full flex-shrink-0">
          <MainMenu />
        </div>
        <div className="sm:hidden w-full fixed top-0 left-0 z-30">
          <MainMenu mobile />
        </div>
        <div className="sm:hidden h-14 w-full flex-shrink-0" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#393542] rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#4a4556] flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium">{t('conversation.not_found')}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all"
            >
              ← {t('conversation.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#615B6D] flex flex-col sm:flex-row overflow-hidden">
      <div className="hidden sm:block h-full flex-shrink-0">
        <MainMenu />
      </div>
      <div className="sm:hidden w-full fixed top-0 left-0 z-30">
        <MainMenu mobile />
      </div>
      <div className="sm:hidden h-14 w-full flex-shrink-0" />

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-auto">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('conversation.back')}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 text-sm font-semibold text-gray-300 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('conversation.back')}
        </button>

        <div className="bg-[#393542] rounded-2xl shadow-xl p-5 w-full max-w-3xl h-[80vh] flex flex-col">
        <header className="flex items-center justify-center mb-4">
          <h2 className="text-2xl font-bold text-[#844AF5] text-center truncate">
            {conversation.title ?? t('conversation.untitled', { id: conversation.id })}
          </h2>
        </header>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 px-2"
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="text-sm text-gray-400">{t('conversation.no_messages')}</div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg break-words max-w-[70%]
                  ${m.role === 'user'
                    ? 'bg-[#615B6D] text-gray-100 self-end text-right'
                    : 'bg-[#844AF5] text-white self-start text-left'
                  }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="text-[10px] text-gray-300 mt-1">
                  {m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom actions */}
        <div className="mt-3 flex flex-col gap-2 items-center">
          <div className="text-sm text-gray-400 text-center">
            {t('conversation.view_only')}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => setShowEvalPopup(true)}
              className="mt-1 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('conversation.view_evaluation')}
            </button>
            <button
              onClick={openFlashcardModal}
              className="mt-1 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('conversation.generate_flashcards')}
            </button>
          </div>
        </div>
      </div>

      {/* Avaliação Popup (SOAP + Resultado) */}
      {showEvalPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowEvalPopup(false)}
        >
          <div
            className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com nota */}
            <div className="px-6 pt-6 pb-4 border-b border-[#4a4556]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t('evaluation.title')}
                </h3>
                <button
                  onClick={() => setShowEvalPopup(false)}
                  className="text-gray-400 hover:text-gray-200 transition p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Score + Duration row */}
              {evaluation && evaluation.status === 'completed' && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div className={`w-full rounded-xl py-4 flex flex-col items-center ${
                    evaluation.score === null ? 'bg-gray-500/10' :
                    evaluation.score >= 80 ? 'bg-emerald-400/10' :
                    evaluation.score >= 60 ? 'bg-amber-400/10' : 'bg-red-400/10'
                  }`}>
                    <div className={`text-5xl font-extrabold ${
                      evaluation.score === null ? 'text-gray-500' :
                      evaluation.score >= 80 ? 'text-emerald-400' :
                      evaluation.score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {evaluation.score !== null ? evaluation.score : '—'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {evaluation.score !== null ? t('evaluation.of_100') : t('evaluation.unavailable')}
                    </p>
                  </div>
                  {evaluation.duration_seconds != null && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-[#2a2635] rounded-full px-3 py-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      {t('duration', { min: Math.floor(evaluation.duration_seconds / 60), sec: evaluation.duration_seconds % 60 })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[55vh] overflow-y-auto">
              {/* Sem dados */}
              {!soapData && (!evaluation || evaluation.status !== 'completed') && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <div className="text-3xl mb-3">{evaluation?.status === 'abandoned' ? '🚪' : '📋'}</div>
                  {evaluation?.status === 'abandoned' ? (
                    <>
                      <p>{t('evaluation.abandoned_line1')}</p>
                      <p className="text-xs mt-1 text-gray-500">{t('evaluation.abandoned_line2')}</p>
                    </>
                  ) : (
                    <>
                      <p>{t('evaluation.none_line1')}</p>
                      <p className="text-xs mt-1 text-gray-500">{t('evaluation.none_line2')}</p>
                    </>
                  )}
                </div>
              )}
              {/* SOAP Fields */}
              {soapData && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
                    <span>📝</span> {t('evaluation.soap_submitted')}
                  </h4>
                  {([
                    { key: 'S', label: t('soap.subjective'), color: 'text-blue-400', icon: '🗣️' },
                    { key: 'O', label: t('soap.objective'), color: 'text-green-400', icon: '🔍' },
                    { key: 'A', label: t('soap.assessment'), color: 'text-amber-400', icon: '🧠' },
                    { key: 'P', label: t('soap.plan'), color: 'text-violet-400', icon: '📋' },
                  ] as const).map(({ key, label, color, icon }) => (
                    <div key={key}>
                      <h5 className={`text-xs font-semibold ${color} mb-1 flex items-center gap-1`}>
                        <span>{icon}</span> {label} ({key})
                      </h5>
                      <div className="bg-[#2a2635] rounded-lg p-3">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {soapData[key] || <span className="text-gray-500 italic">{t('evaluation.not_filled')}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {evaluation && evaluation.status === 'completed' && evaluation.feedback && (
                <div>
                  <h4 className="text-sm font-bold text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <span>💬</span> {t('evaluation.feedback')}
                  </h4>
                  <div className="bg-[#2a2635] rounded-lg p-3 max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {evaluation.feedback}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => setShowEvalPopup(false)}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all"
              >
                {t('evaluation.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Flashcard Generation Modal */}
      {showFlashcardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => { if (!generatingFlashcards) setShowFlashcardModal(false); }}
        >
          <div
            className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b border-[#4a4556]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t('flashcard_modal.title')}
                </h3>
                {!generatingFlashcards && (
                  <button
                    onClick={() => setShowFlashcardModal(false)}
                    className="text-gray-400 hover:text-gray-200 transition p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {flashcardSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-100 font-semibold text-base">
                    {t('flashcard_modal.success', { count: flashcardSuccess.count })}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t('flashcard_modal.deck_label')} <span className="text-gray-200 font-medium">"{flashcardSuccess.deckName}"</span>
                  </p>
                  <button
                    onClick={() => navigate('/student', { state: { tab: 'flashcards' } })}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all"
                  >
                    {t('flashcard_modal.see_mine')}
                  </button>
                </div>
              ) : duplicateDeck ? (
                <div className="space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-amber-300 text-sm font-medium">{t('flashcard_modal.duplicate_title')}</p>
                    <p className="text-amber-200/80 text-xs mt-1">
                      {t('flashcard_modal.duplicate_body', { name: duplicateDeck.name, count: duplicateDeck.total })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateFlashcards(duplicateDeck.id)}
                      disabled={generatingFlashcards}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {t('flashcard_modal.add_to_existing')}
                    </button>
                    <button
                      onClick={() => setDuplicateDeck(null)}
                      className="flex-1 py-2.5 rounded-xl bg-[#4a4556] text-gray-200 text-sm font-semibold hover:bg-[#5a5566] transition-all"
                    >
                      {t('flashcard_modal.rename_new')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('flashcard_modal.deck_name_label')}
                    </label>
                    <input
                      type="text"
                      value={flashcardDeckName}
                      onChange={(e) => setFlashcardDeckName(e.target.value)}
                      placeholder={t('flashcard_modal.deck_name_placeholder')}
                      disabled={generatingFlashcards}
                      className="w-full bg-[#2a2635] border border-[#4a4556] rounded-xl px-4 py-2.5 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {t('flashcard_modal.hint')}
                    </p>
                  </div>
                  {flashcardError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                      <p className="text-red-300 text-sm">{flashcardError}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {!flashcardSuccess && !duplicateDeck && (
              <div className="px-6 pb-6 pt-2 flex gap-2">
                <button
                  onClick={() => setShowFlashcardModal(false)}
                  disabled={generatingFlashcards}
                  className="flex-1 py-3 rounded-xl bg-[#4a4556] text-gray-200 font-semibold text-sm hover:bg-[#5a5566] transition-all disabled:opacity-50"
                >
                  {t('flashcard_modal.cancel')}
                </button>
                <button
                  onClick={() => handleGenerateFlashcards()}
                  disabled={generatingFlashcards || !flashcardDeckName.trim()}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingFlashcards ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {t('flashcard_modal.generating')}
                    </>
                  ) : t('flashcard_modal.generate')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

