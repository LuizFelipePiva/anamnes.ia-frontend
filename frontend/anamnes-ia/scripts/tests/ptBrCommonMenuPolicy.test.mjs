import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const commonPath = new URL('../../src/locales/pt-BR/common.json', import.meta.url);

async function loadCommon() {
  return JSON.parse(await readFile(commonPath, 'utf8'));
}

test('Brazilian Portuguese common menu exposes integrated navigation labels', async () => {
  const common = await loadCommon();

  assert.equal(common.menu.simulados, 'Simulados');
  assert.equal(common.menu.treinamento, 'Treinamento');
  assert.equal(common.menu.trilhas, 'Trilhas de aprendizagem');
  assert.equal(common.menu.questoes, 'Banco de Questões');
});

test('Brazilian Portuguese common menu preserves the local minigame label', async () => {
  const common = await loadCommon();
  assert.equal(Object.hasOwn(common.menu, 'minigame'), true);
});
