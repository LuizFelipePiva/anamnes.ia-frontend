import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/shared/components/MainMenu.tsx', import.meta.url), 'utf8');

test('uses Training as the entry for simulated exams alongside the question hub', () => {
  assert.match(source, /labelKey:\s*'menu\.treinamento'[\s\S]*?route:\s*'\/treinamento'/);
  assert.doesNotMatch(source, /labelKey:\s*'menu\.simulados'[\s\S]*?route:\s*'\/simulados'/);
  assert.match(source, /labelKey:\s*'menu\.questoes'[\s\S]*?route:\s*'\/questoes'/);
});

test('keeps Learning Paths as a dedicated navigation entry', () => {
  assert.match(source, /labelKey:\s*'menu\.trilhas'[\s\S]*?route:\s*'\/trilhas'/);
});

test('Training stays active while browsing its child flows', () => {
  assert.match(source, /activeRoutes:\s*\[[^\]]*'\/treinamento'[^\]]*'\/simulados'[^\]]*\]/s);
});

test('preserves Minigame navigation', () => {
  assert.match(source, /menu\.minigame|route:\s*'\/minigame'|Gamepad2/);
});
