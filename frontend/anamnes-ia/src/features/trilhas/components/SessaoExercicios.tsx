import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Heart, Lightbulb, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Exercicio, Resposta } from '../types/trilha';
import ExercicioRenderer from './ExercicioRenderer';
import ImagemExercicio from './ImagemExercicio';
import TracadoProgresso from './TracadoProgresso';
import { corrigir, respostaCompleta } from '../utils/correcao';

// ─────────────────────────────────────────────────────────────────────────────
// Motor de uma sessão de exercícios. É o mesmo para lição e para revisão —
// o que muda é quem monta a lista e o que acontece no fim.
// ─────────────────────────────────────────────────────────────────────────────

export interface RespostaSessao {
  exercicioId: string;
  acertou: boolean;
  segundos: number;
  usouDica: boolean;
}

export interface ResultadoSessao {
  respostas: RespostaSessao[];
  acertos: number;
  total: number;
  precisao: number;
  segundos: number;
  vidasRestantes: number;
  falhou: boolean;
  /** Maior sequência de acertos seguidos. */
  melhorCombo: number;
}

interface Props {
  exercicios: Exercicio[];
  /** Número de vidas. `null` desliga o sistema (usado na revisão). */
  vidasIniciais: number | null;
  rotulo: string;
  /** Ressalva sobre o conteúdo, mostrada uma vez no começo da sessão. */
  aviso?: string;
  onSair: () => void;
  onFinalizar: (r: ResultadoSessao) => void;
}

