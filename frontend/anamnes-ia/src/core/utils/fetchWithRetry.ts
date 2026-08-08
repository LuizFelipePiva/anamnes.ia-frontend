import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Aguarda um tempo especificado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica se um erro HTTP deve ser retentado
 */
function shouldRetry(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status);
}

/**
 * Realiza fetch com retry automático em caso de falhas transitórias
 * 
 * @param input - URL ou Request object
 * @param init - RequestInit options
 * @param options - Retry options
 * @returns Response
 */
export async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug(`Tentativa ${attempt}/${opts.maxAttempts}`, { url: input.toString() });
      
      const response = await fetch(input, init);
      
      // Se a resposta é OK, retorna imediatamente
      if (response.ok) {
        return response;
      }
      
      // Se não deve retentar, retorna a resposta com erro
      if (!shouldRetry(response.status, opts.retryableStatuses)) {
        logger.warn(`Erro HTTP ${response.status} não retentável`, { url: input.toString() });
        return response;
      }
      
      // Se é a última tentativa, retorna a resposta
      if (attempt === opts.maxAttempts) {
        logger.warn(`Esgotadas ${opts.maxAttempts} tentativas`, { 
          url: input.toString(), 
          status: response.status 
        });
        return response;
      }
      
      // Calcula delay com backoff exponencial
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
      logger.info(`Retentando em ${delay}ms após erro ${response.status}`, { 
        attempt, 
        url: input.toString() 
      });
      await sleep(delay);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Se é erro de rede e não é a última tentativa, retenta
      if (attempt < opts.maxAttempts) {
        const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
        logger.warn(`Erro de rede, retentando em ${delay}ms`, { 
          attempt, 
          error: lastError.message 
        });
        await sleep(delay);
        continue;
      }
      
      // Última tentativa falhou, lança o erro
      logger.error(`Falha após ${opts.maxAttempts} tentativas`, { error: lastError.message });
      throw lastError;
    }
  }
  
  // Nunca deve chegar aqui, mas TypeScript exige
  throw lastError || new Error('Erro desconhecido no retry');
}
