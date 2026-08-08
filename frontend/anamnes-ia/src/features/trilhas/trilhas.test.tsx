import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Exercicio, Licao } from './types/trilha';
import { TRILHAS, carregarLicao, totalExercicios } from './data';
import { corrigir } from './utils/correcao';
import { cartaoNovo, cartoesVencidos, hojeISO, notaDe, revisar, somarDias } from './utils/srs';
import { LicaoPage } from './pages/LicaoPage';
import { RevisaoPage } from './pages/RevisaoPage';
import { carregarProgresso } from './services/progressoService';

// ── Integridade do conteúdo ──────────────────────────────────────────────────
// Roda sobre TODAS as trilhas registradas: conteúdo novo entra na checagem
// automaticamente, sem precisar tocar neste arquivo.

function checarExercicio(ex: Exercicio, idsVistos: Set<string>) {
  expect(idsVistos.has(ex.id), `id repetido: ${ex.id}`).toBe(false);
  idsVistos.add(ex.id);
  expect(ex.enunciado.trim().length, ex.id).toBeGreaterThan(10);

  switch (ex.tipo) {
    case 'escolha_unica':
      expect(ex.alternativas.length, ex.id).toBeGreaterThan(1);
      expect(new Set(ex.alternativas).size, ex.id).toBe(ex.alternativas.length);
      expect(ex.correta).toBeGreaterThanOrEqual(0);
      expect(ex.correta).toBeLessThan(ex.alternativas.length);
      expect(corrigir(ex, { tipo: 'escolha_unica', valor: ex.correta })).toBe(true);
      expect(
        corrigir(ex, { tipo: 'escolha_unica', valor: (ex.correta + 1) % ex.alternativas.length }),
      ).toBe(false);
      break;
    case 'vf':
      expect(corrigir(ex, { tipo: 'vf', valor: ex.correta })).toBe(true);
      expect(corrigir(ex, { tipo: 'vf', valor: !ex.correta })).toBe(false);
      break;
    case 'ordenar': {
      expect(ex.itens.length, ex.id).toBeGreaterThan(2);
      const certa = ex.itens.map((_, i) => i);
      expect(corrigir(ex, { tipo: 'ordenar', valor: certa })).toBe(true);
      expect(corrigir(ex, { tipo: 'ordenar', valor: [...certa].reverse() })).toBe(false);
      break;
    }
    case 'associar': {
      expect(ex.pares.length, ex.id).toBeGreaterThan(1);
      expect(new Set(ex.pares.map(p => p.chave)).size, ex.id).toBe(ex.pares.length);
      expect(new Set(ex.pares.map(p => p.valor)).size, ex.id).toBe(ex.pares.length);
      const certa = Object.fromEntries(ex.pares.map((_, i) => [i, i]));
      expect(corrigir(ex, { tipo: 'associar', valor: certa })).toBe(true);
      break;
    }
    case 'classificar': {
      ex.itens.forEach(item => expect(ex.categorias).toContain(item.categoria));
      const certa = Object.fromEntries(ex.itens.map((it, i) => [i, it.categoria]));
      expect(corrigir(ex, { tipo: 'classificar', valor: certa })).toBe(true);
      break;
    }
    case 'hotspot': {
      expect(ex.imagemUrl, ex.id).toBeTruthy();
      expect(ex.alvos.length, ex.id).toBeGreaterThan(0);
      ex.alvos.forEach(a => {
        expect(a.x, ex.id).toBeGreaterThanOrEqual(0);
        expect(a.y, ex.id).toBeGreaterThanOrEqual(0);
        expect(a.x + a.largura, ex.id).toBeLessThanOrEqual(1);
        expect(a.y + a.altura, ex.id).toBeLessThanOrEqual(1);
        // alvo pequeno demais é impossível de acertar no toque
        expect(a.largura * a.altura, ex.id).toBeGreaterThan(0.003);
      });
      // clicar no centro de cada alvo acerta; clicar fora, não
      const centros = ex.alvos.map(a => ({ x: a.x + a.largura / 2, y: a.y + a.altura / 2 }));
      expect(corrigir(ex, { tipo: 'hotspot', valor: centros })).toBe(true);
      expect(corrigir(ex, { tipo: 'hotspot', valor: [{ x: 0.01, y: 0.99 }] })).toBe(false);
      break;
    }
    case 'numerico':
      expect(ex.faixaCorreta[0]).toBeGreaterThanOrEqual(ex.min);
      expect(ex.faixaCorreta[1]).toBeLessThanOrEqual(ex.max);
      expect((ex.faixaCorreta[0] - ex.min) % ex.passo).toBe(0);
      expect(corrigir(ex, { tipo: 'numerico', valor: ex.faixaCorreta[0] })).toBe(true);
      break;
  }
}

