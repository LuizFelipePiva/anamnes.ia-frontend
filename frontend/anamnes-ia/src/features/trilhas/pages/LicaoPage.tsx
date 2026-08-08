import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Licao } from '../types/trilha';
import { buscarTrilha, carregarLicao } from '../data';
import { useProgresso } from '../hooks/useProgresso';
import SessaoExercicios, { type ResultadoSessao } from '../components/SessaoExercicios';
import ResultadoSessaoView from '../components/ResultadoSessaoView';
import Carregando from '../components/Carregando';
import { embaralharComSeed } from '../utils/correcao';
import '../styles/trilhas.css';

const VIDAS = 5;
/** Precisão mínima para a lição contar como concluída e liberar a próxima. */
const APROVACAO = 60;

export const LicaoPage: React.FC = () => {
  const { trilhaId, licaoId } = useParams<{ trilhaId: string; licaoId: string }>();
  const navigate = useNavigate();
  const { concluir } = useProgresso();

  const trilha = buscarTrilha(trilhaId);
  const [licao, setLicao] = useState<Licao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoSessao | null>(null);
  const [xpGanho, setXpGanho] = useState(0);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!trilhaId || !licaoId) return;
    let ativo = true;
    setLicao(null);
    setErro(null);
    carregarLicao(trilhaId, licaoId)
      .then(l => ativo && setLicao(l))
      .catch(() => ativo && setErro('Não foi possível carregar esta lição.'));
    return () => {
      ativo = false;
    };
  }, [trilhaId, licaoId]);

  // Embaralha a cada tentativa: refazer a lição não vira decoreba de posição.
  const exercicios = useMemo(
    () => (licao ? embaralharComSeed(licao.exercicios, `${licao.id}-${tentativa}`) : []),
    [licao, tentativa],
  );

  const finalizar = useCallback(
    (r: ResultadoSessao) => {
      if (!trilha || !licao) return;
      const concluida = !r.falhou && r.precisao >= APROVACAO;
      const bonus = r.precisao === 100 ? 5 : 0;
      const xp = Math.round((licao.xp * r.precisao) / 100) + bonus;
      setXpGanho(xp);
      setResultado(r);
      concluir({
        trilhaId: trilha.id,
        licaoId: licao.id,
        precisao: r.precisao,
        xpGanho: xp,
        concluida,
        respostas: r.respostas.map(x => ({
          ...x,
          trilhaId: trilha.id,
          licaoId: licao.id,
        })),
      });
    },
    [concluir, licao, trilha],
  );

  if (!trilha || erro) {
    return (
      <div className="tr-page">
        <div className="tr-vazio">
          <p>{erro ?? 'Lição não encontrada.'}</p>
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

  if (!licao) {
    return (
      <div className="tr-page tr-page--licao" style={estilo}>
        <Carregando mensagem="Preparando a lição…" />
      </div>
    );
  }

  if (resultado) {
    const aprovado = !resultado.falhou && resultado.precisao >= APROVACAO;
    return (
      <div className="tr-page" style={estilo}>
        <ResultadoSessaoView
          resultado={resultado}
          xpGanho={xpGanho}
          exercicios={exercicios}
          titulo={
            resultado.falhou
              ? 'Suas vidas acabaram'
              : resultado.precisao === 100
                ? 'Lição perfeita'
                : aprovado
                  ? 'Lição concluída'
                  : 'Quase lá'
          }
          subtitulo={
            resultado.falhou
              ? 'Revise as questões abaixo e tente de novo — a lição não foi marcada como concluída.'
              : aprovado
                ? `${licao.titulo} · ${trilha.titulo}`
                : `Você precisa de ${APROVACAO}% de acerto para concluir a lição.`
          }
          proximaRevisao={aprovado ? 'amanhã' : null}
          acaoPrimaria={{
            rotulo: 'Voltar à trilha',
            onClick: () => navigate(`/trilhas/${trilha.id}`),
          }}
          acaoSecundaria={{
            rotulo: 'Refazer lição',
            onClick: () => {
              setResultado(null);
              setTentativa(t => t + 1);
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="tr-page tr-page--licao" style={estilo}>
      <SessaoExercicios
        key={tentativa}
        exercicios={exercicios}
        vidasIniciais={VIDAS}
        rotulo={licao.titulo}
        aviso={licao.aviso}
        onSair={() => navigate(`/trilhas/${trilha.id}`)}
        onFinalizar={finalizar}
      />
    </div>
  );
};

export default LicaoPage;
