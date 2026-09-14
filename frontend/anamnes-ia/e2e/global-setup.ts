/**
 * Checagem de pré-requisitos antes de qualquer spec rodar.
 *
 * Sem isso, esquecer de subir o backend produz um teste que falha com
 * "elemento não encontrado" 30s depois — sintoma que não diz nada sobre a
 * causa. Aqui a falha é imediata e traz o comando que resolve.
 */

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';

async function ping(url: string, timeoutMs = 3_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requireService(name: string, url: string, fix: string) {
  try {
    const res = await ping(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `\n[e2e] ${name} não respondeu em ${url} (${reason}).\n` +
        `      Para resolver: ${fix}\n` +
        `      Passo a passo completo: frontend/anamnes-ia/e2e/README.md\n`,
    );
  }
}

export default async function globalSetup() {
  await requireService(
    'Supabase local',
    `${SUPABASE_URL}/rest/v1/`,
    'npx supabase start   (na raiz do repo)',
  );

  await requireService(
    'Backend FastAPI',
    `${API_URL}/health`,
    'cd backend && python -m uvicorn app.main:app --port 8000  ' +
      '(com backend/.env.e2e apontando para o Supabase local)',
  );

  // Guarda contra o erro mais caro possível: rodar E2E — que escreve e apaga
  // linhas — contra o Supabase de produção.
  if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
    throw new Error(
      `\n[e2e] E2E_SUPABASE_URL aponta para ${SUPABASE_URL}, que não é local.\n` +
        `      Estes testes escrevem e apagam dados. Abortando.\n`,
    );
  }
}
