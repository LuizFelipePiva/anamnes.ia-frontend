// ── Modelo de dados das Trilhas ──────────────────────────────────────────────
// Conteúdo puro: nenhuma dependência de rede ou de UI.
// Para adicionar uma trilha, ver data/index.ts.

export type ExercicioTipo =
  | 'escolha_unica'
  | 'vf'
  | 'ordenar'
  | 'associar'
  | 'classificar'
  | 'numerico'
  | 'hotspot';

interface ExercicioBase {
  id: string;
  enunciado: string;
  /** Texto mostrado no rodapé depois de responder. Nem toda questão tem. */
  explicacao?: string;
  /** Traçado de ECG, foto de monitor, etc. */
  imagemUrl?: string;
  /** Aparece no botão de dica antes de responder. */
  dica?: string;
}

/** Uma alternativa correta entre N. */
export interface ExEscolhaUnica extends ExercicioBase {
  tipo: 'escolha_unica';
  alternativas: string[];
  /** Índice da alternativa correta em `alternativas`. */
  correta: number;
}

/** Verdadeiro ou falso. */
export interface ExVerdadeiroFalso extends ExercicioBase {
  tipo: 'vf';
  correta: boolean;
}

/** Colocar itens na ordem certa. A ordem correta é a ordem do array. */
export interface ExOrdenar extends ExercicioBase {
  tipo: 'ordenar';
  itens: string[];
}

/** Ligar cada chave ao seu valor. A coluna da direita é embaralhada na tela. */
export interface ExAssociar extends ExercicioBase {
  tipo: 'associar';
  pares: { chave: string; valor: string }[];
}

/** Distribuir itens entre categorias. */
export interface ExClassificar extends ExercicioBase {
  tipo: 'classificar';
  categorias: string[];
  itens: { texto: string; categoria: string }[];
}

/** Escolher um valor numérico dentro de uma faixa aceita. */
export interface ExNumerico extends ExercicioBase {
  tipo: 'numerico';
  unidade: string;
  min: number;
  max: number;
  passo: number;
  /** [mínimo aceito, máximo aceito] — inclusive nos dois extremos. */
  faixaCorreta: [number, number];
}

/**
 * Marcar a alteração na imagem.
 *
 * Coordenadas em fração do quadro (0 a 1), não em pixels: a mesma questão
 * funciona em qualquer tamanho de tela e sobrevive a redimensionamento da
 * imagem no pipeline. Mapeia direto o `bounding_box` da biblioteca clínica.
 */
export interface ExHotspot extends ExercicioBase {
  tipo: 'hotspot';
  /** Obrigatória neste tipo — sem imagem não há o que marcar. */
  imagemUrl: string;
  alvos: AlvoHotspot[];
  /** Quantos cliques o aluno pode dar. Padrão: número de alvos. */
  maxCliques?: number;
  /** Texto do rótulo mostrado sobre cada alvo ao revelar a resposta. */
  legendaAlvos?: string;
}

export interface AlvoHotspot {
  /** Canto superior esquerdo, em fração da largura/altura da imagem. */
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Nome da estrutura ou achado, exibido na correção. */
  rotulo?: string;
}

export type Exercicio =
  | ExEscolhaUnica
  | ExVerdadeiroFalso
  | ExOrdenar
  | ExAssociar
  | ExClassificar
  | ExNumerico
  | ExHotspot;

export interface Licao {
  id: string;
  titulo: string;
  emoji: string;
  xp: number;
  exercicios: Exercicio[];
  /**
   * Ressalva mostrada ao aluno antes de começar. Existe para que uma limitação
   * do conteúdo — imagens ainda sem revisão clínica, por exemplo — apareça para
   * quem está aprendendo, em vez de ficar só no repositório.
   */
  aviso?: string;
}

/** Unidade com o conteúdo completo (formato de autoria em TypeScript). */
export interface Unidade {
  id: string;
  titulo: string;
  descricao: string;
  licoes: Licao[];
}

/** Trilha inteira em memória. Usado por trilhas pequenas escritas em .ts. */
export interface Trilha {
  id: string;
  titulo: string;
  descricao: string;
  emoji: string;
  cor: string;
  corEscura: string;
  unidades: Unidade[];
}

// ── Metadados (esqueleto carregado à vista, sem os exercícios) ────────────────

export interface LicaoMeta {
  id: string;
  titulo: string;
  emoji: string;
  xp: number;
  totalExercicios: number;
  /** Espelha `Licao.aviso` — o mapa sinaliza antes de o aluno entrar. */
  aviso?: string;
}

export interface UnidadeMeta {
  id: string;
  titulo: string;
  descricao: string;
  emoji?: string;
  licoes: LicaoMeta[];
}

export interface TrilhaMeta {
  id: string;
  titulo: string;
  descricao: string;
  emoji: string;
  /** Cor de destaque da trilha (gradientes, nós, barra). */
  cor: string;
  corEscura: string;
  unidades: UnidadeMeta[];
}

// ── Respostas do aluno ───────────────────────────────────────────────────────

export type Resposta =
  | { tipo: 'escolha_unica'; valor: number }
  | { tipo: 'vf'; valor: boolean }
  /** Índices de `itens` na ordem escolhida pelo aluno. */
  | { tipo: 'ordenar'; valor: number[] }
  /** índice do par (coluna esquerda) → índice do valor escolhido (coluna direita). */
  | { tipo: 'associar'; valor: Record<number, number> }
  /** índice do item → nome da categoria escolhida. */
  | { tipo: 'classificar'; valor: Record<number, string> }
  | { tipo: 'numerico'; valor: number }
  /** Cliques do aluno, em fração do quadro da imagem. */
  | { tipo: 'hotspot'; valor: { x: number; y: number }[] };

// ── Progresso e repetição espaçada ───────────────────────────────────────────

export interface ProgressoLicao {
  concluida: boolean;
  /** Melhor precisão já obtida (0–100). */
  melhorPrecisao: number;
  tentativas: number;
  ultimaEm: string;
}

/** Cartão SM-2 de um exercício individual. */
export interface CartaoSrs {
  /** Fator de facilidade (SM-2). Começa em 2.5, piso 1.3. */
  facilidade: number;
  /** Intervalo atual, em dias. */
  intervalo: number;
  /** Acertos consecutivos. */
  repeticoes: number;
  /** Quantas vezes o aluno errou depois de já ter acertado. */
  lapsos: number;
  /** Data (YYYY-MM-DD) em que o cartão volta a vencer. */
  venceEm: string;
  /** Trilha a que o exercício pertence — permite revisar por trilha. */
  trilhaId: string;
  /** Lição de origem — usada para recarregar o exercício na revisão. */
  licaoId: string;
}

export interface ProgressoGlobal {
  versao: 2;
  xp: number;
  /** Dias consecutivos de estudo. */
  ofensiva: number;
  /** ISO date (YYYY-MM-DD) do último dia com atividade. */
  ultimoDia: string | null;
  /** `${trilhaId}:${licaoId}` → progresso. */
  licoes: Record<string, ProgressoLicao>;
  /** `${exercicioId}` → cartão de revisão espaçada. */
  cartoes: Record<string, CartaoSrs>;
}

export interface ResultadoLicao {
  acertos: number;
  total: number;
  precisao: number;
  xpGanho: number;
  segundos: number;
  vidasRestantes: number;
  falhou: boolean;
}
