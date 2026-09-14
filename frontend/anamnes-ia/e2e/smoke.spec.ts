import { expect, test } from '@playwright/test';

/**
 * Smoke da própria infra de E2E — não testa regra de negócio.
 *
 * Serve para responder "o Playwright está de pé e falando com a stack?" sem
 * depender de seed de autenticação. Quando um spec de feature falhar, rode
 * este antes: se ele passar, o problema é a feature; se falhar, é ambiente.
 */
test.describe('smoke da infra', () => {
  test('a aplicação carrega na rota pública', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/anamnes/i);
  });

  test('a tela de login renderiza os campos de credencial', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /e-?mail/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('rota protegida sem sessão redireciona para o login', async ({ page }) => {
    await page.goto('/mainpage');
    await expect(page).toHaveURL(/\/$/);
  });

  test('o backend responde ao health check', async ({ request }) => {
    const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api';
    const res = await request.get(`${apiUrl}/health`);
    expect(res.ok()).toBeTruthy();
  });
});
