/**
 * SPEC-013 — casos de teste do plano de estudos (contrato).
 * Espelha 1:1 `docs/specs/SPEC-013-casos-de-teste.md`; cada `it` cita o id do caso.
 *
 * Fase vermelha: `./studyPlan` ainda não existe. Todos os testes falham por
 * resolução de módulo até a implementação da fase 2 da SPEC-013.
 *
 * Convenções travadas aqui (não mudar sem atualizar a spec):
 * - `now` é sempre parâmetro explícito; nenhuma função lê o relógio.
 * - datas sem sufixo `Z` → horário local (regra R3, dia civil).
 */
import { describe, it, expect } from 'vitest';
import type { AttemptHistory, SoapProfile, SpecialtyStats } from '@/features/profile/types/profile';
import type { AvailableCase } from '@/features/chat/services/studentService';
import type { FreeCase } from '@/features/case/mocks/freeCases';
import {
  WEEKLY_GOAL,
  weeklyStats,
  scoreTrend,
  studyStreak,
  weeklyGoalProgress,
  specialtyMastery,
  soapDimensions,
  buildRecommendations,
  type StudyPlanInput,
} from './studyPlan';

// ─── Fixture builders ────────────────────────────────────────────────────────

/** Quarta-feira. Semana corrente = 10/08 (seg) a 16/08 (dom). */
const NOW = new Date('2026-08-12T15:00:00');

function att(o: Partial<AttemptHistory> & { attempt_id: string; started_at: string }): AttemptHistory {
  return {
    case_id: o.attempt_id,
    case_title: `Caso ${o.attempt_id}`,
    specialty: null,
    difficulty: null,
    score: null,
    feedback: null,
    status: 'completed',
    duration_seconds: null,
    is_ai_chat: false,
    ...o,
  };
}

function spec(specialty: string, attempts: number, average_score: number, completed = attempts): SpecialtyStats {
  return { specialty, attempts, completed, average_score };
}

function classCase(o: Partial<AvailableCase> & { id: string }): AvailableCase {
  return {
    title: `Turma ${o.id}`,
    specialty: null,
    difficulty: 'Intermediário',
    summary: null,
    available_until: null,
    created_at: '2026-08-01T00:00:00',
    attempts_count: 0,
    best_score: null,
    last_status: null,
    class_names: ['Turma A'],
    expires_at: null,
    ...o,
  };
}

/**
 * `FreeCase` não tem campo `specialty` — a especialidade vive em `area`
 * (`features/case/mocks/freeCases.ts`). O motor `weak`/`stale` casa por `area`.
 */
function freeCase(o: Partial<FreeCase> & { id: string }): FreeCase {
  return {
    title: `Livre ${o.id}`,
    persona_nome: 'Paciente',
    persona_idade: '40',
    queixa_principal: 'Dor',
    description: '—',
    category: 'Clínica',
    difficulty: 'medium',
    level: 'Intermediário',
    area: 'clinica_medica',
    estimatedTime: '15-20 min',
    initialPrompt: '—',
    ...o,
  };
}

function planInput(o: Partial<StudyPlanInput> = {}): StudyPlanInput {
  return { history: [], bySpecialty: [], availableCases: [], freeCases: [], ...o };
}

// ─── §2 weeklyStats ──────────────────────────────────────────────────────────

