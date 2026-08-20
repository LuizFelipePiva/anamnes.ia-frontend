import type { CartaoSrs, ProgressoGlobal, ProgressoLicao } from '../types/trilha';
import { chaveLicao } from '../utils/correcao';
import { cartaoNovo, diasEntre, hojeISO, notaDe, revisar } from '../utils/srs';

// ─────────────────────────────────────────────────────────────────────────────
// Persistência do progresso.
//
// HOJE: localStorage (zero backend, dá pra testar a feature inteira sozinha).
// DEPOIS: trocar SÓ o corpo de `carregarProgresso` e `salvar` por chamadas ao
// backend. O resto da feature não muda, porque só conversa com as funções
// exportadas daqui.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'anamnesia:trilhas:v2';
const STORAGE_KEY_V1 = 'anamnesia:trilhas:v1';

const vazio = (): ProgressoGlobal => ({
  versao: 2,
  xp: 0,
  ofensiva: 0,
  ultimoDia: null,
  licoes: {},
  cartoes: {},
});

export function carregarProgresso(): ProgressoGlobal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ProgressoGlobal>;
      if (p.versao === 2) {
        return { ...vazio(), ...p, licoes: p.licoes ?? {}, cartoes: p.cartoes ?? {} };
      }
    }
    // migra o formato anterior (sem cartões de revisão)
    const antigo = localStorage.getItem(STORAGE_KEY_V1);
    if (antigo) {
      const v1 = JSON.parse(antigo) as Partial<ProgressoGlobal>;
      return {
        ...vazio(),
        xp: v1.xp ?? 0,
        ofensiva: v1.ofensiva ?? 0,
        ultimoDia: v1.ultimoDia ?? null,
        licoes: v1.licoes ?? {},
      };
    }
    return vazio();
  } catch {
    return vazio();
  }
}

function salvar(p: ProgressoGlobal): ProgressoGlobal {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Modo privado / quota cheia: segue em memória, sem quebrar a sessão.
  }
  return p;
}

/** Recalcula a ofensiva considerando o dia de hoje. */
function aplicarOfensiva(p: ProgressoGlobal): ProgressoGlobal {
  const hoje = hojeISO();
  if (p.ultimoDia === hoje) return p;
  if (p.ultimoDia && diasEntre(p.ultimoDia, hoje) === 1) {
    return { ...p, ofensiva: p.ofensiva + 1, ultimoDia: hoje };
  }
  return { ...p, ofensiva: 1, ultimoDia: hoje };
}

/** Ofensiva já quebrada (última atividade há mais de 1 dia) vira 0 na exibição. */
export function ofensivaAtual(p: ProgressoGlobal): number {
  if (!p.ultimoDia) return 0;
  return diasEntre(p.ultimoDia, hojeISO()) <= 1 ? p.ofensiva : 0;
}

export function progressoDaLicao(
  p: ProgressoGlobal,
  trilhaId: string,
  licaoId: string,
): ProgressoLicao | undefined {
  return p.licoes[chaveLicao(trilhaId, licaoId)];
}

// ── Registro de respostas ────────────────────────────────────────────────────

export interface RespostaRegistrada {
  exercicioId: string;
  trilhaId: string;
  licaoId: string;
  acertou: boolean;
  segundos: number;
  usouDica: boolean;
}

/** Atualiza os cartões SM-2 de um lote de respostas. */
function aplicarCartoes(
  cartoes: Record<string, CartaoSrs>,
  respostas: RespostaRegistrada[],
): Record<string, CartaoSrs> {
  const out = { ...cartoes };
  for (const r of respostas) {
    const atual = out[r.exercicioId] ?? cartaoNovo(r.trilhaId, r.licaoId);
    const nota = notaDe(r.acertou, r.segundos, r.usouDica);
    out[r.exercicioId] = { ...revisar(atual, nota), trilhaId: r.trilhaId, licaoId: r.licaoId };
  }
  return out;
}

interface RegistroConclusao {
  trilhaId: string;
  licaoId: string;
  precisao: number;
  xpGanho: number;
  concluida: boolean;
  respostas: RespostaRegistrada[];
}

/** Grava o resultado de uma lição e devolve o progresso já atualizado. */
export function registrarConclusao(r: RegistroConclusao): ProgressoGlobal {
  const atual = carregarProgresso();
  const chave = chaveLicao(r.trilhaId, r.licaoId);
  const anterior = atual.licoes[chave];

  const licoes: Record<string, ProgressoLicao> = {
    ...atual.licoes,
    [chave]: {
      concluida: (anterior?.concluida ?? false) || r.concluida,
      melhorPrecisao: Math.max(anterior?.melhorPrecisao ?? 0, r.precisao),
      tentativas: (anterior?.tentativas ?? 0) + 1,
      ultimaEm: new Date().toISOString(),
    },
  };

  const atualizado: ProgressoGlobal = {
    ...atual,
    xp: atual.xp + r.xpGanho,
    licoes,
    cartoes: aplicarCartoes(atual.cartoes, r.respostas),
  };
  return salvar(aplicarOfensiva(atualizado));
}

/** Grava uma sessão de revisão: mexe nos cartões e no XP, não nas lições. */
export function registrarRevisao(respostas: RespostaRegistrada[], xpGanho: number): ProgressoGlobal {
  const atual = carregarProgresso();
  const atualizado: ProgressoGlobal = {
    ...atual,
    xp: atual.xp + xpGanho,
    cartoes: aplicarCartoes(atual.cartoes, respostas),
  };
  return salvar(aplicarOfensiva(atualizado));
}

/** Zera tudo — usado no botão de reset da tela de trilhas. */
export function zerarProgresso(): ProgressoGlobal {
  try {
    localStorage.removeItem(STORAGE_KEY_V1);
  } catch {
    // ignora
  }
  return salvar(vazio());
}
