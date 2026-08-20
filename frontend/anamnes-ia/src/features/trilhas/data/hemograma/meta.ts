import type { UnidadeMeta } from '../../types/trilha';

// ─────────────────────────────────────────────────────────────────────────────
// Esqueleto da trilha de Hemograma: só os metadados (títulos, XP, contagens).
// Os exercícios ficam em m1.json … m8.json e são carregados sob demanda.
// Conteúdo autoral — ver data/hemograma/README.md antes de publicar.
// ─────────────────────────────────────────────────────────────────────────────

export const HEMOGRAMA_UNIDADES: UnidadeMeta[] = [
  {
    id: 'hemo-m1',
    titulo: 'Lendo o hemograma',
    descricao: 'As três séries, as unidades e o que o aparelho realmente mede.',
    emoji: '🧾',
    licoes: [
      { id: 'hemo-m1-l1', titulo: 'As três séries', emoji: '🌱', xp: 12, totalExercicios: 9 },
      { id: 'hemo-m1-l2', titulo: 'Valores de referência', emoji: '📏', xp: 14, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m2',
    titulo: 'Série vermelha e índices',
    descricao: 'VCM, HCM, CHCM e RDW: o que cada sigla realmente informa.',
    emoji: '🩸',
    licoes: [
      { id: 'hemo-m2-l1', titulo: 'VCM, HCM e CHCM', emoji: '🩸', xp: 16, totalExercicios: 9 },
      { id: 'hemo-m2-l2', titulo: 'RDW e reticulócitos', emoji: '📊', xp: 18, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m3',
    titulo: 'Anemias microcíticas',
    descricao: 'Ferropenia, talassemia e doença crônica: como separá-las.',
    emoji: '🔬',
    licoes: [
      { id: 'hemo-m3-l1', titulo: 'Anemia ferropriva', emoji: '🍖', xp: 20, totalExercicios: 9 },
      { id: 'hemo-m3-l2', titulo: 'Talassemia e doença crônica', emoji: '🧬', xp: 22, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m4',
    titulo: 'Macro e normocíticas',
    descricao: 'Megaloblástica, hemólise e falência medular.',
    emoji: '🧫',
    licoes: [
      { id: 'hemo-m4-l1', titulo: 'Anemias macrocíticas', emoji: '💊', xp: 24, totalExercicios: 9 },
      { id: 'hemo-m4-l2', titulo: 'Normocíticas e hemólise', emoji: '💥', xp: 26, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m5',
    titulo: 'Leucograma normal',
    descricao: 'Quem é quem entre os leucócitos e por que o valor absoluto manda.',
    emoji: '🛡️',
    licoes: [
      { id: 'hemo-m5-l1', titulo: 'As cinco linhagens', emoji: '🛡️', xp: 28, totalExercicios: 9 },
      { id: 'hemo-m5-l2', titulo: 'Da medula ao sangue', emoji: '🦠', xp: 30, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m6',
    titulo: 'Alterações do leucograma',
    descricao: 'Neutrofilia, linfocitose, eosinofilia e os sinais que não podem passar.',
    emoji: '⚠️',
    licoes: [
      { id: 'hemo-m6-l1', titulo: 'Neutrofilia e desvio à esquerda', emoji: '🔥', xp: 32, totalExercicios: 9 },
      { id: 'hemo-m6-l2', titulo: 'Linfocitose, eosinofilia e alarmes', emoji: '🩹', xp: 34, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m7',
    titulo: 'Série plaquetária',
    descricao: 'Quando a plaquetopenia sangra e quando ela nem é real.',
    emoji: '🩹',
    licoes: [
      { id: 'hemo-m7-l1', titulo: 'Trombocitopenia', emoji: '🪤', xp: 36, totalExercicios: 9 },
      { id: 'hemo-m7-l2', titulo: 'Trombocitose e armadilhas', emoji: '🧩', xp: 38, totalExercicios: 9 },
    ],
  },
  {
    id: 'hemo-m8',
    titulo: 'Integrando o hemograma',
    descricao: 'Ler as três séries juntas e decidir o próximo passo.',
    emoji: '🧩',
    licoes: [
      { id: 'hemo-m8-l1', titulo: 'Padrões combinados', emoji: '🏥', xp: 40, totalExercicios: 9 },
      { id: 'hemo-m8-l2', titulo: 'Casos e decisões', emoji: '🏆', xp: 40, totalExercicios: 9 },
    ],
  },
];
