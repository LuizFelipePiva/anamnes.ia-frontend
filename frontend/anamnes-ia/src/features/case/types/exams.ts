/**
 * Exames complementares (SPEC-014).
 *
 * Os dois tipos existem separados de propósito e **não** compartilham herança:
 * `MedicalAsset` carrega o gabarito e só o professor recebe; `StudentExam` é o
 * que a API entrega ao aluno. Se um fosse `Omit<>` do outro, um campo novo no
 * catálogo entraria na visão do aluno sem ninguém decidir isso.
 */

/**
 * `audio` cobre ausculta. Quem consome precisa ramificar de verdade: um áudio
 * caindo no ramo `<img>` vira imagem quebrada, e o aluno não tem como saber que
 * era para ouvir.
 */
export type MediaType = 'image' | 'video' | 'gif' | 'audio';

/** Créditos de licença, quando o acervo os traz. Formato livre do pacote de origem. */
export type AssetCredits = Record<string, unknown> | unknown[] | null;

/** Item do catálogo na visão do professor — **inclui o diagnóstico**. */
export interface MedicalAsset {
  id: string;
  modality: string;
  display_name: string;
  diagnosis_or_finding: string;
  url: string | null;
  media_type: MediaType;
  tags: string[];
  attachment_eligible: boolean;
  credits: AssetCredits;
  license: string | null;
  source_url: string | null;
}

/**
 * Rótulo neutro: chave i18n + numeração de desempate.
 *
 * O backend manda chave, não texto, porque quem escolhe o idioma é o front —
 * e `ordinal` vem separado para que "Radiografia 2" continue traduzível.
 */
export interface ExamLabel {
  key: string;
  ordinal: number | null;
}

/**
 * Item na visão do aluno — sem `display_name`, sem `diagnosis_or_finding` e
 * **sem `id`**.
 *
 * A ausência do `id` é regra, não descuido: o acervo usa identificadores
 * falantes (`RX-PNEUMO-001`), então o campo era o gabarito viajando no JSON.
 * A lista já vem ordenada pelo professor, e a posição basta como chave de
 * renderização.
 */
export interface StudentExam {
  label: ExamLabel;
  url: string | null;
  media_type: MediaType;
  credits: AssetCredits;
}
