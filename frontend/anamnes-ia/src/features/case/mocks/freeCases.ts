// Mock data for free clinical cases

export interface FreeCase {
  id: string;
  title: string;
  persona_nome: string;
  persona_idade: string;
  queixa_principal: string;
  description: string;
  category: 'Básico' | 'Intermediário' | 'Emergência' | 'Clínica';
  difficulty: 'easy' | 'medium' | 'hard';
  level: 'Básico' | 'Intermediário' | 'Avançado';
  area: string;
  estimatedTime: string;
  initialPrompt: string;
  available_until?: string | null;
}

export const FREE_DAILY_LIMIT = 3;

export const freeCases: FreeCase[] = [
  {
    id: '1',
    title: 'Diabetes Tipo 2',
    persona_nome: 'Ana Rodrigues',
    persona_idade: '55',
    queixa_principal: 'Sede excessiva e perda de peso não intencional há 3 semanas',
    description: 'Paciente apresentando sintomas de diabetes',
    category: 'Clínica',
    difficulty: 'medium',
    level: 'Intermediário',
    area: 'Clínica',
    estimatedTime: '15-20 min',
    initialPrompt: 'Um paciente de 55 anos chega à consulta com queixas de sede excessiva e perda de peso não intencional.'
  }
];
