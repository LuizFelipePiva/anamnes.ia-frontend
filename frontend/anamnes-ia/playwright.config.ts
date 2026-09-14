import { defineConfig, devices } from '@playwright/test';

/**
 * E2E com **stack completa real** (decisão de 2026-08-13, SPEC-014):
 * Supabase local (CLI) + FastAPI + Vite. Nada de mock de rede — o objetivo é
 * exercitar RLS e autorização de verdade, que é justamente o que os testes de
 * componente não alcançam.
 *
 * Supabase e backend **não** são subidos por aqui: são processos de outro
 * runtime (Docker/Python) e embuti-los no `webServer` do Playwright tornaria a
 * falha ilegível ("timeout") quando o problema real é `supabase start` ou uma
 * migration pendente. `global-setup.ts` checa os dois e falha com instrução.
 * Só o Vite sobe automaticamente.
 *
 * Ver `e2e/README.md` para o passo a passo.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Banco compartilhado entre os specs: paralelismo vira corrida por linha.
  // Se a suíte crescer a ponto de doer, o caminho é isolar por usuário/turma
  // no seed, não aumentar workers às cegas.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
