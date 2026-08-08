import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MainMenu, SoapForm } from '@/shared/components';
import { ThreadProvider, ChatGPT } from '@/features/chat';
import { completeCaseAttempt, startAiChat, startCaseAttempt, abandonAttempt } from '@/features/chat/services/studentService';
import type { CaseCompleteResult, CaseStartResult, SoapBreakdown } from '@/features/chat/services/studentService';
import { authFetch } from '@/core/utils';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';
import { SPECIALTIES, specialtyLabel } from '@/shared/utils/specialties';

type ChatMode = 'easy' | 'advanced' | null;

interface FreeChatCaseState {
  freeCase?: {
    id: string;
    title: string;
    level: string;
    area: string;
    initialPrompt: string;
    type: 'free';
    attemptId?: string;
    conversationId?: string;
    threadId?: string;
  };
  caseAttempt?: {
    caseId: string;
    caseTitle: string;
    specialty: string | null;
    difficulty: string;
    attemptId: string;
    threadId: string;
    conversationId: string;
    patientGreeting: string;
    patientSystemPrompt?: string;
  };
  // Navegacão imediata: attempt só é criado após selecão de modo (igual ao Chat IA)
  pendingCase?: {
    id: string;
    title: string;
    specialty: string | null;
    difficulty: string;
  };
}

