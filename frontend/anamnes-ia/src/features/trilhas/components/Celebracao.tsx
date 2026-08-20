import React, { useEffect, useRef, useState } from 'react';

/** Contador que sobe de 0 até `valor` — dá peso ao XP ganho no fim da lição. */
export const ContadorXp: React.FC<{ valor: number; duracao?: number }> = ({
  valor,
  duracao = 900,
}) => {
  const [atual, setAtual] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzido || valor <= 0) {
      setAtual(valor);
      return;
    }
    const inicio = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      const eased = 1 - Math.pow(1 - p, 3);
      setAtual(Math.round(valor * eased));
      if (p < 1) raf.current = requestAnimationFrame(passo);
    };
    raf.current = requestAnimationFrame(passo);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [valor, duracao]);

  return <>{atual}</>;
};

/** Partículas de comemoração — CSS puro, sem dependência nova. */
export const Confete: React.FC<{ quantidade?: number }> = ({ quantidade = 28 }) => {
  const pecas = Array.from({ length: quantidade }, (_, i) => i);
  return (
    <div className="tr-confete" aria-hidden="true">
      {pecas.map(i => (
        <span
          key={i}
          className="tr-confete-peca"
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--atraso': `${(i % 9) * 90}ms`,
              '--giro': `${((i * 53) % 360) - 180}deg`,
              '--tom': `hsl(${(i * 47) % 360} 85% 62%)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
