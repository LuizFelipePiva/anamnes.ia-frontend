import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../../src/locales/ru/admin.json', import.meta.url);
const ruAdmin = JSON.parse(fs.readFileSync(path, 'utf8'));

test('keeps the complete master Russian admin namespace', () => {
  assert.equal(ruAdmin.questions.title, 'Банк вопросов');
  assert.equal(ruAdmin.flashcards.decks.title, 'Все наборы');
  assert.equal(ruAdmin.panel.nav.overview, 'Обзор');
});

test('preserves the active question-admin keys contributed by Simulados', () => {
  assert.equal(ruAdmin.questions.export, 'Экспортировать JSON');
  assert.equal(ruAdmin.questions.back_panel, 'Главная панель');
  assert.equal(ruAdmin.questions.subtitle, 'Организуйте контент быстрее и держите материал всегда в порядке.');
});
