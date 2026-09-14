import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const target = process.env.RU_NAVIGATOR_FILE || path.resolve('src/locales/ru/navigator.json');
const data = JSON.parse(fs.readFileSync(target, 'utf8'));

test('keeps the active navigator translations from master', () => {
  assert.equal(typeof data.title, 'string');
  assert.equal(typeof data.anamnesis?.title, 'string');
  assert.equal(typeof data.anamnesis?.description, 'string');
});

test('preserves local minigame translations', () => {
  assert.equal(Object.hasOwn(data, 'minigame'), true);
});
