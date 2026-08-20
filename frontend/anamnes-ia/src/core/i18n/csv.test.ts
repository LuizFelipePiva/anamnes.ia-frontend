import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  flatten,
  unflatten,
  toCsv,
  parseCsv,
  dictsToRows,
  rowsToDicts,
  validateImport,
  escapeFormulaCell,
  unescapeFormulaCell,
  detectSeparator,
  resolveNamespaces,
  writeDictsAtomic,
  rowsToStatus,
} from '../../../scripts/i18nCsv.mjs';

import ptAuth from '@/locales/pt-BR/auth.json';
import enAuth from '@/locales/en/auth.json';
import esAuth from '@/locales/es/auth.json';
import ruAuth from '@/locales/ru/auth.json';

// T9 — roundtrip export → (editar) → import preserva estrutura e paridade.
describe('CSV roundtrip (T9)', () => {
  it('flatten/unflatten são inversos', () => {
    expect(unflatten(flatten(ptAuth))).toEqual(ptAuth);
  });

  it('parseCsv é inverso de toCsv (inclui vírgulas, aspas e quebras de linha)', () => {
    const rows = [
      ['namespace', 'key', 'pt-BR'],
      ['auth', 'x', 'texto, com vírgula'],
      ['auth', 'y', 'com "aspas" dentro'],
      ['auth', 'z', 'linha1\nlinha2'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('dicts → CSV → dicts reconstrói os dicionários originais', () => {
    const dicts = { 'pt-BR': { auth: ptAuth }, en: { auth: enAuth }, es: { auth: esAuth }, ru: { auth: ruAuth } };
    const csv = toCsv(dictsToRows(dicts, ['auth']));
    const { dicts: back } = rowsToDicts(parseCsv(csv), {});
    expect(back['pt-BR'].auth).toEqual(ptAuth);
    expect(back.en.auth).toEqual(enAuth);
    expect(back.es.auth).toEqual(esAuth);
    expect(back.ru.auth).toEqual(ruAuth);
  });

  it('editar um valor no CSV reflete só naquela chave', () => {
    const dicts = { 'pt-BR': { auth: ptAuth }, en: { auth: enAuth }, es: { auth: esAuth }, ru: { auth: ruAuth } };
    const rows = dictsToRows(dicts, ['auth']);
    const header = rows[0];
    const enCol = header.indexOf('en');
    const target = rows.find((r) => r[1] === 'login.submit');
    if (!target) throw new Error('chave login.submit não encontrada');
    target[enCol] = 'Log in';
    const { dicts: back } = rowsToDicts(rows, {});
    expect((back.en.auth as typeof enAuth).login.submit).toBe('Log in');
    expect((back['pt-BR'].auth as typeof ptAuth).login.submit).toBe(ptAuth.login.submit);
  });
});

// SPEC-009 §6 — tabela de comportamento (16 casos).
describe('SPEC-009 — ferramental CSV recortável', () => {
  // #1 — RF5: união das chaves, days_few (só em ru) aparece logo após days_one/days_other.
  it('#1 export inclui days_few que só existe em ru, agrupado após a chave-base', () => {
    const dicts = {
      'pt-BR': { chat: { days_one: '{{count}} dia', days_other: '{{count}} dias' } },
      en: { chat: { days_one: '{{count}} day', days_other: '{{count}} days' } },
      es: { chat: { days_one: '{{count}} día', days_other: '{{count}} días' } },
      ru: {
        chat: {
          days_one: '{{count}} день',
          days_other: '{{count}} дней',
          days_few: '{{count}} дня',
          days_many: '{{count}} дней',
        },
      },
    };
    const rows = dictsToRows(dicts, ['chat'], { langs: ['pt-BR', 'en', 'es', 'ru'] });
    const keys = rows.slice(1).map((r) => r[1]);
    expect(keys).toEqual(['days_one', 'days_other', 'days_few', 'days_many']);
  });

  // #2 — mesma união, agora verificando que o roundtrip não apaga days_few.
  it('#2 roundtrip preserva days_few presente só em ru', () => {
    const dicts = {
      'pt-BR': { chat: { days_one: 'a', days_other: 'b' } },
      en: { chat: { days_one: 'a', days_other: 'b' } },
      es: { chat: { days_one: 'a', days_other: 'b' } },
      ru: { chat: { days_one: 'a', days_other: 'b', days_few: 'c', days_many: 'd' } },
    };
    const rows = dictsToRows(dicts, ['chat'], { langs: ['pt-BR', 'en', 'es', 'ru'] });
    const { dicts: back } = rowsToDicts(rows, {});
    expect(back.ru.chat).toEqual(dicts.ru.chat);
  });

  // #3 — RF6: célula vazia não apaga/zera a chave existente.
  it('#3 célula vazia no import não altera a chave existente', () => {
    const existingDicts = { ru: { chat: { greeting: 'Привет' } } };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', ''],
    ];
    const { dicts: back } = rowsToDicts(rows, existingDicts);
    expect(back.ru.chat.greeting).toBe('Привет');
  });

  // #4 — RF4: header lido por nome, não por posição.
  it('#4 colunas reordenadas no CSV são lidas corretamente pelo header', () => {
    const rows = [
      ['namespace', 'key', 'ru', 'en'], // 'ru' antes de 'en' — ordem trocada
      ['chat', 'greeting', 'Привет', 'Hello'],
    ];
    const { dicts: back } = rowsToDicts(rows, {});
    expect(back.ru.chat.greeting).toBe('Привет');
    expect(back.en.chat.greeting).toBe('Hello');
  });

  // #5 — RF2: coluna ref:<lang> é somente leitura, ignorada no import mesmo se editada.
  it('#5 coluna ref:pt-BR editada pelo revisor é ignorada no import', () => {
    const rows = [
      ['namespace', 'key', 'ref:pt-BR', 'ru'],
      ['chat', 'greeting', 'Oi (editado por engano)', 'Привет'],
    ];
    const { dicts: back } = rowsToDicts(rows, {});
    expect(back['pt-BR']).toBeUndefined();
    expect(back.ru.chat.greeting).toBe('Привет');
  });

  // #6 — RF6: CSV recortado por namespace não apaga outros namespaces no merge.
  it('#6 CSV recortado (--ns chat) não apaga o namespace admin existente', () => {
    const existingDicts = {
      ru: { chat: { greeting: 'old' }, admin: { title: 'Админ' } },
    };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', 'novo'],
    ];
    const { dicts: back } = rowsToDicts(rows, existingDicts);
    expect(back.ru.chat.greeting).toBe('novo');
    expect(back.ru.admin.title).toBe('Админ');
  });

  // #7 — RF6: linha ausente do CSV preserva a chave (não é apagada por omissão).
  it('#7 linha ausente do CSV preserva a chave em existingDicts', () => {
    const existingDicts = { ru: { chat: { greeting: 'Привет', farewell: 'Пока' } } };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', 'Привет'],
      // 'farewell' não aparece no CSV
    ];
    const { dicts: back } = rowsToDicts(rows, existingDicts);
    expect(back.ru.chat.farewell).toBe('Пока');
  });

  // #8 — RF6: <DELETE> sem --allow-delete é erro, nada é gravado.
  it('#8 <DELETE> sem allowDelete gera erro de validação e não altera nada', () => {
    const existingDicts = { ru: { chat: { greeting: 'Привет' } } };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', '<DELETE>'],
    ];
    const { errors } = validateImport(rows, existingDicts, { allowDelete: false });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/allow-delete/i);
  });

  it('#8b <DELETE> com allowDelete remove a chave', () => {
    const existingDicts = { ru: { chat: { greeting: 'Привет' } } };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', '<DELETE>'],
    ];
    const { dicts: back } = rowsToDicts(rows, existingDicts, { allowDelete: true });
    expect(back.ru.chat.greeting).toBeUndefined();
  });

  // #9 — RF8.2: tradução que perde {{count}} do pt-BR aborta a validação.
  it('#9 tradução sem {{count}} presente no pt-BR aborta com erro', () => {
    const existingDicts = { 'pt-BR': { chat: { days_one: '{{count}} dia' } } };
    const rows = [
      ['namespace', 'key', 'ref:pt-BR', 'ru'],
      ['chat', 'days_one', '{{count}} dia', 'один день'], // perdeu {{count}}
    ];
    const { errors } = validateImport(rows, existingDicts, {});
    expect(errors.some((e) => /interpola/i.test(e) || /\{\{count\}\}/.test(e))).toBe(true);
  });

  // #10 — RF8.3: valor não-string (array) no dicionário de origem aborta o export.
  it('#10 dicionário com array aborta o export com o caminho da chave', () => {
    const dicts = { 'pt-BR': { chat: { tips: ['a', 'b'] } } };
    expect(() => dictsToRows(dicts, ['chat'], { langs: ['pt-BR'] })).toThrow(/chat\.tips/);
  });

  // #11 — RF5: determinismo, dois exports seguidos são idênticos byte a byte.
  it('#11 dois exports seguidos produzem CSV idêntico', () => {
    const dicts = { 'pt-BR': { auth: ptAuth }, en: { auth: enAuth }, es: { auth: esAuth }, ru: { auth: ruAuth } };
    const csv1 = toCsv(dictsToRows(dicts, ['auth']));
    const csv2 = toCsv(dictsToRows(dicts, ['auth']));
    expect(csv1).toBe(csv2);
  });

  // #12 — RF10: BOM + CRLF + ';' sobrevivem a um roundtrip (simula o que o Excel faz ao salvar).
  it('#12 roundtrip com BOM/CRLF/; preserva acentos e cirílico', () => {
    const rows = [
      ['namespace', 'key', 'pt-BR', 'ru'],
      ['chat', 'greeting', 'Olá, ação!', 'Привет, действие!'],
    ];
    const csv = toCsv(rows, { sep: ';', bom: true, crlf: true });
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('\r\n');
    expect(parseCsv(csv)).toEqual(rows);
  });

  // #13 — RF10: separador é detectado pelo header mesmo se vier ',' com default ';'.
  it('#13 parseCsv detecta separador , mesmo quando o default é ;', () => {
    const header = 'namespace,key,pt-BR,ru';
    expect(detectSeparator(header)).toBe(',');
    const csv = 'namespace,key,pt-BR,ru\nchat,greeting,Olá,Привет';
    expect(parseCsv(csv)).toEqual([
      ['namespace', 'key', 'pt-BR', 'ru'],
      ['chat', 'greeting', 'Olá', 'Привет'],
    ]);
  });

  // #14 — RF10: anti-fórmula. Célula iniciada por =, +, @ ou tab é escapada e restaurada.
  it('#14 texto iniciado por = é escapado no export e restaurado no import', () => {
    expect(escapeFormulaCell('=1+1')).toBe("'=1+1");
    expect(unescapeFormulaCell("'=1+1")).toBe('=1+1');

    const dicts = { 'pt-BR': { chat: { formula: '=SOMA(A1:A2)' } } };
    const rows = dictsToRows(dicts, ['chat'], { langs: ['pt-BR'] });
    const csv = toCsv(rows, { sep: ';' });
    expect(csv).toContain("'=SOMA(A1:A2)");

    const { dicts: back } = rowsToDicts(parseCsv(csv, { sep: ';' }), {});
    expect(back['pt-BR'].chat.formula).toBe('=SOMA(A1:A2)');
  });

  // #15 — RF1/D6: --ns com typo é erro, listando os namespaces válidos.
  it('#15 namespace inexistente (typo) gera erro com a lista de válidos', () => {
    const { errors, valid } = resolveNamespaces(['chat', 'amdin'], ['chat', 'admin', 'case']);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('admin');
    expect(valid).toBeUndefined();
  });

  // #16 — RF9: escrita atômica. Falha no meio não deixa nenhum arquivo alterado.
  it('#16 erro durante a escrita não deixa nenhum idioma parcialmente gravado', () => {
    const dir = mkdtempSync(join(tmpdir(), 'i18n-csv-atomic-'));
    const ruDir = join(dir, 'ru');
    const enDir = join(dir, 'en');
    mkdirSync(ruDir);
    mkdirSync(enDir);
    writeFileSync(join(ruDir, 'chat.json'), '{"greeting":"old-ru"}\n', 'utf8');
    writeFileSync(join(enDir, 'chat.json'), '{"greeting":"old-en"}\n', 'utf8');

    const files = [
      { path: join(ruDir, 'chat.json'), content: '{"greeting":"new-ru"}\n' },
      // caminho inválido força falha no meio da escrita
      { path: join(dir, 'nao-existe', 'chat.json'), content: '{"greeting":"new-broken"}\n' },
      { path: join(enDir, 'chat.json'), content: '{"greeting":"new-en"}\n' },
    ];

    expect(() => writeDictsAtomic(files)).toThrow();

    expect(readFileSync(join(ruDir, 'chat.json'), 'utf8')).toBe('{"greeting":"old-ru"}\n');
    expect(readFileSync(join(enDir, 'chat.json'), 'utf8')).toBe('{"greeting":"old-en"}\n');
  });
});

