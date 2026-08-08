// ─────────────────────────────────────────────────────────────────────────────
// Biblioteca clínica normalizada — camada 2 da arquitetura.
//
// Este arquivo é o contrato entre o pipeline de ingestão (Python, fora do app)
// e o banco de questões. Uma imagem aqui não é um exercício: é matéria-prima da
// qual o gerador extrai vários exercícios.
//
// Nenhuma imagem entra no app com `medicalReviewStatus` diferente de
// 'aprovado'. Os rótulos automáticos das bases públicas (NIH em especial) não
// são gabarito.
// ─────────────────────────────────────────────────────────────────────────────

export type Trilha = 'torax' | 'fraturas' | 'cervical' | 'cranio-face' | 'abdome';

export type Modalidade = 'radiografia' | 'tomografia';

export type Projecao =
  | 'PA'
  | 'AP'
  | 'perfil'
  | 'obliqua'
  | 'decubito-lateral'
  | 'axial'
  | 'panoramica'
  | 'teleradiografia-lateral'
  | 'indeterminada';

export type Lateralidade = 'direita' | 'esquerda' | 'bilateral' | 'nao-aplicavel';

export type FaixaEtaria = 'neonatal' | 'pediatrico' | 'adulto' | 'idoso' | 'desconhecida';

export type Dificuldade = 1 | 2 | 3 | 4 | 5;

export type StatusRevisao = 'pendente' | 'em-revisao' | 'aprovado' | 'rejeitado';

/** Caixa em fração do quadro (0–1), independente da resolução do arquivo. */
export interface CaixaRelativa {
  x: number;
  y: number;
  largura: number;
  altura: number;
  rotulo?: string;
}

/** Procedência e licença — obrigatórias para toda imagem. */
export interface Procedencia {
  /** Nome curto da base: 'grazpedwri-dx', 'fracatlas', 'nih-cxr14'… */
  nomeBase: string;
  versao: string;
  autores: string[];
  doi?: string;
  licenca: string;
  linkLicenca: string;
  /** O que foi alterado em relação ao original — exigido por CC BY. */
  modificacoes: string[];
  /** Texto de atribuição a ser exibido junto da imagem. */
  textoAtribuicao: string;
}

export interface ImagemClinica {
  imageId: string;
  sourceDataset: string;
  sourceImageId: string;
  /** Agrupa incidências diferentes do mesmo exame. */
  studyId: string;
  /** Agrupa imagens do mesmo paciente — impede vazamento entre lições. */
  patientGroupId: string;

  modality: Modalidade;
  track: Trilha;
  subtrack: string;
  anatomicalRegion: string;
  projection: Projecao;
  laterality: Lateralidade;
  ageGroup: FaixaEtaria;

  normalOrAbnormal: 'normal' | 'alterado';
  primaryFinding: string | null;
  secondaryFindings: string[];
  difficulty: Dificuldade;

  boundingBox: CaixaRelativa[];
  segmentationMask?: string;

  clinicalContext?: string;
  correctAnswer: string;
  explanation: string;
  /** Quais exercícios esta imagem é capaz de gerar. */
  questionTypes: TipoQuestaoImagem[];

  procedencia: Procedencia;
  medicalReviewStatus: StatusRevisao;
  reviewer?: string;
  reviewedAt?: string;
}

/** Os dez formatos de exercício previstos para imagem. */
export type TipoQuestaoImagem =
  | 'normal-ou-alterado'
  | 'identificar-incidencia'
  | 'marcar-alteracao'
  | 'selecionar-diagnostico'
  | 'identificar-lado'
  | 'identificar-estrutura'
  | 'classificar-fratura'
  | 'avaliar-tecnica'
  | 'montar-laudo'
  | 'proxima-conduta';

/** Requisitos mínimos de cada tipo — usados pelo gerador e pelo validador. */
export const REQUISITOS_QUESTAO: Record<TipoQuestaoImagem, (keyof ImagemClinica)[]> = {
  'normal-ou-alterado': ['normalOrAbnormal'],
  'identificar-incidencia': ['projection'],
  'marcar-alteracao': ['boundingBox'],
  'selecionar-diagnostico': ['primaryFinding'],
  'identificar-lado': ['laterality'],
  'identificar-estrutura': ['boundingBox'],
  'classificar-fratura': ['primaryFinding'],
  'avaliar-tecnica': ['projection'],
  'montar-laudo': ['primaryFinding', 'explanation'],
  'proxima-conduta': ['clinicalContext', 'primaryFinding'],
};

/**
 * Uma imagem só pode virar exercício se estiver aprovada e tiver os campos que
 * o tipo exige. É a última barreira antes do banco de questões.
 */
export function apta(img: ImagemClinica, tipo: TipoQuestaoImagem): boolean {
  if (img.medicalReviewStatus !== 'aprovado') return false;
  return REQUISITOS_QUESTAO[tipo].every(campo => {
    const v = img[campo];
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  });
}

/** Marcações inválidas quebram o hotspot silenciosamente — melhor barrar antes. */
export function caixasValidas(img: ImagemClinica): boolean {
  return img.boundingBox.every(
    c =>
      c.x >= 0 && c.y >= 0 &&
      c.largura > 0 && c.altura > 0 &&
      c.x + c.largura <= 1 && c.y + c.altura <= 1,
  );
}
