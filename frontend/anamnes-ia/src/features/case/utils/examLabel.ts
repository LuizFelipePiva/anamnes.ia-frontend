/**
 * Funções puras dos exames complementares (SPEC-014).
 *
 * Ficam fora dos componentes porque são a regra que não pode quebrar em
 * silêncio: `examLabel` é a última barreira entre o diagnóstico e a tela do
 * aluno, e `filterAssets` é o que decide se o professor acha o exame que
 * procura. Testar isso pelo DOM seria caro e frouxo.
 */
import type { TFunction } from 'i18next';

import type { MedicalAsset } from '../types/exams';

/**
 * Assinatura frouxa do `t`, para chaves montadas em runtime.
 *
 * `i18next.d.ts` tipa as chaves como união de literais a partir do pt-BR — bom
 * para chamadas estáticas, incompatível com `exams.modality.${slug}`, que só
 * se conhece com o dado do banco em mãos.
 */
type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Prefixo das chaves de rótulo que o backend devolve em `label.key`. */
export const MODALITY_KEY_PREFIX = 'exams.modality.';

/**
 * Teto de exames por caso. Espelha `MAX_EXAMS_PER_CASE` do backend, que é quem
 * de fato recusa (422) — aqui a constante existe só para desabilitar o clique
 * antes de o professor descobrir o limite por um erro.
 */
export const MAX_EXAMS_PER_CASE = 8;

/** Extrai o slug da modalidade da chave i18n vinda da API. */
export function modalityFromLabelKey(key: string): string {
  return key.startsWith(MODALITY_KEY_PREFIX)
    ? key.slice(MODALITY_KEY_PREFIX.length)
    : 'unknown';
}

/**
 * Texto exibido ao aluno para um exame.
 *
 * Deriva **só** da modalidade — nunca do nome do asset, que contém o
 * diagnóstico. Modalidade desconhecida cai no genérico traduzido; o fallback
 * jamais é o dado cru do banco.
 *
 * A numeração só entra quando há outro exame da mesma modalidade no caso: um
 * "Eletrocardiograma 1" solitário não informa nada.
 */
export function examLabel(
  modality: string,
  ordinal: number | null,
  t: TFunction<'case'>,
): string {
  // A chave é montada em runtime a partir da modalidade, então escapa da
  // tipagem literal de `i18next.d.ts` — daí o cast para a forma frouxa.
  const tr = t as unknown as Translate;

  const slug = (modality || '').trim().toLowerCase();
  const key = `${MODALITY_KEY_PREFIX}${slug || 'unknown'}`;

  // `defaultValue` cobre a modalidade que o backend passou a devolver mas o
  // dicionário ainda não conhece: melhor "Exame complementar" do que a chave crua.
  const base = tr(key, { defaultValue: tr(`${MODALITY_KEY_PREFIX}unknown`) });

  if (ordinal == null) return base;
  return tr('exams.numbered', { label: base, ordinal });
}

/** Normaliza para busca: minúsculas e sem acento. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Filtra o catálogo do professor por texto livre e modalidade.
 *
 * Roda em memória sobre o acervo inteiro (~200 itens): busca no servidor a
 * cada tecla custaria latência para ganhar nada nessa ordem de grandeza.
 *
 * A busca ignora acento porque metade do acervo tem diagnóstico acentuado —
 * sem isso, quem digita "pneumotorax" não encontra "Pneumotórax" e conclui que
 * o exame não existe.
 */
export function filterAssets(
  assets: MedicalAsset[],
  query: string,
  modality?: string,
): MedicalAsset[] {
  const term = normalize((query || '').trim());
  const wantedModality = (modality || '').trim().toLowerCase();

  return assets.filter((asset) => {
    if (!asset.attachment_eligible) return false;
    if (wantedModality && asset.modality?.toLowerCase() !== wantedModality) return false;
    if (!term) return true;

    const haystack = normalize(
      [asset.display_name, asset.diagnosis_or_finding, ...(asset.tags ?? [])]
        .filter(Boolean)
        .join(' '),
    );
    return haystack.includes(term);
  });
}
