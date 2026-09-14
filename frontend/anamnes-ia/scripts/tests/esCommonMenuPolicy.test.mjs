import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const commonPath = new URL('../../src/locales/es/common.json', import.meta.url);

async function loadCommon() {
  return JSON.parse(await readFile(commonPath, 'utf8'));
}

test('Spanish common menu exposes integrated navigation labels', async () => {
  const common = await loadCommon();

  assert.equal(common.menu.simulados, 'Simulacros');
  assert.equal(common.menu.treinamento, 'Entrenamiento');
  assert.equal(common.menu.trilhas, 'Rutas de aprendizaje');
  assert.equal(common.menu.questoes, 'Banco de preguntas');
});

test('Spanish common menu preserves the local minigame label', async () => {
  const common = await loadCommon();
  assert.equal(Object.hasOwn(common.menu, 'minigame'), true);
});
