// Export/import dos dicionários i18n para CSV, permitindo revisão por não-devs
// (SPEC-007 / RF16, redesenhado pela SPEC-009). Uso:
//   node scripts/i18nCsv.mjs export [--lang ru] [--ns chat,case] [--todo] [--out f.csv]
//                                   [--sep ,] [--no-context]
//   node scripts/i18nCsv.mjs import [--lang ru] [--dry-run] [--allow-delete] [--out f.csv]
//
// Princípios (SPEC-009):
//   • Export percorre a UNIÃO das chaves de todos os idiomas do recorte (RF5).
//   • Import é MERGE: o CSV atualiza o que traz e não toca no resto (RF6).
//   • Colunas são lidas pelo NOME no header, nunca por posição (RF4).
//   • Nada é gravado se qualquer validação falhar; a escrita é atômica (RF8/RF9).
//   • `context` é somente-leitura (onde a chave aparece na UI) e `status:<lang>`
//     guarda a marca de revisão da célula, fora dos dicionários (SPEC-009 §11).
//
// As funções puras são testadas em src/core/i18n/csv.test.ts (SPEC-009 §6).
import { readFileSync, writeFileSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { scanUsage } from './i18nUsage.mjs';

// Espelha `SUPPORTED_LANGS` de src/core/i18n/resolveLocale.ts — o script é .mjs
// e não consegue importar o .ts, então a lista é duplicada de propósito.
// Ao adicionar um idioma, atualize os dois (mais o backend e a constraint do DB).
export const LANGS = ['pt-BR', 'en', 'es', 'ru'];

// Idioma cuja ordem de chaves define a ordem do CSV (RF5).
const ORDER_LANG = 'pt-BR';
// Marca explícita de remoção; só tem efeito com --allow-delete (RF6).
const DELETE_MARK = '<DELETE>';
// Prefixo de coluna somente-leitura (RF2).
const REF_PREFIX = 'ref:';
// Coluna somente-leitura com a origem da chave na UI (SPEC-009 §11.1).
const CONTEXT_COL = 'context';
// Prefixo da marca de revisão por idioma (SPEC-009 §11.2). Editável, mas não
// vai para os dicionários: é persistida à parte, em REVIEW_STATUS_FILE.
const STATUS_PREFIX = 'status:';
// Sufixos de plural do CLDR — usados para agrupar formas do mesmo termo (RF5).
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

// ── flatten / unflatten (chaves aninhadas → "a.b.c") ─────────────────────────
export function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] ??= {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

// ── anti-fórmula do Excel (RF10) ─────────────────────────────────────────────
// Uma célula iniciada por =, +, @ ou tab é avaliada como fórmula pelo Excel. O
// apóstrofo à frente neutraliza. Também escapamos o próprio apóstrofo, senão um
// texto que já começa com ' seria corrompido no roundtrip.
const FORMULA_START = /^['=+@\t\r]/;

export function escapeFormulaCell(s) {
  const str = String(s ?? '');
  return FORMULA_START.test(str) ? `'${str}` : str;
}

export function unescapeFormulaCell(s) {
  const str = String(s ?? '');
  return str.startsWith("'") ? str.slice(1) : str;
}

// ── CSV (RFC 4180) ───────────────────────────────────────────────────────────
// Detecta o separador contando ocorrências fora de aspas na primeira linha.
// Default ';' (Excel pt-BR), mas um CSV com ',' é aceito sem flag (RF10).
export function detectSeparator(headerLine) {
  const counts = { ';': 0, ',': 0 };
  let inQuotes = false;
  for (const c of String(headerLine ?? '')) {
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && c in counts) counts[c]++;
  }
  if (counts[';'] === 0 && counts[','] > 0) return ',';
  return ';';
}

function escapeCell(s, sep) {
  const str = escapeFormulaCell(s);
  return str.includes('"') || str.includes(sep) || /[\n\r]/.test(str)
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function toCsv(rows, opts = {}) {
  const { sep = ';', bom = false, crlf = false } = opts;
  const eol = crlf ? '\r\n' : '\n';
  const body = rows.map((row) => row.map((cell) => escapeCell(cell, sep)).join(sep)).join(eol);
  return bom ? `﻿${body}` : body;
}

export function parseCsv(text, opts = {}) {
  const raw = String(text ?? '').replace(/^﻿/, ''); // BOM gravado pelo Excel
  const firstLine = raw.split(/\r?\n/, 1)[0] ?? '';
  const sep = opts.sep ?? detectSeparator(firstLine);

  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inQuotes) {
      if (c === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else if (c === '\r' && raw[i + 1] === '\n') {
        // Excel grava quebras internas como CRLF; normaliza p/ LF (o dado é LF)
        cell += '\n';
        i++;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c === '\r') { /* CRLF fora de aspas: o \n fecha a linha */ }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map(unescapeFormulaCell));
}

// ── header ⇄ colunas (RF4: por nome, nunca por posição) ──────────────────────
function mapHeader(header = []) {
  const map = { namespace: -1, key: -1, context: -1, langs: [], refs: [], status: [], unknown: [] };
  header.forEach((rawName, index) => {
    const name = String(rawName ?? '').trim();
    if (name === 'namespace') map.namespace = index;
    else if (name === 'key') map.key = index;
    else if (name === CONTEXT_COL) map.context = index;
    else if (name.startsWith(REF_PREFIX)) map.refs.push({ lang: name.slice(REF_PREFIX.length), index });
    else if (name.startsWith(STATUS_PREFIX)) {
      map.status.push({ lang: name.slice(STATUS_PREFIX.length), index });
    } else if (LANGS.includes(name)) map.langs.push({ lang: name, index });
    else if (name !== '') map.unknown.push(name);
  });
  return map;
}

function headerErrors(map) {
  const errors = [];
  if (map.namespace === -1) errors.push('Coluna obrigatória ausente no header: "namespace".');
  if (map.key === -1) errors.push('Coluna obrigatória ausente no header: "key".');
  for (const name of map.unknown) {
    errors.push(
      `Coluna desconhecida no header: "${name}". Esperado: namespace, key, ` +
        `${CONTEXT_COL}, ${LANGS.join(', ')}, ref:<idioma> ou ${STATUS_PREFIX}<idioma>.`,
    );
  }
  for (const { lang } of map.status) {
    if (!LANGS.includes(lang)) {
      errors.push(
        `Coluna "${STATUS_PREFIX}${lang}": idioma desconhecido. Válidos: ${LANGS.join(', ')}.`,
      );
    }
  }
  return errors;
}

// ── dicionários por idioma ⇄ linhas de CSV ───────────────────────────────────
// dicts: { 'pt-BR': { chat: {...} }, ru: { chat: {...} }, … }

// Achata um namespace e aborta se houver valor não-string (RF8.3): o CSV não
// consegue representar array/objeto e o roundtrip destruiria a estrutura.
function flatNamespace(dicts, lang, ns) {
  const flat = flatten(dicts?.[lang]?.[ns] ?? {});
  for (const [key, value] of Object.entries(flat)) {
    if (typeof value !== 'string') {
      throw new Error(
        `Valor não-string em ${lang}/${ns}.${key} (${Array.isArray(value) ? 'array' : typeof value}). ` +
          'O CSV só representa strings — converta a chave antes de exportar.',
      );
    }
  }
  return flat;
}

// Ordem determinística (RF5): a do pt-BR; chave que só existe em outro idioma
// entra logo após a última forma da mesma chave-base (days_few após days_other).
function orderedKeys(flatByLang, langs) {
  const orderLang = langs.includes(ORDER_LANG) ? ORDER_LANG : langs[0];
  const ordered = Object.keys(flatByLang[orderLang] ?? {});
  const known = new Set(ordered);

  const extras = new Set();
  for (const lang of langs) {
    for (const key of Object.keys(flatByLang[lang] ?? {})) if (!known.has(key)) extras.add(key);
  }

  // Ordena os extras para que o resultado não dependa da ordem das chaves no JSON.
  for (const key of [...extras].sort()) {
    const base = key.replace(PLURAL_SUFFIX, '');
    let at = -1;
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].replace(PLURAL_SUFFIX, '') === base) at = i;
    }
    if (at === -1) ordered.push(key);
    else ordered.splice(at + 1, 0, key);
  }
  return ordered;
}

