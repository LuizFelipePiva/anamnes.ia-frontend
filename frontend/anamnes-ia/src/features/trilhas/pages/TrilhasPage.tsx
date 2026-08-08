import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, Star, RotateCcw, RefreshCw, Layers } from 'lucide-react';
import { TRILHAS, totalExercicios, totalLicoes } from '../data';
import { useProgresso } from '../hooks/useProgresso';
import { chaveLicao, licoesEmOrdem } from '../utils/correcao';
import '../styles/trilhas.css';

export const TrilhasPage: React.FC = () => {
  const navigate = useNavigate();
  const { progresso, ofensiva, vencidos, zerar } = useProgresso();

  const totalConcluidas = Object.values(progresso.licoes).filter(l => l.concluida).length;
  const totalCartoes = Object.keys(progresso.cartoes).length;
  const totalVencidos = Object.values(vencidos).reduce((a, b) => a + b, 0);

  const handleZerar = () => {
    if (window.confirm('Zerar todo o progresso das trilhas? Isso não pode ser desfeito.')) {
      zerar();
    }
  };

  return (
    <div className="tr-page">
      <header className="tr-header">
        <button className="tr-back" onClick={() => navigate('/mainpage')}>
          <ChevronLeft size={15} /> Menu
        </button>
        <h1 className="tr-title">Trilhas</h1>
        <p className="tr-subtitle">
          Exames complementares em lições curtas, com revisão espaçada. Cinco minutos por dia
          sustentam mais do que uma maratona por mês.
        </p>
      </header>

      <section className="tr-stats">
        <div className="tr-stat">
          <Flame size={18} className="tr-stat-icon tr-stat-icon--fogo" />
          <div>
            <strong>{ofensiva}</strong>
            <span>{ofensiva === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </div>
        </div>
        <div className="tr-stat">
          <Star size={18} className="tr-stat-icon tr-stat-icon--xp" />
          <div>
            <strong>{progresso.xp}</strong>
            <span>XP total</span>
          </div>
        </div>
        <div className="tr-stat">
          <Layers size={18} className="tr-stat-icon tr-stat-icon--cartao" />
          <div>
            <strong>{totalCartoes}</strong>
            <span>{totalCartoes === 1 ? 'questão na memória' : 'questões na memória'}</span>
          </div>
        </div>
        <div className="tr-stat">
          <span className="tr-stat-emoji">✅</span>
          <div>
            <strong>{totalConcluidas}</strong>
            <span>{totalConcluidas === 1 ? 'lição concluída' : 'lições concluídas'}</span>
          </div>
        </div>
      </section>

      {totalVencidos > 0 && (
        <section className="tr-chamada">
          <RefreshCw size={18} />
          <p>
            <strong>
              {totalVencidos} {totalVencidos === 1 ? 'questão pede' : 'questões pedem'} revisão
            </strong>{' '}
            — rever agora o que está prestes a ser esquecido é onde o estudo rende mais.
          </p>
        </section>
      )}

      <section className="tr-lista">
        {TRILHAS.map(trilha => {
          const licoes = licoesEmOrdem(trilha.unidades);
          const feitas = licoes.filter(
            l => progresso.licoes[chaveLicao(trilha.id, l.id)]?.concluida,
          ).length;
          const pct = licoes.length > 0 ? Math.round((feitas / licoes.length) * 100) : 0;
          const devidos = vencidos[trilha.id] ?? 0;

          return (
            <div
              key={trilha.id}
              className="tr-card-wrap"
              style={
                { '--tr-cor': trilha.cor, '--tr-cor-escura': trilha.corEscura } as React.CSSProperties
              }
            >
              <button className="tr-card" onClick={() => navigate(`/trilhas/${trilha.id}`)}>
                <span className="tr-card-emoji">{trilha.emoji}</span>

                <div className="tr-card-corpo">
                  <h2 className="tr-card-titulo">
                    {trilha.titulo}
                    {devidos > 0 && <span className="tr-badge">{devidos}</span>}
                  </h2>
                  <p className="tr-card-desc">{trilha.descricao}</p>

                  <div className="tr-progress">
                    <div className="tr-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="tr-card-meta">
                    {feitas} de {totalLicoes(trilha)} lições · {trilha.unidades.length} módulos ·{' '}
                    {totalExercicios(trilha)} questões
                  </p>
                </div>

                <ChevronRight size={20} className="tr-card-seta" />
              </button>

              {devidos > 0 && (
                <button
                  className="tr-card-revisar"
                  onClick={() => navigate(`/trilhas/${trilha.id}/revisao`)}
                >
                  <RefreshCw size={14} /> Revisar {devidos}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <div className="tr-reset-wrap">
        <button className="tr-reset" onClick={handleZerar}>
          <RotateCcw size={14} /> Zerar progresso
        </button>
      </div>
    </div>
  );
};

export default TrilhasPage;
