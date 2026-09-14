import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const srcRoot = fileURLToPath(new URL('../../src/', import.meta.url));
const legacyFeatureDir = join(srcRoot, 'features', 'minigame');

test('local minigames remain available alongside the ZIP training features', () => {
  assert.equal(existsSync(legacyFeatureDir), true);
});

test('the router preserves local modules and adds the training entry', () => {
  const source = readFileSync(join(srcRoot, 'app/App.tsx'), 'utf8');
  for (const route of ['/minigame', '/play/*', '/puericultura', '/preNatal', '/questoes/unica', '/treinamento']) {
    assert.ok(source.includes(`path: '${route}'`), route);
  }
});
