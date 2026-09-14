/**
 * Login programático para os specs E2E.
 *
 * Por que não preencher o formulário de login em cada spec: o objetivo dos
 * testes é o fluxo de exames, não a tela de autenticação (essa já é coberta
 * pelo `smoke.spec.ts`). Passar pela UI a cada spec adiciona ~2s e um ponto
 * de falha alheio ao que se quer provar.
 *
 * O caminho continua sendo o real — `POST /api/login` contra o backend, com a
 * senha do `supabase/seed_e2e.sql` — só a navegação é que é pulada. O token
 * volta para o `localStorage` sob a mesma chave que o `AuthProvider` lê no
 * mount (`authToken`, ver `config/constants.ts`).
 */
import type { Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';

/** Senha única do seed E2E. Local-only — ver o cabeçalho de `seed_e2e.sql`. */
export const E2E_PASSWORD = 'e2e-password-123';

/** Usuários criados por `supabase/seed_e2e.sql`. */
export const E2E_USERS = {
  teacher: {
    email: 'e2e.professor@anamnes-e2e.com',
    id: 'e2e00000-0000-4000-8000-000000000001',
  },
  student: {
    email: 'e2e.aluno@anamnes-e2e.com',
    id: 'e2e00000-0000-4000-8000-000000000002',
  },
  /** Aluno legítimo, mas fora da turma — usado para provar a autorização. */
  outsider: {
    email: 'e2e.intruso@anamnes-e2e.com',
    id: 'e2e00000-0000-4000-8000-000000000003',
  },
} as const;

export type E2EUser = keyof typeof E2E_USERS;

/** Dados fixos do seed que os specs referenciam. */
export const E2E_FIXTURES = {
  classId: 'e2e10000-0000-4000-8000-000000000001',
  caseId: 'e2e20000-0000-4000-8000-000000000001',
  caseTitle: 'Caso E2E — dor torácica',
  assets: {
    rx1: { id: 'E2E-RX-001', diagnosis: 'Pneumotórax hipertensivo' },
    rx2: { id: 'E2E-RX-002', diagnosis: 'Derrame pleural extenso' },
    ecg: { id: 'E2E-ECG-001', diagnosis: 'Fibrilação atrial de alta resposta' },
    /** `attachment_eligible = false`: nunca deve aparecer no picker. */
    gasometria: { id: 'E2E-GASO-001', diagnosis: 'Acidose metabólica' },
  },
} as const;

/**
 * Autentica no backend e devolve o JWT.
 *
 * Falha com mensagem explícita se o usuário não existir: o sintoma natural
 * (401) não diz que o problema é o seed faltando, e é o erro mais provável
 * numa máquina que rodou `db reset` antes deste arquivo existir.
 */
export async function loginAs(user: E2EUser): Promise<string> {
  const { email } = E2E_USERS[user];
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: E2E_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(
      `\n[e2e] Login falhou para ${email} (HTTP ${res.status}).\n` +
        `      O seed de autenticação provavelmente não foi aplicado.\n` +
        `      Rode: npx supabase db reset   (na raiz do repo)\n`,
    );
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error(`[e2e] /login não devolveu token para ${email}`);
  return body.token;
}

/**
 * Deixa a página autenticada antes de qualquer navegação.
 *
 * `addInitScript` roda antes do bundle da app em toda navegação subsequente —
 * é o que garante que o `AuthProvider` já encontre o token no primeiro render.
 * Gravar via `page.evaluate` depois do `goto` levaria a app a montar deslogada
 * e redirecionar para o login antes de o token existir.
 */
export async function authenticate(page: Page, user: E2EUser): Promise<string> {
  const token = await loginAs(user);
  await page.addInitScript((value) => {
    window.localStorage.setItem('authToken', value);
  }, token);
  return token;
}

// ─── Acesso direto ao banco (service key) ────────────────────────────────────
// Chave demo fixa da Supabase CLI, idêntica em toda instalação local e válida
// só contra 127.0.0.1 — a mesma de `backend/.env.e2e`.
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/**
 * Cria uma tentativa direto no banco e devolve o `id`.
 *
 * Por que não usar `POST /api/cases/{id}/start`: aquele endpoint consome a
 * **cota diária** do aluno (2 por dia). A suíte deixaria de passar na terceira
 * execução do mesmo dia — falha intermitente que parece bug do produto e não é.
 * A tentativa aqui é fixture, não o objeto sob teste.
 */
export async function createAttempt(studentId: string, caseId: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/case_attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ case_id: caseId, student_id: studentId, status: 'in_progress' }),
  });
  if (!res.ok) throw new Error(`[e2e] falha ao criar tentativa: ${res.status} ${await res.text()}`);
  const [row] = (await res.json()) as Array<{ id: string }>;
  return row.id;
}

/** Remove a tentativa criada por `createAttempt`. */
export async function deleteAttempt(attemptId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/case_attempts?id=eq.${attemptId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

/** Chamada autenticada direta à API, para arrumar/checar estado sem passar pela UI. */
export async function apiFetch(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}
