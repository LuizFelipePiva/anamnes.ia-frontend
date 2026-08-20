import { authFetch, logger } from '@/core/utils';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';

type ChatMessage = { role: string; content: string };

export async function startNewChat(
  setThreadId: (id: string) => void,
  setMessages: (msgs: ChatMessage[]) => void,
  setInitialLoading: (v: boolean) => void,
  caseTitle?: string,
  onConversationId?: (id: string) => void,
) {
  logger.debug('Iniciando novo chat', { caseTitle });
  setInitialLoading(true);
  try {
    const res = await authFetch(`${config.apiUrl}${API_ENDPOINTS.START_CHAT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_title: caseTitle || null }),
    });
    const data = await res.json();
    setThreadId(data.thread_id);
    setMessages([]);
    if (data.conversation_id && onConversationId) {
      onConversationId(data.conversation_id);
    }
    logger.info('Chat iniciado com sucesso', { threadId: data.thread_id });
  } catch (error) {
    logger.error('Erro ao iniciar chat', error);
    setMessages([{ role: 'assistant', content: 'Erro ao comunicar com o GPT.' }]);
  }
  setInitialLoading(false);
}