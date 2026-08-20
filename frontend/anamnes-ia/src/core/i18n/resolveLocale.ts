// Resolução de idioma (SPEC-007). Funções PURAS — sem side effects, testáveis
// isoladamente (T6/T7). A detecção real e a persistência vivem no ThemeProvider,
// que é a fonte da verdade do `lang`.

// ATENÇÃO: esta lista é espelhada em três outros lugares — mantenha os quatro
// em sincronia ao adicionar um idioma: `scripts/i18nCsv.mjs` (LANGS),
// `backend/app/i18n.py` (SUPPORTED_LANGUAGES) e a CHECK constraint
// `users_language_check` no Supabase (via migration).
export const SUPPORTED_LANGS = ['pt-BR', 'en', 'es', 'ru'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const FALLBACK_LANG: Lang = 'pt-BR';

// Códigos ISO 639 obsoletos que navegadores e sistemas antigos ainda emitem.
// O BCP 47 os mantém válidos mas prefere o código novo; normalizamos na entrada
// para que a comparação seja feita sempre sobre a forma canônica.
const LEGACY_LANG_CODES: Record<string, string> = {
  iw: 'he', // hebraico
  in: 'id', // indonésio
  ji: 'yi', // ídiche
  mo: 'ro', // moldavo → romeno
};

type ParsedTag = { primary: string; script?: string };

/**
 * Extrai as subtags que nos interessam de uma tag BCP 47 (RFC 5646), tolerando
 * o separador `_` do POSIX (`pt_BR`). Devolve `null` para tags que não têm uma
 * subtag primária de idioma utilizável — inclusive as de uso privado (`x-…`) e
 * as grandfathered irregulares (`i-klingon`).
 */
function parseTag(raw: string): ParsedTag | null {
  const subtags = raw.trim().toLowerCase().replace(/_/g, '-').split('-').filter(Boolean);
  const [primary, ...rest] = subtags;
  if (!primary || primary === 'i' || primary === 'x') return null;
  // Subtag primária é sempre 2–3 letras (ISO 639-1/2/3); 4 = script, 5+ = reservado.
  if (!/^[a-z]{2,3}$/.test(primary)) return null;
  return {
    primary: LEGACY_LANG_CODES[primary] ?? primary,
    script: rest.find((s) => /^[a-z]{4}$/.test(s)),
  };
}

// Índice dos idiomas suportados já decomposto, para casar subtag com subtag.
const SUPPORTED_INDEX = SUPPORTED_LANGS.map((tag) => ({ tag, ...(parseTag(tag) as ParsedTag) }));

/**
 * Mapeia um código de locale bruto (ex.: `en-US`, `pt-PT`) para um idioma
 * suportado, ou `null` se não houver correspondência.
 *
 * Regra (D2): compara a **subtag primária** de idioma, não o prefixo da string.
 * Isso importa porque `startsWith` casava por caractere: `rue` (russino) virava
 * `ru` e `enm` (inglês médio) virava `en`, ambos idiomas distintos. Quando um
 * idioma suportado tiver script (`zh-Hans`), o script desempata; sem ele, ganha
 * a variante neutra.
 */
export function normalizeLocale(raw: string | null | undefined): Lang | null {
  if (!raw) return null;
  const parsed = parseTag(raw);
  if (!parsed) return null;

  const candidates = SUPPORTED_INDEX.filter((c) => c.primary === parsed.primary);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].tag;

  const byScript = parsed.script
    ? candidates.find((c) => c.script === parsed.script)
    : undefined;
  return (byScript ?? candidates.find((c) => !c.script) ?? candidates[0]).tag;
}

export type Direction = 'ltr' | 'rtl';

// Fallback para engines sem `Intl.Locale.textInfo` (Chrome < 99, Safari < 17) e
// para tags que o ICU não conhece. Só idiomas de escrita RTL — a lista existe
// como rede de segurança, não como fonte da verdade.
const RTL_PRIMARY_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']);

type TextInfoCarrier = Intl.Locale & {
  textInfo?: { direction?: Direction };
  getTextInfo?: () => { direction?: Direction };
};

/**
 * Direção de escrita de um idioma, derivada do ICU via `Intl.Locale` em vez de
 * uma lista mantida à mão (SPEC-008 §9.7). Hoje os 4 idiomas suportados são
 * todos `ltr`; isto existe para que adicionar `ar`/`he`/`fa` não exija tocar
 * em código de layout.
 */
export function dirFor(lang: string | null | undefined): Direction {
  if (!lang) return 'ltr';
  try {
    const locale = new Intl.Locale(lang) as TextInfoCarrier;
    // A spec final expõe `getTextInfo()`; engines mais antigos, o getter `textInfo`.
    const direction = (locale.getTextInfo?.() ?? locale.textInfo)?.direction;
    if (direction === 'ltr' || direction === 'rtl') return direction;
  } catch {
    // Tag malformada: cai no fallback abaixo.
  }
  return RTL_PRIMARY_LANGS.has(parseTag(lang)?.primary ?? '') ? 'rtl' : 'ltr';
}

/** Igual a `normalizeLocale`, mas cai no fallback (`pt-BR`) em vez de `null`. */
export function resolveLocale(raw: string | null | undefined): Lang {
  return normalizeLocale(raw) ?? FALLBACK_LANG;
}

/**
 * Decide o idioma inicial por ordem de precedência (D2/D3, RF8):
 * perfil (banco) > localStorage > navegador > fallback pt-BR.
 * O idioma do perfil prevalece no login.
 */
export function detectInitialLang(opts: {
  profileLang?: string | null;
  storedLang?: string | null;
  navigatorLangs?: readonly string[];
}): Lang {
  const fromProfile = normalizeLocale(opts.profileLang);
  if (fromProfile) return fromProfile;

  const fromStored = normalizeLocale(opts.storedLang);
  if (fromStored) return fromStored;

  for (const nav of opts.navigatorLangs ?? []) {
    const match = normalizeLocale(nav);
    if (match) return match;
  }

  return FALLBACK_LANG;
}