describe('weeklyStats (T1)', () => {
  // P1 fechada: chat IA conta como tentativa; o único filtro de nota é `score !== null`.
  const base: AttemptHistory[] = [
    att({ attempt_id: 'a1', started_at: '2026-08-12T09:00:00', status: 'completed', score: 80 }),
    att({ attempt_id: 'a2', started_at: '2026-08-11T09:00:00', status: 'completed', score: 60 }),
    att({ attempt_id: 'a3', started_at: '2026-08-10T09:00:00', status: 'in_progress', score: null }),
    att({ attempt_id: 'a4', started_at: '2026-08-12T10:00:00', status: 'completed', score: 100, is_ai_chat: true }),
    att({ attempt_id: 'a5', started_at: '2026-08-08T09:00:00', status: 'completed', score: 20 }),
  ];

  it('T1.1: conta 4 tentativas na semana corrente (a5 é da semana passada)', () => {
    expect(weeklyStats(base, NOW).attempts).toBe(4);
  });

  it('T1.2: conta 3 concluídas (a1, a2, a4)', () => {
    expect(weeklyStats(base, NOW).completed).toBe(3);
  });

  it('T1.3: média 80 — inclui o chat IA, sem filtro por is_ai_chat', () => {
    expect(weeklyStats(base, NOW).avgScore).toBe(80);
  });

  it('T1.3b: chat IA sem nota entra em attempts e não afeta avgScore', () => {
    const h = [
      att({ attempt_id: 'x1', started_at: '2026-08-11T09:00:00', score: 60 }),
      att({ attempt_id: 'x2', started_at: '2026-08-11T10:00:00', score: null, is_ai_chat: true }),
    ];
    expect(weeklyStats(h, NOW)).toEqual({ attempts: 2, completed: 2, avgScore: 60 });
  });

  it('T1.4: histórico vazio devolve o zero do tipo', () => {
    expect(weeklyStats([], NOW)).toEqual({ attempts: 0, completed: 0, avgScore: null });
  });

  it('T1.5: semana sem nenhuma nota devolve avgScore null, nunca 0', () => {
    const h = [att({ attempt_id: 'y1', started_at: '2026-08-11T09:00:00', status: 'in_progress', score: null })];
    expect(weeklyStats(h, NOW).avgScore).toBeNull();
  });

  it('T1.6: limite da semana — segunda 00:00 entra, domingo 23:59 não', () => {
    const dentro = [att({ attempt_id: 'in', started_at: '2026-08-10T00:00:00' })];
    const fora = [att({ attempt_id: 'out', started_at: '2026-08-09T23:59:00' })];
    expect(weeklyStats(dentro, NOW).attempts).toBe(1);
    expect(weeklyStats(fora, NOW).attempts).toBe(0);
  });
});

// ─── §3 scoreTrend ───────────────────────────────────────────────────────────

describe('scoreTrend (T2)', () => {
  /** Janela recente: [now-7d, now]. Janela anterior: [now-14d, now-7d). */
  const recente = (id: string, score: number) => att({ attempt_id: id, started_at: '2026-08-10T09:00:00', score });
  const anterior = (id: string, score: number) => att({ attempt_id: id, started_at: '2026-08-02T09:00:00', score });

  it('T2.1: recente 78 vs anterior 72 devolve 6', () => {
    const h = [recente('r1', 80), recente('r2', 76), anterior('p1', 70), anterior('p2', 74)];
    expect(scoreTrend(h, NOW)).toBe(6);
  });

  it('T2.2: recente 70 vs anterior 74 devolve -4', () => {
    const h = [recente('r1', 70), anterior('p1', 74)];
    expect(scoreTrend(h, NOW)).toBe(-4);
  });

  it('T2.3: janela anterior sem nota devolve null (não 0)', () => {
    expect(scoreTrend([recente('r1', 80)], NOW)).toBeNull();
  });

  it('T2.4: janela recente sem nota devolve null', () => {
    expect(scoreTrend([anterior('p1', 80)], NOW)).toBeNull();
  });

  it('T2.5: empate exato devolve 0 — valor válido, distinto de null (P2)', () => {
    const trend = scoreTrend([recente('r1', 70), anterior('p1', 70)], NOW);
    expect(trend).toBe(0);
    expect(trend).not.toBeNull();
  });

  it('T2.6: arredonda meio para cima — 78.5 − 72 devolve 7', () => {
    const h = [recente('r1', 80), recente('r2', 77), anterior('p1', 70), anterior('p2', 74)];
    expect(scoreTrend(h, NOW)).toBe(7);
  });

  it('T2.7: ignora apenas score null; chat IA com nota conta (P1)', () => {
    const h = [
      recente('r1', 80),
      att({ attempt_id: 'r2', started_at: '2026-08-10T10:00:00', score: null }),
      att({ attempt_id: 'r3', started_at: '2026-08-10T11:00:00', score: 76, is_ai_chat: true }),
      anterior('p1', 72),
    ];
    expect(scoreTrend(h, NOW)).toBe(6);
  });
});

// ─── §4 studyStreak ──────────────────────────────────────────────────────────

