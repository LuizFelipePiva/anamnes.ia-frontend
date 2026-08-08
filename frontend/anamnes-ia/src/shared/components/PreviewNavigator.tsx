import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface Page {
  path: string;
  name: string;
  icon: string;
}

const PreviewNavigator: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const pages: Page[] = [
    { path: '/', name: 'Login', icon: 'A' },
    { path: '/register', name: 'Cadastro', icon: '+' },
    { path: '/navigator', name: 'Navegador', icon: 'N' },
    { path: '/mainpage', name: 'Principal', icon: 'H' },
    { path: '/cases', name: 'Casos', icon: 'C' },
    { path: '/student-chat', name: 'Simulacao', icon: 'S' },
    { path: '/conversation/1', name: 'Conversa', icon: 'V' },
    { path: '/student', name: 'Aluno', icon: 'D' },
    { path: '/profile', name: 'Perfil', icon: 'P' },
    { path: '/teacherpage', name: 'Professor', icon: 'T' },
    { path: '/teacher/new-case', name: 'Novo Caso', icon: 'G' },
    { path: '/admin', name: 'Admin', icon: 'M' },
    { path: '/flashcards', name: 'Flashcards', icon: 'F' },
    { path: '/minigame', name: 'Minigame', icon: 'J' },
    { path: '/settings', name: 'Configuracoes', icon: '*' },
    { path: '/payments', name: 'Pagamentos', icon: '$' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white shadow-lg z-50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-bold">Modo Preview</span>
            <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded">Sem autenticacao</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pages.map((page) => (
              <button
                key={page.path}
                onClick={() => navigate(page.path)}
                className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  location.pathname === page.path
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'bg-purple-500 hover:bg-purple-400'
                }`}
              >
                <span className="mr-1">{page.icon}</span>
                {page.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewNavigator;
