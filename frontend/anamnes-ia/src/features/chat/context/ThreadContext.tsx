import React, { createContext, useContext, useState, useCallback } from 'react';
import { authFetch, logger } from '@/core/utils';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';

interface ThreadContextType {
  threadId: string | null;
  setThreadId: (id: string | null) => void;
  initialLoading: boolean;
  setInitialLoading: (loading: boolean) => void;
  startNewThread: () => Promise<string | null>;
  resetThread: () => void;
}

const ThreadContext = createContext<ThreadContextType>({
  threadId: null,
  setThreadId: () => {},
  initialLoading: false,
  setInitialLoading: () => {},
  startNewThread: async () => null,
  resetThread: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useThread = () => useContext(ThreadContext);

export const ThreadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);

  // Função para criar novo thread sob demanda
  const startNewThread = useCallback(async (): Promise<string | null> => {
    setInitialLoading(true);
    try {
      const res = await authFetch(`${config.apiUrl}${API_ENDPOINTS.START_CHAT}`, { method: 'POST' });
      const data = await res.json();
      const newThreadId = data.thread_id;
      setThreadId(newThreadId);
      logger.info('Thread criado com sucesso', { threadId: newThreadId });
      return newThreadId;
    } catch (error) {
      logger.error('Erro ao criar thread', error);
      return null;
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Função para resetar o thread (ex: ao iniciar nova conversa)
  const resetThread = useCallback(() => {
    setThreadId(null);
  }, []);

  return (
    <ThreadContext.Provider value={{ 
      threadId, 
      setThreadId, 
      initialLoading, 
      setInitialLoading,
      startNewThread,
      resetThread
    }}>
      {children}
    </ThreadContext.Provider>
  );
};