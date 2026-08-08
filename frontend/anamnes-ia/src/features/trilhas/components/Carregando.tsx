import React from 'react';

/** Espera curta enquanto o módulo de exercícios é baixado. */
export const Carregando: React.FC<{ mensagem?: string }> = ({ mensagem = 'Carregando…' }) => (
  <div className="tr-carregando" role="status">
    <svg viewBox="0 0 120 40" className="tr-carregando-tracado" aria-hidden="true">
      <path d="M 0 20 L 24 20 L 30 20 L 34 26 L 40 5 L 46 32 L 52 20 L 76 20 L 84 20 L 90 12 L 96 20 L 120 20" />
    </svg>
    <p>{mensagem}</p>
  </div>
);

export default Carregando;
