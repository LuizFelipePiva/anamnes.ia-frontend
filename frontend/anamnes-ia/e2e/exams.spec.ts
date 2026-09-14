/**
 * SPEC-014 §13 — exames complementares de ponta a ponta.
 *
 * Stack real: FastAPI + Supabase local, sem mock nenhum. É o único nível em
 * que a autorização, o join e a serialização acontecem juntos — os testes com
 * Supabase mockado (pytest) provam a regra, não a fiação.
 *
 * ⚠️ Recorte deliberado: estes specs exercitam a API e o banco de verdade, não
 * o DOM do chat. Abrir o visualizador pela UI exigiria uma tentativa com
 * conversa viva, e a primeira mensagem do paciente passa pela OpenAI — que
 * `backend/.env.e2e` desliga de propósito (chave dummy). As asserções de DOM
 * do visualizador estão em `ExamViewer.test.tsx` (T12.2–T12.5), que renderiza
 * o componente de verdade; o que faltaria aqui seria a navegação, não a regra.
 *
 * Pré-requisitos: `npx supabase start`, `supabase db reset` (aplica
 * `seed_e2e.sql`) e o backend com `--env-file .env.e2e`. Ver `e2e/README.md`.
 */
import { test, expect } from '@playwright/test';

import {
  E2E_FIXTURES,
  E2E_USERS,
  apiFetch,
  authenticate,
  createAttempt,
  deleteAttempt,
  loginAs,
} from './fixtures/auth';

const { caseId, assets } = E2E_FIXTURES;

/** Estado limpo antes de cada spec: nenhum exame anexado ao caso. */
async function clearExams(teacherToken: string) {
  const res = await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
    method: 'PUT',
    body: JSON.stringify({ asset_ids: [] }),
  });
  expect(res.status).toBe(200);
}

