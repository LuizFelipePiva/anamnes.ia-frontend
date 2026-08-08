// Regras de plural por idioma (SPEC-008 RF4/RF5).
//
// O russo entrou como 4º idioma e trouxe um problema que pt-BR/en/es não tinham:
// ele precisa de 4 formas plurais (`one`/`few`/`many`/`other`) onde o português
// usa 2. Sem elas o i18next cai no fallback pt-BR **em silêncio** — aparece
// português no meio da UI russa, sem erro no console.
//
// Tudo aqui é derivado de `Intl.PluralRules` em tempo de execução, então idioma
// novo (pl, ar, …) passa a ser validado sem código novo (D5).
//
// ⚠️ O sufixo de plural também é reconhecido por `scripts/i18nCsv.mjs`
// (`PLURAL_SUFFIX`), duplicado de propósito: o script é .mjs e não importa .ts.

/** As seis categorias do CLDR, na forma como o i18next as escreve como sufixo. */
export const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

export type PluralSuffix = (typeof PLURAL_SUFFIXES)[number];

const SUFFIX_RE = new RegExp(`_(${PLURAL_SUFFIXES.join('|')})$`);

/** Faixa varrida por `reachableCategories`. Ver a nota em RF5(b). */
const DEFAULT_MAX = 200;

export interface ReachOptions {
  /** Maior inteiro varrido. Default 200. */
  max?: number;
  /** Inclui fracionários na varredura (RF5c / D9). Default false. */
  fractions?: boolean;
}

/** `days_few` → `days`; chave sem sufixo volta inalterada. */
export function baseKey(key: string): string {
  return key.replace(SUFFIX_RE, '');
}

/** `days_few` → `few`; `login.submit` → null. */
export function pluralSuffix(key: string): PluralSuffix | null {
  const match = SUFFIX_RE.exec(key);
  return match ? (match[1] as PluralSuffix) : null;
}

/** Conjunto de chaves-base — é sobre ele que a paridade compara (RF4). */
export function baseKeys(keys: string[]): Set<string> {
  return new Set(keys.map(baseKey));
}

/** Categorias que o CLDR declara para o idioma. */
export function pluralCategories(lang: string): string[] {
  return new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
}

// Categorias que a UI realmente alcança contando itens.
//
// Não use `pluralCategories` como critério de cobertura: pt-BR e es declaram
// `many` no CLDR, que é a forma de números compactos ("1 milhão") e nunca
// aparece numa contagem de itens. Exigir o conjunto CLDR completo reprovaria
// pt-BR, es e ru de uma vez, todos por motivo errado.
export function reachableCategories(lang: string, opts: ReachOptions = {}): Set<string> {
  const { max = DEFAULT_MAX, fractions = false } = opts;
  const rules = new Intl.PluralRules(lang);
  const found = new Set<string>();
  for (let n = 0; n <= max; n++) found.add(rules.select(n));
  // Em cs/sk/lt, `many` só existe para decimais (2,5 dny) — D9.
  if (fractions) for (let n = 0; n <= max; n += 0.5) found.add(rules.select(n));
  return found;
}

// Sufixos aceitáveis num dicionário do idioma.
//
// `_zero` é sempre permitido, em qualquer idioma: verificado no i18next 26, um
// `item_zero` em pt-BR vence para `count === 0` mesmo o português não tendo a
// categoria `zero` no CLDR. É um override de UX legítimo ("Nenhum caso pendente"
// em vez de "0 casos pendentes") e a regra não pode reprová-lo (D8).
export function allowedSuffixes(lang: string): Set<string> {
  return new Set([...pluralCategories(lang), 'zero']);
}

/** Formas que o idioma exige: as alcançáveis + `other` como rede de segurança. */
export function requiredSuffixes(lang: string, opts: ReachOptions = {}): Set<string> {
  return new Set([...reachableCategories(lang, opts), 'other']);
}

// Valida as formas plurais de um dicionário achatado. Devolve a lista de erros
// (vazia = ok), no mesmo estilo de `validateImport` do ferramental CSV.
export function validatePlurals(
  keys: string[],
  lang: string,
  opts: ReachOptions = {},
): string[] {
  const errors: string[] = [];
  const allowed = allowedSuffixes(lang);
  const required = requiredSuffixes(lang, opts);

  // Agrupa as formas encontradas por chave-base.
  const forms = new Map<string, Set<string>>();
  for (const key of keys) {
    const suffix = pluralSuffix(key);
    if (!suffix) continue;
    const base = baseKey(key);
    if (!forms.has(base)) forms.set(base, new Set());
    forms.get(base)!.add(suffix);

    // (a) nenhum sufixo inválido — `_zero` fica fora da regra (D8).
    if (suffix !== 'zero' && !allowed.has(suffix)) {
      errors.push(
        `${lang}: sufixo inválido em "${key}" — "${suffix}" não é categoria de ${lang} ` +
          `(válidas: ${[...allowed].sort().join(', ')}).`,
      );
    }
  }

  // (b) cobertura: toda chave-base com plural precisa de todas as formas exigidas.
  for (const [base, present] of forms) {
    const missing = [...required].filter((s) => !present.has(s)).sort();
    if (missing.length) {
      errors.push(
        `${lang}: faltam formas plurais em "${base}" — ${missing.map((s) => `_${s}`).join(', ')}.`,
      );
    }
  }

  return errors;
}
