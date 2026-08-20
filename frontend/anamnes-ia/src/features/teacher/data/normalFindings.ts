import type { ExameFisicoSistema } from './suggestionsData';

export const NORMAL_FINDINGS: Record<string, ExameFisicoSistema[]> = {
  respiratorio: [
    { item: 'Inspeção Estática', achado: 'Tórax simétrico, sem abaulamentos ou retrações.' },
    { item: 'Inspeção Dinâmica', achado: 'Respiração torácica, sem uso de musculatura acessória, frequência respiratória normal.' },
    { item: 'Expansibilidade', achado: 'Preservada e simétrica em bases e ápices pulmonares.' },
    { item: 'Frêmito Toracovocal (FTV)', achado: 'Normal e simétrico em todos os campos pulmonares.' },
    { item: 'Percussão', achado: 'Som claro pulmonar em toda a extensão do tórax.' },
    { item: 'Ausculta', achado: 'Murmúrio vesicular universalmente audível, sem ruídos adventícios.' }
  ],
  cardiovascular: [
    { item: 'Inspeção (Ictus Cordis)', achado: 'Visível e palpável no 5º espaço intercostal esquerdo, linha hemiclavicular.' },
    { item: 'Ausculta', achado: 'Bulas rítmicas e normofonéticas em 2 tempos, sem sopros.' },
    { item: 'Pulsos Periféricos', achado: 'Simétricos, amplos, rítmicos e com frequência normal em todos os membros.' },
    { item: 'Enchimento Capilar', achado: 'Perfuso e normal (menor que 2 segundos).' },
    { item: 'Turgência Jugular', achado: 'Ausência de turgência jugular a 45 graus.' }
  ],
  abdome: [
    { item: 'Inspeção', achado: 'Plano, simétrico, sem cicatrizes ou circulações colaterais.' },
    { item: 'Ausculta', achado: 'Ruídos hidroaéreos (RHA) presentes e normais em todos os quadrantes.' },
    { item: 'Percussão', achado: 'Som timpânico em todo o abdome, espaço de Traube livre.' },
    { item: 'Fígado', achado: 'Fígado impalpável ou a 1-2 cm do bordo costal direito, superfície lisa.' },
    { item: 'Baço', achado: 'Baço impalpável e espaço de Traube livre.' },
    { item: 'Palpação Superficial', achado: 'Abdome indolor, sem massas ou tensões.' },
    { item: 'Palpação Profunda', achado: 'Ausência de massas, visceromegalias ou sinais de irritação peritoneal.' }
  ],
  neurologico: [
    { item: 'Nível de Consciência', achado: 'Lúcido e orientado em tempo e espaço (Glasgow 15).' },
    { item: 'Pupilas', achado: 'Isocóricas e fotorreativas (reflexos direto e consensual preservados).' },
    { item: 'Força Motora', achado: 'Grau V em todos os grupos musculares, simétrica.' },
    { item: 'Sensibilidade', achado: 'Preservada (tátil, térmica e dolorosa) em todos os dermátomos.' },
    { item: 'Coordenação e Equilíbrio', achado: 'Index-nariz preservado, marcha estável, Romberg negativo.' },
    { item: 'Reflexos', achado: 'Normorreflexia global e simétrica (biciptal, triciptal, patelar e aquileu).' },
    { item: 'Sinais Meníngeos', achado: 'Rigidez de nuca ausente, Kernig e Brudzinski negativos.' }
  ],
  musculoesqueletico: [
    { item: 'Inspeção', achado: 'Ausência de deformidades, edemas ou sinais inflamatórios articulares.' },
    { item: 'Palpação', achado: 'Ausência de pontos dolorosos ou crepitações ósseas.' },
    { item: 'Amplitude de Movimento', achado: 'Movimentos ativos e passivos preservados em todas as articulações.' },
    { item: 'Coluna Vertebral', achado: 'Alinhamento preservado, ausência de dor à palpação das espinhosas.' }
  ],
  geral: [
    { item: 'Estado Geral', achado: 'Bom estado geral (BEG), corado, hidratado, acianótico e anictérico.' },
    { item: 'Fácies', achado: 'Fácies atípica, sem sinais de sofrimento ou dor.' },
    { item: 'Hidratação', achado: 'Pele e mucosas úmidas, turgor e elasticidade preservados.' },
    { item: 'Linfonodos', achado: 'Cadeias ganglionares impalpáveis e indolores.' }
  ],
  inspecao: [
    { item: 'Pele (Geral)', achado: 'Íntegra, sem lesões elementares ou alterações de coloração.' },
    { item: 'Cabeça', achado: 'Normocéfalo, implantação capilar normal, sem lesões em couro cabeludo.' },
    { item: 'Tórax', achado: 'Configuração normal, sem abaulamentos ou retrações.' },
    { item: 'Abdômen', achado: 'Plano, sem cicatrizes ou hérnias visíveis.' },
    { item: 'Extremidades', achado: 'Sem edemas, cianose ou alterações tróficas.' }
  ]
};