export function dictsToRows(dicts, namespaces, opts = {}) {
  const { langs = LANGS, refLang, todo = false, context, status } = opts;
  const cols = refLang ? [refLang, ...langs] : [...langs];
  const header = [
    'namespace',
    'key',
    ...(context ? [CONTEXT_COL] : []),
    ...(refLang ? [`${REF_PREFIX}${refLang}`] : []),
    ...langs,
    ...(status ? langs.map((l) => `${STATUS_PREFIX}${l}`) : []),
  ];
  const rows = [header];

  for (const ns of namespaces) {
    const flatByLang = Object.fromEntries(cols.map((l) => [l, flatNamespace(dicts, l, ns)]));
    for (const key of orderedKeys(flatByLang, cols)) {
      // --todo: só o que ainda falta traduzir nos idiomas editáveis (RF1)
      if (todo) {
        const pending = langs.some((l) => {
          const value = flatByLang[l]?.[key];
          return value === undefined || value === '' || value.startsWith('TODO:');
        });
        if (!pending) continue;
      }
      rows.push([
        ns,
        key,
        ...(context ? [context(ns, key)] : []),
        ...cols.map((l) => flatByLang[l]?.[key] ?? ''),
        ...(status ? langs.map((l) => status?.[l]?.[ns]?.[key] ?? '') : []),
      ]);
    }
  }
  return rows;
}

