/** Questão como o aluno vê — o gabarito nunca chega ao browser antes da resposta. */
export interface Question {
  id: string;
  statement: string;
  options: Record<string, string>;
  specialty: string;
  subspecialty: string;
  image_url: string | null;
  created_at?: string;
}

/** Resultado da correção de uma resposta (retornado pelo backend). */
export interface QuestionAnswerResult {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
}

/** Questão completa (admin) — inclui gabarito. */
export interface QuestionBankItem extends Question {
  correct_answer: string;
  explanation: string | null;
}

/** Payload de criação/edição de questão (admin). */
export interface QuestionPayload {
  statement: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  specialty: string;
  subspecialty: string;
  image_url: string | null;
}
