import React, { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ExHotspot, Resposta } from '../types/trilha';
import { dentroDoAlvo } from '../utils/correcao';

// ─────────────────────────────────────────────────────────────────────────────
// "Marque a alteração na imagem."
//
// O aluno clica sobre a radiografia; os cliques são guardados em fração do
// quadro (0–1), não em pixels, para funcionar em qualquer tamanho de tela e
// sobreviver ao redimensionamento das imagens no pipeline de ingestão.
// Ao verificar, os alvos reais aparecem sobrepostos.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  ex: ExHotspot;
  resposta: Resposta | null;
  onChange: (r: Resposta) => void;
  bloqueado: boolean;
}

export const Hotspot: React.FC<Props> = ({ ex, resposta, onChange, bloqueado }) => {
  const quadro = useRef<HTMLDivElement>(null);
  const [carregada, setCarregada] = useState(false);

  const cliques = resposta?.tipo === 'hotspot' ? resposta.valor : [];
  const maxCliques = ex.maxCliques ?? ex.alvos.length;

  const marcar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (bloqueado || !quadro.current) return;
    const r = quadro.current.getBoundingClientRect();
    const ponto = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };

    // clicar de novo sobre uma marca já feita a remove
    const existente = cliques.findIndex(
      c => Math.hypot(c.x - ponto.x, c.y - ponto.y) < 0.04,
    );
    if (existente >= 0) {
      onChange({ tipo: 'hotspot', valor: cliques.filter((_, i) => i !== existente) });
      return;
    }
    if (cliques.length >= maxCliques) return;
    onChange({ tipo: 'hotspot', valor: [...cliques, ponto] });
  };

  const restantes = maxCliques - cliques.length;

  return (
    <div className="tr-hotspot">
      <div
        ref={quadro}
        className={`tr-hotspot-quadro ${bloqueado ? 'tr-hotspot-quadro--travado' : ''}`}
        onClick={marcar}
        role="application"
        aria-label={ex.enunciado}
      >
        <img src={ex.imagemUrl} alt="" onLoad={() => setCarregada(true)} draggable={false} />

        {/* alvos reais — só depois de verificar */}
        {bloqueado &&
          ex.alvos.map((alvo, i) => (
            <span
              key={i}
              className="tr-hotspot-alvo"
              style={{
                left: `${alvo.x * 100}%`,
                top: `${alvo.y * 100}%`,
                width: `${alvo.largura * 100}%`,
                height: `${alvo.altura * 100}%`,
              }}
            >
              {alvo.rotulo && <span className="tr-hotspot-rotulo">{alvo.rotulo}</span>}
            </span>
          ))}

        {/* marcas do aluno */}
        {cliques.map((c, i) => {
          const acertou = ex.alvos.some(alvo => dentroDoAlvo(c, alvo));
          const estado = bloqueado ? (acertou ? 'tr-marca--ok' : 'tr-marca--err') : '';
          return (
            <span
              key={i}
              className={`tr-marca ${estado}`}
              style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
            >
              {bloqueado && (acertou ? <Check size={13} /> : <X size={13} />)}
            </span>
          );
        })}

        {!carregada && <span className="tr-hotspot-esperando">Carregando imagem…</span>}
      </div>

      <p className="tr-hotspot-ajuda">
        {bloqueado
          ? `${ex.legendaAlvos ?? 'Área correta'} destacada acima.`
          : restantes > 0
            ? `Toque na imagem para marcar. ${restantes} ${
                restantes === 1 ? 'marcação restante' : 'marcações restantes'
              }. Toque de novo em uma marca para removê-la.`
            : 'Todas as marcações foram usadas. Toque em uma marca para removê-la e tentar outro ponto.'}
      </p>
    </div>
  );
};

export default Hotspot;
