import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const common = JSON.parse(
  await readFile(new URL('../../src/locales/ru/common.json', import.meta.url), 'utf8'),
);

test('preserva a navegação atual e adiciona apenas as entradas novas usadas', () => {
  assert.equal(common.menu.simulados, 'Пробные экзамены');
  assert.equal(common.menu.treinamento, 'Тренировка');
  assert.equal(common.menu.trilhas, 'Маршруты обучения');
  assert.equal(common.menu.questoes, 'Банк вопросов');
});

test('não reintroduz chaves legadas de Simulados e preserva a home moderna da master', () => {
  assert.equal(Object.hasOwn(common.menu, 'minigame'), true);
  assert.equal(Object.hasOwn(common.home, 'week_summary'), false);
  assert.equal(common.home.summary.title, 'ИТОГИ НЕДЕЛИ');
  assert.equal(common.home.mastery.title, 'ВЛАДЕНИЕ ПО СПЕЦИАЛЬНОСТЯМ');
  assert.equal(common.home.soap.title, 'ПРОФИЛЬ SOAP');
});
