import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const defaultStudentChat = resolve(here, '../../src/features/chat/pages/StudentChat.tsx');
const studentChatPath = process.env.STUDENT_CHAT_SOURCE || defaultStudentChat;
const source = readFileSync(studentChatPath, 'utf8');

test('StudentChat keeps exam data behind attempt-scoped backend access', () => {
  assert.match(source, /<ExamViewer\s+attemptId=\{resolvedAttempt\.attemptId\}\s*\/>/);
  assert.doesNotMatch(source, /\bform_data\b/);
  assert.doesNotMatch(source, /\bcasePatologia\b/);
  assert.doesNotMatch(source, /\bpathologySpecific\b/);
  assert.doesNotMatch(source, /\bpatologia\s*=/);
  assert.match(source, /physical_exam/);
});

test('StudentChat preserves specialty selection, i18n and SOAP breakdown', () => {
  assert.match(source, /useTranslation\(['"]chat['"]\)/);
  assert.match(source, /\bSPECIALTIES\b/);
  assert.match(source, /\bspecialtyLabel\b/);
  assert.match(source, /\bSoapBreakdown\b/);
  assert.match(source, /startAiChat\(selectedSpecialty\s*\|\|\s*undefined\)/);
});
