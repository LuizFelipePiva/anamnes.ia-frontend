import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const target = process.env.RU_TEACHER_FILE || path.resolve('src/locales/ru/teacher.json');
const data = JSON.parse(fs.readFileSync(target, 'utf8'));

function flatten(value, prefix = '', result = {}) {
  for (const [key, nested] of Object.entries(value)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      flatten(nested, keyPath, result);
    } else {
      result[keyPath] = nested;
    }
  }
  return result;
}

test('keeps the complete Russian teacher locale from master', () => {
  const flattened = flatten(data);
  assert.ok(Object.keys(flattened).length >= 357);
  assert.equal(
    data.caseForm?.err_exams,
    'Случай сохранён, но произошла ошибка при прикреплении дополнительных исследований.',
  );
});

test('preserves representative teacher translations shared with Simulados', () => {
  assert.equal(typeof data.caseForm?.save_case, 'string');
  assert.equal(typeof data.caseForm?.err_save, 'string');
  assert.equal(typeof data.caseForm?.err_update, 'string');
});
