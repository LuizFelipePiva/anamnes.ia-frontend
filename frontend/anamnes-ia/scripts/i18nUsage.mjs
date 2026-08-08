// Índice de uso das chaves de tradução no código-fonte (SPEC-008 §9.4 /
// SPEC-007 §9.3). Responde a duas perguntas:
//   • quais chaves dos dicionários não são mais usadas por ninguém (órfãs);
//   • em que arquivo:linha cada chave aparece (contexto para o tradutor —
//     SPEC-009 §11.1, consumido por i18nCsv.mjs).
//
// Por que regex e não AST: o que precisamos extrair são literais em posições
// muito previsíveis (`t('x')`, `i18nKey="x"`), e um parser TS traria uma
// dependência nova só para isto. O custo é ambiguidade em chave dinâmica —
// tratada explicitamente abaixo, nunca ignorada em silêncio.
//
// Uso:
//   node scripts/i18nUsage.mjs [--strict] [--ns chat,case]
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, sep } from 'node:path';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

// Namespace curinga para usos cujo dono não dá para determinar estaticamente.
// Casa com a chave em qualquer namespace; conservador de propósito.
const ANY_NS = '*';

// Chamada de tradução: `t(`, `i18n.t(` e aliases `tCommon(` / `tAuth(`.
// O `\b` no início evita casar o fim de outro identificador (`format(`).
const T_CALL = '\\bt(?:[A-Z]\\w*)?\\(\\s*';

// Props/setters que carregam chave de tradução (ver comentário em extractFromSource).
const KEY_PROP =
  /\b\w*(?:i18n|label|error|title|msg|message|text)Key\b\s*[:=(]\s*['"]([^'"]+)['"]/gi;

// Arquivos que definem UI. Testes ficam de fora: uma chave usada só em teste
// continua órfã na prática, e chaves inventadas por teste poluiriam o relatório.
const SOURCE_EXT = /\.(ts|tsx)$/;
const IGNORED = /(\.test\.|\.d\.ts$|[/\\]locales[/\\])/;

// Chaves que o scanner não consegue ver por construção — o valor não aparece
// como literal em lugar nenhum. Cada entrada precisa de justificativa; sem ela,
// vira lixeira e o relatório perde a serventia.
export const USAGE_ALLOWLIST = [
  // specialtyLabel() monta `common.specialties.<slug>` a partir do `key` que
  // vem do banco — a fonte é shared/utils/specialties.ts, não o código de UI.
  'common:specialties.',
];

// ── varredura de arquivos ────────────────────────────────────────────────────
function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !SOURCE_EXT.test(entry.name)) continue;
    const full = resolve(entry.parentPath ?? entry.path, entry.name);
    if (IGNORED.test(full)) continue;
    out.push(full);
  }
  return out;
}