// SPEC-009 — requisitos sem linha própria na §6, mas presentes nos RF e nos
// critérios de aceite (§7). Sem eles o contrato deixa buracos na implementação.
describe('SPEC-009 — recorte, relatório e simetria', () => {
  const dictsFixture = () => ({
    'pt-BR': {
      chat: { greeting: 'Olá', farewell: 'Tchau' },
      admin: { title: 'Administração' },
    },
    ru: {
      chat: { greeting: 'TODO: Olá', farewell: 'Пока' },
      admin: { title: 'TODO: Administração' },
    },
  });

  // RF1 — --todo: só linhas ausentes ou começando com "TODO:" no idioma-alvo.
  it('--todo exporta apenas as pendências do idioma-alvo', () => {
    const rows = dictsToRows(dictsFixture(), ['chat'], {
      langs: ['ru'],
      refLang: 'pt-BR',
      todo: true,
    });
    const keys = rows.slice(1).map((r) => r[1]);
    expect(keys).toEqual(['greeting']); // 'farewell' já traduzido, fica de fora
  });

  it('--todo inclui chave ausente no idioma-alvo', () => {
    const dicts = {
      'pt-BR': { chat: { greeting: 'Olá', novo: 'Novo' } },
      ru: { chat: { greeting: 'Привет' } }, // 'novo' não existe em ru
    };
    const rows = dictsToRows(dicts, ['chat'], { langs: ['ru'], refLang: 'pt-BR', todo: true });
    const keys = rows.slice(1).map((r) => r[1]);
    expect(keys).toEqual(['novo']);
  });

  // RF1 + RF2 — recorte por idioma gera a coluna de referência no header do export.
  it('export com --lang ru inclui pt-BR como coluna ref:pt-BR', () => {
    const rows = dictsToRows(dictsFixture(), ['chat'], { langs: ['ru'], refLang: 'pt-BR' });
    expect(rows[0]).toEqual(['namespace', 'key', 'ref:pt-BR', 'ru']);
  });

  // RF1 — recorte por namespace: --ns chat não exporta linhas de admin.
  it('export com --ns chat não inclui linhas de admin', () => {
    const rows = dictsToRows(dictsFixture(), ['chat'], { langs: ['ru'], refLang: 'pt-BR' });
    expect(rows.slice(1).every((r) => r[0] === 'chat')).toBe(true);
  });

  // RF7 — relatório de dry-run: atualizadas / novas / inalteradas / removidas.
  it('validateImport devolve o relatório com as contagens do RF7', () => {
    const existingDicts = {
      ru: { chat: { greeting: 'Привет', farewell: 'Пока', obsoleta: 'x' } },
    };
    const rows = [
      ['namespace', 'key', 'ru'],
      ['chat', 'greeting', 'Здравствуйте'], // atualizada
      ['chat', 'farewell', 'Пока'], // inalterada (mesmo valor)
      ['chat', 'nova', 'Новый'], // nova
      ['chat', 'obsoleta', '<DELETE>'], // removida
    ];
    const { errors, report } = validateImport(rows, existingDicts, { allowDelete: true });
    expect(errors).toEqual([]);
    expect(report).toEqual({ updated: 1, created: 1, unchanged: 1, removed: 1 });
  });

  // RF4 — header desconhecido aborta, listando o que se esperava.
  it('header com coluna desconhecida gera erro listando os idiomas esperados', () => {
    const rows = [
      ['namespace', 'key', 'ru', 'klingon'],
      ['chat', 'greeting', 'Привет', 'nuqneH'],
    ];
    const { errors } = validateImport(rows, {}, {});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('klingon');
  });

  it('header sem a coluna key gera erro', () => {
    const rows = [
      ['namespace', 'ru'],
      ['chat', 'Привет'],
    ];
    const { errors } = validateImport(rows, {}, {});
    expect(errors.join(' ')).toMatch(/key/);
  });

  // RF10 — a simetria do anti-fórmula precisa valer para QUALQUER texto, inclusive
  // um que já comece com apóstrofo: senão o escape corrompe conteúdo legítimo.
  it('escape/unescape de fórmula é simétrico, inclusive para texto que já começa com apóstrofo', () => {
    const casos = [
      '=SOMA(A1)',
      '+55 11 99999-9999',
      '@usuario',
      '\tcom tab',
      "'já começa com apóstrofo",
      'texto normal',
      '',
      'Привет',
    ];
    for (const caso of casos) {
      expect(unescapeFormulaCell(escapeFormulaCell(caso))).toBe(caso);
    }
  });

  // RF5 — determinismo real: a ordem não pode depender da ordem de inserção no JSON.
  it('a ordem do export não depende da ordem das chaves no dicionário de origem', () => {
    const a = {
      'pt-BR': { chat: { alpha: '1', beta: '2', gamma: '3' } },
      ru: { chat: { gamma: 'г', alpha: 'а', beta: 'б' } },
    };
    const b = {
      'pt-BR': { chat: { alpha: '1', beta: '2', gamma: '3' } },
      ru: { chat: { alpha: 'а', beta: 'б', gamma: 'г' } },
    };
    const opts = { langs: ['pt-BR', 'ru'] };
    expect(toCsv(dictsToRows(a, ['chat'], opts))).toBe(toCsv(dictsToRows(b, ['chat'], opts)));
  });
});

