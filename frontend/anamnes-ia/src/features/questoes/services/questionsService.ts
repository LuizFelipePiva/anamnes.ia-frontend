import { authFetch } from '@/core/utils/authFetch';
import type {
  Question,
  QuestionAnswerResult,
  QuestionBankItem,
  QuestionPayload,
} from '../types/question';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as { detail?: string }).detail ?? fallback);
}

// ── Aluno ─────────────────────────────────────────────────────────────────────

export async function fetchQuestions(limit = 50, offset = 0): Promise<Question[]> {
  const res = await authFetch(`${BASE}/questions?limit=${limit}&offset=${offset}`);
  if (!res.ok) return parseError(res, 'Erro ao buscar questões');
  return res.json();
}

export async function answerQuestion(
  questionId: string,
  answer: string
): Promise<QuestionAnswerResult> {
  const res = await authFetch(`${BASE}/questions/${questionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) return parseError(res, 'Erro ao corrigir a resposta');
  return res.json();
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminFetchQuestions(): Promise<QuestionBankItem[]> {
  const res = await authFetch(`${BASE}/questions/admin`);
  if (!res.ok) return parseError(res, 'Erro ao buscar questões');
  return res.json();
}

export async function adminCreateQuestion(data: QuestionPayload): Promise<QuestionBankItem> {
  const res = await authFetch(`${BASE}/questions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res, 'Erro ao criar questão');
  return res.json();
}

export async function adminUpdateQuestion(
  id: string,
  data: Partial<QuestionPayload>
): Promise<QuestionBankItem> {
  const res = await authFetch(`${BASE}/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res, 'Erro ao atualizar questão');
  return res.json();
}

export async function adminDeleteQuestion(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/questions/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) return parseError(res, 'Erro ao deletar questão');
}

export async function adminImportQuestions(
  items: Record<string, unknown>[]
): Promise<{ imported: number }> {
  const res = await authFetch(`${BASE}/questions/import`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) return parseError(res, 'Erro ao importar questões');
  return res.json();
}

export async function adminUploadQuestionImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // Não definir Content-Type manualmente: o browser gera o boundary do multipart.
  const res = await authFetch(`${BASE}/questions/images`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) return parseError(res, 'Erro ao subir a imagem');
  const data: { image_url: string } = await res.json();
  return data.image_url;
}
