import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { useTranslation } from 'react-i18next';
import { ChatGPT } from '@/features/chat';
import { MainMenu } from '@/shared/components';
import { ThreadProvider } from '@/features/chat';

const TeacherNewCaseChat: React.FC = () => {
  const navigate = useNavigate(); // Hook para navegação
  const { t } = useTranslation('teacher');

  // Prompt inicial definido conforme seu exemplo
  const initialPrompt = `olá, eu sou professor e esse é meu caso pronto, Nível de dificuldade:

Patologia(s): Infecção respiratória aguda - Sinais e sintomas: Febre alta, tosse seca, dor no peito e fadiga - Especificidades: Nenhuma - Exames complementares: Radiografia de tórax e hemograma - Histórico familiar: Pai com histórico de asma - Hábitos de vida: Fumante há 10 anos, sedentário e alimentação irregular Aqui está o resumo do caso: *Nível de dificuldade:* 4 *Especialidade:* Infectologia *Persona:* - Nome: Lucas Pereira - Idade: 34 anos - Profissão: Professor de História - Escolaridade: Mestrado - Estado emocional: Ansioso - Contexto social: Vive sozinho em um apartamento pequeno, enfrenta dificuldades financeiras e está preocupado com a saúde. *Patologia(s):* Infecção respiratória aguda *Sinais e sintomas:* Febre alta, tosse seca, dor no peito e fadiga *Especificidades:* Nenhuma *Exames complementares:* Radiografia de tórax e hemograma *Histórico familiar:* Pai com histórico de asma *Hábitos de vida:* Fumante há 10 anos, sedentário e alimentação irregular Se estiver tudo certo, podemos iniciar o caso!`;

  return (
    <ThreadProvider>
      <div className="min-h-screen bg-[#615B6D] flex flex-col sm:flex-row">
        {/* Menu lateral no desktop, topo no mobile */}
        <div className="sm:block hidden">
          <MainMenu />
        </div>
        <div className="sm:hidden w-full fixed top-0 left-0 z-10">
          <MainMenu mobile />
        </div>
        {/* Espaço para menu topo no mobile */}
        <div className="sm:hidden h-20 w-full" />

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-12 pt-8 sm:pt-12 relative">

          {/* Botão de Voltar */}
          <div className="w-full max-w-4xl mb-4 flex justify-start">
            <button
              onClick={() => navigate('/teacherpage')}
              className="flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 px-4 py-2 rounded-lg transition-all"
            >
              <span>⬅</span>
              <span className="font-medium">{t('newCase.back_to_panel')}</span>
            </button>
          </div>

          <div className="w-full max-w-4xl h-[85vh]"> {/* Altura ajustada para caber bem na tela */}
            <div className="w-full h-full flex items-stretch">
              <ChatGPT
                initialPrompt={initialPrompt}

              />
            </div>
          </div>
        </div>
      </div>
    </ThreadProvider>
  );
};

export default TeacherNewCaseChat;