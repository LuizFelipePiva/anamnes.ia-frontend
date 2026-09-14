import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const commonPath = new URL('../../src/locales/en/common.json', import.meta.url);

async function loadCommon() {
  return JSON.parse(await readFile(commonPath, 'utf8'));
}

test('English common menu exposes integrated navigation labels', async () => {
  const common = await loadCommon();

  assert.equal(common.menu.simulados, 'Mock Exams');
  assert.equal(common.menu.treinamento, 'Training');
  assert.equal(common.menu.trilhas, 'Learning Paths');
  assert.equal(common.menu.questoes, 'Question Bank');
});

test('English common menu preserves the local minigame label', async () => {
  const common = await loadCommon();
  assert.equal(Object.hasOwn(common.menu, 'minigame'), true);
});
