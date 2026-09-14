import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const file = path.join(root, 'src/features/teacher/components/CaseForm.tsx');
const source = fs.readFileSync(file, 'utf8');

test('CaseForm preserves master clinical safeguards and exam architecture', () => {
  assert.match(source, /ExamPicker/);
  assert.match(source, /soap_weights/);
  assert.match(source, /exame_fisico/);
  assert.match(source, /ComplementaryExamModal/);
  assert.match(source, /SPECIALTIES/);
  assert.match(source, /specialtyLabel/);
  assert.match(source, /useTranslation\('teacher'\)/);
  assert.doesNotMatch(source, /ExamSuggestionsModal/);
});

test('CaseForm preserves local chip editors for clinical fields', () => {
  assert.match(source, /import ChipInput from ['"]\.\/ChipInput['"]/);

  for (const field of ['sintomas', 'especificidades', 'historico_familiar', 'habitos']) {
    const pattern = new RegExp(`<ChipInput[\\s\\S]{0,240}value=\\{form\\.${field}\\}[\\s\\S]{0,240}up\\('${field}'`, 'm');
    assert.match(source, pattern, `${field} should use ChipInput`);
  }

});