describe('conteúdo das trilhas', () => {
  const idsVistos = new Set<string>();

  TRILHAS.forEach(trilha => {
    it(`${trilha.id}: metadados coerentes`, () => {
      expect(trilha.unidades.length).toBeGreaterThan(0);
      const ids = trilha.unidades.flatMap(u => u.licoes.map(l => l.id));
      expect(new Set(ids).size).toBe(ids.length);
      trilha.unidades.forEach(u =>
        u.licoes.forEach(l => expect(l.totalExercicios, l.id).toBeGreaterThan(0)),
      );
      expect(totalExercicios(trilha)).toBeGreaterThan(0);
    });

    trilha.unidades.forEach(unidade => {
      it(`${trilha.id} · ${unidade.id}: exercícios válidos`, async () => {
        for (const meta of unidade.licoes) {
          const licao: Licao = await carregarLicao(trilha.id, meta.id);
          // o esqueleto do mapa não pode mentir sobre o tamanho da lição
          expect(licao.exercicios.length, meta.id).toBe(meta.totalExercicios);
          licao.exercicios.forEach(ex => checarExercicio(ex, idsVistos));
        }
      });
    });
  });
});

// ── Repetição espaçada ───────────────────────────────────────────────────────

describe('SM-2', () => {
  it('acerto rápido vale mais que acerto hesitante ou com dica', () => {
    expect(notaDe(true, 5, false)).toBeGreaterThan(notaDe(true, 60, false));
    expect(notaDe(true, 5, true)).toBeLessThan(notaDe(true, 5, false));
    expect(notaDe(false, 5, false)).toBeLessThan(3);
  });

  it('intervalo cresce a cada acerto consecutivo', () => {
    const hoje = '2026-03-01';
    let c = cartaoNovo('ecg', 'ecg-m1-l1');
    c = revisar(c, 5, hoje);
    expect(c.intervalo).toBe(1);
    c = revisar(c, 5, hoje);
    expect(c.intervalo).toBe(3);
    const antes = c.intervalo;
    c = revisar(c, 5, hoje);
    expect(c.intervalo).toBeGreaterThan(antes);
    expect(c.venceEm).toBe(somarDias(hoje, c.intervalo));
  });

  it('erro reinicia o intervalo e conta lapso', () => {
    const hoje = '2026-03-01';
    let c = revisar(revisar(cartaoNovo('ecg', 'l'), 5, hoje), 5, hoje);
    c = revisar(c, 1, hoje);
    expect(c.intervalo).toBe(1);
    expect(c.repeticoes).toBe(0);
    expect(c.lapsos).toBe(1);
    expect(c.venceEm).toBe(somarDias(hoje, 1));
  });

  it('facilidade nunca cai abaixo do piso', () => {
    let c = cartaoNovo('ecg', 'l');
    for (let i = 0; i < 12; i++) c = revisar(c, 0, '2026-03-01');
    expect(c.facilidade).toBeGreaterThanOrEqual(1.3);
  });

  it('a fila de revisão traz só o que já venceu, do mais atrasado', () => {
    const hoje = hojeISO();
    const fila = cartoesVencidos(
      {
        futuro: { ...cartaoNovo('ecg', 'l'), venceEm: somarDias(hoje, 5) },
        atrasado: { ...cartaoNovo('ecg', 'l'), venceEm: somarDias(hoje, -4) },
        hojeMesmo: { ...cartaoNovo('ecg', 'l'), venceEm: hoje },
        outraTrilha: { ...cartaoNovo('sinais-vitais', 'l'), venceEm: hoje },
      },
      'ecg',
    );
    expect(fila.map(f => f.exercicioId)).toEqual(['atrasado', 'hojeMesmo']);
  });
});

// ── Fluxo da lição ───────────────────────────────────────────────────────────

