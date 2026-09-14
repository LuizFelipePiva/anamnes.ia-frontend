/**
 * SPEC-013 — compõe as funções puras de `studyPlan.ts` para a home.
 *
 * O hook não busca nada: recebe o que a página já carregou (perfil, casos da
 * turma, casos livres) e devolve o plano derivado. Toda a regra vive no módulo
 * puro; aqui só entra memoização e o relógio.
 */
import { useMemo } from 'react';
import type { StudentProfile } from '@/features/profile/types/profile';
import type { AvailableCase } from '@/features/chat/services/studentService';
import type { FreeCase } from '@/features/case/mocks/freeCases';
import {
  buildRecommendations,
  scoreTrend,
  soapDimensions,
  specialtyMastery,
  studyStreak,
  weeklyGoalProgress,
  weeklyStats,
  type GoalProgress,
  type MasteryRow,
  type Recommendation,
  type SoapRow,
  type Streak,
  type WeeklyStats,
} from '../utils/studyPlan';

export interface StudyPlan {
  weekly: WeeklyStats;
  trend: number | null;
  streak: Streak;
  goal: GoalProgress;
  mastery: MasteryRow[];
  /** Vazio com menos de 3 tentativas avaliadas — o bloco não renderiza. */
  soap: SoapRow[];
  recommendations: Recommendation[];
  /** Aluno sem nenhuma tentativa — a home esconde streak/domínio/pendências. */
  isEmpty: boolean;
}

export interface UseStudyPlanArgs {
  profile: StudentProfile | null;
  availableCases: AvailableCase[];
  freeCases: FreeCase[];
  /** Injetável nos testes; a página passa `new Date()`. */
  now?: Date;
}

export function useStudyPlan({ profile, availableCases, freeCases, now }: UseStudyPlanArgs): StudyPlan | null {
  // `now` só muda quando o perfil recarrega — congelar evita recomputar a cada render.
  const reference = useMemo(() => now ?? new Date(), [now]);

  return useMemo(() => {
    if (!profile) return null;
    const history = profile.history ?? [];
    const bySpecialty = profile.by_specialty ?? [];
    return {
      weekly: weeklyStats(history, reference),
      trend: scoreTrend(history, reference),
      streak: studyStreak(history, reference),
      goal: weeklyGoalProgress(history, reference),
      mastery: specialtyMastery(bySpecialty),
      soap: soapDimensions(profile.soap_profile),
      recommendations: buildRecommendations({ history, bySpecialty, availableCases, freeCases }, reference),
      isEmpty: history.length === 0,
    };
  }, [profile, availableCases, freeCases, reference]);
}