describe('studyStreak (T3)', () => {
  const dia = (id: string, iso: string) => att({ attempt_id: id, started_at: iso });

  it('T3.1: tentativas em 10, 11 e 12/08 devolvem current 3', () => {
    const h = [dia('d1', '2026-08-10T09:00:00'), dia('d2', '2026-08-11T09:00:00'), dia('d3', '2026-08-12T09:00:00')];
    expect(studyStreak(h, NOW).current).toBe(3);
  });

  it('T3.2: sem tentativa hoje a sequência não quebra — current 2', () => {
    const h = [dia('d1', '2026-08-10T09:00:00'), dia('d2', '2026-08-11T09:00:00')];
    expect(studyStreak(h, NOW).current).toBe(2);
  });

  it('T3.3: última tentativa anteontem devolve current 0', () => {
    expect(studyStreak([dia('d1', '2026-08-09T09:00:00')], NOW).current).toBe(0);
  });

  it('T3.4: duas tentativas no mesmo dia contam 1', () => {
    const h = [dia('d1', '2026-08-12T09:00:00'), dia('d2', '2026-08-12T18:00:00')];
    expect(studyStreak(h, NOW).current).toBe(1);
  });

  it('T3.5: best olha o histórico inteiro — current 3, best 11', () => {
    const maio = Array.from({ length: 11 }, (_, i) =>
      dia(`m${i}`, `2026-05-${String(i + 1).padStart(2, '0')}T09:00:00`),
    );
    const agora = [
      dia('d1', '2026-08-10T09:00:00'),
      dia('d2', '2026-08-11T09:00:00'),
      dia('d3', '2026-08-12T09:00:00'),
    ];
    expect(studyStreak([...maio, ...agora], NOW)).toMatchObject({ current: 3, best: 11 });
  });

  it('T3.6: week tem 7 booleanos com índice 0 = segunda', () => {
    const h = [dia('d1', '2026-08-10T09:00:00'), dia('d2', '2026-08-11T09:00:00'), dia('d3', '2026-08-12T09:00:00')];
    expect(studyStreak(h, NOW).week).toEqual([true, true, true, false, false, false, false]);
  });

  it('T3.7: histórico vazio devolve o zero do tipo', () => {
    expect(studyStreak([], NOW)).toEqual({ current: 0, best: 0, week: Array(7).fill(false) });
  });

  it('T3.8: 23:30 de ontem e 00:30 de hoje contam 2 dias (limite civil)', () => {
    const h = [dia('d1', '2026-08-11T23:30:00'), dia('d2', '2026-08-12T00:30:00')];
    expect(studyStreak(h, NOW).current).toBe(2);
  });
});

// ─── §5 weeklyGoalProgress ───────────────────────────────────────────────────

describe('weeklyGoalProgress (T4)', () => {
  const concluida = (id: string) => att({ attempt_id: id, started_at: '2026-08-11T09:00:00', status: 'completed' });

  it('T4.1: 3 concluídas na semana devolvem 60%', () => {
    const h = [concluida('c1'), concluida('c2'), concluida('c3')];
    expect(weeklyGoalProgress(h, NOW)).toEqual({ done: 3, goal: WEEKLY_GOAL, pct: 60 });
  });

  it('T4.2: nenhuma concluída devolve 0%', () => {
    expect(weeklyGoalProgress([], NOW)).toEqual({ done: 0, goal: WEEKLY_GOAL, pct: 0 });
  });

  it('T4.3: 7 concluídas — done mostra o real, pct satura em 100', () => {
    const h = Array.from({ length: 7 }, (_, i) => concluida(`c${i}`));
    expect(weeklyGoalProgress(h, NOW)).toEqual({ done: 7, goal: WEEKLY_GOAL, pct: 100 });
  });

  it('T4.4: só status completed conta', () => {
    const h = [
      concluida('c1'),
      att({ attempt_id: 'c2', started_at: '2026-08-11T09:00:00', status: 'in_progress' }),
      att({ attempt_id: 'c3', started_at: '2026-08-11T09:00:00', status: 'abandoned' }),
    ];
    expect(weeklyGoalProgress(h, NOW).done).toBe(1);
  });
});

// ─── §6 specialtyMastery ─────────────────────────────────────────────────────