function renderRotas(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/trilhas/:trilhaId/licao/:licaoId" element={<LicaoPage />} />
        <Route path="/trilhas/:trilhaId/revisao" element={<RevisaoPage />} />
        <Route path="/trilhas/:trilhaId" element={<p>mapa</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Responde a questão visível escolhendo certo ou errado, e verifica. */
async function responder(user: ReturnType<typeof userEvent.setup>, ex: Exercicio, certo: boolean) {
  if (ex.tipo === 'escolha_unica') {
    const i = certo ? ex.correta : (ex.correta + 1) % ex.alternativas.length;
    await user.click(screen.getByText(ex.alternativas[i]));
  } else if (ex.tipo === 'vf') {
    const querVerdadeiro = certo ? ex.correta : !ex.correta;
    await user.click(screen.getByRole('button', { name: querVerdadeiro ? 'Verdadeiro' : 'Falso' }));
  } else if (ex.tipo === 'ordenar') {
    const ordem = certo ? ex.itens : [...ex.itens].reverse();
    for (const item of ordem) await user.click(screen.getByRole('button', { name: item }));
  } else if (ex.tipo === 'associar') {
    const valores = certo ? ex.pares.map(p => p.valor) : [...ex.pares].reverse().map(p => p.valor);
    for (let i = 0; i < ex.pares.length; i++) {
      await user.click(screen.getByText(ex.pares[i].chave));
      await user.click(screen.getByRole('button', { name: valores[i] }));
    }
  }
  await user.click(screen.getByRole('button', { name: 'Verificar' }));
}

/** Qual exercício está visível agora (a ordem é embaralhada a cada tentativa). */
function questaoNaTela(licao: Licao): Exercicio {
  const ex = licao.exercicios.find(e => screen.queryByText(e.enunciado) !== null);
  if (!ex) throw new Error('nenhuma questão da lição está visível');
  return ex;
}

describe('fluxo da lição', () => {
  beforeEach(() => localStorage.clear());

  it('carrega a lição sob demanda e só habilita "Verificar" após responder', async () => {
    renderRotas('/trilhas/ecg/licao/ecg-m1-l1');
    const verificar = await screen.findByRole('button', { name: 'Verificar' });
    expect(verificar).toBeDisabled();
  });

  it('mostra o resultado errado e trava a resposta', async () => {
    const user = userEvent.setup();
    renderRotas('/trilhas/ecg/licao/ecg-m1-l1');
    await screen.findByRole('button', { name: 'Verificar' });

    const licao = await carregarLicao('ecg', 'ecg-m1-l1');
    await responder(user, questaoNaTela(licao), false);

    expect(screen.getByText('Resposta incorreta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verificar' })).toBeNull();
  });

  it('conclui a lição inteira, grava XP, ofensiva e agenda a revisão', async () => {
    const user = userEvent.setup();
    renderRotas('/trilhas/ecg/licao/ecg-m1-l1');
    await screen.findByRole('button', { name: 'Verificar' });

    const licao = await carregarLicao('ecg', 'ecg-m1-l1');
    for (let i = 0; i < licao.exercicios.length; i++) {
      await responder(user, questaoNaTela(licao), true);
      await user.click(screen.getByRole('button', { name: /Continuar|Finalizar/ }));
    }

    expect(await screen.findByText('Lição perfeita')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    const salvo = carregarProgresso();
    expect(salvo.licoes['ecg:ecg-m1-l1'].concluida).toBe(true);
    expect(salvo.xp).toBeGreaterThan(0);
    expect(salvo.ofensiva).toBe(1);
    // todo exercício respondido virou cartão agendado para o futuro
    expect(Object.keys(salvo.cartoes).length).toBe(licao.exercicios.length);
    Object.values(salvo.cartoes).forEach(c => {
      expect(c.trilhaId).toBe('ecg');
      expect(c.licaoId).toBe('ecg-m1-l1');
      expect(c.venceEm > hojeISO()).toBe(true);
    });
  }, 40000);
});

// ── Sessão de revisão ────────────────────────────────────────────────────────

describe('sessão de revisão', () => {
  beforeEach(() => localStorage.clear());

  it('avisa quando não há nada vencido', async () => {
    renderRotas('/trilhas/ecg/revisao');
    expect(await screen.findByText(/Nada vencido em ECG/)).toBeInTheDocument();
  });

  it('monta a fila com os cartões vencidos daquela trilha e não usa vidas', async () => {
    const licao = await carregarLicao('ecg', 'ecg-m1-l1');
    const alvo = licao.exercicios[0];
    localStorage.setItem(
      'anamnesia:trilhas:v2',
      JSON.stringify({
        versao: 2,
        xp: 0,
        ofensiva: 0,
        ultimoDia: null,
        licoes: {},
        cartoes: {
          [alvo.id]: { ...cartaoNovo('ecg', 'ecg-m1-l1'), venceEm: somarDias(hojeISO(), -1) },
        },
      }),
    );

    renderRotas('/trilhas/ecg/revisao');
    await waitFor(() => expect(screen.getByText(alvo.enunciado)).toBeInTheDocument());
    expect(screen.getByText(/Revisão · 1 de 1/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/vidas/)).toBeNull();
  });
});
