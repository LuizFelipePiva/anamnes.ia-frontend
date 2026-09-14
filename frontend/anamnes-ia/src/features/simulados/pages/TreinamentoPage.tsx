import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainMenu } from '@/shared/components';
import { ClipboardList, BookOpenCheck, ChevronRight } from 'lucide-react';
import './TreinamentoPage.css';

export const TreinamentoPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="treinamento-layout">
      <MainMenu />
      <main className="treinamento-main">
        <div className="treinamento-header">
          <h1>Prática & Treinamento</h1>
          <p>Escolha o formato ideal para os seus estudos agora.</p>
        </div>

        <div className="treinamento-cards">

          <div className="treinamento-card" onClick={() => navigate('/simulados')}>
            <div className="tc-icon bg-cyan"><ClipboardList size={32} /></div>
            <div className="tc-content">
              <h3>Modo Simulado</h3>
              <p>Crie provas personalizadas com filtros de especialidade, tempo e receba um relatório de desempenho completo no final.</p>
            </div>
            <div className="tc-arrow"><ChevronRight size={24} /></div>
          </div>

          <div className="treinamento-card" onClick={() => navigate('/questoes/unica')}>
            <div className="tc-icon bg-orange"><BookOpenCheck size={32} /></div>
            <div className="tc-content">
              <h3>Questões Avulsas</h3>
              <p>Pratique com questões infinitas e aleatórias, recebendo feedback imediato a cada resposta, sem compromisso de prova.</p>
            </div>
            <div className="tc-arrow"><ChevronRight size={24} /></div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default TreinamentoPage;
