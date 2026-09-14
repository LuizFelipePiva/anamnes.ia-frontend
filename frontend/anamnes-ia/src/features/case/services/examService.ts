/**
 * Camada de API dos exames complementares (SPEC-014).
 *
 * Três endpoints, três públicos:
 *  - `fetchMedicalAssets` / `fetchCaseExams` / `saveCaseExams` → professor (com gabarito)
 *  - `fetchAttemptExams` → aluno (sem gabarito)
 *
 * A chamada do aluno é ancorada na **tentativa**, não no caso: quem tem
 * tentativa aberta já provou que podia acessar aquele caso.
 */
import { config } from '@/config/env';
import { authFetch } from '@/core/utils/authFetch';

import type { MedicalAsset, StudentExam } from '../types/exams';

const api = (path: string) => `${config.apiUrl}${path}`;

/** Catálogo completo de exames anexáveis (o front filtra em memória). */
export async function fetchMedicalAssets(modality?: string): Promise<MedicalAsset[]> {
  const query = modality ? `?modality=${encodeURIComponent(modality)}` : '';
  const res = await authFetch(api(`/medical-assets${query}`));
  if (!res.ok) throw new Error('Erro ao carregar o catálogo de exames');
  return res.json();
}

/** Exames já anexados ao caso, na visão do professor. */
export async function fetchCaseExams(caseId: string): Promise<MedicalAsset[]> {
  const res = await authFetch(api(`/cases/${caseId}/exams`));
  if (!res.ok) throw new Error('Erro ao carregar os exames do caso');
  return res.json();
}

/**
 * Substitui o conjunto anexado ao caso. A ordem da lista vira a ordem exibida.
 *
 * Substituição em vez de anexar/desanexar item a item: o cliente manda o
 * estado desejado inteiro, então reenviar não duplica nada e não há como as
 * duas pontas divergirem.
 */
export async function saveCaseExams(
  caseId: string,
  assetIds: string[],
): Promise<MedicalAsset[]> {
  const res = await authFetch(api(`/cases/${caseId}/exams`), {
    method: 'PUT',
    body: JSON.stringify({ asset_ids: assetIds }),
  });
  if (!res.ok) throw new Error('Erro ao salvar os exames do caso');
  return res.json();
}

/** Exames da tentativa, na visão do aluno — sem diagnóstico. */
export async function fetchAttemptExams(attemptId: string): Promise<StudentExam[]> {
  const res = await authFetch(api(`/attempts/${attemptId}/exams`));
  if (!res.ok) throw new Error('Erro ao carregar os exames');
  return res.json();
}
