import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Lock, Check, Star, RefreshCw, Flag } from 'lucide-react';
import { buscarTrilha } from '../data';
import { useProgresso } from '../hooks/useProgresso';
import { chaveLicao, licoesEmOrdem } from '../utils/correcao';
import '../styles/trilhas.css';

export const TrilhaMapaPage: React.FC = () => {
  const { trilhaId } = useParams<{ trilhaId: string }>();
  const navigate = useNavigate();
  const { progresso, vencidos } = useProgresso();
  const trilha = buscarTrilha(trilhaId);

  const ordem = useMemo(() => (trilha ? licoesEmOrdem(trilha.unidades) : []), [trilha]);

  if (!trilha) {
    return (
      <div className="tr-page">
        <div className="tr-vazio">
          <p>Trilha não encontrada.</p>
          <button className="tr-btn" onClick={() => navigate('/trilhas')}>
            Voltar para as trilhas
          </button>
        </div>
      </div>
    );
  }

  /** Índice da primeira lição ainda não concluída — tudo depois dela fica bloqueado. */
  const primeiraPendente = ordem.findIndex(
    l => !progresso.licoes[chaveLicao(trilha.id, l.id)]?.concluida,
  );
  const liberadaAte = primeiraPendente === -1 ? ordem.length - 1 : primeiraPendente;
  const devidos = vencidos[trilha.id] ?? 0;

  let indiceGlobal = -1;

  return (
    <div
      className="tr-page tr-page--mapa"
      style={{ '--tr-cor': trilha.cor, '--tr-cor-escura': trilha.corEscura } as React.CSSProperties}
    >
      <header className="tr-header">
        <button className="tr-back" onClick={() => navigate('/trilhas')}>
          <ChevronLeft size={15} /> Trilhas
        </button>
        <h1 className="tr-title">
          <span className="tr-title-emoji">{trilha.emoji}</span> {trilha.titulo}
        </h1>
        <p className="tr-subtitle">{trilha.descricao}</p>

        {devidos > 0 && (
          <button className="tr-btn tr-btn--revisar" onClick={() => navigate(`/trilhas/${trilha.id}/revisao`)}>
            <RefreshCw size={16} /> Revisar {devidos} {devidos === 1 ? 'questão' : 'questões'}
          </button>
        )}
      </header>

      <div className="tr-mapa">
        {trilha.unidades.map((unidade, ui) => {
          const feitasNaUnidade = unidade.licoes.filter(
            l => progresso.licoes[chaveLicao(trilha.id, l.id)]?.concluida,
          ).length;

          return (
            <section key={unidade.id} className="tr-unidade">
              <div className="tr-unidade-faixa">
                <div className="tr-unidade-num">
                  {unidade.emoji ?? String(ui + 1).padStart(2, '0')}
                </div>
                <div className="tr-unidade-texto">
                  <h2>{unidade.titulo}</h2>
                  <p>{unidade.descricao}</p>
                </div>
                <span className="tr-unidade-contagem">
                  {feitasNaUnidade}/{unidade.licoes.length}
                </span>
              </div>

              <div className="tr-nos">
                {unidade.licoes.map(licao => {
                  indiceGlobal += 1;
                  const prog = progresso.licoes[chaveLicao(trilha.id, licao.id)];
                  const concluida = prog?.concluida ?? false;
                  const bloqueada = indiceGlobal > liberadaAte;
                  const atual = indiceGlobal === liberadaAte && !concluida;
                  const lado = indiceGlobal % 2 === 0 ? 'tr-no--esq' : 'tr-no--dir';

                  return (
                    <div
                      key={licao.id}
                      className={`tr-no-wrap ${lado}`}
                      style={{ '--atraso': `${(indiceGlobal % 6) * 55}ms` } as React.CSSProperties}
                    >
                      <button
                        className={`tr-no ${concluida ? 'tr-no--feito' : ''} ${
                          bloqueada ? 'tr-no--travado' : ''
                        } ${atual ? 'tr-no--atual' : ''}`}
                        disabled={bloqueada}
                        onClick={() => navigate(`/trilhas/${trilha.id}/licao/${licao.id}`)}
                        title={bloqueada ? 'Conclua a lição anterior para liberar' : licao.titulo}
                      >
                        {bloqueada ? (
                          <Lock size={20} />
                        ) : concluida ? (
                          <Check size={26} strokeWidth={3} />
                        ) : (
                          <span className="tr-no-emoji">{licao.emoji}</span>
                        )}
                      </button>

                      <div className="tr-no-info">
                        <span className="tr-no-titulo">{licao.titulo}</span>
                        <span className="tr-no-meta">
                          {licao.totalExercicios} questões · {licao.xp} XP
                          {prog ? ` · melhor ${prog.melhorPrecisao}%` : ''}
                          {licao.aviso && (
                            <span className="tr-no-aviso" title={licao.aviso}>
                              · sem revisão clínica
                            </span>
                          )}
                        </span>
                      </div>

                      {atual && <span className="tr-no-aqui">Você está aqui</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="tr-fim">
          {liberadaAte >= ordem.length - 1 &&
          progresso.licoes[chaveLicao(trilha.id, ordem[ordem.length - 1]?.id ?? '')]?.concluida ? (
            <>
              <Flag size={18} />
              <span>Trilha completa. Agora é manter na memória: revise todo dia.</span>
            </>
          ) : (
            <>
              <Star size={18} />
              <span>
                {ordem.length - liberadaAte} {ordem.length - liberadaAte === 1 ? 'lição' : 'lições'}{' '}
                pela frente.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrilhaMapaPage;
