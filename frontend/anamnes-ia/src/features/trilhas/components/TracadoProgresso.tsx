import React, { useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// A barra de progresso da lição é um traçado de ritmo, não um retângulo.
// Cada questão respondida "avança o papel" e desenha mais um batimento; o
// batimento seguinte pulsa quando a resposta está certa. É o elemento que dá
// identidade à trilha e o único lugar onde gastamos ornamento.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Quantas questões já foram respondidas. */
  feitas: number;
  total: number;
  /** Dispara o pulso do último batimento. */
  pulsando?: boolean;
}

const LARGURA = 300;
const ALTURA = 40;
const LINHA_BASE = ALTURA / 2;

/** Um ciclo PQRST desenhado em `w` unidades de largura. */
function ciclo(x0: number, w: number): string {
  const p = (f: number) => x0 + w * f;
  return [
    `L ${p(0.08)} ${LINHA_BASE}`,
    `Q ${p(0.14)} ${LINHA_BASE - 5} ${p(0.2)} ${LINHA_BASE}`, // onda P
    `L ${p(0.32)} ${LINHA_BASE}`,
    `L ${p(0.36)} ${LINHA_BASE + 3}`, // Q
    `L ${p(0.42)} ${LINHA_BASE - 15}`, // R
    `L ${p(0.48)} ${LINHA_BASE + 8}`, // S
    `L ${p(0.54)} ${LINHA_BASE}`,
    `L ${p(0.66)} ${LINHA_BASE}`,
    `Q ${p(0.76)} ${LINHA_BASE - 7} ${p(0.86)} ${LINHA_BASE}`, // onda T
    `L ${p(1)} ${LINHA_BASE}`,
  ].join(' ');
}

export const TracadoProgresso: React.FC<Props> = ({ feitas, total, pulsando = false }) => {
  const seguro = Math.max(1, total);
  const largura = LARGURA / seguro;

  const caminho = useMemo(() => {
    let d = `M 0 ${LINHA_BASE}`;
    for (let i = 0; i < seguro; i++) d += ' ' + ciclo(i * largura, largura);
    return d;
  }, [seguro, largura]);

  const pct = Math.min(1, feitas / seguro);

  return (
    <div className="tr-tracado" role="progressbar" aria-valuenow={feitas} aria-valuemax={total}>
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="none" aria-hidden="true">
        <path className="tr-tracado-fundo" d={caminho} />
        <path
          className={`tr-tracado-linha ${pulsando ? 'tr-tracado-linha--pulso' : ''}`}
          d={caminho}
          style={{ clipPath: `inset(0 ${(1 - pct) * 100}% 0 0)` }}
        />
      </svg>
      <span className="tr-tracado-cursor" style={{ left: `${pct * 100}%` }} />
    </div>
  );
};

export default TracadoProgresso;
