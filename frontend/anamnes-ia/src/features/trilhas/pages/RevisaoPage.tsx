import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Exercicio } from '../types/trilha';
import { buscarTrilha, carregarLicoes } from '../data';
import { useProgresso } from '../hooks/useProgresso';
import SessaoExercicios, { type ResultadoSessao } from '../components/SessaoExercicios';
import ResultadoSessaoView from '../components/ResultadoSessaoView';
import Carregando from '../components/Carregando';
import { cartoesVencidos } from '../utils/srs';
import '../styles/trilhas.css';

/** Teto de questões por sessão — revisão longa demais ninguém termina. */
const LIMITE = 20;
const XP_POR_ACERTO = 3;

export const RevisaoPage: React.FC = () => {
  const { trilhaId } = useParams<{ trilhaId: string }>();
  const navigate = useNavigate();
  const { progresso, revisar } = useProgresso();
  const trilha = buscarTrilha(trilhaId);

  const [exercicios, setExercicios] = useState<Exercicio[] | null>(null);
  const [origem, setOrigem] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoSessao | null>(null);
  const [xpGanho, setXpGanho] = useState(0);

  // A fila é montada uma única vez, no mount: os cartões mudam durante a
  // sessão e a lista não pode se remontar embaixo do aluno.
  const fila = useMemo(
    () => cartoesVencidos(progresso.cartoes, trilhaId).slice(0, LIMITE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trilhaId],
  );

  useEffect(() => {
    if (!trilhaId || fila.length === 0) {
      setExercicios([]);
      return;
    }
    let ativo = true;
    carregarLicoes(fila.map(f => ({ trilhaId: f.cartao.trilhaId, licaoId: f.cartao.licaoId })))
      .then(licoes => {
        if (!ativo) return;
        const porId = new Map<string, Exercicio>();
        const deQualLicao: Record<string, string> = {};
        for (const [chave, licao] of licoes) {
          for (const ex of licao.exercicios) {
            porId.set(ex.id, ex);
            deQualLicao[ex.id] = chave.split(':')[1];
          }
        }
        setOrigem(deQualLicao);
        setExercicios(
          fila.map(f => porId.get(f.exercicioId)).filter((e): e is Exercicio => Boolean(e)),
        );
      })
      .catch(() => ativo && setExercicios([]));
    return () => {
      ativo = false;
    };
  }, [fila, trilhaId]);

  const finalizar = useCallback(
    (r: ResultadoSessao) => {
      if (!trilha) return;
      const xp = r.acertos * XP_POR_ACERTO;
      setXpGanho(xp);
      setResultado(r);
      revisar(
        r.respostas.map(x => ({
          ...x,
          trilhaId: trilha.id,
          licaoId: origem[x.exercicioId] ?? '',
        })),
        xp,
      );
    },
    [origem, revisar, trilha],
  );

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

  const estilo = {
    '--tr-cor': trilha.cor,
    '--tr-cor-escura': trilha.corEscura,
  } as React.CSSProperties;

  if (exercicios === null) {
    return (
      <div className="tr-page tr-page--licao" style={estilo}>
        <Carregando mensagem="Montando sua revisão…" />
      </div>
    );
  }

  if (exercicios.length === 0) {
    return (
      <div className="tr-page" style={estilo}>
        <div className="tr-vazio">
          <span className="tr-vazio-emoji">🌤️</span>
          <p>
            Nada vencido em {trilha.titulo} por hoje. Faça uma lição nova — as questões voltam
            sozinhas quando estiverem prestes a ser esquecidas.
          </p>
          <button className="tr-btn" onClick={() => navigate(`/trilhas/${trilha.id}`)}>
            Ir para a trilha
          </button>
        </div>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="tr-page" style={estilo}>
        <ResultadoSessaoView
          resultado={resultado}
          xpGanho={xpGanho}
          exercicios={exercicios}
          titulo={resultado.precisao === 100 ? 'Revisão impecável' : 'Revisão concluída'}
          subtitulo={
            resultado.precisao >= 80
              ? 'O que você acertou volta mais tarde; o que errou, amanhã.'
              : 'As questões erradas voltam amanhã, e as certas em intervalos maiores.'
          }
          acaoPrimaria={{
            rotulo: 'Voltar à trilha',
            onClick: () => navigate(`/trilhas/${trilha.id}`),
          }}
          acaoSecundaria={{ rotulo: 'Todas as trilhas', onClick: () => navigate('/trilhas') }}
        />
      </div>
    );
  }

  return (
    <div className="tr-page tr-page--licao" style={estilo}>
      <SessaoExercicios
        exercicios={exercicios}
        vidasIniciais={null}
        rotulo="Revisão"
        onSair={() => navigate(`/trilhas/${trilha.id}`)}
        onFinalizar={finalizar}
      />
    </div>
  );
};

export default RevisaoPage;