export const SessaoExercicios: React.FC<Props> = ({
  exercicios,
  vidasIniciais,
  rotulo,
  aviso,
  onSair,
  onFinalizar,
}) => {
  const inicioSessao = useRef(Date.now());
  const inicioQuestao = useRef(Date.now());

  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [verificado, setVerificado] = useState(false);
  const [vidas, setVidas] = useState(vidasIniciais ?? Infinity);
  const [mostrarDica, setMostrarDica] = useState(false);
  const [usouDica, setUsouDica] = useState(false);
  const [respostas, setRespostas] = useState<RespostaSessao[]>([]);
  const [combo, setCombo] = useState(0);
  const [melhorCombo, setMelhorCombo] = useState(0);
  const [batendo, setBatendo] = useState(false);
  const [tremendo, setTremendo] = useState(false);
  const [entrando, setEntrando] = useState(true);
  const [avisoAberto, setAvisoAberto] = useState(Boolean(aviso));

  const total = exercicios.length;
  const exercicio = exercicios[Math.min(indice, total - 1)];
  const acertou = verificado && corrigir(exercicio, resposta);
  const podeVerificar = respostaCompleta(exercicio, resposta);

  useEffect(() => {
    inicioQuestao.current = Date.now();
    setEntrando(true);
    const t = setTimeout(() => setEntrando(false), 260);
    return () => clearTimeout(t);
  }, [indice]);

  const finalizar = useCallback(
    (lista: RespostaSessao[], falhou: boolean, vidasFinais: number, melhor: number) => {
      const acertosFinais = lista.filter(r => r.acertou).length;
      onFinalizar({
        respostas: lista,
        acertos: acertosFinais,
        total,
        precisao: total > 0 ? Math.round((acertosFinais / total) * 100) : 0,
        segundos: Math.round((Date.now() - inicioSessao.current) / 1000),
        vidasRestantes: Number.isFinite(vidasFinais) ? vidasFinais : 0,
        falhou,
        melhorCombo: melhor,
      });
    },
    [onFinalizar, total],
  );

  const verificar = () => {
    const certo = corrigir(exercicio, resposta);
    const segundos = Math.round((Date.now() - inicioQuestao.current) / 1000);
    setVerificado(true);
    setRespostas(prev => [...prev, { exercicioId: exercicio.id, acertou: certo, segundos, usouDica }]);

    if (certo) {
      const novo = combo + 1;
      setCombo(novo);
      setMelhorCombo(m => Math.max(m, novo));
      setBatendo(true);
      setTimeout(() => setBatendo(false), 620);
    } else {
      setCombo(0);
      setVidas(v => v - 1);
      setTremendo(true);
      setTimeout(() => setTremendo(false), 420);
    }
  };

  const avancar = () => {
    const semVidas = vidas <= 0;
    if (semVidas) {
      finalizar(respostas, true, 0, melhorCombo);
      return;
    }
    if (indice + 1 >= total) {
      finalizar(respostas, false, vidas, melhorCombo);
      return;
    }
    setIndice(i => i + 1);
    setResposta(null);
    setVerificado(false);
    setMostrarDica(false);
    setUsouDica(false);
  };

  const feitas = respostas.length;

  return (
    <div className={`tr-sessao ${tremendo ? 'tr-sessao--erro' : ''}`}>
      <div className="tr-topo">
        <button className="tr-sair" onClick={onSair} title="Sair da sessão" aria-label="Sair">
          <X size={20} />
        </button>

        <TracadoProgresso feitas={feitas} total={total} pulsando={batendo} />

        {vidasIniciais !== null ? (
          <div className="tr-vidas" aria-label={`${Math.max(0, vidas)} vidas`}>
            {Array.from({ length: vidasIniciais }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                className={i < vidas ? 'tr-vida tr-vida--cheia' : 'tr-vida tr-vida--gasta'}
                fill={i < vidas ? 'currentColor' : 'none'}
              />
            ))}
          </div>
        ) : (
          <span className="tr-contador-simples">
            {feitas}/{total}
          </span>
        )}
      </div>

      {avisoAberto && aviso && (
        <div className="tr-aviso" role="note">
          <AlertTriangle size={17} />
          <p>{aviso}</p>
          <button onClick={() => setAvisoAberto(false)} aria-label="Entendi">
            Entendi
          </button>
        </div>
      )}

      {combo >= 3 && !verificado && (
        <div className="tr-combo" key={combo}>
          🔥 {combo} seguidas
        </div>
      )}

      <main className={`tr-exercicio ${entrando ? 'tr-exercicio--entrando' : ''}`} key={exercicio.id}>
        <span className="tr-exercicio-contador">
          {rotulo} · {Math.min(indice + 1, total)} de {total}
        </span>
        <h1 className="tr-enunciado">{exercicio.enunciado}</h1>

        {exercicio.imagemUrl && exercicio.tipo !== 'hotspot' && (
          <ImagemExercicio src={exercicio.imagemUrl} />
        )}

        {exercicio.dica && !verificado && (
          <div className="tr-dica-wrap">
            <button
              className="tr-dica-btn"
              onClick={() => {
                setMostrarDica(v => !v);
                setUsouDica(true);
              }}
            >
              <Lightbulb size={14} /> {mostrarDica ? 'Esconder dica' : 'Ver dica'}
            </button>
            {mostrarDica && <p className="tr-dica">{exercicio.dica}</p>}
          </div>
        )}

        <ExercicioRenderer
          exercicio={exercicio}
          resposta={resposta}
          onChange={setResposta}
          bloqueado={verificado}
        />
      </main>

      <footer
        className={`tr-rodape ${verificado ? (acertou ? 'tr-rodape--ok' : 'tr-rodape--err') : ''}`}
      >
        {verificado && (
          <div className="tr-feedback">
            <div className="tr-feedback-titulo">
              {acertou ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{acertou ? 'Correto' : 'Resposta incorreta'}</span>
            </div>
            {exercicio.explicacao && <p className="tr-feedback-texto">{exercicio.explicacao}</p>}
          </div>
        )}

        {!verificado ? (
          <button className="tr-btn tr-btn--largo" disabled={!podeVerificar} onClick={verificar}>
            Verificar
          </button>
        ) : (
          <button className="tr-btn tr-btn--largo" onClick={avancar}>
            {vidas <= 0 ? 'Ver resultado' : indice + 1 >= total ? 'Finalizar' : 'Continuar'}
          </button>
        )}
      </footer>
    </div>
  );
};

export default SessaoExercicios;
