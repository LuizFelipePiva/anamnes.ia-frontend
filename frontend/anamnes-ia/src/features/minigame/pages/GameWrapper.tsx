import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MainMenu } from '@/shared/components';

const BASE_URL = 'https://anamnes-ia-mainpage-exam-pro.base44.app';

const GameWrapper: React.FC = () => {
  const { '*': path } = useParams();
  const navigate = useNavigate();

  // Segurança: Sanitiza a rota extraída para evitar Directory Traversal ou injeção de caracteres
  const safePath = path?.replace(/[^a-zA-Z0-9_-]/g, '') || '';

  return (
    <div className="flex h-screen bg-[#111018] overflow-hidden">
      {/* Menu Desktop */}
      <aside className="hidden sm:block sm:w-20 sm:flex-shrink-0 z-30">
        <MainMenu />
      </aside>

      {/* Menu Mobile */}
      <div className="sm:hidden w-full fixed top-0 left-0 z-30">
        <MainMenu mobile />
      </div>

      <div className="flex-1 flex flex-col relative sm:pt-0 pt-20 w-full">
        {/* Barra de Voltar */}
        <div className="h-14 flex-shrink-0 flex items-center px-4 bg-[#181622] border-b border-[#2a2736]">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors font-medium text-sm bg-[#221f2e] hover:bg-[#2d293d] px-3 py-1.5 rounded-lg"
          >
            <ChevronLeft size={18} />
            Voltar ao App
          </button>
        </div>

        {/* Iframe */}
        <div className="flex-1 w-full bg-black">
          <iframe 
            src={`${BASE_URL}/${safePath}`} 
            className="w-full h-full border-none"
            allow="autoplay; fullscreen"
            title="Minigame Interativo"
          />
        </div>
      </div>
    </div>
  );
};

export default GameWrapper;
