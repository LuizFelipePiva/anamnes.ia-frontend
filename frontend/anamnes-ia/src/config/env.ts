/**
 * Validação e configuração centralizada de variáveis de ambiente
 */

interface EnvVars {
  VITE_API_URL: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

/**
 * Lista de variáveis de ambiente obrigatórias
 */
const REQUIRED_ENV_VARS: (keyof EnvVars)[] = [
  'VITE_API_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

/**
 * Valida se todas as variáveis de ambiente necessárias estão configuradas
 * @throws Error se alguma variável obrigatória estiver faltando
 */
export function validateEnvironment(): void {
  const missing: string[] = [];
  
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = import.meta.env[varName];
    if (!value || value === '' || value === 'undefined') {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    const errorMsg = `❌ Variáveis de ambiente obrigatórias não configuradas:\n${missing.join('\n')}\n\nVerifique o arquivo .env na raiz do projeto.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('✅ Variáveis de ambiente validadas com sucesso');
}

/**
 * Retorna o valor de uma variável de ambiente com type safety
 */
export function getEnvVar(key: keyof EnvVars): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente ${key} não encontrada`);
  }
  return value;
}

/**
 * Configuração da aplicação (após validação)
 */
export const config = {
  get apiUrl(): string {
    return getEnvVar('VITE_API_URL');
  },
  get supabaseUrl(): string {
    return getEnvVar('VITE_SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return getEnvVar('VITE_SUPABASE_ANON_KEY');
  }
} as const;
