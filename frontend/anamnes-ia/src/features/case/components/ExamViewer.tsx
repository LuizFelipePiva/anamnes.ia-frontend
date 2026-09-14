/**
 * Visualizador de exames complementares do aluno (SPEC-014 §6).
 *
 * ⚠️ Este é o último ponto antes da tela: **nada aqui pode derivar do
 * diagnóstico**. O rótulo vem de `examLabel`, que só conhece a modalidade, e o
 * `alt` da imagem usa esse mesmo rótulo — um `alt` com o nome do asset vazaria
 * o gabarito para quem usa leitor de tela e para quem abre o inspetor.
 *
 * A API já não envia o achado (`to_student_dto` no backend); esta camada existe
 * para que um campo novo, se um dia chegar, também não apareça por descuido.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FileImage, X } from 'lucide-react';

import { fetchAttemptExams } from '../services/examService';
import type { StudentExam } from '../types/exams';
import { examLabel, modalityFromLabelKey } from '../utils/examLabel';

interface ExamViewerProps {
  attemptId: string;
}

/** Créditos em texto legível — o acervo traz formatos variados. */
function creditsText(credits: StudentExam['credits']): string | null {
  if (!credits) return null;
  if (Array.isArray(credits)) {
    return credits.length ? credits.map((c) => String(c)).join(', ') : null;
  }
  if (typeof credits === 'object') {
    const values = Object.values(credits).filter(Boolean).map((v) => String(v));
    return values.length ? values.join(' · ') : null;
  }
  return String(credits);
}

const ExamViewer: React.FC<ExamViewerProps> = ({ attemptId }) => {
  const { t } = useTranslation('case');
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchAttemptExams(attemptId)
      .then((data) => { if (alive) setExams(data); })
      // Falha ao carregar não vira erro na tela: exame é apoio, e um toast de
      // erro no meio da anamnese atrapalha mais do que a ausência do botão.
      .catch(() => { if (alive) setExams([]); });
    return () => { alive = false; };
  }, [attemptId]);

  // Esc fecha. Registrado só enquanto aberto — um listener global permanente
  // roubaria o Esc de outros modais da página.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Sem exames, sem botão: um botão que abre uma lista vazia só gera clique
  // frustrado e sugere que o aluno perdeu alguma coisa.
  if (exams.length === 0) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('exams.viewer.title')}
      onClick={() => setOpen(false)}
    >
      {/* Mobile: folha colada embaixo, altura quase cheia — é onde o polegar
          alcança. Desktop: card centralizado. */}
      <div
        className="bg-[#393542] border border-[#4a4556] w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#4a4556] flex-shrink-0">
          <div className="text-base font-bold text-gray-100">{t('exams.viewer.title')}</div>
          <button
            type="button"
            aria-label={t('exams.viewer.close')}
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-[#4a4556] text-gray-300 flex items-center justify-center hover:bg-[#565064] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 flex flex-col gap-6 overflow-y-auto">
          {exams.map((exam, index) => {
            const label = examLabel(
              modalityFromLabelKey(exam.label.key),
              exam.label.ordinal,
              t,
            );
            const credits = creditsText(exam.credits);
            return (
              // A chave é o índice porque o aluno **não** recebe `id`: o
              // identificador do acervo é falante e vazava o diagnóstico. A
              // lista é imutável dentro da tentativa (só muda por refetch, que
              // substitui tudo), então não há reordenação para o índice errar.
              <figure key={index} className="flex flex-col gap-2">
                <figcaption className="text-sm font-bold text-gray-100">{label}</figcaption>
                {exam.url ? (
                  exam.media_type === 'audio' ? (
                    // Ausculta. O `aria-label` é o **rótulo neutro**, igual ao
                    // `alt` da imagem: o player é mais um lugar por onde o nome
                    // do asset — que é o diagnóstico — vazaria.
                    <audio
                      src={exam.url}
                      controls
                      preload="metadata"
                      aria-label={label}
                      className="w-full"
                    />
                  ) : (
                    <img
                      src={exam.url}
                      alt={label}
                      loading="lazy"
                      // `max-h` + `object-contain`: uma radiografia em pé tem
                      // proporção muito vertical e, sem teto, empurra os demais
                      // exames para fora da tela.
                      className="w-full max-h-[60vh] object-contain rounded-xl border border-[#4a4556] bg-[#2a2635]"
                    />
                  )
                ) : (
                  <div className="text-xs text-gray-400">{t('exams.viewer.unavailable')}</div>
                )}
                {credits && (
                  <span className="text-[11px] text-gray-400 break-words">
                    {t('exams.viewer.credits', { credits })}
                  </span>
                )}
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // No celular sobra só o ícone; sem o label o botão fica mudo para
        // leitor de tela.
        aria-label={t('exams.viewer.open')}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 text-[11px] sm:text-xs font-semibold text-violet-300 hover:bg-violet-500/20 hover:border-violet-400 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap"
      >
        <FileImage size={14} className="flex-shrink-0" />
        {/* O texto some no celular: o ícone já identifica, e o header do chat
            disputa espaço com cronômetro e etiquetas de modo. */}
        <span className="hidden sm:inline">{t('exams.viewer.open')}</span>
      </button>

      {/* Portal para o <body>: o header do chat usa `backdrop-blur`, que cria
          bloco de contenção para descendentes `fixed` — sem o portal o modal
          fica preso dentro da faixa do header, e é por isso que aparecia
          deslocado. O portal também tira o modal da disputa de empilhamento
          com o SOAP (que é `z-50`; este é `z-[60]`). */}
      {open && createPortal(modal, document.body)}
    </>
  );
};

export default ExamViewer;
