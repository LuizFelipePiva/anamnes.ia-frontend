// Export/import dos dicionários i18n para CSV, permitindo revisão por não-devs
// (SPEC-007 / RF16). Uso:
//   node scripts/i18nCsv.mjs export   → gera i18n-review.csv (chave · pt-BR · en · es)
//   node scripts/i18nCsv.mjs import   → aplica o CSV de volta aos JSONs
//
// As funções puras (flatten/unflatten/toCsv/parseCsv) são testadas em
// src/core/i18n/csv.test.ts (T9 — roundtrip preserva estrutura e paridade).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const LANGS = ['pt-BR', 'en', 'es'];

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

// ── CSV (RFC-4180 simplificado: aspas duplas, escape "") ─────────────────────
function escapeCell(s) {
  const str = String(s ?? '');
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\n');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c === '\r') { /* ignora */ }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ── dicionários por idioma ⇄ linhas de CSV ───────────────────────────────────
// dicts: { 'pt-BR': {ns: {...}}, en: {...}, es: {...} }
export function dictsToRows(dicts, namespaces) {
  const header = ['namespace', 'key', ...LANGS];
  const rows = [header];
  for (const ns of namespaces) {
    const flatByLang = Object.fromEntries(LANGS.map((l) => [l, flatten(dicts[l][ns] ?? {})]));
    for (const key of Object.keys(flatByLang['pt-BR'])) {
      rows.push([ns, key, ...LANGS.map((l) => flatByLang[l][key] ?? '')]);
    }
  }
  return rows;
}

export function rowsToDicts(rows) {
  const [, ...body] = rows; // descarta header
  const dicts = Object.fromEntries(LANGS.map((l) => [l, {}]));
  for (const row of body) {
    if (row.length < 2 || row[0] === '') continue;
    const [ns, key, ...vals] = row;
    LANGS.forEach((l, i) => {
      dicts[l][ns] ??= {};
      dicts[l][ns][`${key}`] = vals[i] ?? '';
    });
  }
  // reconstrói o aninhamento por namespace
  for (const l of LANGS) {
    for (const ns of Object.keys(dicts[l])) dicts[l][ns] = unflatten(dicts[l][ns]);
  }
  return dicts;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../src/locales');
const CSV_PATH = resolve(__dirname, '../i18n-review.csv');

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

function runExport() {
  const { dicts, namespaces } = loadDicts();
  writeFileSync(CSV_PATH, toCsv(dictsToRows(dicts, namespaces)), 'utf8');
  console.log(`✅ Exportado ${namespaces.length} namespace(s) → ${CSV_PATH}`);
}

function runImport() {
  const dicts = rowsToDicts(parseCsv(readFileSync(CSV_PATH, 'utf8')));
  for (const l of LANGS) {
    for (const ns of Object.keys(dicts[l])) {
      const path = resolve(LOCALES_DIR, l, `${ns}.json`);
      writeFileSync(path, JSON.stringify(dicts[l][ns], null, 2) + '\n', 'utf8');
    }
  }
  console.log(`✅ Importado ${CSV_PATH} → JSONs em ${LOCALES_DIR}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'export') runExport();
  else if (cmd === 'import') runImport();
  else { console.error('Uso: node scripts/i18nCsv.mjs <export|import>'); process.exit(1); }
}
