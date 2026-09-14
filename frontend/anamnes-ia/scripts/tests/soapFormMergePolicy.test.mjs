import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const soapFormPath = process.env.SOAP_FORM_PATH
  ? path.resolve(process.env.SOAP_FORM_PATH)
  : path.join(repoRoot, 'src/shared/components/SoapForm.tsx');
const source = fs.readFileSync(soapFormPath, 'utf8');

test('SoapForm preserves i18n validation and plain SOAP submission contract', () => {
  assert.match(source, /useTranslation\(['"]common['"]\)/);
  assert.match(source, /errorKey/);
  assert.match(source, /soap\.fill_all/);
  assert.match(source, /S: \$\{fields\.S\}\\nO: \$\{fields\.O\}\\nA: \$\{assessmentText\}\\nP: \$\{fields\.P\}/);
});

test('SoapForm does not receive or derive hidden case answers in the browser', () => {
  const forbidden = [
    'SUGGESTIONS_DATA',
    'pathologySpecific',
    'patologia?:',
  ];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden clinical-answer coupling found: ${token}`);
  }
});

test('SoapForm connects clinical helpers to the SOAP form', () => {
  assert.match(source, /CID10Modal/);
  assert.match(source, /onExamsSelected/);
  assert.match(source, /onConfirm=\{prescription/);
  const forbidden = [
  ];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden/deferred integration found: ${token}`);
  }
});
