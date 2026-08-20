import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/config/constants';
import { fetchWithRetry, logger } from '@/core/utils';
import supabase from '@/core/lib/supabaseClient';

const API_URL = config.apiUrl;

export async function login(email: string, password: string): Promise<string> {
  try {
    const response = await fetchWithRetry(`${API_URL}${API_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.token) {
      logger.warn('Login falhou', { email, status: response.status });
      throw new Error(data.detail || 'Credenciais inválidas');
    }
    
    logger.info('Login bem-sucedido', { email });
    return data.token;
  } catch (error) {
    logger.error('Erro no login', error);
    throw error;
  }
}

/**
 * Inicia o cadastro. O backend adota fluxo de confirmação por e-mail (SPEC-006):
 * NÃO retorna token e responde de forma idêntica exista ou não o e-mail
 * (anti-enumeração). Em sucesso, retorna a mensagem genérica para exibir ao
 * usuário ("verifique seu e-mail"). Não faz login automático.
 */
export async function register(name: string, email: string, password: string, role: string = 'student'): Promise<string> {
  try {
    const response = await fetchWithRetry(`${API_URL}${API_ENDPOINTS.REGISTER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.detail || data.message || `Erro ${response.status}: ${response.statusText}`;
      logger.warn('Registro falhou', { email, status: response.status, error: errorMessage });
      throw new Error(errorMessage);
    }

    logger.info('Cadastro iniciado (aguardando confirmação de e-mail)', { email });
    return data.message || 'Verifique seu e-mail para confirmar o cadastro.';
  } catch (error) {
    logger.error('Erro no registro', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao conectar com o servidor');
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}