// Import é merge (RF6): aplica o que o CSV traz sobre os dicionários atuais e
// devolve só os idiomas presentes no arquivo. `touched` diz quais namespaces
// mudaram, para a CLI não reescrever JSONs intocados.
export function rowsToDicts(rows, existingDicts = {}, opts = {}) {
  const { allowDelete = false, langs } = opts;
  const [header = [], ...body] = rows;
  const map = mapHeader(header);
  const cols = langs ? map.langs.filter((c) => langs.includes(c.lang)) : map.langs;

  const flatCache = {}; // lang → ns → flat (partindo do estado atual em disco)
  const touched = {};
  const getFlat = (lang, ns) => {
    flatCache[lang] ??= {};
    flatCache[lang][ns] ??= flatten(existingDicts?.[lang]?.[ns] ?? {});
    return flatCache[lang][ns];
  };

  for (const row of body) {
    const ns = row[map.namespace];
    const key = row[map.key];
    if (!ns || !key) continue; // linha em branco deixada pela planilha
    for (const { lang, index } of cols) {
      const value = row[index];
      if (value === undefined || value === '') continue; // vazio = "não mexi" (RF6)
      const flat = getFlat(lang, ns);
      if (value === DELETE_MARK) {
        if (!allowDelete) continue; // barrado por validateImport; aqui é no-op
        delete flat[key];
      } else {
        flat[key] = value;
      }
      (touched[lang] ??= new Set()).add(ns);
    }
  }

  const dicts = {};
  for (const { lang } of cols) {
    // Clona o idioma inteiro para preservar os namespaces fora do recorte (RF6).
    dicts[lang] = structuredClone(existingDicts?.[lang] ?? {});
    for (const ns of Object.keys(flatCache[lang] ?? {})) {
      dicts[lang][ns] = unflatten(flatCache[lang][ns]);
    }
  }
  return { dicts, touched, status: rowsToStatus(rows, opts.existingStatus) };
}

// Marca de revisão (SPEC-009 §11.2). Vive fora dos dicionários: é metadado do
// processo de tradução, não conteúdo da UI. Como o resto do import, é MERGE —
// célula vazia mantém a marca anterior; `-` apaga.
const STATUS_CLEAR = '-';

export function rowsToStatus(rows, existingStatus = {}) {
  const [header = [], ...body] = rows;
  const map = mapHeader(header);
  if (map.status.length === 0) return structuredClone(existingStatus);

  const status = structuredClone(existingStatus);
  for (const row of body) {
    const ns = row[map.namespace];
    const key = row[map.key];
    if (!ns || !key) continue;
    for (const { lang, index } of map.status) {
      const value = String(row[index] ?? '').trim();
      if (value === '') continue;
      if (value === STATUS_CLEAR) {
        if (status[lang]?.[ns]) delete status[lang][ns][key];
        continue;
      }
      status[lang] ??= {};
      status[lang][ns] ??= {};
      status[lang][ns][key] = value;
    }
  }
  return status;
}