describe('specialtyMastery (T5)', () => {
  it('T5.1: ordena por average_score crescente (o fraco primeiro)', () => {
    const rows = specialtyMastery([spec('pediatria', 4, 90), spec('cardiologia', 3, 52), spec('neurologia', 3, 70)]);
    expect(rows.map(r => r.specialty)).toEqual(['cardiologia', 'neurologia', 'pediatria']);
  });

  it('T5.2: descarta especialidade sem tentativa', () => {
    const rows = specialtyMastery([spec('pediatria', 0, 0, 0), spec('cardiologia', 3, 52)]);
    expect(rows.map(r => r.specialty)).toEqual(['cardiologia']);
  });

  it('T5.2b: descarta a sentinela average_score 0 com tentativas (P5)', () => {
    // `routes/profile.py:111` devolve 0, não null, quando não há nota nenhuma.
    const rows = specialtyMastery([spec('pediatria', 4, 0), spec('cardiologia', 3, 52)]);
    expect(rows.map(r => r.specialty)).toEqual(['cardiologia']);
  });

  it('T5.2c: nota real 1 aparece — o corte é exatamente em 0', () => {
    const rows = specialtyMastery([spec('pediatria', 4, 1), spec('cardiologia', 3, 52)]);
    expect(rows.map(r => r.specialty)).toEqual(['pediatria', 'cardiologia']);
  });

  it('T5.3: corta em 5 linhas com 14 especialidades', () => {
    const todas = Array.from({ length: 14 }, (_, i) => spec(`esp_${i}`, 3, 40 + i));
    expect(specialtyMastery(todas)).toHaveLength(5);
  });

  it('T5.4: faixas 59 low, 60 mid, 79 mid, 80 high', () => {
    const rows = specialtyMastery([spec('a', 3, 59), spec('b', 3, 60), spec('c', 3, 79), spec('d', 3, 80)]);
    expect(rows.map(r => r.band)).toEqual(['low', 'mid', 'mid', 'high']);
  });

  it('T5.5: devolve a key da especialidade, não o rótulo traduzido', () => {
    expect(specialtyMastery([spec('clinica_medica', 3, 70)])[0].specialty).toBe('clinica_medica');
  });

  it('T5.6: lista vazia devolve []', () => {
    expect(specialtyMastery([])).toEqual([]);
  });
});

// ─── §6.8 soapDimensions (fase 3b) ───────────────────────────────────────────

describe('soapDimensions (T8)', () => {
  const soap = (o: Partial<SoapProfile> = {}): SoapProfile => ({
    attempts: 5, subjetivo: 70, objetivo: 55, avaliacao: 82, plano: 64, ...o,
  });

  it('T8.1: devolve as 4 dimensões na ordem canônica S/O/A/P', () => {
    expect(soapDimensions(soap()).map(r => r.dim)).toEqual(['subjetivo', 'objetivo', 'avaliacao', 'plano']);
  });

  it('T8.2: com menos de 3 tentativas avaliadas não renderiza nada', () => {
    expect(soapDimensions(soap({ attempts: 2 }))).toEqual([]);
    expect(soapDimensions(soap({ attempts: 3 }))).toHaveLength(4);
  });

  it('T8.3: null/undefined (backend antigo ou aluno sem breakdown) devolve []', () => {
    expect(soapDimensions(null)).toEqual([]);
    expect(soapDimensions(undefined)).toEqual([]);
  });

  it('T8.4: faixas de cor iguais às do domínio — 59 low, 60 mid, 79 mid, 80 high', () => {
    const rows = soapDimensions(soap({ subjetivo: 59, objetivo: 60, avaliacao: 79, plano: 80 }));
    expect(rows.map(r => r.band)).toEqual(['low', 'mid', 'mid', 'high']);
  });

  it('T8.5: arredonda a média decimal que vem do backend', () => {
    const rows = soapDimensions(soap({ subjetivo: 70.4, objetivo: 59.5 }));
    expect(rows[0].score).toBe(70);
    expect(rows[1].score).toBe(60);
    // 59.5 arredonda para 60 → muda de faixa junto com a nota exibida.
    expect(rows[1].band).toBe('mid');
  });

  it('T8.6: não muta a entrada (R2)', () => {
    const input = soap();
    const copy = { ...input };
    soapDimensions(input);
    expect(input).toEqual(copy);
  });
});

// ─── §7 buildRecommendations ─────────────────────────────────────────────────

