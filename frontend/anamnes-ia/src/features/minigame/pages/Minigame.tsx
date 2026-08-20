import React from 'react';
import { MainMenu } from '@/shared/components';

const Minigame: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-[#f6f4ff] overflow-x-hidden">
      {/* Menu Desktop */}
      <aside className="hidden sm:block sm:fixed sm:left-0 sm:top-0 sm:h-screen z-30">
        <MainMenu />
      </aside>
      <div className="hidden sm:block w-20 flex-shrink-0" />

      {/* Menu Mobile */}
      <div className="sm:hidden w-full fixed top-0 left-0 z-30">
        <MainMenu mobile />
      </div>
      <div className="sm:hidden h-20 w-full flex-shrink-0" />

      {/* Conteúdo Principal */}
      <div className="flex-1 relative">
        {/* Fundo decorativo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(1200px 900px at 70% 10%, rgba(124,58,237,.15), transparent 60%)',
          }}
        />

        <div className="relative z-10 px-5 py-5 max-w-[1000px] mx-auto text-[#1f1b3a]"
          style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
        >
          {/* Hero */}
          <section
            className="grid grid-cols-1 md:grid-cols-2 gap-7 items-center rounded-[28px] p-[34px] mb-9"
            style={{
              background:
                'linear-gradient(135deg, rgba(109,40,217,.14), rgba(39,74,165,.08))',
              boxShadow: '0 18px 40px rgba(35,20,85,.15)',
            }}
          >
            <div>
              <h1 className="text-[30px] font-black leading-tight tracking-tight text-[#1f1b3a] mb-3">
                Minigame Anamnes.IA 🤝 Quero saber
              </h1>

              <p className="text-base leading-relaxed text-[#6b6885] mb-4 font-semibold">
                Um aplicativo educacional baseado em{' '}
                <b>repetição espaçada</b>, criado para fortalecer a{' '}
                <b>memória clínica</b> e a <b>base teórica</b> do acadêmico de medicina.
              </p>

              <p className="text-base leading-relaxed text-[#6b6885] mb-5 font-semibold">
                Estude poucos minutos por dia, no tempo certo, e transforme revisão em{' '}
                <b>aprendizado sólido e contínuo</b>.
              </p>

              <div className="flex gap-3.5 flex-wrap">
                <a
                  className="inline-flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-white no-underline hover:-translate-y-0.5 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
                    boxShadow: '0 14px 28px rgba(109,40,217,.35)',
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://play.google.com/store/apps/details?id=br.com.quero.saber&pcampaignid=web_share"
                >
                  📱 Google Play
                  <span className="text-[13px] opacity-85 font-bold">Android</span>
                </a>

                <a
                  className="inline-flex items-center gap-3 px-4 py-3.5 rounded-2xl font-extrabold text-white no-underline hover:-translate-y-0.5 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #1f2937, #111827)',
                    boxShadow: '0 14px 28px rgba(0,0,0,.3)',
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://apps.apple.com/br/app/quero-saber/id6742165440"
                >
                  🍎 App Store
                  <span className="text-[13px] opacity-85 font-bold">iOS</span>
                </a>
              </div>
            </div>

            {/* Mockup do celular */}
            <div
              className="rounded-[26px] p-5 border border-[rgba(40,30,90,.12)]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.95))',
                boxShadow: '0 18px 40px rgba(35,20,85,.15)',
              }}
            >
              <div
                className="bg-white rounded-[18px] p-3.5 mb-3 text-sm text-[#1f1b3a]"
                style={{ boxShadow: '0 10px 20px rgba(40,30,90,.08)' }}
              >
                <b className="block mb-1.5 text-[#6d28d9]">📚 Revisão Inteligente</b>
                Questões retornam exatamente no momento ideal para fixação.
              </div>

              <div
                className="bg-white rounded-[18px] p-3.5 mb-3 text-sm text-[#1f1b3a]"
                style={{ boxShadow: '0 10px 20px rgba(40,30,90,.08)' }}
              >
                <b className="block mb-1.5 text-[#6d28d9]">🧠 Memória de Longo Prazo</b>
                O app adapta o intervalo conforme seu desempenho.
              </div>

              <div
                className="bg-white rounded-[18px] p-3.5 text-sm text-[#1f1b3a]"
                style={{ boxShadow: '0 10px 20px rgba(40,30,90,.08)' }}
              >
                <b className="block mb-1.5 text-[#6d28d9]">📊 Progresso Diário</b>
                <div className="h-3 bg-[#e9e6ff] rounded-full overflow-hidden">
                  <div
                    className="h-full w-[42%] rounded-full animate-pulse"
                    style={{ background: 'linear-gradient(90deg, #6d28d9, #274aa5)' }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Painéis de informação */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div
              className="bg-white rounded-[22px] p-5"
              style={{ boxShadow: '0 18px 40px rgba(35,20,85,.15)' }}
            >
              <h2 className="text-lg font-bold text-[#1f1b3a] mb-2.5">🎯 Para quem é</h2>
              <p className="text-[#6b6885] leading-relaxed font-semibold m-0">
                Acadêmicos de medicina que desejam manter a base teórica ativa,
                mesmo durante a rotina pesada de estágios e provas.
              </p>
            </div>

            <div
              className="bg-white rounded-[22px] p-5"
              style={{ boxShadow: '0 18px 40px rgba(35,20,85,.15)' }}
            >
              <h2 className="text-lg font-bold text-[#1f1b3a] mb-2.5">⚙️ Como funciona</h2>
              <p className="text-[#6b6885] leading-relaxed font-semibold m-0">
                O sistema apresenta conteúdos em ciclos inteligentes. O que você quase
                esqueceu volta primeiro. O que você domina, volta depois.
              </p>
            </div>

            <div
              className="bg-white rounded-[22px] p-5"
              style={{ boxShadow: '0 18px 40px rgba(35,20,85,.15)' }}
            >
              <h2 className="text-lg font-bold text-[#1f1b3a] mb-2.5">⏱️ Pouco tempo, máximo ganho</h2>
              <p className="text-[#6b6885] leading-relaxed font-semibold m-0">
                Sessões curtas, objetivas e frequentes. Ideal para estudar no intervalo,
                transporte ou antes de dormir.
              </p>
            </div>

            <div
              className="bg-white rounded-[22px] p-5"
              style={{ boxShadow: '0 18px 40px rgba(35,20,85,.15)' }}
            >
              <h2 className="text-lg font-bold text-[#1f1b3a] mb-2.5">🚀 Integração futura</h2>
              <p className="text-[#6b6885] leading-relaxed font-semibold m-0">
                Em breve, integração direta com os casos clínicos da Anamnes.IA,
                conectando teoria e prática.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Minigame;
