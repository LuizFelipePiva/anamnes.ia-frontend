import { describe, expect, it } from 'vitest';
import type { QuestionBankItem } from '../types/question';
import { serializeQuestionsExport, toQuestionExportItems } from './questionExport';

const question: QuestionBankItem = {
  id: 'q-1',
  statement: 'Paciente com dor torácica. Qual a conduta?',
  options: { A: 'AAS', B: 'Alta' },
  correct_answer: 'A',
  explanation: 'Suspeita de SCA.',
  specialty: 'cardiologia',
  subspecialty: 'síndrome coronariana',
  image_url: 'https://example.test/image.png',
  created_at: '2026-09-07T12:00:00Z',
};

describe('question export', () => {
  it('exporta somente os campos compatíveis com a importação', () => {
    expect(toQuestionExportItems([question])).toEqual([
      {
        statement: question.statement,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        specialty: question.specialty,
        subspecialty: question.subspecialty,
      },
    ]);
  });

  it('não inclui id, created_at nem image_url no JSON exportado', () => {
    const [item] = JSON.parse(serializeQuestionsExport([question])) as Array<Record<string, unknown>>;

    expect(item).not.toHaveProperty('id');
    expect(item).not.toHaveProperty('created_at');
    expect(item).not.toHaveProperty('image_url');
  });
});
