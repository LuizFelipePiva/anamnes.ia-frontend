// src/utils/errorHandler.ts
// Utilitário para tratamento centralizado de erros

import { logger } from './logger';
import { ERROR_MESSAGES as CONST_ERROR_MESSAGES, HTTP_STATUS } from '@/config/constants';

/**
 * Mensagens de erro amigáveis para o usuário
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'Token expirado': CONST_ERROR_MESSAGES.SESSION_EXPIRED,
  'Token não encontrado': CONST_ERROR_MESSAGES.UNAUTHORIZED,
  'Sessão expirada': CONST_ERROR_MESSAGES.SESSION_EXPIRED,
  'EMAIL_EXISTS': 'Este email já está cadastrado.',
  'INVALID_EMAIL': 'Email inválido. Verifique e tente novamente.',
  'RATE_LIMIT': 'Muitas tentativas. Aguarde alguns minutos.',
  
  // Network errors
  'Failed to fetch': CONST_ERROR_MESSAGES.NETWORK_ERROR,
  'Network Error': CONST_ERROR_MESSAGES.NETWORK_ERROR,
  'NetworkError': CONST_ERROR_MESSAGES.NETWORK_ERROR,
  
  // Server errors
  [HTTP_STATUS.INTERNAL_SERVER_ERROR.toString()]: CONST_ERROR_MESSAGES.SERVER_ERROR,
  [HTTP_STATUS.BAD_GATEWAY.toString()]: 'Servidor temporariamente indisponível.',
  [HTTP_STATUS.SERVICE_UNAVAILABLE.toString()]: 'Serviço indisponível. Tente novamente.',
  [HTTP_STATUS.GATEWAY_TIMEOUT.toString()]: 'Tempo de resposta esgotado. Tente novamente.',
  
  // Generic
  'default': CONST_ERROR_MESSAGES.UNKNOWN_ERROR,
};

/**
 * Retorna uma mensagem amigável para o erro
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error || ERROR_MESSAGES.default;
  }
  
  if (error instanceof Error) {
    const msg = error.message;
    
    // Procura por mensagem conhecida
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (msg.includes(key)) {
        return value;
      }
    }
    
    return msg || ERROR_MESSAGES.default;
  }
  
  // Para objetos de erro da API
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    if (errObj.message) return getErrorMessage(errObj.message);
    if (errObj.error) return getErrorMessage(errObj.error);
    if (errObj.detail) return String(errObj.detail);
  }
  
  return ERROR_MESSAGES.default;
}

/**
 * Handler para erros de requisição
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = ERROR_MESSAGES.default;
  
  // Tenta extrair mensagem do body
  try {
    const data = await response.json();
    if (data.detail) errorMessage = data.detail;
    else if (data.message) errorMessage = data.message;
    else if (data.error) errorMessage = data.error;
  } catch {
    // Se não conseguir parsear, usa status
    errorMessage = ERROR_MESSAGES[String(response.status)] || `Erro ${response.status}`;
  }
  
  throw new Error(errorMessage);
}

/**
 * Wrapper para try/catch com logging
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(getErrorMessage(error));
    logger.error('Erro capturado em tryCatch', { message: err.message });
    onError?.(err);
    return null;
  }
}
