import { useCallback, useMemo, useState } from 'react';
import type { ProgressoGlobal } from '../types/trilha';
import {
  carregarProgresso,
  ofensivaAtual,
  registrarConclusao,
  registrarRevisao,
  zerarProgresso,
  type RespostaRegistrada,
} from '../services/progressoService';
import { contarVencidosPorTrilha } from '../utils/srs';

export function useProgresso() {
  const [progresso, setProgresso] = useState<ProgressoGlobal>(() => carregarProgresso());

  const concluir = useCallback(
    (args: {
      trilhaId: string;
      licaoId: string;
      precisao: number;
      xpGanho: number;
      concluida: boolean;
      respostas: RespostaRegistrada[];
    }) => setProgresso(registrarConclusao(args)),
    [],
  );

  const revisar = useCallback(
    (respostas: RespostaRegistrada[], xpGanho: number) =>
      setProgresso(registrarRevisao(respostas, xpGanho)),
    [],
  );

  const recarregar = useCallback(() => setProgresso(carregarProgresso()), []);
  const zerar = useCallback(() => setProgresso(zerarProgresso()), []);

  const vencidos = useMemo(() => contarVencidosPorTrilha(progresso.cartoes), [progresso.cartoes]);

  return {
    progresso,
    ofensiva: ofensivaAtual(progresso),
    vencidos,
    concluir,
    revisar,
    recarregar,
    zerar,
  };
}
