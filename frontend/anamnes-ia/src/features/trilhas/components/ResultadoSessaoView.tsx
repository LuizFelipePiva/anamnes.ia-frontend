import React from 'react';
import { Star, Clock, Target, Flame } from 'lucide-react';
import type { Exercicio } from '../types/trilha';
import type { ResultadoSessao } from './SessaoExercicios';
import { ContadorXp, Confete } from './Celebracao';
import { formatarTempo } from '../utils/correcao';

interface Props {
  resultado: ResultadoSessao;
  xpGanho: number;
  exercicios: Exercicio[];
  titulo: string;
  subtitulo: string;
  /** Rótulos dos botões e o que cada um faz. */
  acaoPrimaria: { rotulo: string; onClick: () => void };
  acaoSecundaria?: { rotulo: string; onClick: () => void };
  /** Data legível da próxima revisão, quando houver. */
  proximaRevisao?: string | null;
}

export const ResultadoSessaoView: React.FC<Props> = ({
  resultado,
  xpGanho,
  exercicios,
  titulo,
  subtitulo,
  acaoPrimaria,
  acaoSecundaria,
  proximaRevisao,
}) => {
  const { precisao, segundos, melhorCombo, falhou } = resultado;
  const erradas = resultado.respostas.filter(r => !r.acertou).map(r => r.exercicioId);
  const paraRevisar = exercicios.filter(e => erradas.includes(e.id));
  const comemorar = !falhou && precisao >= 80;

  return (
    <div className="tr-resultado">
      {comemorar && <Confete />}

      <span className={`tr-resultado-emoji ${comemorar ? 'tr-resultado-emoji--pulo' : ''}`}>
        {falhou ? '🫥' : precisao === 100 ? '🏆' : precisao >= 60 ? '🎉' : '📚'}
      </span>
      <h1 className="tr-resultado-titulo">{titulo}</h1>
      <p className="tr-resultado-sub">{subtitulo}</p>

      <div className="tr-resultado-cards">
        <div className="tr-res-card">
          <Target size={16} />
          <strong>{precisao}%</strong>
          <span>precisão</span>
        </div>
        <div className="tr-res-card">
          <Star size={16} />
          <strong>
            +<ContadorXp valor={xpGanho} />
          </strong>
          <span>XP</span>
        </div>
        <div className="tr-res-card">
          <Flame size={16} />
          <strong>{melhorCombo}</strong>
          <span>melhor sequência</span>
        </div>
        <div className="tr-res-card">
          <Clock size={16} />
          <strong>{formatarTempo(segundos)}</strong>
          <span>tempo</span>
        </div>
      </div>

      {proximaRevisao && (
        <p className="tr-proxima">
          As questões desta sessão voltam para revisão a partir de <strong>{proximaRevisao}</strong>.
        </p>
      )}

      {paraRevisar.length > 0 && (
        <div className="tr-revisao">
          <h2>Para revisar</h2>
          {paraRevisar.map(e => (
            <div key={e.id} className="tr-revisao-item">
              <p className="tr-revisao-enunciado">{e.enunciado}</p>
              {e.explicacao && <p className="tr-revisao-explicacao">{e.explicacao}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="tr-resultado-acoes">
        <button className="tr-btn" onClick={acaoPrimaria.onClick}>
          {acaoPrimaria.rotulo}
        </button>
        {acaoSecundaria && (
          <button className="tr-btn tr-btn--ghost" onClick={acaoSecundaria.onClick}>
            {acaoSecundaria.rotulo}
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultadoSessaoView;