test.describe('Exames complementares (SPEC-014 §13)', () => {
  let teacherToken: string;

  test.beforeAll(async () => {
    teacherToken = await loginAs('teacher');
  });

  test.beforeEach(async () => {
    await clearExams(teacherToken);
  });

  test.afterAll(async () => {
    await clearExams(teacherToken);
  });

  test('T13.1 — o professor anexa dois exames e eles persistem de verdade', async () => {
    const put = await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.rx1.id, assets.ecg.id] }),
    });
    expect(put.status).toBe(200);

    // Releitura numa requisição nova: se só o estado do React tivesse mudado,
    // ou se o insert tivesse falhado em silêncio, isto viria vazio.
    const get = await apiFetch(teacherToken, `/cases/${caseId}/exams`);
    const body = (await get.json()) as Array<{ id: string }>;
    expect(body.map((item) => item.id)).toEqual([assets.rx1.id, assets.ecg.id]);
  });

  test('T13.2 — o aluno da turma recebe os exames com rótulo neutro e numeração', async () => {
    await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.rx1.id, assets.rx2.id, assets.ecg.id] }),
    });

    const studentToken = await loginAs('student');
    const attemptId = await createAttempt(E2E_USERS.student.id, caseId);

    try {
      const res = await apiFetch(studentToken, `/attempts/${attemptId}/exams`);
      expect(res.status).toBe(200);

      const exams = (await res.json()) as Array<{
        id?: string; label: { key: string; ordinal: number | null };
      }>;

      // A conferência é por rótulo, e não por id: o aluno **não** recebe
      // identificador — os do acervo são falantes (`RX-PNEUMO-001`) e
      // entregavam o diagnóstico na aba Network.
      expect(exams.every((e) => e.id === undefined)).toBe(true);
      // Duas radiografias no mesmo caso → numeradas; o ECG, único, não.
      expect(exams.map((e) => e.label)).toEqual([
        { key: 'exams.modality.radiografia', ordinal: 1 },
        { key: 'exams.modality.radiografia', ordinal: 2 },
        { key: 'exams.modality.ecg', ordinal: null },
      ]);
    } finally {
      await deleteAttempt(attemptId);
    }
  });

  test('T13.3 — nada do que chega ao aluno contém o diagnóstico', async () => {
    await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.rx1.id, assets.ecg.id] }),
    });

    const studentToken = await loginAs('student');
    const attemptId = await createAttempt(E2E_USERS.student.id, caseId);

    try {
      const res = await apiFetch(studentToken, `/attempts/${attemptId}/exams`);
      // Corpo cru, não o JSON parseado: pega vazamento em qualquer campo,
      // inclusive um que nem exista no tipo ainda.
      const raw = (await res.text()).toLowerCase();

      expect(raw).not.toContain('pneumot');
      expect(raw).not.toContain('fibrila');
      expect(raw).not.toContain('display_name');
      expect(raw).not.toContain('diagnosis');
      // Nem o identificador: no acervo real ele é o diagnóstico abreviado
      // (`RX-PNEUMO-001`), então mandá-lo anulava todo o resto.
      expect(raw).not.toContain('"id"');
      expect(raw).not.toContain(assets.rx1.id.toLowerCase());
    } finally {
      await deleteAttempt(attemptId);
    }
  });

  test('T13.4 — aluno de fora que força a URL da tentativa não recebe os exames', async () => {
    await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.rx1.id] }),
    });

    // A tentativa é do aluno matriculado; quem chama é outro aluno, autenticado
    // e legítimo — exatamente o cenário que mock de rede não consegue montar.
    const attemptId = await createAttempt(E2E_USERS.student.id, caseId);
    const outsiderToken = await loginAs('outsider');

    try {
      const res = await apiFetch(outsiderToken, `/attempts/${attemptId}/exams`);
      expect(res.status).toBe(403);
      expect((await res.text()).toLowerCase()).not.toContain('pneumot');
    } finally {
      await deleteAttempt(attemptId);
    }
  });

  test('T13.5 — remover um exame reflete na visão do aluno', async () => {
    await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.rx1.id, assets.ecg.id] }),
    });

    const studentToken = await loginAs('student');
    const attemptId = await createAttempt(E2E_USERS.student.id, caseId);

    try {
      const antes = await (await apiFetch(studentToken, `/attempts/${attemptId}/exams`)).json();
      expect(antes).toHaveLength(2);

      await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
        method: 'PUT',
        body: JSON.stringify({ asset_ids: [assets.ecg.id] }),
      });

      const depois = (await (await apiFetch(studentToken, `/attempts/${attemptId}/exams`)).json()) as Array<{
        label: { key: string };
      }>;
      // Sobrou o ECG: identificado pelo rótulo, que é tudo o que o aluno recebe.
      expect(depois.map((e) => e.label.key)).toEqual(['exams.modality.ecg']);
    } finally {
      await deleteAttempt(attemptId);
    }
  });

  test('o exame inelegível não entra no catálogo nem pode ser anexado', async () => {
    const catalogo = (await (await apiFetch(teacherToken, '/medical-assets')).json()) as Array<{ id: string }>;
    expect(catalogo.map((a) => a.id)).not.toContain(assets.gasometria.id);

    const res = await apiFetch(teacherToken, `/cases/${caseId}/exams`, {
      method: 'PUT',
      body: JSON.stringify({ asset_ids: [assets.gasometria.id] }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('asset_not_attachable');
  });

  test('o catálogo é negado ao aluno — ele expõe o gabarito do acervo inteiro', async () => {
    const studentToken = await loginAs('student');
    const res = await apiFetch(studentToken, '/medical-assets');
    expect(res.status).toBe(403);
  });
});

test.describe('Sessão E2E', () => {
  test('o login programático entrega uma sessão que a app reconhece', async ({ page }) => {
    // Guarda o próprio fixture de autenticação: se `authenticate` parar de
    // funcionar, os specs acima falhariam por "403" e o diagnóstico apontaria
    // para a autorização, que estaria certa.
    await authenticate(page, 'student');
    await page.goto('/mainpage');

    await expect(page).not.toHaveURL(/\/login/);
  });
});
