import type { CartaoSrs } from '../types/trilha';

// ─────────────────────────────────────────────────────────────────────────────
// Repetição espaçada — SM-2 adaptado.
//
// O algoritmo original do SuperMemo pede uma nota de 0 a 5 dada pelo próprio
// aluno. Aqui a nota é derivada do desempenho, para não interromper o ritmo
// da lição: acerto rápido vale mais que acerto lento, e o erro sempre reinicia
// o intervalo. É a mesma curva do Anki, com uma entrada mais simples.
// ─────────────────────────────────────────────────────────────────────────────

export const FACILIDADE_INICIAL = 2.5;
export const FACILIDADE_MINIMA = 1.3;

/** Segundos acima dos quais um acerto é considerado "hesitante". */
const LIMITE_HESITACAO = 25;

export function hojeISO(dt: Date = new Date()): string {
  const d = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return hojeISO(d);
}

export function diasEntre(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

/** Traduz desempenho em nota SM-2 (0–5). */
export function notaDe(acertou: boolean, segundos: number, usouDica: boolean): number {
  if (!acertou) return segundos > LIMITE_HESITACAO ? 0 : 2;
  if (usouDica) return 3;
  return segundos > LIMITE_HESITACAO ? 3 : 5;
}

export function cartaoNovo(trilhaId: string, licaoId: string): CartaoSrs {
  return {
    facilidade: FACILIDADE_INICIAL,
    intervalo: 0,
    repeticoes: 0,
    lapsos: 0,
    venceEm: hojeISO(),
    trilhaId,
    licaoId,
  };
}

/**
 * Aplica uma revisão ao cartão e devolve o cartão atualizado.
 * Nota < 3 = erro: zera as repetições e devolve o exercício para o dia seguinte.
 */
export function revisar(cartao: CartaoSrs, nota: number, hoje = hojeISO()): CartaoSrs {
  const facilidade = Math.max(
    FACILIDADE_MINIMA,
    cartao.facilidade + (0.1 - (5 - nota) * (0.08 + (5 - nota) * 0.02)),
  );

  if (nota < 3) {
    return {
      ...cartao,
      facilidade,
      intervalo: 1,
      repeticoes: 0,
      lapsos: cartao.lapsos + (cartao.repeticoes > 0 ? 1 : 0),
      venceEm: somarDias(hoje, 1),
    };
  }

  const repeticoes = cartao.repeticoes + 1;
  let intervalo: number;
  if (repeticoes === 1) intervalo = 1;
  else if (repeticoes === 2) intervalo = 3;
  else intervalo = Math.round(cartao.intervalo * facilidade);
  intervalo = Math.min(intervalo, 365);

  return { ...cartao, facilidade, intervalo, repeticoes, venceEm: somarDias(hoje, intervalo) };
}

/** Cartões vencidos (hoje ou antes), do mais atrasado para o menos. */
export function cartoesVencidos(
  cartoes: Record<string, CartaoSrs>,
  trilhaId?: string,
  hoje = hojeISO(),
): { exercicioId: string; cartao: CartaoSrs }[] {
  return Object.entries(cartoes)
    .filter(([, c]) => (!trilhaId || c.trilhaId === trilhaId) && c.venceEm <= hoje)
    .map(([exercicioId, cartao]) => ({ exercicioId, cartao }))
    .sort((a, b) => {
      const d = a.cartao.venceEm.localeCompare(b.cartao.venceEm);
      return d !== 0 ? d : b.cartao.lapsos - a.cartao.lapsos;
    });
}

/** Quantos cartões vencem hoje, por trilha. */
export function contarVencidosPorTrilha(
  cartoes: Record<string, CartaoSrs>,
  hoje = hojeISO(),
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of Object.values(cartoes)) {
    if (c.venceEm <= hoje) out[c.trilhaId] = (out[c.trilhaId] ?? 0) + 1;
  }
  return out;
}

/** Rótulo curto do estado de um cartão, para a UI. */
export function forcaDoCartao(cartao: CartaoSrs): 'novo' | 'aprendendo' | 'jovem' | 'maduro' {
  if (cartao.repeticoes === 0) return cartao.intervalo === 0 ? 'novo' : 'aprendendo';
  if (cartao.intervalo < 21) return 'jovem';
  return 'maduro';
}
