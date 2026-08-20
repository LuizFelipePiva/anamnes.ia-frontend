import { globalLogout } from '@/features/auth/context/authContext';
import { STORAGE_KEYS, TIMEOUTS } from '@/config/constants';
import { queueSessionNotice } from './sessionNotice';
import { logger } from './logger';
import { fetchWithRetry } from './fetchWithRetry';

/**
 * Decodifica um JWT e retorna o payload
 */
function parseJwt(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Erro ao decodificar JWT', error);
    return null;
  }
}

/**
 * Verifica se o token JWT está expirado
 */
function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  
  // exp está em segundos, Date.now() em milissegundos
  const expirationTime = payload.exp * 1000;
  const now = Date.now();
  
  // Considera expirado se faltar menos de 1 minuto (buffer de segurança)
  return now >= expirationTime - TIMEOUTS.JWT_REFRESH_BUFFER;
}

// i18n (SPEC-007): módulo sem React. As mensagens dos `throw new Error(...)`
// abaixo **não** são traduzidas de propósito — `errorHandler.ts` as usa como
// chave de mapeamento interno, não são exibidas. O único texto visível é o aviso
// de sessão expirada, que é enfileirado como chave e traduzido pelo
// `SessionNotice` depois do redirecionamento.

/**
 * Função para fazer requisições autenticadas
 * - Verifica se o token está expirado antes de fazer a requisição
 * - Faz logout automático se receber 401/403
 * - Usa retry logic automaticamente
 */
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  
  // Verifica se tem token
  if (!token) {
    logger.warn('Token não encontrado, redirecionando para login');
    globalLogout();
    window.location.href = '/';
    throw new Error('Token não encontrado');
  }
  
  // Verifica se token está expirado ANTES de fazer a requisição
  if (isTokenExpired(token)) {
    logger.warn('Token expirado, redirecionando para login');
    queueSessionNotice('session_expired');
    globalLogout();
    window.location.href = '/';
    throw new Error('Token expirado');
  }
  
  const hasBody = init?.body !== undefined && init.body !== null;
  // FormData define o próprio Content-Type (multipart + boundary) — não sobrescrever
  const isFormData = init?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
    'Authorization': `Bearer ${token}`,
    // Só envia Content-Type quando há um body (evita header desnecessário em GET/DELETE)
    ...(hasBody && !isFormData && !((init?.headers as Record<string, string>)?.['Content-Type'])
      ? { 'Content-Type': 'application/json' }
      : {}),
  };

  const response = await fetchWithRetry(input, { ...init, headers });
  
  // Apenas 401 (token inválido/expirado) → desloga
  // 403 (acesso negado) → deixa o chamador tratar o erro, NÃO desloga
  if (response.status === 401) {
    logger.warn('Token inválido (401), redirecionando para login');
    queueSessionNotice('session_expired');
    globalLogout();
    window.location.href = '/';
    throw new Error('Sessão expirada');
  }
  
  return response;
}