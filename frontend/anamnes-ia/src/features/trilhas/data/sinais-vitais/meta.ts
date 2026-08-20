import type { UnidadeMeta } from '../../types/trilha';

// ─────────────────────────────────────────────────────────────────────────────
// Esqueleto da trilha de Sinais Vitais: só os metadados (títulos, XP, contagens).
// Os exercícios ficam em m1.json … m3.json e são carregados sob demanda, quando
// o aluno abre a lição — o mapa não paga o custo do conteúdo inteiro.
// Gerado a partir dos documentos originais; ver data/sinais-vitais/README.md.
// ─────────────────────────────────────────────────────────────────────────────

export const SINAIS_VITAIS_UNIDADES: UnidadeMeta[] = [
  {
    id: 'sv-m1',
    titulo: 'Fundamentos e Medições',
    descricao: 'O que são os cinco sinais e como aferir cada um.',
    emoji: '📋',
    licoes: [
      { id: 'sv-m1-l1', titulo: 'Fundamentos: Definição e Importância', emoji: '🌱', xp: 15, totalExercicios: 9 },
      { id: 'sv-m1-l2', titulo: 'Temperatura Corporal', emoji: '🔍', xp: 20, totalExercicios: 9 },
      { id: 'sv-m1-l3', titulo: 'Frequência de Pulso', emoji: '🧠', xp: 25, totalExercicios: 10 },
      { id: 'sv-m1-l4', titulo: 'Frequência Respiratória', emoji: '🧩', xp: 30, totalExercicios: 10 },
      { id: 'sv-m1-l5', titulo: 'Pressão Arterial', emoji: '👑', xp: 35, totalExercicios: 8 },
      { id: 'sv-m1-l6', titulo: 'Saturação de Oxigênio', emoji: '🚑', xp: 35, totalExercicios: 9 },
    ],
  },
  {
    id: 'sv-m2',
    titulo: 'Interpretação Clínica',
    descricao: 'Do número ao significado: normal, alterado e grave.',
    emoji: '🔎',
    licoes: [
      { id: 'sv-m2-l1', titulo: 'Valores Normais e Anormais', emoji: '🌱', xp: 15, totalExercicios: 11 },
      { id: 'sv-m2-l2', titulo: 'Padrões Críticos', emoji: '🔍', xp: 20, totalExercicios: 11 },
      { id: 'sv-m2-l3', titulo: 'Alterações Leves e Graves', emoji: '🧠', xp: 25, totalExercicios: 11 },
      { id: 'sv-m2-l4', titulo: 'Sinais Combinados de Deterioração', emoji: '🧩', xp: 30, totalExercicios: 11 },
      { id: 'sv-m2-l5', titulo: 'Fatores Influenciadores', emoji: '👑', xp: 35, totalExercicios: 11 },
      { id: 'sv-m2-l6', titulo: 'Casos Clínicos Práticos', emoji: '🚑', xp: 35, totalExercicios: 11 },
    ],
  },
  {
    id: 'sv-m3',
    titulo: 'Idade e Condições Especiais',
    descricao: 'Criança, gestante, idoso e paciente crítico.',
    emoji: '👥',
    licoes: [
      { id: 'sv-m3-l1', titulo: 'Diferenças entre Faixas Etárias', emoji: '🌱', xp: 15, totalExercicios: 11 },
      { id: 'sv-m3-l2', titulo: 'Sinais Vitais em Crianças', emoji: '🔍', xp: 20, totalExercicios: 11 },
      { id: 'sv-m3-l3', titulo: 'Gestantes', emoji: '🧠', xp: 25, totalExercicios: 11 },
      { id: 'sv-m3-l4', titulo: 'Idosos', emoji: '🧩', xp: 30, totalExercicios: 11 },
      { id: 'sv-m3-l5', titulo: 'Pacientes Críticos', emoji: '👑', xp: 35, totalExercicios: 11 },
      { id: 'sv-m3-l6', titulo: 'Situações de Emergência', emoji: '🚑', xp: 35, totalExercicios: 11 },
    ],
  },
];
