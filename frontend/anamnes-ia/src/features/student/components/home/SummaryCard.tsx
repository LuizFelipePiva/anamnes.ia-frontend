/**
 * SPEC-013 §6.9 — resumo da semana por IA.
 * 2–3 frases de coaching vindas do backend. Sem texto não renderiza: nada de
 * placeholder ou skeleton, porque com a feature desligada o card simplesmente
 * não existe na home.
 *
 * Layout: faixa de largura cheia entre o hero e o grid, não coluna lateral —
 * texto corrido espremido em ~380px virava seis linhas curtas. O parágrafo vai
 * até a borda direita, sem teto de medida de leitura: a linha longa foi escolha
 * explícita de quem desenhou a home, então não reintroduza um `max-w-[Nch]`.
 *
 * "É gerado por IA" é dito pela **estética**, não por rótulo: a moldura
 * iridescente que percorre o card devagar (`.ai-ring`, `index.css`) é o único
 * elemento vivo de uma home inteiramente estática, e o título em gradiente
 * repete a assinatura. Versões anteriores usavam filete lateral, selo de texto
 * "Gerado por IA" e uma onda de fundo — todos recusados no design review; não
 * reintroduza.
 *
 * A moldura é `padding` + `background` no elemento externo, com o miolo opaco
 * por cima: dá borda de gradiente com raio sem `mask`, que o Safari antigo
 * renderiza torto. Movimento respeita `prefers-reduced-motion` no CSS.
 *
 * O miolo é a classe `.ai-ring-body` (`index.css`), não utilitários Tailwind:
 * o gradiente branco inline não era alcançado pelos overrides de modo escuro
 * (que só remapeiam `bg-white` e afins) e o card ficava branco no escuro.
 *
 * O `font-['Lato']` é explícito de propósito: `body` (`index.css:93`) sobrescreve
 * o `:root` com `system-ui`, então sem isso o resumo herdaria Segoe UI/Avenir em
 * vez da fonte de leitura do design system.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Sparkles } from 'lucide-react';
import { specialtyLabel } from '@/shared/utils/specialties';

export type SummaryTrainingMode = 'recommended' | 'create' | null;

interface SummaryCardProps {
  summary: string | null;
  weakSpecialty?: string | null;
  trainingMode?: SummaryTrainingMode;
  onTrain?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  summary,
  weakSpecialty = null,
  trainingMode = null,
  onTrain,
}) => {
  const { t } = useTranslation('common');
  if (!summary) return null;

  return (
    <section
      data-testid="card-summary"
      className="ai-ring animate-fade-in w-full rounded-2xl p-[2px] shadow-[0_6px_22px_rgba(19,12,45,.07)]"
    >
      {/* Raio do miolo = raio externo (16px) − espessura da moldura (2px), senão
          a borda engrossa nos cantos. */}
      <div className="ai-ring-body rounded-[14px] px-6 py-5 flex flex-col gap-3">
        <h2 className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em]">
          <Sparkles size={13} aria-hidden="true" className="text-[#844AF5]" />
          {/* Gradiente no próprio texto: mesma paleta da moldura, para o título
              ler como parte da assinatura em vez de rótulo solto. */}
          <span className="bg-gradient-to-r from-[#844AF5] via-[#8f5bff] to-[#f04b87] bg-clip-text text-transparent">
            {t('home.summary.title')}
          </span>
        </h2>

        <p className="m-0 font-['Lato'] text-[14.5px] leading-[1.7] text-[#372f52]">
          {summary}
        </p>

        {weakSpecialty && trainingMode && onTrain && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onTrain}
              className="inline-flex items-center gap-2 rounded-xl border border-[#844AF5]/25 bg-[#844AF5]/10 px-4 py-2 text-sm font-bold text-[#6840c6] transition hover:bg-[#844AF5]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#844AF5]/40"
            >
              {t(
                trainingMode === 'recommended'
                  ? 'home.summary.train_specialty'
                  : 'home.summary.create_training',
                { specialty: specialtyLabel(weakSpecialty) },
              )}
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SummaryCard;
