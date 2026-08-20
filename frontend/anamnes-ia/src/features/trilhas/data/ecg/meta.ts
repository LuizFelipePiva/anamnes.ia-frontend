import type { UnidadeMeta } from '../../types/trilha';


// ─────────────────────────────────────────────────────────────────────────────
// Esqueleto da trilha de ECG: só os metadados (títulos, contagens, XP).
// Os exercícios ficam em m1.json … m8.json e são carregados sob demanda,
// quando o aluno abre a lição — o mapa não paga o custo do conteúdo inteiro.
// Gerado a partir dos documentos originais; ver data/ecg/README.md.
// ─────────────────────────────────────────────────────────────────────────────

export const ECG_UNIDADES: UnidadeMeta[] = [
  {
    id: 'ecg-m1',
    titulo: 'Fundamentos do ECG',
    descricao: 'Papel, calibração, ondas e derivações.',
    emoji: '📐',
    licoes: [
      { id: 'ecg-m1-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 9 },
      { id: 'ecg-m1-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m1-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 11 },
      { id: 'ecg-m1-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 9 },
    ],
  },
  {
    id: 'ecg-m2',
    titulo: 'ECG Normal',
    descricao: 'O que é normal antes de reconhecer o anormal.',
    emoji: '💚',
    licoes: [
      { id: 'ecg-m2-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 9 },
      { id: 'ecg-m2-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 11 },
      { id: 'ecg-m2-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m2-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 7 },
    ],
  },
  {
    id: 'ecg-m3',
    titulo: 'Sobrecargas',
    descricao: 'Átrios e ventrículos aumentados no traçado.',
    emoji: '📈',
    licoes: [
      { id: 'ecg-m3-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m3-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m3-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 9 },
      { id: 'ecg-m3-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m3-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
  {
    id: 'ecg-m4',
    titulo: 'Bloqueios AV',
    descricao: 'Do PR alargado à dissociação completa.',
    emoji: '🚧',
    licoes: [
      { id: 'ecg-m4-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m4-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m4-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m4-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m4-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
  {
    id: 'ecg-m5',
    titulo: 'Bloqueios de Ramo',
    descricao: 'BRD, BRE e os bloqueios fasciculares.',
    emoji: '🌿',
    licoes: [
      { id: 'ecg-m5-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m5-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m5-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m5-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m5-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
  {
    id: 'ecg-m6',
    titulo: 'Arritmias',
    descricao: 'Reconhecer o ritmo em dez segundos.',
    emoji: '⚡',
    licoes: [
      { id: 'ecg-m6-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m6-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m6-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m6-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m6-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
  {
    id: 'ecg-m7',
    titulo: 'Síndromes Coronarianas I',
    descricao: 'Isquemia, lesão e necrose no traçado.',
    emoji: '🔺',
    licoes: [
      { id: 'ecg-m7-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m7-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m7-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m7-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m7-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
  {
    id: 'ecg-m8',
    titulo: 'Síndromes Coronarianas II',
    descricao: 'Padrões de alto risco e reperfusão.',
    emoji: '🚨',
    licoes: [
      { id: 'ecg-m8-l1', titulo: 'Nível 1 · Base', emoji: '🌱', xp: 15, totalExercicios: 10 },
      { id: 'ecg-m8-l2', titulo: 'Nível 2 · Aplicação', emoji: '🔍', xp: 20, totalExercicios: 10 },
      { id: 'ecg-m8-l3', titulo: 'Nível 3 · Análise', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'ecg-m8-l4', titulo: 'Nível 4 · Casos difíceis', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'ecg-m8-l5', titulo: 'Nível 5 · Domínio', emoji: '👑', xp: 35, totalExercicios: 10 },
    ],
  },
];
