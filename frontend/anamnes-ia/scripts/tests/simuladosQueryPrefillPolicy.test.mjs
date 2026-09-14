import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(
  new URL('../../src/features/simulados/pages/SimuladosListPage.tsx', import.meta.url),
  'utf8',
);

test('SimuladosListPage lê specialty e intent da query string', () => {
  assert.match(source, /useSearchParams/);
  assert.match(source, /searchParams\.get\(['"]specialty['"]\)/);
  assert.match(source, /searchParams\.get\(['"]intent['"]\)\s*===\s*['"]create['"]/);
});

test('specialty da URL é validada contra as opções do banco antes do prefill', () => {
  assert.match(source, /data\.specialties\.includes\(requestedSpecialty\)/);
  assert.match(source, /specialties:\s*\[validRequestedSpecialty\]/);
  assert.match(source, /setDrillEsp\(validRequestedSpecialty\)/);
  assert.match(source, /setActivePanel\(['"]ger['"]\)/);
  assert.match(source, /countAvailableQuestions\(initialForm\)/);
});
