import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const defaultPath = new URL('../../src/locales/ru/case.json', import.meta.url);
const localePath = process.env.RU_CASE_LOCALE_PATH || defaultPath;
const ruCase = JSON.parse(fs.readFileSync(localePath, 'utf8'));

function flatten(value, prefix = '', result = {}) {
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      flatten(nested, path, result);
    } else {
      result[path] = nested;
    }
  }
  return result;
}

test('keeps the complete Russian case/exam namespace from master', () => {
  const flattened = flatten(ruCase);

  assert.ok(Object.keys(flattened).length >= 72);
  assert.equal(ruCase.exams.picker.title, 'Прикрепить дополнительные исследования');
  assert.equal(ruCase.exams.viewer.title, 'Дополнительные исследования');
  assert.equal(ruCase.exams.modality.ecg, 'Электрокардиограмма');
  assert.equal(ruCase.exams.modality.tomografia, 'Компьютерная томография');
});

test('preserves the original case translations shared with Simulados', () => {
  assert.equal(ruCase.header_title, 'Клинические случаи');
  assert.equal(ruCase.action.start, 'Начать случай');
  assert.equal(ruCase.chief_complaint, 'Основная жалоба');
});