const StudentChat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const state = location.state as FreeChatCaseState | null;

  const currentFreeCase = state?.freeCase;
  const caseAttempt = state?.caseAttempt;
  const pendingCase = state?.pendingCase;

  const [caseAttemptResult, setCaseAttemptResult] = useState<CaseStartResult | null>(null);

  // Chat IA iniciado sem state — resolve apenas após escolha de modo
  const [aiChatResult, setAiChatResult] = useState<CaseStartResult | null>(null);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState<string | null>(null);

  // Seleção de especialidade — apenas para Chat IA
  const isAiChat = !currentFreeCase && !caseAttempt && !pendingCase;
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [specialtyConfirmed, setSpecialtyConfirmed] = useState(!isAiChat);

  // Attempt efetivo: caseAttempt (legado) | pendingCase resolvido | Chat IA resolvido
  const resolvedAttempt = useMemo(() =>
    caseAttempt ??
    (pendingCase && caseAttemptResult ? {
      caseId: pendingCase.id,
      caseTitle: pendingCase.title,
      specialty: pendingCase.specialty,
      difficulty: pendingCase.difficulty,
      attemptId: caseAttemptResult.attempt_id,
      threadId: caseAttemptResult.thread_id,
      conversationId: caseAttemptResult.conversation_id,
      patientGreeting: '',
      patientSystemPrompt: caseAttemptResult.patient_prompt,
    } : null) ??
    (aiChatResult ? {
      caseId: aiChatResult.case_id ?? '',
      caseTitle: 'Chat IA',
      specialty: null,
      difficulty: 'Intermédio',
      attemptId: aiChatResult.attempt_id,
      threadId: aiChatResult.thread_id,
      conversationId: aiChatResult.conversation_id,
      patientGreeting: aiChatResult.patient_prompt,
    } : null)
    , [caseAttempt, pendingCase, caseAttemptResult, aiChatResult]);

  // Mode selector — mesma UX para todos os tipos de caso
  const [chatMode, setChatMode] = useState<ChatMode>(null);

  const handleSelectMode = (mode: ChatMode) => {
    if (mode === null) return;
    if (pendingCase) {
      // Caso pronto (teacher/admin): cria attempt após modo (igual Chat IA)
      setAiChatLoading(true);
      startCaseAttempt(pendingCase.id)
        .then(result => { setCaseAttemptResult(result); setAiChatLoading(false); setChatMode(mode); })
        .catch(err => { setAiChatError(err.message); setAiChatLoading(false); });
    } else if (!caseAttempt && !currentFreeCase) {
      // Chat IA
      setAiChatLoading(true);
      startAiChat(selectedSpecialty || undefined)
        .then(result => { setAiChatResult(result); setAiChatLoading(false); setChatMode(mode); })
        .catch(err => { setAiChatError(err.message); setAiChatLoading(false); });
    } else {
      setChatMode(mode);
    }
  };

  // SOAP state
  const [showSoap, setShowSoap] = useState(false);
  const [soapLoading, setSoapLoading] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [chatReady, setChatReady] = useState(false);

  // Cronômetro
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (chatMode === null) return;
    timerStartRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (timerStartRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [chatMode]);

  // Confirmation step
  const [pendingSoapContent, setPendingSoapContent] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Result popup
  const [caseResult, setCaseResult] = useState<CaseCompleteResult | null>(null);

  const chatThreadIdRef = useRef<string | null>(null);
  // Refs para o cleanup de abandono (closures precisam de ref para pegar valor atual)
  const attemptIdRef = useRef<string | null>(null);
  const isCompletedRef = useRef(false);
  // Estado reativo que espelha isCompletedRef — usado no useBlocker (avaliado no render)
  const [isCompleted, setIsCompleted] = useState(false);

  // Atualiza attemptIdRef sempre que o attempt mudar (usado no beforeunload / cleanup)
  useEffect(() => {
    const id = resolvedAttempt?.attemptId ?? caseAttempt?.attemptId ?? null;
    attemptIdRef.current = id;
  }, [resolvedAttempt, caseAttempt]);

  // Bloqueia navegação interna — usa valores reativos para que React Router avalie
  // na render correta (attemptIdRef.current seria lido antes do efeito rodar)
  const blocker = useBlocker(
    !!resolvedAttempt?.attemptId && !isCompleted
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(t('leave_confirm'));
      if (confirmed) {
        // Chama abandonAttempt ANTES de navegar, enquanto o componente ainda está montado
        if (attemptIdRef.current) {
          abandonAttempt(attemptIdRef.current);
          isCompletedRef.current = true; // impede dupla chamada no unmount
          setIsCompleted(true);
        }
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, t]);

  // Abandona attempt ao sair da página sem finalizar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (attemptIdRef.current && !isCompletedRef.current) {
        e.preventDefault();
        e.returnValue = '';
        abandonAttempt(attemptIdRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Também abandona ao desmontar (navegação interna)
      if (attemptIdRef.current && !isCompletedRef.current) {
        abandonAttempt(attemptIdRef.current);
      }
    };
  }, []);
  const [conversationId, setConversationId] = useState<string | null>(
    caseAttempt?.conversationId ?? currentFreeCase?.conversationId ?? null
  );
  const freeCaseStartTime = useRef(Date.now());

  // Atualiza conversationId quando Chat IA ou pendingCase resolvem
  useEffect(() => {
    if (aiChatResult?.conversation_id) setConversationId(aiChatResult.conversation_id);
  }, [aiChatResult]);
  useEffect(() => {
    if (caseAttemptResult?.conversation_id) setConversationId(caseAttemptResult.conversation_id);
  }, [caseAttemptResult]);

  const isCaseAttempt = !!resolvedAttempt;

  const existingThreadId = resolvedAttempt?.threadId ?? currentFreeCase?.threadId;

  // Para caseAttempt: usa patientSystemPrompt como prompt inicial (GPT responde após modo sér selecionado).
  // Para Chat IA: patientSystemPrompt é undefined (GPT já foi chamado no backend, greeting em existingMessages).
  // Para free cases: usa initialPrompt do caso (sempre).
  const initialPrompt = isCaseAttempt
    ? resolvedAttempt?.patientSystemPrompt
    : currentFreeCase?.initialPrompt ??
    'Você é um paciente em consulta médica. Apresente uma queixa principal de forma natural e coloquial, como um paciente real faria. Não revele o diagnóstico — aguarde as perguntas do médico para conduzi-lo.';

  // Só exibe mensagem pré-gerada para Chat IA (GPT chamado no backend, sem patientSystemPrompt).
  // Para casos com patientSystemPrompt, o ChatGPT component chama o GPT via initialPrompt.
  const existingMessages = useMemo(() => {
    if (resolvedAttempt?.patientGreeting && !resolvedAttempt.patientSystemPrompt) {
      return [{ role: 'assistant', content: resolvedAttempt.patientGreeting }];
    }
    return undefined;
  }, [resolvedAttempt?.patientGreeting, resolvedAttempt?.patientSystemPrompt]);

  const handleThreadReady = useCallback((threadId: string) => {
    chatThreadIdRef.current = threadId;
  }, []);

  const handleChatReady = useCallback((ready: boolean) => {
    if (ready) setChatReady(true);
  }, []);

  const handleConversationReady = useCallback((convId: string) => {
    setConversationId(convId);
  }, []);

  // Abrir SOAP popup (somente modo avancado)
  const handleOpenSoap = () => {
    setShowSoap(true);
    setIsChatLocked(true);
  };

  // Passo 1: SoapForm envia -> guarda conteudo e mostra confirmacao
  const handleSoapSend = (prompt: string) => {
    setPendingSoapContent(prompt);
    setShowSoap(false);
    setIsChatLocked(true);
    setShowConfirm(true);
  };

  // Passo 2: Usuario confirma -> avalia SOAP
  const handleConfirmComplete = async () => {
    if (!pendingSoapContent) return;
    setShowConfirm(false);
    setSoapLoading(true);
    try {
      let result: CaseCompleteResult;
      if (resolvedAttempt) {
        // Usa case_id do resolvedAttempt (funciona para caso pronto e Chat IA)
        result = await completeCaseAttempt(resolvedAttempt.caseId, pendingSoapContent);
      } else if (currentFreeCase?.attemptId) {
        result = await completeCaseAttempt(currentFreeCase.id, pendingSoapContent);
      } else {
        result = await evaluateFreeCaseSoap(pendingSoapContent);
      }
      setCaseResult(result);
      isCompletedRef.current = true; // não abandonar ao sair
      setIsCompleted(true);
      setPendingSoapContent(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errors.complete_case');
      alert(msg);
      setIsChatLocked(false);
    } finally {
      setSoapLoading(false);
    }
  };

  const evaluateFreeCaseSoap = async (soapContent: string): Promise<CaseCompleteResult> => {
    const res = await authFetch(`${config.apiUrl}${API_ENDPOINTS.CASES_EVALUATE_SOAP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        soap_content: soapContent,
        case_summary: currentFreeCase?.title || null,
        conversation_id: conversationId || null,
      }),
    });
    if (!res.ok) throw new Error(t('errors.evaluate_soap'));
    const data = await res.json();
    const durationSeconds = Math.floor((Date.now() - freeCaseStartTime.current) / 1000);
    return {
      attempt_id: 'free-case',
      score: data.score ?? null,
      feedback: data.feedback || t('result.eval_fallback'),
      duration_seconds: durationSeconds,
    };
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    if (chatMode === 'easy') {
      setIsChatLocked(false); // facil: desbloqueia chat ao voltar editar SOAP
    } else {
      setShowSoap(true); // avancado: reabre popup SOAP
    }
  };

  // --- Render helpers ---

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const caseHeader = (
    <header className="w-full border-b border-[#4a4556] bg-[#393542]/90 backdrop-blur-sm px-4 sm:px-8 py-3 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          {resolvedAttempt ? (
            <span className="inline-flex items-center rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2.5 py-1">
              {aiChatResult ? t('header.simulation') : t('header.teacher_case')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-semibold px-2.5 py-1">
              {t('header.free_case')}
            </span>
          )}
          {currentFreeCase && (
            <>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-300 text-[11px] font-medium px-2 py-0.5">
                {currentFreeCase.level}
              </span>
              <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-300 text-[11px] font-medium px-2 py-0.5">
                {specialtyLabel(currentFreeCase.area)}
              </span>
            </>
          )}
          {resolvedAttempt && !aiChatResult && (
            <>
              <span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-300 text-[11px] font-medium px-2 py-0.5">
                {resolvedAttempt.difficulty}
              </span>
              {resolvedAttempt.specialty && (
                <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-300 text-[11px] font-medium px-2 py-0.5">
                  {specialtyLabel(resolvedAttempt.specialty)}
                </span>
              )}
            </>
          )}
          {chatMode === 'easy' && (
            <span className="inline-flex items-center rounded-full bg-green-500/20 text-green-300 text-[11px] font-semibold px-2.5 py-1">
              {t('header.mode_standard')}
            </span>
          )}
          {chatMode === 'advanced' && (
            <span className="inline-flex items-center rounded-full bg-orange-500/20 text-orange-300 text-[11px] font-semibold px-2.5 py-1">
              {t('header.mode_memorization')}
            </span>
          )}
        </div>
        
      </div>

      {/* Cronômetro */}
      {chatMode !== null && (
        <div className="flex items-center gap-2 bg-[#2a2635]/70 border border-[#4a4556]/60 rounded-2xl px-4 py-2 shadow-inner flex-shrink-0">
          <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          <span className="font-mono text-base font-bold text-violet-300 tabular-nums tracking-widest">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      )}
    </header>
  );

  const sharedModals = (
    <>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-[#4a4556]">
            <div className="text-center mb-4">
              <span className="text-4xl">&#x26A0;&#xFE0F;</span>
            </div>
            <h3 className="text-lg font-bold text-gray-100 text-center mb-2">
              {t('confirm.title')}
            </h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              {t('confirm.body')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-2.5 rounded-xl bg-[#4a4556] text-gray-200 font-semibold text-sm border border-[#5a5466] hover:bg-[#5a5466] transition-all"
              >
                {t('confirm.back_edit')}
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all"
              >
                {t('confirm.yes_finish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {soapLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-8 text-center border border-[#4a4556]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-100 mb-1">{t('evaluating.title')}</h3>
            <p className="text-sm text-gray-400">{t('evaluating.body')}</p>
          </div>
        </div>
      )}

      {caseResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-md border border-[#4a4556] overflow-hidden">
            <div className={`px-6 pt-8 pb-6 text-center ${caseResult.score === null ? 'bg-slate-600/30' :
              caseResult.score >= 80 ? 'bg-green-500/10' :
                caseResult.score >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'
              }`}>
              <div className={`text-7xl font-black mb-1 ${caseResult.score === null ? 'text-gray-400' :
                caseResult.score >= 80 ? 'text-green-400' :
                  caseResult.score >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                {caseResult.score !== null ? caseResult.score : '\u2014'}
              </div>
              <p className="text-sm text-gray-400">
                {caseResult.score !== null ? t('result.of_100') : t('result.unavailable')}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 bg-[#2a2635] rounded-full px-3 py-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {t('duration', { min: Math.floor(caseResult.duration_seconds / 60), sec: caseResult.duration_seconds % 60 })}
              </div>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Breakdown por seção SOAP */}
              {caseResult.breakdown && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">{t('result.section_scores')}</h4>
                  <div className="flex flex-col gap-1.5">
                    {(Object.entries(caseResult.breakdown) as [keyof SoapBreakdown, SoapBreakdown[keyof SoapBreakdown]][]).map(([dim, data]) => {
                      const labels: Record<string, string> = { subjetivo: t('result.soap_s'), objetivo: t('result.soap_o'), avaliacao: t('result.soap_a'), plano: t('result.soap_p') };
                      const pct = data.score;
                      const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-500';
                      return (
                        <div key={dim} className="bg-[#2a2635] rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400 font-medium">{labels[dim]}</span>
                            <span className="text-xs font-bold text-gray-200">
                              {data.score}<span className="text-gray-500 font-normal">/100</span>
                              <span className="ml-1.5 text-gray-500">({data.weight}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-[#3d3848] rounded-full h-1.5">
                            <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${data.score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Feedback geral */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                  <span>&#x1F4AC;</span> {t('result.feedback')}
                </h4>
                <div className="bg-[#2a2635] rounded-xl p-4 max-h-44 overflow-y-auto">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {caseResult.feedback}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/mainpage')}
                className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                </svg>
                {t('result.back_home')}
              </button>
              {conversationId && (
                <button
                  onClick={() => navigate(`/conversation/${conversationId}`)}
                  className="flex-1 py-3 rounded-xl bg-[#4a4556] text-gray-200 font-semibold text-sm hover:bg-[#5a5466] transition-all border border-[#5a5466] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {t('result.view_conversation')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <ThreadProvider>
      {/* Overlay unificado: cobre aguardar backend (Chat IA / pendingCase) E
           aguardar primeira resposta do GPT após modo selecionado (free cases). */}
      {(aiChatLoading || (chatMode !== null && !chatReady)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2635]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4" />
            <p className="text-sm text-gray-400">{t('loading_patient')}</p>
          </div>
        </div>
      )}
      {/* Erro ao inicializar Chat IA */}
      {aiChatError && !aiChatLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2635] p-4">
          <div className="text-center max-w-sm">
            <p className="text-red-400 font-semibold mb-2">{t('ai_error_title')}</p>
            <p className="text-gray-400 text-sm mb-4">{aiChatError}</p>
            <button onClick={() => navigate('/mainpage')} className="text-sm text-indigo-400 hover:text-indigo-300">{t('back_home')}</button>
          </div>
        </div>
      )}
      <div className="h-screen bg-[#615B6D] flex flex-col sm:flex-row overflow-hidden">
        <div className="hidden sm:block h-full flex-shrink-0">
          <MainMenu />
        </div>
        <div className="sm:hidden w-full fixed top-0 left-0 z-30">
          <MainMenu mobile />
        </div>
        <div className="sm:hidden h-16 w-full flex-shrink-0" />

        <div className="flex-1 flex flex-col overflow-hidden relative w-full min-h-0">

          {/* Seletor de especialidade — apenas Chat IA, antes de escolher modo */}
          {chatMode === null && !specialtyConfirmed && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#2a2635]/95 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-lg py-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">{t('specialty.title')}</h2>
                  <p className="text-sm text-gray-400">
                    {t('specialty.subtitle')}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                  {[
                    { label: t('specialty.random'), emoji: '🎲', value: '' },
                    ...SPECIALTIES.map(s => ({ label: specialtyLabel(s.key), emoji: s.emoji, value: s.key })),
                  ].map(({ label, emoji, value }) => {
                    const active = selectedSpecialty === value;
                    return (
                      <button
                        key={label}
                        onClick={() => setSelectedSpecialty(value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                          active
                            ? 'border-violet-400 bg-violet-500/20 text-violet-300'
                            : 'border-violet-500/30 bg-violet-500/10 text-gray-300 hover:border-violet-400/50 hover:bg-violet-500/20'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSpecialtyConfirmed(true)}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-sm"
                >
                  {selectedSpecialty ? t('specialty.continue_with', { specialty: selectedSpecialty }) : t('specialty.continue_random')}
                </button>
              </div>
            </div>
          )}

          {/* Seletor de modo */}
          {chatMode === null && specialtyConfirmed && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#2a2635]/95 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">{t('mode.title')}</h2>
                  <p className="text-sm text-gray-400">{t('mode.subtitle')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSelectMode('easy')}
                    className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-green-500/40 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400/60 transition-all text-left"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      📖
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-300 mb-1">{t('mode.standard_title')}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {t('mode.standard_desc')}
                      </p>
                    </div>
                    <span className="mt-auto text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                      {t('mode.standard_badge')}
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectMode('advanced')}
                    className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400/60 transition-all text-left"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      🔒
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-orange-300 mb-1">{t('mode.memorization_title')}</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {t('mode.memorization_desc')}
                      </p>
                    </div>
                    <span className="mt-auto text-xs font-semibold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                      {t('mode.memorization_badge')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {chatMode !== null && caseHeader}

          {/* Modo Facil: layout split — SOAP à esquerda no desktop, cima/baixo no mobile */}
          {chatMode === 'easy' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 gap-0">
              {/* SOAP — esquerda no desktop, topo no mobile */}
              <div className="w-full lg:w-[450px] xl:w-[520px] flex-shrink-0 flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#4a4556]">
                {!caseResult && (
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">
                        {t('soap_panel.fill')}
                      </span>
                      <span className="text-[10px] text-gray-500 ml-auto">
                        {t('soap_panel.consult_chat')}
                      </span>
                    </div>
                    <div className="relative">
                      {!chatReady && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-[#2a2635]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
                          <p className="text-sm text-gray-400 text-center px-4">{t('soap_panel.wait_patient')}</p>
                        </div>
                      )}
                      <SoapForm
                        onSend={handleSoapSend}
                        loading={soapLoading}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat — direita no desktop, baixo no mobile */}
              <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 overflow-hidden">
                <div className="flex-1 min-h-0">
                  <ChatGPT
                    initialPrompt={initialPrompt}
                    existingThreadId={existingThreadId}
                    existingMessages={existingMessages}

                    disabled={isChatLocked}
                    onThreadReady={handleThreadReady}
                    onChatReady={handleChatReady}
                    onConversationReady={handleConversationReady}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modo Avancado: layout atual */}
          {chatMode === 'advanced' && (
            <div className="flex-1 flex flex-col items-center p-2 sm:p-4 lg:p-6 overflow-hidden min-h-0">
              {showSoap && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                  onClick={() => { setShowSoap(false); setIsChatLocked(false); }}
                >
                  <div
                    className="bg-[#393542] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-[#4a4556]"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {t('soap_panel.fill_title')}
                        </h3>
                        <button
                          onClick={() => { setShowSoap(false); setIsChatLocked(false); }}
                          className="text-gray-400 hover:text-gray-200 transition p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <SoapForm onSend={handleSoapSend} loading={soapLoading} />
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full max-w-4xl flex-1 min-h-0">
                <ChatGPT
                  initialPrompt={initialPrompt}
                  existingThreadId={existingThreadId}
                  existingMessages={existingMessages}

                  disabled={isChatLocked}
                  onThreadReady={handleThreadReady}
                  onChatReady={handleChatReady}
                  onConversationReady={handleConversationReady}
                />
              </div>

              {!caseResult && (
                <div className="flex-shrink-0 pt-2 sm:pt-4 pb-2">
                  <button
                    onClick={handleOpenSoap}
                    disabled={showSoap || showConfirm || soapLoading || !chatReady}
                    className="bg-violet-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-violet-700 transition text-xs sm:text-sm md:text-base flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>&#x1F4DD;</span>
                    <span>{soapLoading ? t('finish.evaluating') : !chatReady ? t('finish.wait_chat') : t('finish.finish_consult')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {chatMode === null && <div className="flex-1" />}
        </div>

        {sharedModals}
      </div>
    </ThreadProvider>
  );
};

export default StudentChat;