// ── SPEC-009 §11.1/§11.2 — contexto de UI e marca de revisão ─────────────────
describe('SPEC-009 §11 — colunas de contexto e revisão', () => {
  const dicts = {
    'pt-BR': { chat: { send: 'Enviar', title: 'Conversa' } },
    ru: { chat: { send: 'TODO: Enviar', title: 'TODO: Conversa' } },
  };
  const context = (_ns: string, key: string) =>
    key === 'send' ? 'features/chat/Chat.tsx:42' : '';

  it('adiciona a coluna context como somente-leitura, após key', () => {
    const rows = dictsToRows(dicts, ['chat'], { langs: ['ru'], refLang: 'pt-BR', context });
    expect(rows[0]).toEqual(['namespace', 'key', 'context', 'ref:pt-BR', 'ru']);
    expect(rows[1][2]).toBe('features/chat/Chat.tsx:42');
    // Chave sem origem conhecida fica vazia em vez de apontar para o lugar errado.
    expect(rows[2][2]).toBe('');
  });

  it('emite uma coluna status por idioma editável e a preenche com a marca atual', () => {
    const status = { ru: { chat: { send: 'revisado' } } };
    const rows = dictsToRows(dicts, ['chat'], { langs: ['ru'], refLang: 'pt-BR', status });
    expect(rows[0]).toEqual(['namespace', 'key', 'ref:pt-BR', 'ru', 'status:ru']);
    expect(rows[1][4]).toBe('revisado');
    expect(rows[2][4]).toBe('');
  });

  it('o import é merge: célula vazia preserva a marca anterior', () => {
    const rows = [
      ['namespace', 'key', 'ru', 'status:ru'],
      ['chat', 'send', '', ''],
      ['chat', 'title', 'Беседа', 'revisado'],
    ];
    const status = rowsToStatus(rows, { ru: { chat: { send: 'duvida' } } });
    expect(status.ru.chat.send).toBe('duvida');
    expect(status.ru.chat.title).toBe('revisado');
  });

  it('"-" apaga a marca da célula', () => {
    const rows = [
      ['namespace', 'key', 'status:ru'],
      ['chat', 'send', '-'],
    ];
    const status = rowsToStatus(rows, { ru: { chat: { send: 'revisado' } } });
    expect(status.ru.chat.send).toBeUndefined();
  });

  it('marca de revisão não vaza para os dicionários', () => {
    const rows = [
      ['namespace', 'key', 'ru', 'status:ru'],
      ['chat', 'send', 'Отправить', 'revisado'],
    ];
    const { dicts: out } = rowsToDicts(rows, dicts);
    expect(out.ru.chat).toEqual({ send: 'Отправить', title: 'TODO: Conversa' });
  });

  it('context e status:<lang> são colunas conhecidas — não viram erro de header', () => {
    const rows = [
      ['namespace', 'key', 'context', 'ru', 'status:ru'],
      ['chat', 'send', 'features/chat/Chat.tsx:42', 'Отправить', 'revisado'],
    ];
    const { errors } = validateImport(rows, dicts, { validNamespaces: ['chat'] });
    expect(errors).toEqual([]);
  });

  it('status de idioma inexistente é erro de header', () => {
    const rows = [['namespace', 'key', 'status:zz'], ['chat', 'send', 'ok']];
    const { errors } = validateImport(rows, dicts, { validNamespaces: ['chat'] });
    expect(errors.join(' ')).toContain('status:zz');
  });
});
