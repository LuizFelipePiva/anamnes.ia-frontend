import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { startNewChat } from '../utils/chatUtils';
import { useAuth } from '@/features/auth';
import { authFetch } from '@/core/utils';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';

interface ChatGPTProps {
  initialPrompt?: string;
  onLoadingChange?: (loading: boolean) => void;

  disabled?: boolean;
  /** Provide an existing thread ID to skip creating a new one */
  existingThreadId?: string;
  /** Provide initial messages to display immediately (used with existingThreadId) */
  existingMessages?: { role: string; content: string }[];
  /** Called when the thread ID is available (for external evaluation flow) */
  onThreadReady?: (threadId: string) => void;
  /** Called when the chat is ready (first message loaded and not processing) */
  onChatReady?: (ready: boolean) => void;
  /** Called when the conversation ID is available (for history navigation) */
  onConversationReady?: (conversationId: string) => void;
}

const ChatGPT: React.FC<ChatGPTProps> = ({
  initialPrompt,
  onLoadingChange,

  disabled = false,
  existingThreadId,
  existingMessages,
  onThreadReady,
  onChatReady,
  onConversationReady,
}) => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inicialização: só um fluxo roda!
    if (!token) return;

    // existingThreadId + initialPrompt: thread criado pelo backend, mas GPT ainda não foi chamado.
    // Envia o prompt ao GPT usando a thread existente (sem criar nova thread).
    if (existingThreadId && initialPrompt) {
      setThreadId(existingThreadId);
      setInitialLoading(true);
      fetch(`${config.apiUrl}${API_ENDPOINTS.GPT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ thread_id: existingThreadId, message: initialPrompt }),
      })
        .then(res => res.json())
        .then(data => {
          setMessages([{ role: 'assistant', content: data.reply }]);
        })
        .catch(() => {
          setMessages([{ role: 'assistant', content: t('gpt_error') }]);
        })
        .finally(() => {
          setInitialLoading(false);
          setLoading(false);
          if (onLoadingChange) onLoadingChange(false);
        });
      return;
    }

    // existingThreadId sem initialPrompt: usa mensagens pré-geradas (ex: Chat IA)
    if (existingThreadId) {
      setThreadId(existingThreadId);
      setMessages(existingMessages || []);
      setInitialLoading(false);
      return;
    }

    // Se tem initialPrompt, só roda esse fluxo!
    if (initialPrompt) {
      setInitialLoading(true);
      startNewChat(
        (newThreadId) => {
          setThreadId(newThreadId);
          fetch(`${config.apiUrl}${API_ENDPOINTS.GPT}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ thread_id: newThreadId, message: initialPrompt }),
          })
            .then(res => res.json())
            .then(data => {
              setMessages([{ role: 'assistant', content: data.reply }]);
            })
            .catch(() => {
              setMessages([{ role: 'assistant', content: t('gpt_error') }]);
            })
            .finally(() => {
              setInitialLoading(false);
              setLoading(false);
              if (onLoadingChange) onLoadingChange(false);
            });
        },
        setMessages,
        () => { }, // no-op: initialLoading controlled locally above, not by startNewChat
        undefined, // caseTitle
        onConversationReady, // forward conversation_id
      );
      return; // <-- IMPORTANTE: impede o fluxo padrão de rodar!
    }

    // Fluxo padrão: só cria a thread e espera o usuário digitar
    startNewChat(setThreadId, setMessages, setInitialLoading, undefined, onConversationReady);
    // eslint-disable-next-line
  }, [token, initialPrompt, existingThreadId]);

  // Notifica o parent quando o threadId estiver pronto
  useEffect(() => {
    if (threadId && onThreadReady) onThreadReady(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (onLoadingChange) onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  // Notifica parent se o chat está pronto para interação
  useEffect(() => {
    if (onChatReady) onChatReady(!initialLoading && !loading);
  }, [initialLoading, loading, onChatReady]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || disabled) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);

    try {
      const response = await authFetch(`${config.apiUrl}${API_ENDPOINTS.GPT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ thread_id: threadId, message: input }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: t('gpt_error') }]);
    }
    setInput('');
    setLoading(false);
    if (onLoadingChange) onLoadingChange(false);
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div
        className="bg-[#393542] rounded-2xl shadow-xl p-3 sm:p-4 md:p-5 w-full
                   flex flex-col justify-between
                   h-full min-h-0"
      >

        <div
          className="flex-1 overflow-y-auto mb-2 sm:mb-4 flex flex-col gap-2 min-h-0"
          ref={messagesEndRef}
        >
          {initialLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#844AF5]" />
            </div>
          )}
          {messages.map((msg, idx) => {
            const isNarrator = msg.role === 'assistant' && msg.content.startsWith('[NARRADOR]');
            const displayContent = isNarrator
              ? msg.content.replace(/^\[NARRADOR\]\s*/, '')
              : msg.content;

            if (isNarrator) {
              return (
                <div key={idx} className="self-start w-full max-w-[95%] sm:max-w-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide">{t('clinical_data')}</span>
                  </div>
                  <div className="bg-teal-900/40 border border-teal-500/30 text-teal-100 p-3 rounded-xl text-sm font-mono leading-relaxed break-words">
                    {displayContent}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[85%] sm:max-w-md break-words text-sm sm:text-base
                  ${msg.role === 'user'
                    ? 'bg-[#615B6D] text-gray-100 self-end text-right'
                    : 'bg-[#844AF5] text-white self-start text-left'
                  }`}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {displayContent}
              </div>
            );
          })}
          {loading && messages.length > 0 && (
            <div className="self-start bg-[#844AF5]/60 text-white p-3 rounded-xl text-sm">
              <span className="animate-pulse">{t('typing')}</span>
            </div>
          )}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 mt-2 sm:mt-4">
          <input
            type="text"
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-600 bg-[#4a4556] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#844AF5] text-gray-100 text-sm sm:text-base placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? t('input_placeholder.finished') : initialLoading ? t('input_placeholder.waiting_patient') : loading ? t('input_placeholder.waiting_response') : t('input_placeholder.default')}
            disabled={loading || initialLoading || disabled}
          />
          <button
            type="submit"
            className="bg-[#844AF5] text-white px-4 sm:px-6 py-2 rounded-xl font-semibold hover:bg-[#6F3CBB] transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={loading || initialLoading || disabled}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatGPT;