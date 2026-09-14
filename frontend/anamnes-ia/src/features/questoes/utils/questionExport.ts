import type { QuestionBankItem } from '../types/question';

/** Campos aceitos pelo importador em lote de questões. */
export interface QuestionExportItem {
  statement: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  specialty: string;
  subspecialty: string;
}

/**
 * Converte o modelo administrativo em um formato seguro para backup/importação.
 * IDs, timestamps e URLs de imagem não são exportados porque não fazem parte
 * do contrato atual de reimportação do backend.
 */
export function toQuestionExportItems(
  questions: readonly QuestionBankItem[],
): QuestionExportItem[] {
  return questions.map((question) => ({
    statement: question.statement,
    options: { ...question.options },
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    specialty: question.specialty,
    subspecialty: question.subspecialty,
  }));
}

export function serializeQuestionsExport(
  questions: readonly QuestionBankItem[],
): string {
  return JSON.stringify(toQuestionExportItems(questions), null, 2);
}