// ── validação (RF7/RF8): acumula erros, nunca lança ──────────────────────────
function interpolations(text) {
  const vars = [...String(text).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((m) => m[1]);
  const tags = [...String(text).matchAll(/<\/?\s*([\w.]+)\s*\/?>/g)].map((m) => m[1]);
  return new Set([...vars.map((v) => `{{${v}}}`), ...tags.map((t) => `<${t}>`)]);
}

export function validateImport(rows, existingDicts = {}, opts = {}) {
  const { allowDelete = false, validNamespaces } = opts;
  const [header = [], ...body] = rows;
  const map = mapHeader(header);
  const errors = headerErrors(map);
  const report = { updated: 0, created: 0, unchanged: 0, removed: 0 };
  if (errors.length) return { errors, report };

  const refByLang = Object.fromEntries(map.refs.map((r) => [r.lang, r.index]));

  body.forEach((row, i) => {
    const line = i + 2; // 1-based, contando o header
    const ns = row[map.namespace];
    const key = row[map.key];
    if (!ns || !key) return;

    if (validNamespaces && !validNamespaces.includes(ns)) {
      errors.push(`Linha ${line}: namespace inexistente "${ns}". Válidos: ${validNamespaces.join(', ')}.`);
      return;
    }

    // Referência de interpolação: a coluna ref:pt-BR, senão o dicionário em disco.
    const source =
      (refByLang[ORDER_LANG] !== undefined ? row[refByLang[ORDER_LANG]] : undefined) ??
      flatten(existingDicts?.[ORDER_LANG]?.[ns] ?? {})[key];
    const expected = source ? interpolations(source) : null;

    for (const { lang, index } of map.langs) {
      const value = row[index];
      if (value === undefined || value === '') continue;

      if (value === DELETE_MARK) {
        if (!allowDelete) {
          errors.push(
            `Linha ${line}: ${lang}/${ns}.${key} marcada com ${DELETE_MARK} sem --allow-delete.`,
          );
        } else if (flatten(existingDicts?.[lang]?.[ns] ?? {})[key] !== undefined) {
          report.removed++;
        }
        continue;
      }

      if (expected) {
        const missing = [...expected].filter((token) => !interpolations(value).has(token));
        if (missing.length) {
          errors.push(
            `Linha ${line}: interpolação perdida em ${lang}/${ns}.${key} — falta ${missing.join(', ')}.`,
          );
        }
      }

      const current = flatten(existingDicts?.[lang]?.[ns] ?? {})[key];
      if (current === undefined) report.created++;
      else if (current === value) report.unchanged++;
      else report.updated++;
    }
  });

  return { errors, report };
}

// --ns com typo é erro, não conjunto vazio (D6): um export silenciosamente
// vazio é indistinguível de sucesso e faz perder uma rodada de revisão.
export function resolveNamespaces(requested, available) {
  if (!requested || requested.length === 0) return { errors: [], valid: available };
  const invalid = requested.filter((ns) => !available.includes(ns));
  if (invalid.length) {
    return {
      errors: [
        `Namespace(s) inexistente(s): ${invalid.join(', ')}. ` +
          `Válidos: ${[...available].sort().join(', ')}.`,
      ],
      valid: undefined,
    };
  }
  return { errors: [], valid: requested };
}

// ── escrita atômica (RF9) ────────────────────────────────────────────────────
// Grava tudo em temporários primeiro; só renomeia se todos foram escritos. Uma
// falha no meio não deixa idiomas em estados diferentes.
export function writeDictsAtomic(files) {
  const written = [];
  try {
    for (const { path, content } of files) {
      const tmp = `${path}.tmp`;
      writeFileSync(tmp, content, 'utf8');
      written.push({ tmp, path });
    }
  } catch (err) {
    for (const { tmp } of written) {
      try { unlinkSync(tmp); } catch { /* já removido */ }
    }
    throw err;
  }
  for (const { tmp, path } of written) renameSync(tmp, path);
  return written.length;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src');
const LOCALES_DIR = resolve(SRC_DIR, 'locales');
const DEFAULT_CSV = resolve(__dirname, '../i18n-review.csv');
// Marcas de revisão: metadado do processo, versionado junto com os dicionários.
const REVIEW_STATUS_FILE = resolve(LOCALES_DIR, 'review-status.json');

function loadReviewStatus() {
  try {
    return JSON.parse(readFileSync(REVIEW_STATUS_FILE, 'utf8'));
  } catch {
    return {}; // primeira rodada: ainda não existe
  }
}

// Contexto de UI: "arquivo:linha" de até 2 ocorrências (SPEC-009 §11.1). Se a
// chave só existir via prefixo dinâmico, não há linha exata — melhor vazio do
// que apontar para o lugar errado.
function buildContextLookup() {
  const { byKey } = scanUsage(SRC_DIR);
  return (ns, key) => {
    const spots = byKey.get(`${ns}:${key}`) ?? byKey.get(`*:${key}`) ?? [];
    return spots
      .slice(0, 2)
      .map(({ file, line }) => `${file}:${line}`)
      .join(' ');
  };
}

function loadDicts() {
  const namespaces = new Set();
  const dicts = Object.fromEntries(LANGS.map((l) => [l, {}]));
  for (const l of LANGS) {
    const dir = resolve(LOCALES_DIR, l);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const ns = file.replace(/\.json$/, '');
      namespaces.add(ns);
      dicts[l][ns] = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    }
  }
  return { dicts, namespaces: [...namespaces] };
}

function parseArgs(argv) {
  const args = { todo: false, dryRun: false, allowDelete: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === '--lang') args.langs = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (flag === '--ns') args.ns = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (flag === '--out') args.out = resolve(process.cwd(), next());
    else if (flag === '--sep') args.sep = next();
    else if (flag === '--todo') args.todo = true;
    else if (flag === '--no-context') args.noContext = true;
    else if (flag === '--dry-run') args.dryRun = true;
    else if (flag === '--allow-delete') args.allowDelete = true;
    else throw new Error(`Flag desconhecida: ${flag}`);
  }
  return args;
}

