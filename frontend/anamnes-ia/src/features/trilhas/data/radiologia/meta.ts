import type { UnidadeMeta } from '../../types/trilha';

// ─────────────────────────────────────────────────────────────────────────────
// Trilha de Radiologia — quatro blocos, na ordem em que se aprende:
//   tórax conceitual (m1–m5) → fraturas com imagem (m7) → abdome com
//   imagem (m8) → cervical e crânio/face (m9, m10).
// Módulos com imagem carregam `aviso`, mostrado ao aluno antes de começar.
// ─────────────────────────────────────────────────────────────────────────────

export const RADIOLOGIA_UNIDADES: UnidadeMeta[] = [
  {
    id: 'rx-torax-m1',
    titulo: 'Técnica e qualidade',
    descricao: 'Antes de interpretar, decidir se o exame pode ser interpretado.',
    emoji: '📐',
    licoes: [
      { id: 'rx-torax-m1-l1', titulo: 'Incidências', emoji: '📐', xp: 12, totalExercicios: 9 },
      { id: 'rx-torax-m1-l2', titulo: 'Rotação, inspiração e penetração', emoji: '🎚️', xp: 14, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-torax-m2',
    titulo: 'Anatomia e método ABCDE',
    descricao: 'Um roteiro fixo para não deixar achado para trás.',
    emoji: '🗺️',
    licoes: [
      { id: 'rx-torax-m2-l1', titulo: 'Reconhecer as estruturas', emoji: '🗺️', xp: 16, totalExercicios: 9 },
      { id: 'rx-torax-m2-l2', titulo: 'O roteiro ABCDE', emoji: '🔤', xp: 18, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-torax-m3',
    titulo: 'Parênquima pulmonar',
    descricao: 'Consolidação, atelectasia e edema: separar o que é branco.',
    emoji: '🫁',
    licoes: [
      { id: 'rx-torax-m3-l1', titulo: 'Consolidação e pneumonia', emoji: '🫁', xp: 20, totalExercicios: 9 },
      { id: 'rx-torax-m3-l2', titulo: 'Atelectasia, edema e congestão', emoji: '💨', xp: 22, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-torax-m4',
    titulo: 'Pleura',
    descricao: 'Derrame e pneumotórax: o que ocupa o espaço que deveria ser virtual.',
    emoji: '💧',
    licoes: [
      { id: 'rx-torax-m4-l1', titulo: 'Derrame pleural', emoji: '💧', xp: 24, totalExercicios: 9 },
      { id: 'rx-torax-m4-l2', titulo: 'Pneumotórax', emoji: '🎈', xp: 26, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-torax-m5',
    titulo: 'Coração, mediastino e dispositivos',
    descricao: 'Silhueta cardíaca, alargamento mediastinal e a conferência de tubos e cateteres.',
    emoji: '🫀',
    licoes: [
      { id: 'rx-torax-m5-l1', titulo: 'Área cardíaca e mediastino', emoji: '🫀', xp: 28, totalExercicios: 9 },
      { id: 'rx-torax-m5-l2', titulo: 'Dispositivos e sondas', emoji: '🔌', xp: 30, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-frat-m7',
    titulo: 'Fraturas — casos reais',
    descricao: 'GRAZPEDWRI-DX e FracAtlas, com padrão de referência das bases.',
    emoji: '🩻',
    licoes: [
      { id: 'rx-frat-m7-l1', titulo: 'Punho e antebraço', emoji: '🤚', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-frat-m7-l2', titulo: 'Mão e dedos', emoji: '🖐️', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-frat-m7-l3', titulo: 'Membro inferior', emoji: '🦵', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-frat-m7-l4', titulo: 'Regiões diversas', emoji: '🩻', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-frat-m7-l5', titulo: 'Ombro e úmero', emoji: '💪', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-frat-m7-l6', titulo: 'Quadril e pelve', emoji: '🦴', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
    ],
  },
  {
    id: 'rx-abd-m8',
    titulo: 'Abdome — cálculos urinários',
    descricao: 'KUB-StoneX, com máscaras de segmentação como referência.',
    emoji: '🫙',
    licoes: [
      { id: 'rx-abd-m8-l1', titulo: 'Abdome normal', emoji: '⚪', xp: 30, totalExercicios: 6, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
      { id: 'rx-abd-m8-l2', titulo: 'Cálculos urinários', emoji: '🫘', xp: 30, totalExercicios: 10, aviso: 'Imagens de bases públicas ainda sem revisão clínica da equipe. Use para treinar o olhar; não use como referência diagnóstica.' },
    ],
  },
  {
    id: 'rx-cerv-m9',
    titulo: 'Coluna cervical',
    descricao: 'As três linhas que se seguem antes de qualquer outra coisa.',
    emoji: '🦴',
    licoes: [
      { id: 'rx-cerv-m9-l1', titulo: 'Anatomia e linhas de alinhamento', emoji: '📘', xp: 32, totalExercicios: 9 },
      { id: 'rx-cerv-m9-l2', titulo: 'Degeneração e pós-operatório', emoji: '📘', xp: 34, totalExercicios: 9 },
    ],
  },
  {
    id: 'rx-cran-m10',
    titulo: 'Crânio e face',
    descricao: 'Onde a radiografia ainda ajuda — e onde já foi substituída.',
    emoji: '💀',
    licoes: [
      { id: 'rx-cran-m10-l1', titulo: 'Anatomia e seios da face', emoji: '📘', xp: 36, totalExercicios: 9 },
      { id: 'rx-cran-m10-l2', titulo: 'Cefalometria', emoji: '📘', xp: 38, totalExercicios: 9 },
    ],
  },
];