describe('buildRecommendations — motor weak (T6.1–T6.4)', () => {
  /** Tentativas de hoje: mantêm a especialidade "fresca" para o motor stale não disparar. */
  const hoje = (id: string, specialty: string) =>
    att({ attempt_id: id, case_id: `hist_${id}`, started_at: '2026-08-12T09:00:00', specialty, score: 52 });

  it('T6.1: a especialidade mais fraca com ≥3 tentativas vira o 1º card', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'cardiologia')],
        bySpecialty: [spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'f1', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({
      kind: 'weak',
      caseId: 'f1',
      caseKind: 'free',
      specialty: 'cardiologia',
      reasonValues: { score: 52, attempts: 3 },
    });
  });

  it('T6.2: pula a pior com amostra insuficiente e promove a próxima elegível (P3)', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'pediatria'), hoje('h2', 'cardiologia')],
        bySpecialty: [spec('pediatria', 2, 40), spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'fp', area: 'pediatria' }), freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia', reasonValues: { score: 52, attempts: 3 } });
  });

  it('T6.2b: três inelegíveis na frente — o card é a elegível e a copy usa o número dela', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'cardiologia')],
        bySpecialty: [spec('a', 1, 10), spec('b', 2, 20), spec('c', 2, 30), spec('cardiologia', 3, 52)],
        freeCases: [
          freeCase({ id: 'fa', area: 'a' }),
          freeCase({ id: 'fb', area: 'b' }),
          freeCase({ id: 'fc2', area: 'c' }),
          freeCase({ id: 'fcardio', area: 'cardiologia' }),
        ],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia', reasonValues: { score: 52, attempts: 3 } });
  });

  it('T6.2c: a sentinela average_score 0 não é candidata nem com ≥3 tentativas (P5)', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'neurologia'), hoje('h2', 'cardiologia')],
        bySpecialty: [spec('neurologia', 4, 0), spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'fn', area: 'neurologia' }), freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia' });
  });

  it('T6.3: empate de nota desempata por mais tentativas', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'pediatria'), hoje('h2', 'cardiologia')],
        bySpecialty: [spec('pediatria', 3, 52), spec('cardiologia', 5, 52)],
        freeCases: [freeCase({ id: 'fp', area: 'pediatria' }), freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia' });
  });

  it('T6.3b: empate de nota e de tentativas desempata pela key em ordem alfabética', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'pediatria'), hoje('h2', 'cardiologia')],
        bySpecialty: [spec('pediatria', 3, 52), spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'fp', area: 'pediatria' }), freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia' });
  });

  it('T6.4: nenhuma especialidade com ≥3 tentativas não gera card weak', () => {
    const out = buildRecommendations(
      planInput({
        history: [hoje('h1', 'cardiologia')],
        bySpecialty: [spec('cardiologia', 2, 30)],
        freeCases: [freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out.find(r => r.kind === 'weak')).toBeUndefined();
  });
});

describe('buildRecommendations — motor stale (T6.5–T6.8)', () => {
  /** bySpecialty com <3 tentativas mantém o motor `weak` desligado nestes casos. */
  const praticou = (id: string, specialty: string, started_at: string) =>
    att({ attempt_id: id, case_id: `hist_${id}`, started_at, specialty });

  it('T6.5: especialidade parada há 6 dias vira card stale', () => {
    const out = buildRecommendations(
      planInput({
        history: [praticou('h1', 'dermatologia', '2026-08-06T15:00:00')],
        bySpecialty: [spec('dermatologia', 1, 70)],
        freeCases: [freeCase({ id: 'fd', area: 'dermatologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'stale', specialty: 'dermatologia', reasonValues: { days: 6 } });
  });

  it('T6.6: parada há 4 dias não dispara — o limiar é ≥5', () => {
    const out = buildRecommendations(
      planInput({
        history: [praticou('h1', 'dermatologia', '2026-08-08T15:00:00')],
        bySpecialty: [spec('dermatologia', 1, 70)],
        freeCases: [freeCase({ id: 'fd', area: 'dermatologia' })],
      }),
      NOW,
    );
    expect(out.find(r => r.kind === 'stale')).toBeUndefined();
  });

  it('T6.7: a mais parada sendo a escolhida pelo weak, stale pega a próxima', () => {
    const out = buildRecommendations(
      planInput({
        history: [
          praticou('h1', 'cardiologia', '2026-08-01T15:00:00'),
          praticou('h2', 'dermatologia', '2026-08-05T15:00:00'),
        ],
        bySpecialty: [spec('cardiologia', 3, 52), spec('dermatologia', 1, 70)],
        freeCases: [freeCase({ id: 'fc', area: 'cardiologia' }), freeCase({ id: 'fd', area: 'dermatologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', specialty: 'cardiologia' });
    expect(out[1]).toMatchObject({ kind: 'stale', specialty: 'dermatologia' });
  });

  it('T6.7b: não havendo outra especialidade parada, o motor stale não dispara', () => {
    const out = buildRecommendations(
      planInput({
        history: [praticou('h1', 'cardiologia', '2026-08-01T15:00:00')],
        bySpecialty: [spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'fc', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out.find(r => r.kind === 'stale')).toBeUndefined();
  });

  it('T6.8: especialidade nunca praticada não é "parada"', () => {
    const out = buildRecommendations(
      planInput({
        history: [],
        bySpecialty: [spec('dermatologia', 0, 0, 0)],
        freeCases: [freeCase({ id: 'fd', area: 'dermatologia' })],
      }),
      NOW,
    );
    expect(out.find(r => r.kind === 'stale')).toBeUndefined();
  });
});

describe('buildRecommendations — motor class (T6.9–T6.11b)', () => {
  it('T6.9: caso de turma nunca tentado vira card class', () => {
    const out = buildRecommendations(planInput({ availableCases: [classCase({ id: 'c1', attempts_count: 0 })] }), NOW);
    expect(out[0]).toMatchObject({ kind: 'class', caseId: 'c1', caseKind: 'class' });
  });

  it('T6.10: caso já tentado é excluído, inclusive com last_status in_progress', () => {
    const out = buildRecommendations(
      planInput({
        availableCases: [
          classCase({ id: 'c1', attempts_count: 1, last_status: 'completed' }),
          classCase({ id: 'c2', attempts_count: 1, last_status: 'in_progress' }),
        ],
      }),
      NOW,
    );
    expect(out.find(r => r.kind === 'class')).toBeUndefined();
  });

  it('T6.11: entre elegíveis, prazo mais próximo primeiro; sem prazo vai para o fim', () => {
    const out = buildRecommendations(
      planInput({
        availableCases: [
          classCase({ id: 'sem_prazo', created_at: '2026-08-11T00:00:00' }),
          classCase({ id: 'longe', available_until: '2026-08-30T00:00:00' }),
          classCase({ id: 'perto', expires_at: '2026-08-14T00:00:00' }),
        ],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'class', caseId: 'perto' });
  });

  it('T6.11b: caso com prazo vencido é excluído', () => {
    const out = buildRecommendations(
      planInput({ availableCases: [classCase({ id: 'vencido', available_until: '2026-08-11T00:00:00' })] }),
      NOW,
    );
    expect(out.find(r => r.kind === 'class')).toBeUndefined();
  });
});

describe('buildRecommendations — motor streak (T6.12–T6.15)', () => {
  const ontem = att({ attempt_id: 'h1', case_id: 'hist_h1', started_at: '2026-08-11T09:00:00', specialty: 'clinica_medica' });
  const basico = freeCase({ id: 'fb', difficulty: 'easy', level: 'Básico', category: 'Básico' });

  it('T6.12: sequência viva e nenhuma tentativa hoje geram card streak', () => {
    const out = buildRecommendations(planInput({ history: [ontem], freeCases: [basico] }), NOW);
    expect(out.find(r => r.kind === 'streak')).toMatchObject({ caseId: 'fb', caseKind: 'free' });
  });

  it('T6.13: já houve tentativa hoje — não dispara', () => {
    const hoje = att({ attempt_id: 'h2', case_id: 'hist_h2', started_at: '2026-08-12T09:00:00' });
    const out = buildRecommendations(planInput({ history: [ontem, hoje], freeCases: [basico] }), NOW);
    expect(out.find(r => r.kind === 'streak')).toBeUndefined();
  });

  it('T6.14: sequência zerada — não dispara', () => {
    const antigo = att({ attempt_id: 'h3', case_id: 'hist_h3', started_at: '2026-08-05T09:00:00' });
    const out = buildRecommendations(planInput({ history: [antigo], freeCases: [basico] }), NOW);
    expect(out.find(r => r.kind === 'streak')).toBeUndefined();
  });

  it('T6.15: sem caso básico disponível não rebaixa para outro nível', () => {
    const dificil = freeCase({ id: 'fh', difficulty: 'hard', level: 'Avançado' });
    const out = buildRecommendations(planInput({ history: [ontem], freeCases: [dificil] }), NOW);
    expect(out.find(r => r.kind === 'streak')).toBeUndefined();
  });
});

describe('buildRecommendations — transversais (T6.16–T6.21)', () => {
  /** Aciona os quatro motores de uma vez, com caseIds distintos. */
  function fixtureCompleta(): StudyPlanInput {
    return planInput({
      history: [
        att({ attempt_id: 'h1', case_id: 'hist_1', started_at: '2026-08-09T09:00:00', specialty: 'cardiologia', score: 52 }),
        att({ attempt_id: 'h2', case_id: 'hist_2', started_at: '2026-08-10T09:00:00', specialty: 'cardiologia', score: 50 }),
        att({ attempt_id: 'h3', case_id: 'hist_3', started_at: '2026-08-11T09:00:00', specialty: 'cardiologia', score: 54 }),
        att({ attempt_id: 'h4', case_id: 'hist_4', started_at: '2026-08-05T09:00:00', specialty: 'dermatologia', score: 90 }),
      ],
      bySpecialty: [spec('cardiologia', 3, 52), spec('dermatologia', 1, 90)],
      availableCases: [classCase({ id: 'c1', attempts_count: 0 })],
      freeCases: [
        freeCase({ id: 'f_cardio', area: 'cardiologia' }),
        freeCase({ id: 'f_derma', area: 'dermatologia' }),
        freeCase({ id: 'f_basico', difficulty: 'easy', level: 'Básico', category: 'Básico' }),
      ],
    });
  }

  it('T6.16: aluno zerado devolve [] (o componente mostra o empty state)', () => {
    expect(buildRecommendations(planInput(), NOW)).toEqual([]);
  });

  it('T6.17: o mesmo caseId nunca aparece em dois cards', () => {
    const out = buildRecommendations(fixtureCompleta(), NOW);
    const ids = out.map(r => r.caseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('T6.18: com todos os motores disparando são 4 cards na ordem weak, stale, class, streak', () => {
    const out = buildRecommendations(fixtureCompleta(), NOW);
    expect(out).toHaveLength(4);
    expect(out.map(r => r.kind)).toEqual(['weak', 'stale', 'class', 'streak']);
  });

  it('T6.19: dentro da especialidade prefere o caso ainda não tentado', () => {
    const out = buildRecommendations(
      planInput({
        history: [att({ attempt_id: 'h1', case_id: 'f1', started_at: '2026-08-12T09:00:00', specialty: 'cardiologia', score: 52 })],
        bySpecialty: [spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'f1', area: 'cardiologia' }), freeCase({ id: 'f2', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', caseId: 'f2' });
  });

  it('T6.19b: todos já tentados — usa o de tentativa mais antiga', () => {
    const out = buildRecommendations(
      planInput({
        history: [
          att({ attempt_id: 'h1', case_id: 'f1', started_at: '2026-08-01T09:00:00', specialty: 'cardiologia', score: 52 }),
          att({ attempt_id: 'h2', case_id: 'f2', started_at: '2026-08-12T09:00:00', specialty: 'cardiologia', score: 52 }),
        ],
        bySpecialty: [spec('cardiologia', 3, 52)],
        freeCases: [freeCase({ id: 'f1', area: 'cardiologia' }), freeCase({ id: 'f2', area: 'cardiologia' })],
      }),
      NOW,
    );
    expect(out[0]).toMatchObject({ kind: 'weak', caseId: 'f1' });
  });

  it('T6.20: reasonKey é chave i18n home.reco.*, nunca texto pronto (R5)', () => {
    const out = buildRecommendations(fixtureCompleta(), NOW);
    expect(out.length).toBeGreaterThan(0);
    for (const reco of out) {
      expect(reco.reasonKey).toMatch(/^home\.reco\.[a-z0-9_.]+$/);
    }
  });

  it('T6.21: não muta a entrada (R2)', () => {
    const input = fixtureCompleta();
    const antes = structuredClone(input);
    buildRecommendations(input, NOW);
    expect(input).toEqual(antes);
  });
});