function fail(errors) {
  for (const e of errors) console.error(`❌ ${e}`);
  process.exit(1);
}

function formatReport({ updated, created, unchanged, removed }) {
  return `  ~ ${updated} atualizadas   + ${created} novas   = ${unchanged} inalteradas   - ${removed} removidas`;
}

function runExport(args) {
  const { dicts, namespaces } = loadDicts();

  const badLangs = (args.langs ?? []).filter((l) => !LANGS.includes(l));
  if (badLangs.length) fail([`Idioma(s) inválido(s): ${badLangs.join(', ')}. Válidos: ${LANGS.join(', ')}.`]);

  const { errors, valid } = resolveNamespaces(args.ns, namespaces);
  if (errors.length) fail(errors);

  const langs = args.langs ?? LANGS;
  // pt-BR fora do recorte vira coluna de referência somente-leitura (RF2).
  const refLang = langs.includes(ORDER_LANG) ? undefined : ORDER_LANG;

  let rows;
  try {
    rows = dictsToRows(dicts, valid, {
      langs,
      refLang,
      todo: args.todo,
      context: args.noContext ? undefined : buildContextLookup(),
      status: loadReviewStatus(),
    });
  } catch (err) {
    fail([err.message]);
  }

  const out = args.out ?? DEFAULT_CSV;
  writeFileSync(out, toCsv(rows, { sep: args.sep ?? ';', bom: true, crlf: true }), 'utf8');
  console.log(
    `✅ ${rows.length - 1} linha(s) · ${valid.length} namespace(s) · idiomas: ${langs.join(', ')}` +
      `${refLang ? ` (ref: ${refLang})` : ''} → ${out}`,
  );
}

function runImport(args) {
  const csvPath = args.out ?? DEFAULT_CSV;
  const { dicts: existing, namespaces } = loadDicts();
  const rows = parseCsv(readFileSync(csvPath, 'utf8'), args.sep ? { sep: args.sep } : {});

  const { errors, report } = validateImport(rows, existing, {
    allowDelete: args.allowDelete,
    validNamespaces: namespaces,
  });
  if (errors.length) {
    console.error(`${formatReport(report)}\n  ! ${errors.length} erro(s) → aborta, nada foi gravado`);
    fail(errors);
  }

  if (args.dryRun) {
    console.log(`i18n:import --dry-run (${csvPath})\n${formatReport(report)}`);
    return;
  }

  const existingStatus = loadReviewStatus();
  const { dicts, touched, status } = rowsToDicts(rows, existing, {
    allowDelete: args.allowDelete,
    langs: args.langs,
    existingStatus,
  });

  const files = [];
  for (const [lang, nsSet] of Object.entries(touched)) {
    for (const ns of nsSet) {
      files.push({
        path: resolve(LOCALES_DIR, lang, `${ns}.json`),
        content: JSON.stringify(dicts[lang][ns], null, 2) + '\n',
      });
    }
  }

  // Só reescreve as marcas se mudaram — evita ruído no diff a cada import.
  const statusChanged = JSON.stringify(status) !== JSON.stringify(existingStatus);
  if (statusChanged) {
    files.push({ path: REVIEW_STATUS_FILE, content: JSON.stringify(status, null, 2) + '\n' });
  }

  writeDictsAtomic(files);
  console.log(
    `✅ ${csvPath} → ${files.length} arquivo(s)${statusChanged ? ' (inclui marcas de revisão)' : ''}\n` +
      formatReport(report),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  try {
    const args = parseArgs(process.argv.slice(3));
    if (cmd === 'export') runExport(args);
    else if (cmd === 'import') runImport(args);
    else {
      console.error(
        'Uso: node scripts/i18nCsv.mjs export [--lang ru] [--ns chat,case] [--todo] [--out f.csv] [--sep ,]\n' +
          '     node scripts/i18nCsv.mjs import [--lang ru] [--dry-run] [--allow-delete] [--out f.csv]',
      );
      process.exit(1);
    }
  } catch (err) {
    fail([err.message]);
  }
}
