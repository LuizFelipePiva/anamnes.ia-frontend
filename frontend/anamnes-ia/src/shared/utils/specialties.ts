/**
 * Fonte única de verdade para especialidades médicas.
 * Adicionar, renomear ou remover aqui reflete em todo o projeto.
 *
 * i18n (SPEC-007): `key` é o valor canônico gravado no banco e **nunca** é
 * traduzido — só o rótulo exibido. Use `specialtyLabel(key)` na UI; `label`
 * permanece como fallback pt-BR para contextos sem i18next.
 */
import i18n from '@/core/i18n';

export interface SpecialtyDef {
  /** Chave canônica usada no banco de dados */
  key: string;
  /** Rótulo pt-BR — fallback; na UI prefira `specialtyLabel(key)` */
  label: string;
  /** Sufixo da chave de tradução (`specialties.<slug>` no namespace `common`) */
  slug: string;
  /** Emoji representativo */
  emoji: string;
  /** Cor hex para gráficos/badges */
  color: string;
}

export const SPECIALTIES: SpecialtyDef[] = [
  { key: 'Clínica Geral',          label: 'Clínica Geral',         slug: 'general_practice',  emoji: '🩺', color: '#C06A1A' },
  { key: 'Cardiologia',            label: 'Cardiologia',           slug: 'cardiology',        emoji: '❤️', color: '#C0415A' },
  { key: 'Neurologia',             label: 'Neurologia',            slug: 'neurology',         emoji: '🧠', color: '#6640C8' },
  { key: 'Pneumologia',            label: 'Pneumologia',           slug: 'pulmonology',       emoji: '🫁', color: '#2C72B8' },
  { key: 'Gastroenterologia',      label: 'Gastroenterologia',     slug: 'gastroenterology',  emoji: '🍽️', color: '#7C3AED' },
  { key: 'Hematologia',            label: 'Hematologia',           slug: 'hematology',        emoji: '🩸', color: '#BE123C' },
  { key: 'Ortopedia',              label: 'Ortopedia',             slug: 'orthopedics',       emoji: '🦴', color: '#92400E' },
  { key: 'Endocrinologia',         label: 'Endocrinologia',        slug: 'endocrinology',     emoji: '💉', color: '#0E7490' },
  { key: 'Dermatologia',           label: 'Dermatologia',          slug: 'dermatology',       emoji: '🩹', color: '#D97706' },
  { key: 'Ginecologia',            label: 'Ginecologia',           slug: 'gynecology',        emoji: '♀️', color: '#DB2777' },
  { key: 'Infectologia',           label: 'Infectologia',          slug: 'infectious_disease',emoji: '🦠', color: '#1E8C68' },
  { key: 'Nefrologia',             label: 'Nefrologia',            slug: 'nephrology',        emoji: '🧪', color: '#0369A1' },
  { key: 'Pediatria',              label: 'Pediatria',             slug: 'pediatrics',        emoji: '🧸', color: '#EA580C' },
  { key: 'Urgência e Emergência',  label: 'Urgência e Emergência', slug: 'emergency',         emoji: '🚨', color: '#DC2626' },
];

/** Fallback para especialidades desconhecidas */
export const SPECIALTY_DEFAULT: SpecialtyDef = {
  key: '',
  label: 'Geral',
  slug: 'general',
  emoji: '🏥',
  color: '#6366f1',
};

/** Lookup rápido por chave (inclui alias legados) */
const SPECIALTY_ALIASES: Record<string, string> = {
  'Clínica':   'Clínica Geral',
  'Emergência': 'Urgência e Emergência',
  'Geral':      'Clínica Geral',
};

export function getSpecialty(key: string | null | undefined): SpecialtyDef {
  if (!key) return SPECIALTY_DEFAULT;
  const resolved = SPECIALTY_ALIASES[key] ?? key;
  return SPECIALTIES.find(s => s.key === resolved) ?? { ...SPECIALTY_DEFAULT, key, label: key, slug: '' };
}

/**
 * Rótulo traduzido de uma especialidade. Especialidade fora da lista canônica
 * (`slug` vazio) cai no próprio valor vindo do banco, que segue em pt-BR (D5).
 */
export function specialtyLabel(key: string | null | undefined): string {
  const spec = getSpecialty(key);
  if (!spec.slug) return spec.label;
  return i18n.t(`specialties.${spec.slug}`, { ns: 'common', defaultValue: spec.label });
}

/** Cor hex de uma especialidade */
export function specialtyColor(key: string | null | undefined): string {
  return getSpecialty(key).color;
}

/** Emoji de uma especialidade */
export function specialtyEmoji(key: string | null | undefined): string {
  return getSpecialty(key).emoji;
}
