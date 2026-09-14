/**
 * Barrel da feature `student`.
 *
 * Expõe a superfície do plano de estudos da home (SPEC-013). As páginas
 * (`pages/StudentDashboard`) continuam importadas por caminho direto no
 * roteador — entram aqui só se passarem a ser consumidas por outra feature.
 */
export { default as RecommendationsCard } from './components/home/RecommendationsCard';
export { default as MasteryCard } from './components/home/MasteryCard';
export { default as SoapCard } from './components/home/SoapCard';
export { default as StreakCard } from './components/home/StreakCard';
export { default as WeeklyGoalCard } from './components/home/WeeklyGoalCard';
export { default as PendingCard } from './components/home/PendingCard';
export { default as SummaryCard } from './components/home/SummaryCard';
export { useStudyPlan, type StudyPlan } from './hooks/useStudyPlan';
export { useWeeklySummary } from './hooks/useWeeklySummary';
export * from './utils/studyPlan';
