import React, { useEffect, useState } from 'react';
import { ZoomIn, X } from 'lucide-react';

// Traçados de ECG são inúteis pequenos: o aluno precisa medir quadradinhos.
// A imagem abre em tela cheia ao toque, com fundo escurecido e fechamento por Esc.

interface Props {
  src: string;
  legenda?: string;
}

export const ImagemExercicio: React.FC<Props> = ({ src, legenda }) => {
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberta(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberta]);

  return (
    <>
      <button
        type="button"
        className="tr-img-btn"
        onClick={() => setAberta(true)}
        aria-label="Ampliar o traçado"
      >
        <img src={src} alt={legenda ?? 'Traçado do exercício'} loading="lazy" />
        <span className="tr-img-lupa">
          <ZoomIn size={15} /> Ampliar
        </span>
      </button>

      {aberta && (
        <div className="tr-lightbox" onClick={() => setAberta(false)} role="dialog" aria-modal="true">
          <button className="tr-lightbox-fechar" aria-label="Fechar">
            <X size={22} />
          </button>
          <img src={src} alt={legenda ?? 'Traçado ampliado'} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default ImagemExercicio;
