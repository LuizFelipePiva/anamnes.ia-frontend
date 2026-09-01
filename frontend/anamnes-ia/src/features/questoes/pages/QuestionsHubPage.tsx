import React from 'react';
import { BookOpenText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainMenu } from '@/shared/components';
import { SimuladoConfigurator } from '@/features/simulados/components/SimuladoConfigurator';

const QuestionsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const sectionTitleClass =
    'mb-3 text-[1.35rem] sm:text-[1.45rem] font-black tracking-[-0.05em] text-[#1a1a22] leading-none';

  return (
    <div className="lg:grid lg:grid-cols-[80px_1fr] min-h-screen w-full bg-[#f7f6fa] text-[#1d1d22]">
      <aside className="hidden lg:block lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto z-30">
        <MainMenu />
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full shadow-md">
        <MainMenu mobile />
      </header>

      <div className="hidden lg:block w-20 bg-[#1a1730]" />

      <main className="w-full relative">
        <div className="lg:hidden h-16 w-full" />

        <div className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-9">
          <div className="mx-auto w-full max-w-[1040px] flex flex-col gap-8">
            <section className="rounded-[1.5rem] border border-[#e6e1ee] bg-white px-5 sm:px-6 py-5 shadow-[0_6px_20px_rgba(19,12,45,.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8d0eb] bg-[#f3f0fb] text-[#6f46b8]">
                  <BookOpenText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[1.05rem] sm:text-[1.1rem] font-black text-[#17181f] leading-none">
                    Banco de Questões
                  </p>
                  <p className="mt-1 text-[0.9rem] text-[#667085]">
                    Acesso rápido à questão única e ao configurador de simulados.
                  </p>
                </div>
              </div>
            </section>

            <section className="w-full max-w-[1040px] mx-auto">
              

              <div className="mb-7">
                <h2 className={sectionTitleClass}>Questão única</h2>

                <button
                  type="button"
                  onClick={() => navigate('/questoes/unica')}
                  className="group w-full rounded-2xl border border-[#e6e1ee] bg-white px-4 py-4 text-left shadow-[0_4px_18px_rgba(19,12,45,.04)] transition hover:-translate-y-0.5 hover:border-[#d6c8f1] hover:shadow-[0_8px_24px_rgba(19,12,45,.08)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ddd5eb] bg-[#f5f2fb] text-[#6f46b8]">
                      <BookOpenText className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                      <div className="text-[1.05rem] font-bold text-[#1f212a]">Responder uma questão</div>
                      <div className="mt-1 text-[0.72rem] leading-4 text-[#596070]">
                        Pratique com questões de múltipla escolha e confira sua resposta na hora.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-[#6f46b8] transition group-hover:translate-x-0.5">
                    Começar questão
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </section>

            <section className="w-full">
              <div className="rounded-[1.6rem] border border-[#e6e1ee] bg-white shadow-[0_6px_20px_rgba(19,12,45,.04)]">
                <div className="p-3 sm:p-4">
                  <div className="sl-page sl-page--embedded" style={{ backgroundColor: 'transparent' }}>
                    <SimuladoConfigurator compact />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuestionsHubPage;
