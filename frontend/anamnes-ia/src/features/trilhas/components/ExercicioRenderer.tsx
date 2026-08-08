import React, { useMemo, useState } from 'react';
import type {
  Exercicio,
  ExAssociar,
  ExClassificar,
  ExEscolhaUnica,
  ExNumerico,
  ExOrdenar,
  ExVerdadeiroFalso,
  Resposta,
} from '../types/trilha';
import { embaralharComSeed } from '../utils/correcao';
import Hotspot from './Hotspot';

interface Props {
  exercicio: Exercicio;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  /** Verdadeiro depois que o aluno clicou em "Verificar": mostra gabarito e trava a UI. */
  bloqueado: boolean;
}

// ── Escolha única ────────────────────────────────────────────────────────────

const EscolhaUnica: React.FC<{
  ex: ExEscolhaUnica;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const sel = resposta?.tipo === 'escolha_unica' ? resposta.valor : -1;
  return (
    <div className="tr-opts">
      {ex.alternativas.map((alt, i) => {
        let estado = '';
        if (bloqueado) {
          if (i === ex.correta) estado = 'tr-opt--ok';
          else if (i === sel) estado = 'tr-opt--err';
        } else if (i === sel) {
          estado = 'tr-opt--sel';
        }
        return (
          <button
            key={i}
            type="button"
            className={`tr-opt ${estado}`}
            disabled={bloqueado}
            onClick={() => onChange({ tipo: 'escolha_unica', valor: i })}
          >
            <span className="tr-opt-letra">{String.fromCharCode(65 + i)}</span>
            <span>{alt}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Verdadeiro / falso ───────────────────────────────────────────────────────

const VerdadeiroFalso: React.FC<{
  ex: ExVerdadeiroFalso;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const sel = resposta?.tipo === 'vf' ? resposta.valor : null;
  const opcoes: { rotulo: string; valor: boolean }[] = [
    { rotulo: 'Verdadeiro', valor: true },
    { rotulo: 'Falso', valor: false },
  ];
  return (
    <div className="tr-vf">
      {opcoes.map(o => {
        let estado = '';
        if (bloqueado) {
          if (o.valor === ex.correta) estado = 'tr-opt--ok';
          else if (o.valor === sel) estado = 'tr-opt--err';
        } else if (o.valor === sel) {
          estado = 'tr-opt--sel';
        }
        return (
          <button
            key={o.rotulo}
            type="button"
            className={`tr-vf-btn ${estado}`}
            disabled={bloqueado}
            onClick={() => onChange({ tipo: 'vf', valor: o.valor })}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
};

// ── Ordenar ──────────────────────────────────────────────────────────────────

const Ordenar: React.FC<{
  ex: ExOrdenar;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const ordem = resposta?.tipo === 'ordenar' ? resposta.valor : [];
  const embaralhados = useMemo(
    () => embaralharComSeed(ex.itens.map((_, i) => i), ex.id),
    [ex.id, ex.itens],
  );
  const restantes = embaralhados.filter(i => !ordem.includes(i));

  return (
    <div className="tr-ordenar">
      <div className="tr-ordenar-lista">
        {ordem.length === 0 && (
          <p className="tr-hint">Toque nos itens abaixo na ordem correta.</p>
        )}
        {ordem.map((idx, pos) => {
          const estado = bloqueado ? (idx === pos ? 'tr-opt--ok' : 'tr-opt--err') : '';
          return (
            <button
              key={idx}
              type="button"
              className={`tr-opt tr-opt--num ${estado}`}
              disabled={bloqueado}
              onClick={() => onChange({ tipo: 'ordenar', valor: ordem.filter(v => v !== idx) })}
            >
              <span className="tr-opt-letra">{pos + 1}</span>
              <span>{ex.itens[idx]}</span>
            </button>
          );
        })}
      </div>

      {restantes.length > 0 && (
        <div className="tr-ordenar-banco">
          {restantes.map(idx => (
            <button
              key={idx}
              type="button"
              className="tr-chip"
              disabled={bloqueado}
              onClick={() => onChange({ tipo: 'ordenar', valor: [...ordem, idx] })}
            >
              {ex.itens[idx]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Associar ─────────────────────────────────────────────────────────────────

const Associar: React.FC<{
  ex: ExAssociar;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const mapa = resposta?.tipo === 'associar' ? resposta.valor : {};
  const [ativo, setAtivo] = useState<number | null>(null);
  const direita = useMemo(
    () => embaralharComSeed(ex.pares.map((_, i) => i), ex.id + '-d'),
    [ex.id, ex.pares],
  );
  const usados = new Set(Object.values(mapa));

  const escolherEsquerda = (i: number) => {
    if (bloqueado) return;
    if (mapa[i] !== undefined) {
      const novo = { ...mapa };
      delete novo[i];
      onChange({ tipo: 'associar', valor: novo });
      setAtivo(i);
      return;
    }
    setAtivo(ativo === i ? null : i);
  };

  const escolherDireita = (j: number) => {
    if (bloqueado || ativo === null || usados.has(j)) return;
    onChange({ tipo: 'associar', valor: { ...mapa, [ativo]: j } });
    setAtivo(null);
  };

  return (
    <div className="tr-associar">
      <div className="tr-col">
        {ex.pares.map((p, i) => {
          const escolhido = mapa[i];
          let estado = '';
          if (bloqueado) estado = escolhido === i ? 'tr-opt--ok' : 'tr-opt--err';
          else if (ativo === i) estado = 'tr-opt--sel';
          else if (escolhido !== undefined) estado = 'tr-opt--pareado';
          return (
            <button
              key={p.chave}
              type="button"
              className={`tr-opt tr-opt--par ${estado}`}
              disabled={bloqueado}
              onClick={() => escolherEsquerda(i)}
            >
              <span className="tr-par-chave">{p.chave}</span>
              {escolhido !== undefined && (
                <span className="tr-par-valor">{ex.pares[escolhido].valor}</span>
              )}
              {bloqueado && escolhido !== i && (
                <span className="tr-par-correto">{ex.pares[i].valor}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="tr-col">
        {direita.map(j => {
          const usado = usados.has(j);
          return (
            <button
              key={j}
              type="button"
              className={`tr-chip tr-chip--alto ${usado ? 'tr-chip--usado' : ''}`}
              disabled={bloqueado || usado || ativo === null}
              onClick={() => escolherDireita(j)}
            >
              {ex.pares[j].valor}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Classificar ──────────────────────────────────────────────────────────────

const Classificar: React.FC<{
  ex: ExClassificar;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const mapa = resposta?.tipo === 'classificar' ? resposta.valor : {};
  return (
    <div className="tr-classificar">
      {ex.itens.map((item, i) => {
        const escolhida = mapa[i];
        const acertou = escolhida === item.categoria;
        return (
          <div
            key={item.texto}
            className={`tr-class-linha ${
              bloqueado ? (acertou ? 'tr-class--ok' : 'tr-class--err') : ''
            }`}
          >
            <span className="tr-class-item">{item.texto}</span>
            <div className="tr-class-cats">
              {ex.categorias.map(cat => {
                const sel = escolhida === cat;
                let estado = '';
                if (bloqueado) {
                  if (cat === item.categoria) estado = 'tr-cat--ok';
                  else if (sel) estado = 'tr-cat--err';
                } else if (sel) {
                  estado = 'tr-cat--sel';
                }
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`tr-cat ${estado}`}
                    disabled={bloqueado}
                    onClick={() => onChange({ tipo: 'classificar', valor: { ...mapa, [i]: cat } })}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Numérico ─────────────────────────────────────────────────────────────────

const Numerico: React.FC<{
  ex: ExNumerico;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}> = ({ ex, resposta, onChange, bloqueado }) => {
  const valor =
    resposta?.tipo === 'numerico'
      ? resposta.valor
      : Math.round((ex.min + ex.max) / 2 / ex.passo) * ex.passo;
  const acertou = valor >= ex.faixaCorreta[0] && valor <= ex.faixaCorreta[1];
  const alvo =
    ex.faixaCorreta[0] === ex.faixaCorreta[1]
      ? `${ex.faixaCorreta[0]} ${ex.unidade}`
      : `${ex.faixaCorreta[0]}–${ex.faixaCorreta[1]} ${ex.unidade}`;

  const ajustar = (delta: number) => {
    const novo = Math.min(ex.max, Math.max(ex.min, valor + delta * ex.passo));
    onChange({ tipo: 'numerico', valor: novo });
  };

  return (
    <div className="tr-numerico">
      <div
        className={`tr-num-display ${
          bloqueado ? (acertou ? 'tr-num--ok' : 'tr-num--err') : ''
        }`}
      >
        <span className="tr-num-valor">{valor}</span>
        <span className="tr-num-unidade">{ex.unidade}</span>
      </div>

      <div className="tr-num-controles">
        <button type="button" className="tr-num-btn" disabled={bloqueado} onClick={() => ajustar(-1)}>
          −
        </button>
        <input
          type="range"
          className="tr-num-range"
          min={ex.min}
          max={ex.max}
          step={ex.passo}
          value={valor}
          disabled={bloqueado}
          onChange={e => onChange({ tipo: 'numerico', valor: Number(e.target.value) })}
        />
        <button type="button" className="tr-num-btn" disabled={bloqueado} onClick={() => ajustar(1)}>
          +
        </button>
      </div>

      <div className="tr-num-escala">
        <span>
          {ex.min} {ex.unidade}
        </span>
        <span>
          {ex.max} {ex.unidade}
        </span>
      </div>

      {bloqueado && !acertou && <p className="tr-hint">Resposta esperada: {alvo}</p>}
    </div>
  );
};

// ── Dispatcher ───────────────────────────────────────────────────────────────

const ExercicioRenderer: React.FC<Props> = ({ exercicio, resposta, onChange, bloqueado }) => {
  switch (exercicio.tipo) {
    case 'escolha_unica':
      return (
        <EscolhaUnica ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />
      );
    case 'vf':
      return (
        <VerdadeiroFalso ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />
      );
    case 'ordenar':
      return <Ordenar ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />;
    case 'associar':
      return <Associar ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />;
    case 'classificar':
      return (
        <Classificar ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />
      );
    case 'numerico':
      return <Numerico ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />;
    case 'hotspot':
      return <Hotspot ex={exercicio} resposta={resposta} onChange={onChange} bloqueado={bloqueado} />;
  }
};

export default ExercicioRenderer;