// ── extração de chaves de um arquivo ─────────────────────────────────────────
// Namespaces em jogo no arquivo: os de useTranslation(...) e os passados
// explicitamente por `{ ns: '...' }`. Uma chave é considerada resolvida se
// existir em QUALQUER um deles — preferimos deixar de acusar uma órfã a acusar
// uma chave viva por não termos amarrado o namespace certo.
function fileNamespaces(text) {
  const ns = new Set();
  for (const m of text.matchAll(/useTranslation\(\s*\[?\s*'([^']+)'/g)) ns.add(m[1]);
  for (const m of text.matchAll(/useTranslation\(\s*\[?\s*"([^"]+)"/g)) ns.add(m[1]);
  // Namespaces adicionais de useTranslation(['a', 'b'])
  for (const m of text.matchAll(/useTranslation\(\s*\[([^\]]+)\]/g)) {
    for (const lit of m[1].matchAll(/['"]([^'"]+)['"]/g)) ns.add(lit[1]);
  }
  for (const m of text.matchAll(/\bns\s*:\s*['"]([^'"]+)['"]/g)) ns.add(m[1]);
  return ns;
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

/**
 * Extrai de um arquivo:
 *  - `keys`: chaves literais, com a linha em que aparecem;
 *  - `prefixes`: prefixos de chave dinâmica (`t(`panel.nav.${x}`)` → `panel.nav.`),
 *    que marcam como usada toda chave sob eles.
 */
export function extractFromSource(text) {
  const keys = [];
  const prefixes = [];
  // `soft`: uso que prova que a chave está viva, mas cujo texto pode não ser a
  // chave inteira (ver KEY_PROP abaixo). Nunca vira "faltante".
  const push = (raw, index, soft = false) => {
    const value = String(raw);
    // Forma `ns:chave` — o prefixo antes dos dois-pontos manda no namespace.
    const explicit = value.includes(':') ? value.split(':', 2) : null;
    keys.push({
      ns: explicit?.[0],
      key: explicit ? explicit[1] : value,
      line: lineOf(text, index),
      soft,
    });
  };

  // t('x') / t("x") / i18n.t('x'), e aliases de renomeação do hook
  // (`const { t: tCommon } = useTranslation('common')`).
  for (const m of text.matchAll(new RegExp(`${T_CALL}'([^'\\\\]+)'`, 'g'))) push(m[1], m.index);
  for (const m of text.matchAll(new RegExp(`${T_CALL}"([^"\\\\]+)"`, 'g'))) push(m[1], m.index);

  // Template literal: só o trecho estático até a primeira interpolação serve.
  for (const m of text.matchAll(new RegExp(`${T_CALL}\`([^\`$]*)\\$\\{`, 'g'))) {
    if (m[1]) prefixes.push({ prefix: m[1], line: lineOf(text, m.index) });
  }
  // Template literal sem interpolação é chave literal comum.
  for (const m of text.matchAll(new RegExp(`${T_CALL}\`([^\`$]+)\``, 'g'))) push(m[1], m.index);

  // <Trans i18nKey="x"> e i18nKey={cond ? 'a' : 'b'} — pega todo literal da expressão.
  for (const m of text.matchAll(/i18nKey\s*=\s*"([^"]+)"/g)) push(m[1], m.index);
  for (const m of text.matchAll(/i18nKey\s*=\s*\{([^}]+)\}/g)) {
    for (const lit of m[1].matchAll(/['"]([^'"]+)['"]/g)) push(lit[1], m.index);
  }

  // Convenção do projeto: a chave viaja em um campo/setter nomeado (`labelKey`
  // no MainMenu, `setErrorKey('soap.fill_all')` no SoapForm) e só é traduzida lá
  // adiante. Sem isto, toda chave adiada vira órfã falsa.
  //
  // A lista é explícita porque "termina em Key" pega campo de dado: `dataKey` do
  // Recharts e `key:` de React não têm nada a ver com tradução. E o valor pode
  // ser FRAGMENTO — `labelKey: 'overview'` é completado por `t(`panel.nav.${…}`)`
  // — por isso entra como `soft`.
  for (const m of text.matchAll(KEY_PROP)) push(m[1], m.index, true);

  // Rede final: qualquer literal PONTUADO idêntico a uma chave existente conta
  // como uso. Cobre o que nenhum padrão pega — `t(cond ? 'density.compact' :
  // 'density.comfortable')`, `return 'home.greeting_morning'` de um helper,
  // uniões de tipo. Exige o ponto porque chave de uma palavra (`role`, `title`)
  // colide com identificador comum e mascararia órfã de verdade.
  for (const m of text.matchAll(/['"]([a-z][\w-]*(?:\.[\w-]+)+)['"]/gi)) {
    if (!m[1].includes(' ')) push(m[1], m.index, true);
  }

  return { keys, prefixes };
}

/**
 * Varre `srcDir` e devolve o índice de uso.
 *  - `byKey`: "ns:chave" → [{ file, line }]  (contexto para o CSV)
 *  - `prefixes`: Set de "ns:prefixo" (chaves dinâmicas)
 */
export function scanUsage(srcDir) {
  const byKey = new Map();
  const prefixes = new Set();

  for (const file of sourceFiles(srcDir)) {
    const text = readFileSync(file, 'utf8');
    const { keys, prefixes: dyn } = extractFromSource(text);
    if (keys.length === 0 && dyn.length === 0) continue;

    const namespaces = fileNamespaces(text);
    const short = relative(srcDir, file).split(sep).join('/');

    for (const { ns, key, line, soft } of keys) {
      // Sem namespace no arquivo (ex.: ErrorBoundary, class component que chama
      // `i18n.t` direto): registra o uso como "qualquer namespace" — resolvido
      // contra os dicionários lá na comparação, em vez de virar órfã falsa.
      // Com mais de um namespace no arquivo não dá para saber a qual o uso
      // pertence: registrar em todos faria cada um cobrar a chave dos outros.
      // ANY_NS resolve isso — cobre a chave onde ela existir, e só acusa
      // faltante quando não existe em namespace nenhum.
      const own = ns ? [ns] : [...namespaces];
      const candidates = own.length === 1 ? own : [ANY_NS];
      for (const candidate of candidates) {
        const id = `${candidate}:${key}`;
        if (!byKey.has(id)) byKey.set(id, []);
        byKey.get(id).push({ file: short, line, soft });
      }
    }

    for (const { prefix } of dyn) {
      for (const candidate of namespaces.size > 0 ? namespaces : [ANY_NS]) {
        prefixes.add(`${candidate}:${prefix}`);
      }
    }
  }

  return { byKey, prefixes };
}

// ── órfãs ────────────────────────────────────────────────────────────────────
function isCovered(id, usage) {
  const key = id.slice(id.indexOf(':') + 1);
  const anyId = `${ANY_NS}:${key}`;
  if (usage.byKey.has(id) || usage.byKey.has(anyId)) return true;
  // Plural: o código chama t('days', {count}), o dicionário tem days_one/days_other.
  const base = id.replace(PLURAL_SUFFIX, '');
  if (base !== id && (usage.byKey.has(base) || usage.byKey.has(anyId.replace(PLURAL_SUFFIX, '')))) {
    return true;
  }
  for (const prefix of usage.prefixes) {
    if (id.startsWith(prefix) || anyId.startsWith(prefix)) return true;
  }
  for (const allowed of USAGE_ALLOWLIST) if (id.startsWith(allowed)) return true;
  return false;
}

/**
 * Compara as chaves definidas (flat, por namespace) com o índice de uso.
 * `orphans` = definidas e nunca referenciadas. `missing` = referenciadas no
 * código e ausentes do dicionário de referência.
 */
export function findOrphans(definedByNs, usage) {
  const orphans = [];
  const missing = [];

  for (const [ns, flat] of Object.entries(definedByNs)) {
    for (const key of Object.keys(flat)) {
      const id = `${ns}:${key}`;
      if (!isCovered(id, usage)) orphans.push(id);
    }
  }

  for (const [id, spots] of usage.byKey) {
    // Uso `soft` não prova que o literal é a chave inteira — não acusa faltante.
    if (spots.every((s) => s.soft)) continue;
    const [ns, ...rest] = id.split(':');
    const key = rest.join(':');
    if (ns === ANY_NS) {
      // Namespace indeterminado: só é "faltante" se não existir em NENHUM.
      const anywhere = Object.values(definedByNs).some((flat) =>
        Object.keys(flat).some((k) => k === key || k.replace(PLURAL_SUFFIX, '') === key),
      );
      if (!anywhere) missing.push({ id, spots });
      continue;
    }
    const flat = definedByNs[ns];
    if (!flat) continue; // namespace desconhecido: pode ser ns de outro escopo
    const base = key.replace(PLURAL_SUFFIX, '');
    const exists = Object.keys(flat).some((k) => k === key || k.replace(PLURAL_SUFFIX, '') === base);
    if (!exists) missing.push({ id, spots });
  }

  return { orphans, missing };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '../src');
const LOCALES_DIR = resolve(SRC_DIR, 'locales');
const REFERENCE_LANG = 'pt-BR';

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export function loadDefined(langDir) {
  const defined = {};
  for (const file of readdirSync(langDir).filter((f) => f.endsWith('.json'))) {
    const ns = file.replace(/\.json$/, '');
    defined[ns] = flatten(JSON.parse(readFileSync(resolve(langDir, file), 'utf8')));
  }
  return defined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const strict = argv.includes('--strict');
  const nsArg = argv.indexOf('--ns');
  const only = nsArg === -1 ? null : argv[nsArg + 1].split(',').map((s) => s.trim());

  const usage = scanUsage(SRC_DIR);
  let defined = loadDefined(resolve(LOCALES_DIR, REFERENCE_LANG));
  if (only) defined = Object.fromEntries(Object.entries(defined).filter(([ns]) => only.includes(ns)));

  const { orphans, missing } = findOrphans(defined, usage);
  const total = Object.values(defined).reduce((n, flat) => n + Object.keys(flat).length, 0);

  if (missing.length) {
    console.log(`\n❌ ${missing.length} chave(s) usada(s) no código e ausente(s) em ${REFERENCE_LANG}:`);
    for (const { id, spots } of missing) console.log(`   ${id}  (${spots[0].file}:${spots[0].line})`);
  }

  if (orphans.length) {
    console.log(`\n⚠️  ${orphans.length} chave(s) órfã(s) — definidas e sem uso encontrado:`);
    const byNs = {};
    for (const id of orphans) {
      const [ns, ...rest] = id.split(':');
      (byNs[ns] ??= []).push(rest.join(':'));
    }
    for (const [ns, keys] of Object.entries(byNs)) {
      console.log(`   ${ns} (${keys.length}):`);
      for (const key of keys) console.log(`      ${key}`);
    }
    console.log(
      '\n   Antes de apagar: confira se a chave não é montada dinamicamente.\n' +
        '   Se for, acrescente o prefixo em USAGE_ALLOWLIST (scripts/i18nUsage.mjs).',
    );
  }

  console.log(
    `\n${total} chave(s) em ${REFERENCE_LANG} · ${orphans.length} órfã(s) · ${missing.length} faltante(s)`,
  );

  if (strict && (orphans.length || missing.length)) process.exit(1);
}
